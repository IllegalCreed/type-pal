// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, key, observation, until } from './__tests__/runtime-shell/driver.js'
import { sceneWithCommands, shellProject } from './__tests__/runtime-shell/project.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
  Reflect.deleteProperty(window, '__tpObserve')
})

async function clockHost() {
  host = await installShellHost()
  const h = host
  let realNow = 0
  vi.spyOn(performance, 'now').mockImplementation(() => realNow)
  const present = h.frame.bind(h)
  h.frame = (dt = 100) => {
    realNow += dt
    present(dt)
    h.draws.length = 0
  }
  // Only external browser IO is adapted. Blank pixels are not a visual oracle.
  vi.stubGlobal(
    'ImageData',
    class implements ImageData {
      readonly colorSpace = 'srgb' as const
      constructor(
        readonly data: Uint8ClampedArray<ArrayBuffer>,
        readonly width: number,
        readonly height: number,
      ) {}
    },
  )
  return h
}

function screen() {
  const canvas = document.querySelector<HTMLCanvasElement>('#screen')
  if (!canvas) throw new Error('real runtime canvas missing')
  // Clock/Promise regression only; do not spend the test doing full-screen pixel work.
  canvas.width = 4
  canvas.height = 4
}

function ditherRunning() {
  const value: unknown = Reflect.get(window, '__rfDither')
  if (!value || typeof value !== 'object' || !('active' in value))
    throw new Error('real dither observation missing')
  if (typeof value.active !== 'boolean') throw new Error('invalid real dither active flag')
  return value.active
}

function ditherProgress() {
  const value: unknown = Reflect.get(window, '__rfDither')
  if (
    !value ||
    typeof value !== 'object' ||
    !('active' in value) ||
    value.active !== true ||
    !('pr' in value) ||
    typeof value.pr !== 'number' ||
    !('step' in value) ||
    typeof value.step !== 'number'
  )
    throw new Error('real active dither progress missing')
  return { pr: value.pr, step: value.step }
}

function dialoguePhase() {
  const protocol: unknown = Reflect.get(window, '__tpObserve')
  if (
    !protocol ||
    typeof protocol !== 'object' ||
    !('readRuntime' in protocol) ||
    typeof protocol.readRuntime !== 'function'
  )
    throw new Error('real runtime observation missing')
  const runtime: unknown = protocol.readRuntime()
  if (!runtime || typeof runtime !== 'object' || !('dialogue' in runtime))
    throw new Error('real runtime dialogue observation missing')
  const dialogue = runtime.dialogue
  if (dialogue === null) return null
  if (!dialogue || typeof dialogue !== 'object' || !('phase' in dialogue))
    throw new Error('invalid actual dialogue observation')
  return dialogue.phase
}

test('Root counter: a genuine long frame cannot turn 720ms dither into gameplay-clock catch-up', async () => {
  const h = await clockHost()
  const fixture = await shellProject({
    first: sceneWithCommands('a', [
      { kind: 'wait', ms: 200 },
      { kind: 'ditherScreen', ms: 720 },
      { kind: 'giveMoney', delta: 9 },
    ]),
  })
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  screen()
  h.frame(100)
  await drain()
  h.frame(20000)
  await drain()
  await until(h, ditherRunning)
  h.frame(16)
  await drain()
  expect(ditherProgress()).toEqual({ pr: 0, step: 0 })
  for (let i = 0; i < 6; i++) {
    h.frame(40)
    await drain()
  }
  const progress = ditherProgress()
  expect(progress.step).toBe(Math.floor(progress.pr * 72))
  expect(progress.step).toBe(24)
  for (let i = 0; i < 12; i++) {
    h.frame(40)
    await drain()
  }
  expect(ditherRunning()).toBe(false)
  expect(observation().world.money).toBe(59)
  // The effect/tail have committed; allow the real invocation lease's final task turn.
  await h.settleIO()
  await drain()
  expect(observation().script.running).toBe(false)
})

test('Root counter: the first ordinary cue keeps its real 24ms typewriter after a long frame', async () => {
  const h = await clockHost()
  const fixture = await shellProject({
    first: sceneWithCommands('a', [
      { kind: 'wait', ms: 200 },
      {
        kind: 'dialog',
        cue: { identity: { kind: 'narration' }, slot: 'bottom', rows: [{ text: 'line.one' }] },
      },
      { kind: 'giveMoney', delta: 9 },
    ]),
  })
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  h.frame(100)
  await drain()
  h.frame(20000)
  await drain()
  await until(h, () => observation().dialogue)
  h.frame(16)
  await drain()
  expect(dialoguePhase()).toBe('typing')
  const firstDraw = h.text.mock.calls.filter((call) =>
    call[1].some((span) => span.text === 'First'),
  )
  expect(firstDraw.length).toBeGreaterThan(0)
  expect(firstDraw.at(-1)?.[4]?.maxChars).toBeLessThan(5)
  h.frame(120)
  await drain()
  expect(dialoguePhase()).toBe('waiting-input')
  await key(h, 'Enter', 16)
  await until(h, () => !observation().script.running)
  expect(observation().world.money).toBe(59)
})
