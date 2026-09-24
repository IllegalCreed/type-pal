// @vitest-environment jsdom
import type { AuthorCommand } from '@type-pal/content'
import { afterEach, expect, test } from 'vitest'
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { key } from './__tests__/runtime-shell/driver.js'
import { sceneWithCommands } from './__tests__/runtime-shell/project.js'
import {
  advance,
  bootScenario,
  installShellHost,
  state,
} from './__tests__/runtime-shell/scenarios.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})
const target = { scene: 'a', entity: 'npc' }
const initialPos = { col: 4, row: 4, height: 0 }
function story(commands: AuthorCommand[]) {
  const scene = sceneWithCommands('a', [
    { kind: 'wait', ms: 200 },
    ...commands,
    { kind: 'giveMoney', delta: 9 },
  ])
  scene.entities = [
    { id: 'npc', sprite: 'walker', pos: { ...initialPos }, facing: 'down', collide: false },
  ]
  return scene
}

test.each([
  {
    label: 'absolute',
    command: {
      kind: 'setEntityPos',
      target,
      pos: { col: 5, row: 4, height: 0 },
    } satisfies AuthorCommand,
    expected: { col: 5, row: 4, height: 0 },
  },
  {
    label: 'party-relative',
    command: { kind: 'setEntityPosRelParty', target, dcol: 1, drow: 2 } satisfies AuthorCommand,
    expected: { col: 3, row: 4, height: 0 },
  },
])('H10 $label entity position reaches both durable state and live projection before continuation', async ({
  command,
  expected,
}) => {
  host = await installShellHost()
  const h = await bootScenario(host, { first: story([command]) })
  const party = structuredClone(state().world.party)
  expect(state().entities[0]!.pos).toEqual(initialPos)
  await advance(host, () => !state().script.running && state().world.money === 59)
  expect(state().entities[0]!.pos).toEqual(expected)
  expect(state().world.script?.entityPos).toEqual({ a: { npc: expected } })
  expect(state().world.party).toEqual(party)
  h.assertInputUnchanged()
})

test('H10 authored move waits for exact endpoint and persists it without mutating scene definition', async () => {
  host = await installShellHost()
  const endpoint = { col: 5, row: 4, height: 0 }
  const h = await bootScenario(host, {
    first: story([{ kind: 'moveEntity', target, to: endpoint, speed: 'slow' }]),
  })
  await advance(host, () => state().entities[0]!.pos.col > 4)
  expect(state().entities[0]!.pos.col).toBeLessThan(5)
  expect(state().world.money).toBe(50)
  expect(state().world.script?.entityPos?.a?.npc).toBeUndefined()
  await advance(host, () => !state().script.running && state().world.money === 59)
  expect(state().entities[0]!.pos).toEqual(endpoint)
  expect(state().world.script?.entityPos).toEqual({ a: { npc: endpoint } })
  h.assertInputUnchanged()
})

test('H10 hide then restore keeps entity identity and resumes the next authored command', async () => {
  host = await installShellHost()
  const h = await bootScenario(host, {
    first: story([
      { kind: 'hideEntity', target, ticks: 30 },
      { kind: 'wait', ms: 300 },
      { kind: 'restoreEntity', target },
    ]),
  })
  await advance(host, () => state().world.entityLifecycles?.a?.npc?.phase === 'despawned')
  expect(state().world.money).toBe(50)
  expect(state().entities[0]!.id).toBe('npc')
  expect(state().entities[0]!.hidden).toBe(true)
  await advance(host, () => !state().script.running && state().world.money === 59)
  expect(state().world.entityLifecycles?.a?.npc).toBeUndefined()
  expect(state().entities[0]!.hidden).toBe(false)
  expect(state().entities[0]!.pos).toEqual(initialPos)
  h.assertInputUnchanged()
})

test.each([
  { label: 'default', destination: {}, expected: { col: 4, row: 3, height: 0 } },
  {
    label: 'explicit',
    destination: { pos: { col: 6, row: 2, height: 0 }, facing: 'up' as const },
    expected: { col: 6, row: 2, height: 0 },
  },
])('H10 authored loadScene uses $label arrival and continues after the actual map commit', async ({
  destination,
  expected,
}) => {
  host = await installShellHost()
  const h = await bootScenario(host, {
    first: story([{ kind: 'loadScene', scene: 'b', ...destination }]),
  })
  const party = structuredClone(state().world.party)
  await advance(host, () => state().sceneId === 'b' && !state().script.running)
  expect(state().player.pos).toEqual(expected)
  expect(state().world.money).toBe(59)
  expect(state().world.party).toEqual(party)
  expect(h.fixture.reads).toContain('content/maps/b.json')
  h.assertInputUnchanged()
})

test('H10 script movement owns keyboard until completion; exploration menu opens afterwards', async () => {
  host = await installShellHost()
  const h = await bootScenario(host, {
    first: story([
      { kind: 'moveEntity', target, to: { col: 5, row: 4, height: 0 }, speed: 'slow' },
    ]),
  })
  const pos = structuredClone(state().player.pos)
  await advance(host, () => state().entities[0]!.pos.col > 4)
  await key(host, 'Escape')
  await key(host, 'ArrowUp')
  expect(state().renderDebug.menuActive).toBe(false)
  expect(state().player.pos).toEqual(pos)
  await advance(host, () => !state().script.running)
  await key(host, 'Escape')
  expect(state().renderDebug.menuActive).toBe(true)
  h.assertInputUnchanged()
})
