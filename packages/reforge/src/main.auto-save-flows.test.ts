// @vitest-environment jsdom
import {
  type AuthorCommand,
  type AuthorScriptFlow,
  gridToPixel,
  validateAuthorScenes,
} from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import inn from '../../../projects/pal/content/scenes/s003.json' with { type: 'json' }
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
  vi.useRealTimers()
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
  await advance(host, () => {
    const at = state().world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at
    return at?.kind === 'state' && at.state === 'second'
  })
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

test.each([
  'stepEntity',
  'chasePlayer',
] as const)('the ordinary save menu snapshots a queued auto %s without waiting for a frozen world tick', async (kind) => {
  host = await installShellHost()
  const first = shellScene('a')
  first.entities = [
    {
      id: 'npc',
      sprite: 'walker',
      pos: { col: 4, row: 4, height: 0 },
      pages: [{ id: 'normal', label: 'Normal', auto: 'move' }],
      initialPage: 'normal',
      behaviors: {
        auto: {
          move: {
            label: 'Move',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'first',
              stages: [
                {
                  id: 'first',
                  body: [
                    kind === 'stepEntity' ? { kind, target, dir: 'right' } : { kind, range: 8 },
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
  await drain()
  await key(host, 'Escape', 1)
  expect(state().renderDebug.menuActive).toBe(true)
  const initial = structuredClone(state().entities[0]!.pos)
  for (const value of ['ArrowUp', 'Enter', 'Enter', 'ArrowDown', 'ArrowDown', 'Enter'])
    await key(host, value)
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  for (let turn = 0; turn < 20 && !(await store.getPayload('m01')); turn++) {
    await drain()
    await host.settleIO()
  }
  const saved = await store.getPayload('m01')
  expect(saved).not.toBeNull()
  expect(saved?.world.money).toBe(50)
  expect(saved?.world.script?.entityPos?.a?.npc).toEqual(initial)
  expect(saved?.world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.resume?.frames).toEqual([
    { index: 0 },
  ])
  booted.assertInputUnchanged()
})

test.each([
  'stepEntity',
  'chasePlayer',
] as const)('a committed auto %s is saved before its deferred ack and never applies its relative movement twice after F9', async (kind) => {
  host = await installShellHost()
  const first = shellScene('a')
  first.entities = [
    {
      id: 'npc',
      sprite: 'walker',
      pos: { col: 4, row: 4, height: 0 },
      pages: [{ id: 'normal', label: 'Normal', auto: 'move' }],
      initialPage: 'normal',
      behaviors: {
        auto: {
          move: {
            label: 'Move',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'first',
              stages: [
                {
                  id: 'first',
                  body: [
                    kind === 'stepEntity' ? { kind, target, dir: 'right' } : { kind, range: 8 },
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
  await drain()
  host.frame(100)
  const committed = structuredClone(state().entities[0]!.pos)
  expect(committed).not.toEqual({ col: 4, row: 4, height: 0 })
  // Do not settle the timeout-based motion ack before requesting this real snapshot.
  await key(host, 'F5', 1)
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  for (let turn = 0; turn < 20 && !(await store.getPayload('quick')); turn++) {
    await drain()
    await host.settleIO()
  }
  const saved = await store.getPayload('quick')
  expect(saved?.world.money).toBe(50)
  expect(saved?.world.script?.entityPos?.a?.npc).toEqual(committed)
  expect(saved?.world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.resume?.frames).toEqual([
    { index: 0, control: { kind: 'leaf', command: kind, phase: 'continuation' } },
  ])
  await key(host, 'F9', 1)
  for (let turn = 0; turn < 10; turn++) {
    await drain()
    await host.settleIO()
  }
  await advance(
    host,
    () => state().world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at.kind === 'completed',
  )
  expect(state().entities[0]!.pos).toEqual(committed)
  expect(state().world.money).toBe(57)
  booted.assertInputUnchanged()
})

test.each([
  'owner',
  'target',
] as const)('a committed cross-target auto step suspended at its %s is immediately saveable and resumes without a second step', async (who) => {
  host = await installShellHost()
  const first = shellScene('a')
  const paused = { scene: 'a', entity: who === 'owner' ? 'owner' : 'npc' }
  first.entities = [
    { id: 'npc', sprite: 'walker', pos: { col: 4, row: 4, height: 0 } },
    {
      id: 'owner',
      sprite: 'walker',
      pos: { col: 8, row: 8, height: 0 },
      pages: [{ id: 'normal', label: 'Normal', auto: 'move' }],
      initialPage: 'normal',
      behaviors: {
        auto: {
          move: {
            label: 'Move target',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'first',
              stages: [
                {
                  id: 'first',
                  body: [
                    { kind: 'stepEntity', target, dir: 'right' },
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
    {
      id: 'switch',
      sprite: 'walker',
      pos: { col: 2, row: 3, height: 0 },
      pages: [
        {
          id: 'normal',
          label: 'Normal',
          trigger: 'pause',
          triggerActivation: { on: 'interact', range: 2 },
        },
      ],
      initialPage: 'normal',
      behaviors: {
        trigger: {
          pause: {
            label: 'Pause / restore',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'pause',
              stages: [
                {
                  id: 'pause',
                  body: [{ kind: 'suspendEntity', target: paused, ticks: 1_000_000 }],
                  next: 'resume',
                },
                {
                  id: 'resume',
                  body: [{ kind: 'restoreEntity', target: paused }],
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
  await drain()
  host.frame(100)
  const committed = structuredClone(state().entities[0]!.pos)
  expect(committed.col).toBe(4.25)
  await key(host, 'Enter', 1)
  for (let turn = 0; turn < 10; turn++) {
    await drain()
    await host.settleIO()
  }
  expect(state().world.entityLifecycles?.a?.[paused.entity]?.phase).toBe('suspended')
  expect(state().script.running).toBe(false)
  await key(host, 'F5', 1)
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  for (let turn = 0; turn < 20 && !(await store.getPayload('quick')); turn++) {
    await drain()
    await host.settleIO()
  }
  const saved = await store.getPayload('quick')
  expect(saved?.world.money).toBe(50)
  expect(saved?.world.script?.behaviors.entities?.a?.owner?.auto?.cursor?.resume?.frames).toEqual([
    { index: 0, control: { kind: 'leaf', command: 'stepEntity', phase: 'continuation' } },
  ])
  await key(host, 'F9', 1)
  for (let turn = 0; turn < 10; turn++) {
    await drain()
    await host.settleIO()
  }
  expect(state().entities[0]!.pos).toEqual(committed)
  expect(state().world.money).toBe(50)
  await key(host, 'Enter', 1)
  await advance(
    host,
    () => state().world.script?.behaviors.entities?.a?.owner?.auto?.cursor?.at.kind === 'completed',
  )
  expect(state().entities[0]!.pos).toEqual(committed)
  expect(state().world.money).toBe(57)
  booted.assertInputUnchanged()
})

test('a completed chase-trigger interaction is saved during its pacing wait and never rewards twice after F9', async () => {
  host = await installShellHost()
  const first = shellScene('a')
  first.entities = [
    {
      id: 'npc',
      sprite: 'walker',
      pos: { col: 3, row: 2, height: 0 },
      pages: [
        {
          id: 'normal',
          label: 'Normal',
          auto: 'chase',
          trigger: 'greet',
          triggerActivation: { on: 'interact', range: 1 },
        },
      ],
      initialPage: 'normal',
      behaviors: {
        auto: {
          chase: {
            label: 'Chase once',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'first',
              stages: [
                {
                  id: 'first',
                  body: [{ kind: 'chasePlayer' }, { kind: 'giveMoney', delta: 7 }],
                  next: { kind: 'complete' },
                },
              ],
            },
          },
        },
        trigger: {
          greet: {
            label: 'Greet',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'first',
              stages: [{ id: 'first', body: [{ kind: 'giveMoney', delta: 5 }] }],
            },
          },
        },
      },
    },
  ]
  const booted = await bootScenario(host, { first })
  await advance(
    host,
    () =>
      state().world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.resume?.frames[0]?.control
        ?.kind === 'leaf',
  )
  expect(state().world.money).toBe(55)
  expect(state().script.running).toBe(false)
  await key(host, 'F5', 1)
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  for (let turn = 0; turn < 20 && !(await store.getPayload('quick')); turn++) {
    await drain()
    await host.settleIO()
  }
  const saved = await store.getPayload('quick')
  expect(saved?.world.money).toBe(55)
  expect(saved?.world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.resume?.frames).toEqual([
    { index: 0, control: { kind: 'leaf', command: 'chasePlayer', phase: 'done' } },
  ])
  await key(host, 'F9', 1)
  for (let turn = 0; turn < 10; turn++) {
    await drain()
    await host.settleIO()
  }
  await advance(
    host,
    () => state().world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at.kind === 'completed',
  )
  expect(state().world.money).toBe(62)
  booted.assertInputUnchanged()
})

test('a chase terminal held by the manual-save menu remains pending in the real slot and fires once after restoring that slot', async () => {
  host = await installShellHost()
  const first = shellScene('a')
  first.entities = [
    {
      id: 'npc',
      sprite: 'walker',
      pos: { col: 3, row: 2, height: 0 },
      pages: [
        {
          id: 'normal',
          label: 'Normal',
          auto: 'chase',
          trigger: 'greet',
          triggerActivation: { on: 'interact', range: 1 },
        },
      ],
      initialPage: 'normal',
      behaviors: {
        auto: {
          chase: {
            label: 'Chase once',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'first',
              stages: [
                {
                  id: 'first',
                  body: [
                    { kind: 'wait', ms: 200 },
                    { kind: 'chasePlayer' },
                    { kind: 'giveMoney', delta: 7 },
                  ],
                  next: { kind: 'complete' },
                },
              ],
            },
          },
        },
        trigger: {
          greet: {
            label: 'Greet',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'first',
              stages: [{ id: 'first', body: [{ kind: 'giveMoney', delta: 5 }] }],
            },
          },
        },
      },
    },
  ]
  const booted = await bootScenario(host, { first })
  await drain()
  await key(host, 'Escape', 1)
  for (const value of ['ArrowUp', 'Enter', 'Enter', 'ArrowDown', 'ArrowDown', 'Enter'])
    await key(host, value)
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  for (let turn = 0; turn < 20 && !(await store.getPayload('m01')); turn++) {
    await drain()
    await host.settleIO()
  }
  const saved = await store.getPayload('m01')
  expect(saved?.world.money).toBe(50)
  expect(saved?.world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.resume?.frames).toEqual([
    { index: 1 },
  ])
  for (let layer = 0; layer < 4 && state().renderDebug.menuActive; layer++)
    await key(host, 'Escape', 1)
  await advance(
    host,
    () => state().world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at.kind === 'completed',
  )
  expect(state().world.money).toBe(62)
  // Hub remembers system, system remembers save, and the only populated browser slot is m01.
  for (const value of ['Escape', 'Enter', 'ArrowDown', 'Enter', 'Enter']) await key(host, value, 1)
  for (let turn = 0; turn < 20; turn++) {
    await drain()
    await host.settleIO()
  }
  expect(state().renderDebug.menuActive).toBe(false)
  await advance(
    host,
    () => state().world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at.kind === 'completed',
  )
  expect(state().world.money).toBe(62)
  expect(await store.getPayload('m01')).toEqual(saved)
  booted.assertInputUnchanged()
})

/** Actual authored flow, translated into the legal small shell fixture; no business module mock. */
function auntRouteScene(startWithRoute = true) {
  const aunt = validateAuthorScenes([structuredClone(inn)])[0]!.entities.find(
    (entity) => entity.id === 'e56',
  )!
  const route = structuredClone(aunt.behaviors!.auto!['legacy-006']!.flow)
  if (route.kind !== 'stages') throw new Error('actual aunt route must use ordinary steps')
  for (const stage of route.stages)
    for (const command of stage.body) {
      if (
        command.kind !== 'moveEntity' &&
        command.kind !== 'setEntityTriggerActivation' &&
        command.kind !== 'selectEntityBehavior'
      )
        throw new Error(`unexpected aunt route command: ${command.kind}`)
      command.target = target
      if (command.kind === 'moveEntity')
        command.to = { ...command.to, col: command.to.col - 120, row: command.to.row - 41 }
    }
  const idle: AuthorScriptFlow = {
    kind: 'stages',
    initial: 'idle',
    stages: [{ id: 'idle', body: [], next: { kind: 'complete' } }],
  }
  const first = shellScene('a')
  first.entities = [
    {
      id: 'npc',
      sprite: 'walker',
      pos: { col: aunt.pos.col - 120, row: aunt.pos.row - 41, height: aunt.pos.height },
      pages: [
        {
          id: 'normal',
          label: 'Normal',
          auto: startWithRoute ? 'route' : 'idle',
          trigger: 'before',
          triggerActivation: { on: 'interact', range: 2 },
        },
      ],
      initialPage: 'normal',
      behaviors: {
        auto: {
          idle: { label: 'Idle', order: 0, flow: idle },
          route: { label: 'Actual aunt route', order: 1, flow: route },
        },
        trigger: {
          before: { label: 'Before arrival', order: 0, flow: idle },
          'greet-after-guests': { label: 'After arrival', order: 1, flow: idle },
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
  return first
}

test.each([
  'first-target',
  'stairs',
] as const)('F5 during the actual one-step aunt route at %s captures the in-flight pose immediately, and F9 resumes that command', async (phase) => {
  host = await installShellHost()
  const booted = await bootScenario(host, { first: auntRouteScene() })
  await advance(host, () => {
    const position = state().entities[0]!.pos
    return phase === 'first-target'
      ? position.col < 4 && position.col > 1
      : position.col > 2 && position.col < 11 && position.row > 8
  })
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  await key(host, 'F5')
  const capturedPose = structuredClone(state().entities[0]!.pos)
  for (let turn = 0; turn < 10 && !(await store.getPayload('quick')); turn++) {
    await drain()
    await host.settleIO()
  }
  const saved = await store.getPayload('quick')
  expect(saved).not.toBeNull()
  expect(saved?.world.script?.entityPos?.a?.npc).toEqual(capturedPose)
  expect(saved?.world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at).toEqual({
    kind: 'stage',
    stage: 'leave-reception',
  })
  expect(saved?.world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.resume?.frames).toEqual([
    { index: phase === 'first-target' ? 1 : 4 },
  ])
  expect(saved?.world.script?.behaviors.entities?.a?.npc?.trigger?.selection).toBeUndefined()
  await key(host, 'F9')
  for (let turn = 0; turn < 10; turn++) {
    await drain()
    await host.settleIO()
  }
  expect(state().entities[0]!.pos).toEqual(capturedPose)
  for (let frame = 0; frame < 3; frame++) {
    host.frame(100)
    await drain()
    const position = state().entities[0]!.pos
    if (phase === 'first-target') expect(position.col).toBeLessThanOrEqual(capturedPose.col)
    else {
      expect(position.col).toBeGreaterThanOrEqual(capturedPose.col)
      expect(position.row).toBeGreaterThanOrEqual(capturedPose.row)
    }
  }
  await advance(
    host,
    () => state().world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at.kind === 'completed',
    160,
  )
  expect(state().entities[0]!.pos).toEqual({ col: 17, row: 25, height: 0 })
  expect(state().world.money).toBe(50)
  expect(state().world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at).toEqual({
    kind: 'completed',
  })
  expect(state().world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.resume).toBeUndefined()
  expect(state().world.script?.behaviors.entities?.a?.npc?.trigger?.selection).toEqual({
    kind: 'use',
    value: 'greet-after-guests',
  })
  expect(await store.getPayload('quick')).toEqual(saved)
  booted.assertInputUnchanged()
})

test('F9 during the actual aunt multi-command route cancels every remaining move and final trigger switch', async () => {
  host = await installShellHost()
  const first = auntRouteScene(false)
  const initialPos = structuredClone(first.entities[0]!.pos)
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
  expect(saved).not.toBeNull()
  await key(host, 'Enter')
  await advance(host, () => state().entities[0]!.pos.col > 2 && state().entities[0]!.pos.row > 8)
  expect(state().entities[0]!.pos.row).toBeLessThan(25)
  await key(host, 'F9')
  for (let frame = 0; frame < 140; frame++) {
    host.frame(100)
    await drain()
    await host.settleIO()
  }
  expect(state().entities[0]!.pos).toEqual(initialPos)
  expect(state().world.money).toBe(50)
  expect(state().world.script?.behaviors.entities?.a?.npc).toEqual(
    saved?.world.script?.behaviors.entities?.a?.npc,
  )
  expect(await store.getPayload('quick')).toEqual(saved)
  booted.assertInputUnchanged()
})

test('a real diagonal target leg saves without waiting for its endpoint and resumes without reward replay after F9', async () => {
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
  const capturedPose = structuredClone(state().entities[0]!.pos)
  for (let turn = 0; turn < 10 && !(await store.getPayload('quick')); turn++) {
    await drain()
    await host.settleIO()
  }
  const saved = await store.getPayload('quick')
  expect(saved?.world.script?.entityPos?.a?.npc).toEqual(capturedPose)
  expect(saved?.world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at).toEqual({
    kind: 'stage',
    stage: 'first',
  })
  expect(saved?.world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.resume?.frames).toEqual([
    { index: 0 },
  ])
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
    () =>
      JSON.stringify(state().world.script?.behaviors.entities?.a?.npc?.auto?.cursor?.at) ===
      JSON.stringify(cursor),
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
