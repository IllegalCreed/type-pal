// @vitest-environment jsdom
import type { AuthorCommand } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, key } from './__tests__/runtime-shell/driver.js'
import { shellScene } from './__tests__/runtime-shell/project.js'
import { bootScenario, installShellHost, state } from './__tests__/runtime-shell/scenarios.js'
import type { DialogueObservation } from './dialog/dialog-box.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
  for (const property of ['__tpObserve', '__rfDither', '__rfSceneEntry'])
    Reflect.deleteProperty(window, property)
})

function dialogue(): DialogueObservation | null {
  const observer: unknown = Reflect.get(window, '__tpObserve')
  if (
    !observer ||
    typeof observer !== 'object' ||
    !('readRuntime' in observer) ||
    typeof observer.readRuntime !== 'function'
  )
    throw new Error('real runtime observation missing')
  // Detached product observation only; no input or world mutation through this diagnostic.
  return observer.readRuntime().dialogue
}
function dither(): { active: boolean; step: number; pr: number; prepareMs: number | null } {
  return Reflect.get(window, '__rfDither')
}
function pauseWorld() {
  const label = [...document.querySelectorAll<HTMLLabelElement>('label')].find((candidate) =>
    candidate.textContent?.startsWith('帧步进（'),
  )
  const input = label?.querySelector<HTMLInputElement>('input[type="checkbox"]')
  if (!input) throw new Error('real debug world-step checkbox missing')
  input.click()
  expect(input.checked).toBe(true)
}
async function harness(body: AuthorCommand[], debug = false) {
  host = await installShellHost(debug ? '?debug' : '')
  const h = host
  let wall = 0,
    raf = 0
  vi.spyOn(performance, 'now').mockImplementation(() => wall)
  const present = h.frame
  h.frame = (dt = 100) => {
    wall += dt
    const elapsed = wall - raf
    raf = wall
    present(elapsed)
  }
  // External Canvas data adapter. Blank pixels cannot establish visual correctness; these
  // cases assert actual production step calls, dialogue phase and awaited script completion.
  vi.stubGlobal(
    'ImageData',
    class {
      readonly colorSpace = 'srgb'
      constructor(
        readonly data: Uint8ClampedArray,
        readonly width: number,
        readonly height: number,
      ) {}
    },
  )
  const first = shellScene('a')
  first.entities = [
    {
      id: 'talker',
      zone: true,
      pos: { col: 3, row: 2, height: 0 },
      initialPage: 'normal',
      pages: [
        {
          id: 'normal',
          label: 'Normal',
          trigger: 'show',
          triggerActivation: { on: 'interact', range: 2 },
        },
      ],
      behaviors: {
        trigger: {
          show: {
            label: 'Presentation',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'once',
              stages: [{ id: 'once', body, next: { kind: 'complete' } }],
            },
          },
        },
      },
    },
  ]
  const fixture = await bootScenario(h, {
    first,
    sharedScripts: { cancelFilm: { name: 'Cancelable presentation', self: 'none', body } },
  })
  await drain()
  const transition = await import('./dither-transition.js')
  const steps = vi.spyOn(transition, 'applyDitherPaletteTransition')
  return {
    h,
    fixture,
    steps,
    now: () => wall,
    cost: (ms: number) => {
      wall += ms
    },
    frame: async (dt: number) => {
      h.frame(dt)
      await drain()
      await h.settleIO()
    },
    start: async () => {
      await key(h, 'Enter', 0)
      await h.settleIO()
      expect(state().script.running).toBe(true)
    },
  }
}
const cue: AuthorCommand = {
  kind: 'dialog',
  cue: {
    identity: { kind: 'unbound', speaker: 'A' },
    slot: 'bottom',
    rows: [{ text: 'AAAAAAAA', speed: 100 }],
  },
}
const tail: AuthorCommand = { kind: 'giveMoney', delta: 7 }

test.each([
  false,
  true,
])('ordinary first cue uses UI time despite accumulated long-frame lag: %s', async (lag) => {
  const r = await harness([cue, tail])
  if (lag) {
    await r.frame(3000)
    await r.frame(3000)
  }
  await r.start()
  await r.frame(0)
  expect(dialogue()).toMatchObject({ phase: 'typing', pageStartedAtMs: r.now() })
  expect(r.h.text.mock.lastCall?.[4]?.maxChars).toBe(0)
  await r.frame(300)
  expect(dialogue()?.phase).toBe('typing')
  expect(r.h.text.mock.lastCall?.[4]?.maxChars).toBe(3)
  await r.frame(500)
  expect(dialogue()?.phase).toBe('waiting-input')
  await key(r.h, 'Enter', 0)
  await r.frame(0)
  expect(state().world.money).toBe(57)
  expect(state().script.running).toBe(false)
  r.fixture.assertInputUnchanged()
})

test('world single-step pause does not pause dialogue typing, input or the next script effect', async () => {
  const r = await harness([cue, tail], true)
  pauseWorld()
  await r.frame(2000)
  const position = structuredClone(state().player.pos)
  await r.start()
  await r.frame(0)
  expect(dialogue()?.phase).toBe('typing')
  await r.frame(800)
  expect(dialogue()?.phase).toBe('waiting-input')
  await key(r.h, 'Enter', 0)
  await r.frame(0)
  expect(state().world.money).toBe(57)
  expect(state().player.pos).toEqual(position)
  r.fixture.assertInputUnchanged()
})

test('world pause keeps legal skip and automatic tail timing on the same UI clock', async () => {
  if (cue.kind !== 'dialog') throw new Error('ordinary dialogue fixture missing')
  const r = await harness([{ ...cue, cue: { ...cue.cue, autoAdvance: 300 } }, tail], true)
  pauseWorld()
  await r.frame(2000)
  await r.start()
  await r.frame(0)
  expect(dialogue()?.phase).toBe('typing')
  await r.frame(200)
  await key(r.h, 'Enter', 0)
  await r.frame(0)
  expect(dialogue()?.phase).toBe('auto-advance')
  await key(r.h, 'Enter', 0)
  await r.frame(0)
  expect(dialogue()?.phase).toBe('auto-advance')
  await r.frame(899)
  expect(dialogue()?.phase).toBe('auto-advance')
  expect(state().world.money).toBe(50)
  await r.frame(1)
  await r.frame(0)
  expect(dialogue()).toBeNull()
  expect(state().world.money).toBe(57)
  r.fixture.assertInputUnchanged()
})

test('ordinary page skip and next-page typing retain real-time start after a lagged first cue', async () => {
  if (cue.kind !== 'dialog') throw new Error('ordinary dialogue fixture missing')
  const r = await harness([
    {
      ...cue,
      cue: {
        ...cue.cue,
        rows: Array.from({ length: 6 }, () => ({ text: 'AAAAAAAA', speed: 100 })),
      },
    },
    tail,
  ])
  await r.frame(6000)
  await r.start()
  await r.frame(0)
  expect(dialogue()).toMatchObject({ phase: 'typing', pageIndex: 0, pageCount: 2 })
  await key(r.h, 'Enter', 0)
  await r.frame(0)
  expect(dialogue()).toMatchObject({ phase: 'waiting-input', pageIndex: 0 })
  await key(r.h, 'Enter', 0)
  await r.frame(0)
  expect(dialogue()).toMatchObject({ phase: 'typing', pageIndex: 1, pageStartedAtMs: r.now() })
  await r.frame(400)
  expect(dialogue()?.phase).toBe('typing')
  await key(r.h, 'Enter', 0)
  await key(r.h, 'Enter', 0)
  await r.frame(0)
  expect(dialogue()).toBeNull()
  expect(state().world.money).toBe(57)
  r.fixture.assertInputUnchanged()
})

test('normal dither keeps its forced zero frame and all 72 time-derived steps before resolving', async () => {
  const r = await harness([{ kind: 'ditherScreen', ms: 720 }, tail])
  await r.start()
  await r.frame(0)
  expect(dither()).toMatchObject({ active: true, step: 0, pr: 0 })
  for (let step = 1; step <= 72; step++) {
    await r.frame(10)
    expect(r.steps.mock.lastCall?.[3]).toBe(step)
    if (step < 72) expect(dither()).toMatchObject({ active: true, step, pr: step / 72 })
  }
  expect(dither().active).toBe(false)
  expect(state().world.money).toBe(57)
  expect(state().script.running).toBe(false)
  r.fixture.assertInputUnchanged()
})

test.each([
  false,
  true,
])('dither UI progress agrees with real output and finishes while gameplay lags or pauses: %s', async (paused) => {
  const r = await harness([{ kind: 'ditherScreen', ms: 720 }, tail], true)
  if (paused) pauseWorld()
  await r.frame(3000)
  await r.frame(3000)
  await r.start()
  await r.frame(0)
  expect(dither()).toMatchObject({ active: true, step: 0, pr: 0 })
  await r.frame(360)
  expect(dither()).toMatchObject({ active: true, step: 36, pr: 0.5 })
  expect(r.steps.mock.lastCall?.[3]).toBe(36)
  expect(state().world.money).toBe(50)
  await r.frame(360)
  expect(r.steps.mock.lastCall?.[3]).toBe(72)
  expect(dither().active).toBe(false)
  expect(state().world.money).toBe(57)
  expect(state().script.running).toBe(false)
  r.fixture.assertInputUnchanged()
})

test('palette preparation cost is excluded from the existing 720ms dither budget', async () => {
  const r = await harness([{ kind: 'ditherScreen', ms: 720 }, tail])
  const transition = await import('./dither-transition.js'),
    build = transition.buildDitherPalettePlan
  vi.spyOn(transition, 'buildDitherPalettePlan').mockImplementation((...args) => {
    const result = build(...args)
    r.cost(2000) // Transparent real implementation; only model elapsed external CPU work.
    return result
  })
  await r.start()
  await r.frame(0)
  expect(dither()).toMatchObject({ active: true, step: 0, pr: 0, prepareMs: 2000 })
  await r.frame(0)
  expect(dither()).toMatchObject({ active: true, step: 0, pr: 0 })
  await r.frame(10)
  expect(r.steps.mock.lastCall?.[3]).toBe(1)
  await r.frame(710)
  expect(r.steps.mock.lastCall?.[3]).toBe(72)
  expect(state().world.money).toBe(57)
  r.fixture.assertInputUnchanged()
})

test.each([
  'dialog',
  'dither',
] as const)('canceling a real detached %s rejects its awaited effect and never executes the tail', async (effect) => {
  const r = await harness(
    [effect === 'dialog' ? cue : { kind: 'ditherScreen', ms: 720 }, tail],
    true,
  )
  const run = [...document.querySelectorAll<HTMLButtonElement>('.tpd-trigger-button')].find(
    (button) => button.textContent?.includes('shared/cancelFilm'),
  )
  if (!run) throw new Error('real shared presentation trigger missing')
  run.click()
  await drain()
  await r.frame(0)
  expect(effect === 'dialog' ? dialogue() !== null : dither().active).toBe(true)
  const cancel = [...document.querySelectorAll<HTMLButtonElement>('.tpd-trigger-button')].find(
    (button) => button !== run && button.textContent?.includes('shared/cancelFilm'),
  )
  if (!cancel) throw new Error('real running presentation cancellation button missing')
  cancel.click()
  await drain()
  await r.frame(2000)
  expect(dialogue()).toBeNull()
  expect(dither().active).toBe(false)
  expect(state().world.money).toBe(50)
  r.fixture.assertInputUnchanged()
})
