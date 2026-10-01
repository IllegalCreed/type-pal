// @vitest-environment jsdom
import { type AuthorCommand, type AuthorScriptFlow, gridToPixel } from '@type-pal/content'
import { afterEach, expect, test } from 'vitest'
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, key } from './__tests__/runtime-shell/driver.js'
import { shellScene } from './__tests__/runtime-shell/project.js'
import {
  advance,
  bootScenario,
  installShellHost,
  state,
} from './__tests__/runtime-shell/scenarios.js'
import { IndexedDbSaveStore } from './save/store.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

test.each([
  'hidden',
  'suspended',
] as const)('a machine to boundary remains saveable when %s before a later F5, then resumes without replay', async (mode) => {
  host = await installShellHost()
  const pause: AuthorCommand =
    mode === 'hidden'
      ? { kind: 'setEntityState', target, state: 0 }
      : { kind: 'suspendEntity', target, ticks: 100 }
  const resume: AuthorCommand =
    mode === 'hidden'
      ? { kind: 'setEntityState', target, state: 1 }
      : { kind: 'restoreEntity', target }
  const first = shellScene('a')
  first.entities = [
    {
      id: 'npc',
      sprite: 'walker',
      pos: { col: 4, row: 4, height: 0 },
      pages: [{ id: 'normal', label: 'Normal', auto: 'walk' }],
      initialPage: 'normal',
      behaviors: {
        auto: {
          walk: {
            label: 'Walk',
            order: 0,
            flow: {
              kind: 'stateMachine',
              machine: {
                id: 'walk',
                label: 'Walk',
                initial: 'first',
                states: {
                  first: {
                    label: 'First',
                    body: [{ kind: 'giveMoney', delta: 7 }, pause],
                    next: { kind: 'to', state: 'second', yield: 'worldTick' },
                  },
                  second: {
                    label: 'Second',
                    body: [{ kind: 'giveMoney', delta: 9 }],
                    next: { kind: 'advance', state: 'complete' },
                  },
                  complete: { label: 'Complete', body: [], next: { kind: 'stay' } },
                },
              },
            },
          },
        },
      },
    },
    {
      id: 'switch',
      sprite: 'walker',
      pos: { col: 2, row: 3, height: 0 },
      pages: [
        {
          id: 'normal',
          label: 'Normal',
          trigger: 'resume',
          triggerActivation: { on: 'interact', range: 2 },
        },
      ],
      initialPage: 'normal',
      behaviors: {
        trigger: {
          resume: {
            label: 'Resume',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'one',
              stages: [{ id: 'one', body: [resume] }],
            },
          },
        },
      },
    },
  ]
  const booted = await bootScenario(host, { first })
  const cursor = { kind: 'state', machine: 'walk', state: 'second' }
  await advance(
    host,
    () => state().world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at?.kind === 'state',
  )
  expect(state().world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at).toEqual(cursor)
  for (let frame = 0; frame < 5; frame++) {
    host.frame(100)
    await drain()
  }
  expect(state().world.money).toBe(57)
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  await key(host, 'F5')
  for (let frame = 0; frame < 40 && !(await store.getPayload('quick')); frame++) {
    host.frame(100)
    await drain()
    await host.settleIO()
  }
  const payload = await store.getPayload('quick')
  expect(payload).not.toBeNull()
  expect(payload?.world.money).toBe(57)
  expect(payload?.world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at).toEqual(cursor)
  await key(host, 'F9')
  for (let frame = 0; frame < 5; frame++) {
    host.frame(100)
    await drain()
    await host.settleIO()
  }
  expect(state().world.money).toBe(57)
  await key(host, 'Enter')
  await advance(host, () => {
    const at = state().world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at
    return state().world.money === 66 && at?.kind === 'state' && at.state === 'complete'
  })
  expect(state().world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at).toEqual({
    kind: 'state',
    machine: 'walk',
    state: 'complete',
  })
  booted.assertInputUnchanged()
})

const target = { scene: 'a', entity: 'npc' }
const endpoint = { col: 5, row: 4, height: 0 }

test('a real diagonal target leg saves at its endpoint, resumes the next leg and remains completed after F9', async () => {
  host = await installShellHost()
  const first = shellScene('a')
  const firstEndpoint = { col: 7, row: 5, height: 0 }
  const lastEndpoint = { col: 7, row: 6, height: 0 }
  first.entities = [
    {
      id: 'npc',
      sprite: 'walker',
      pos: { col: 4, row: 4, height: 0 },
      pages: [{ id: 'normal', label: 'Normal', auto: 'route' }],
      initialPage: 'normal',
      behaviors: {
        auto: {
          route: {
            label: 'Two target legs',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'first',
              stages: [
                {
                  id: 'first',
                  body: [{ kind: 'moveEntity', target, to: firstEndpoint, speed: 'normal' }],
                  next: 'last',
                },
                {
                  id: 'last',
                  body: [
                    { kind: 'moveEntity', target, to: lastEndpoint, speed: 'normal' },
                    { kind: 'giveMoney', delta: 7 },
                  ],
                  next: { kind: 'complete' },
                },
              ],
            },
          },
        },
      },
    },
  ]
  const booted = await bootScenario(host, { first })
  await advance(host, () => {
    const current = state().entities[0]!.pos
    return current.col > 4 && current.col < 7
  })
  const current = gridToPixel(state().entities[0]!.pos)
  expect(current.x - gridToPixel({ col: 4, row: 4, height: 0 }).x).toBeCloseTo(
    current.y - gridToPixel({ col: 4, row: 4, height: 0 }).y,
  )
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  await key(host, 'F5')
  for (let frame = 0; frame < 40 && !(await store.getPayload('quick')); frame++) {
    host.frame(100)
    await drain()
    await host.settleIO()
  }
  const saved = await store.getPayload('quick')
  expect(saved?.world.script?.entityPos?.a?.npc).toEqual(firstEndpoint)
  expect(saved?.world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at).toEqual({
    kind: 'stage',
    stage: 'last',
  })
  expect(saved?.world.money).toBe(50)
  await advance(host, () => state().world.money === 57)
  await key(host, 'F9')
  for (let frame = 0; frame < 20; frame++) {
    host.frame(100)
    await drain()
    await host.settleIO()
  }
  await advance(
    host,
    () => state().world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at.kind === 'completed',
  )
  expect(state().entities[0]!.pos).toEqual(lastEndpoint)
  expect(state().world.money).toBe(57)
  await key(host, 'F5')
  for (let frame = 0; frame < 20; frame++) {
    host.frame(100)
    await drain()
    await host.settleIO()
  }
  expect(
    (await store.getPayload('quick'))?.world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at,
  ).toEqual({ kind: 'completed' })
  await key(host, 'F9')
  for (let frame = 0; frame < 20; frame++) {
    host.frame(100)
    await drain()
    await host.settleIO()
  }
  expect(state().entities[0]!.pos).toEqual(lastEndpoint)
  expect(state().world.money).toBe(57)
  expect(state().world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at).toEqual({
    kind: 'completed',
  })
  booted.assertInputUnchanged()
})

test('F9 cancels a real in-flight diagonal move without late position, reward or behavior selection', async () => {
  host = await installShellHost()
  const first = shellScene('a')
  const initialPos = { col: 4, row: 4, height: 0 }
  first.entities = [
    {
      id: 'npc',
      sprite: 'walker',
      pos: initialPos,
      pages: [{ id: 'normal', label: 'Normal', auto: 'idle' }],
      initialPage: 'normal',
      behaviors: {
        auto: {
          idle: {
            label: 'Idle',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'idle',
              stages: [{ id: 'idle', body: [], next: { kind: 'complete' } }],
            },
          },
          route: {
            label: 'Diagonal route',
            order: 1,
            flow: {
              kind: 'stages',
              initial: 'move',
              stages: [
                {
                  id: 'move',
                  body: [
                    {
                      kind: 'moveEntity',
                      target,
                      to: { col: 12, row: 6, height: 0 },
                      speed: 'normal',
                    },
                    { kind: 'giveMoney', delta: 7 },
                    {
                      kind: 'selectEntityBehavior',
                      target,
                      channel: 'auto',
                      selection: { kind: 'use', value: 'idle' },
                    },
                  ],
                  next: { kind: 'complete' },
                },
              ],
            },
          },
        },
      },
    },
    {
      id: 'switch',
      sprite: 'walker',
      pos: { col: 2, row: 3, height: 0 },
      pages: [
        {
          id: 'normal',
          label: 'Normal',
          trigger: 'start',
          triggerActivation: { on: 'interact', range: 2 },
        },
      ],
      initialPage: 'normal',
      behaviors: {
        trigger: {
          start: {
            label: 'Start route',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'start',
              stages: [
                {
                  id: 'start',
                  body: [
                    {
                      kind: 'selectEntityBehavior',
                      target,
                      channel: 'auto',
                      selection: { kind: 'use', value: 'route' },
                    },
                  ],
                  next: { kind: 'complete' },
                },
              ],
            },
          },
        },
      },
    },
  ]
  const booted = await bootScenario(host, { first })
  await advance(
    host,
    () => state().world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at.kind === 'completed',
  )
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  await key(host, 'F5')
  for (let frame = 0; frame < 20 && !(await store.getPayload('quick')); frame++) {
    host.frame(100)
    await drain()
    await host.settleIO()
  }
  const saved = await store.getPayload('quick')
  expect(saved?.world.money).toBe(50)
  await key(host, 'Enter')
  await advance(host, () => state().entities[0]!.pos.col > 4)
  expect(state().entities[0]!.pos.col).toBeLessThan(12)
  expect(state().world.money).toBe(50)
  await key(host, 'F9')
  for (let frame = 0; frame < 80; frame++) {
    host.frame(100)
    await drain()
    await host.settleIO()
  }
  expect(state().entities[0]!.pos).toEqual(initialPos)
  expect(state().world.money).toBe(50)
  expect(state().world.script?.behaviors.entities?.a?.npc?.auto).toEqual(
    saved?.world.script?.behaviors.entities?.a?.npc?.auto,
  )
  expect(await store.getPayload('quick')).toEqual(saved)
  booted.assertInputUnchanged()
})

function departure(kind: 'stages' | 'stateMachine', explicitCompletion = false): AuthorScriptFlow {
  const body: AuthorCommand[] = [
    { kind: 'moveEntity', target, to: endpoint, speed: 'slow' },
    { kind: 'giveMoney', delta: 7 },
    { kind: 'setEntityState', target, state: 0 },
  ]
  return kind === 'stages'
    ? {
        kind,
        initial: 'depart',
        stages: explicitCompletion
          ? [{ id: 'depart', body, next: { kind: 'complete' } }]
          : [
              { id: 'depart', body, next: 'completed' },
              { id: 'completed', body: [] },
            ],
      }
    : {
        kind,
        machine: {
          id: 'departure',
          label: 'Departure',
          initial: 'depart',
          states: explicitCompletion
            ? { depart: { label: 'Depart', body, next: { kind: 'complete' } } }
            : {
                depart: { label: 'Depart', body, next: { kind: 'advance', state: 'completed' } },
                completed: { label: 'Complete', body: [], next: { kind: 'stay' } },
              },
        },
      }
}

test.each([
  ['stages', false],
  ['stateMachine', false],
  ['stages', true],
  ['stateMachine', true],
] as const)('completed %s auto (explicit completion %s) commits after self state0, permitting real F5/F9 without replay', async (kind, explicitCompletion) => {
  host = await installShellHost()
  const first = shellScene('a')
  first.entities = [
    {
      id: 'npc',
      sprite: 'walker',
      pos: { col: 4, row: 4, height: 0 },
      pages: [{ id: 'normal', label: 'Normal', auto: 'leave' }],
      initialPage: 'normal',
      behaviors: {
        auto: { leave: { label: 'Leave', order: 0, flow: departure(kind, explicitCompletion) } },
      },
    },
  ]
  const booted = await bootScenario(host, { first })
  await advance(host, () => state().world.script?.entityState.a?.npc === 0)
  expect(state().world.money).toBe(57)
  expect(state().entities[0]?.pos).toEqual(endpoint)
  expect(state().entities[0]?.hidden).toBe(true)
  const cursor = explicitCompletion
    ? { kind: 'completed' }
    : kind === 'stages'
      ? { kind: 'stage', stage: 'completed' }
      : { kind: 'state', machine: 'departure', state: 'completed' }
  await advance(
    host,
    () => state().world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at?.kind === cursor.kind,
  )
  expect(state().world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at).toEqual(cursor)

  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  await key(host, 'F5')
  for (let frame = 0; frame < 40 && !(await store.getPayload('quick')); frame++) {
    host.frame(100)
    await drain()
    await host.settleIO()
  }
  const payload = await store.getPayload('quick')
  expect(payload).not.toBeNull()
  expect(payload?.world.money).toBe(57)
  expect(payload?.world.script?.entityPos?.a?.npc).toEqual(endpoint)
  expect(payload?.world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at).toEqual(cursor)
  await key(host, 'F9')
  for (let frame = 0; frame < 12; frame++) {
    host.frame(100)
    await drain()
    await host.settleIO()
  }
  expect(state().world.money).toBe(57)
  expect(state().entities[0]?.hidden).toBe(true)
  expect(state().world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at).toEqual(cursor)
  booted.assertInputUnchanged()
})
