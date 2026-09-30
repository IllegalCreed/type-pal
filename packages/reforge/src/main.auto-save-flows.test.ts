// @vitest-environment jsdom
import type { AuthorCommand, AuthorScriptFlow } from '@type-pal/content'
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
