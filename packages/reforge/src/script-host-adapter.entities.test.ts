import type { Facing, RuntimeCommand } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  forestEntity,
  recordScriptHost,
  runAdapterCommands,
  villageEntity,
  villageScene,
} from './__tests__/script-host-adapter-fixture.js'
import { expectDefined } from './defined.js'
import {
  compileRuntimeCommandRoot,
  RuntimeSharedScriptResolver,
} from './runtime-script-compiler.js'
import { RuntimeScriptRunner } from './runtime-script-runner.js'
import { compileBaseCommands } from './script-compiler-core.js'
import { executeScriptHostEffect } from './script-host-adapter.js'

test.each([
  { label: 'inherited caller', self: undefined, opened: 'chest' },
  { label: 'explicit caller', self: villageEntity('gate'), opened: 'gate' },
  { label: 'off-scene namesake', self: forestEntity('chest'), opened: undefined },
])('shared poses use the $label within the active scene', async ({ self, opened }) => {
  const poses = new Map<string, { facing: Facing; frame: number }>([
    ['chest', { facing: 'up', frame: 0 }],
    ['gate', { facing: 'left', frame: 0 }],
  ])
  const { host } = recordScriptHost({
    setEntityFacing: (id, facing) => {
      expectDefined(poses.get(id)).facing = facing
    },
    setEntityFrame: (id, frame) => {
      expectDefined(poses.get(id)).frame = frame
    },
  })
  const canonicalContentDigest = 'b'.repeat(64)
  const shared = new RuntimeSharedScriptResolver(
    {
      opening: {
        name: 'Opening',
        self: 'required',
        body: [
          { kind: 'setEntityFacing', target: 'self', facing: 'down' },
          { kind: 'setEntityFrame', target: 'self', frame: 1 },
        ],
      },
    },
    canonicalContentDigest,
  )
  const signal = new AbortController().signal
  const runner = new RuntimeScriptRunner(
    {
      execute: (command, context, abort) => {
        if (command.kind !== 'setEntityFacing' && command.kind !== 'setEntityFrame')
          throw new Error('pose fixture only accepts pose commands')
        return executeScriptHostEffect(host, command, context, abort, villageScene)
      },
      evalCondition: () => false,
      wait: async () => {},
      waitWorldTick: async () => {},
      yieldMacroTask: async () => {},
      confirm: async () => true,
      startBattle: async () => 'victory',
      teleportOut: async () => false,
    },
    signal,
    shared,
  )
  await runner.runFlow(
    compileRuntimeCommandRoot(
      [{ kind: 'callScript', script: 'opening', ...(self ? { self } : {}) }],
      { timing: 'interactive', canonicalContentDigest },
    ),
    {
      self: villageEntity('chest'),
      cursorController: { checkpointEnabled: false, reachSafePoint: () => 'continue' },
    },
  )
  expect([...poses]).toEqual([
    ['chest', opened === 'chest' ? { facing: 'down', frame: 1 } : { facing: 'up', frame: 0 }],
    ['gate', opened === 'gate' ? { facing: 'down', frame: 1 } : { facing: 'left', frame: 0 }],
  ])
})

test('scene-qualified positions, motion and pose commands reach their own entity', async () => {
  const { host, calls } = recordScriptHost()
  const signal = new AbortController().signal
  const pos = { col: 2, row: 3, height: 0 }
  await runAdapterCommands(
    host,
    [
      { kind: 'setEntityPos', target: villageEntity('guide'), pos },
      { kind: 'setEntityPosRelParty', target: villageEntity('guide'), dcol: -1, drow: 2 },
      { kind: 'moveEntity', target: villageEntity('guard'), to: pos, speed: 'fast' },
      { kind: 'stepEntity', target: villageEntity('guard'), dir: 'down' },
      { kind: 'nudgeEntity', target: villageEntity('guard'), dx: 1, dy: -1 },
      { kind: 'animEntity', target: villageEntity('guard') },
      { kind: 'faceEntityToParty', target: villageEntity('guide') },
      { kind: 'setEntityFacing', target: villageEntity('guard'), facing: 'left' },
      { kind: 'setEntityFrame', target: villageEntity('guard'), frame: 5 },
    ],
    { signal },
  )
  expect(calls).toStrictEqual([
    { method: 'setEntityPos', args: ['guide', pos] },
    { method: 'setEntityPosRelParty', args: ['guide', -1, 2] },
    { method: 'moveEntity', args: ['guard', pos, 'fast', signal] },
    { method: 'stepEntity', args: ['guard', 'down'] },
    { method: 'nudgeEntity', args: ['guard', 1, -1] },
    { method: 'animEntity', args: ['guard'] },
    { method: 'faceEntityToParty', args: ['guide'] },
    { method: 'setEntityFacing', args: ['guard', 'left'] },
    { method: 'setEntityFrame', args: ['guard', 5] },
  ])
})

test('a namesake from another scene cannot change the live pose, motion or mounting', async () => {
  const { host, calls } = recordScriptHost()
  const target = forestEntity('guide')
  const pos = { col: 2, row: 2, height: 0 }
  const commands: RuntimeCommand[] = [
    { kind: 'setEntityPos', target, pos },
    { kind: 'setEntityPosRelParty', target, dcol: 1, drow: 0 },
    { kind: 'moveEntity', target, to: pos, speed: 'normal' },
    { kind: 'stepEntity', target, dir: 'down' },
    { kind: 'nudgeEntity', target, dx: 1, dy: 0 },
    { kind: 'animEntity', target },
    { kind: 'faceEntityToParty', target },
    { kind: 'setEntityFacing', target, facing: 'down' },
    { kind: 'setEntityFrame', target, frame: 2 },
    { kind: 'playEntityAction', target, sprite: 'walker', action: 'wave', loop: false },
    { kind: 'stopEntityAction', target, reset: true },
    { kind: 'takeEntity', target },
    { kind: 'releaseEntity', target },
    { kind: 'mountParty', target },
    { kind: 'ride', target, to: pos, speed: 'slow' },
    { kind: 'setEntityState', target, state: 0 },
    { kind: 'setMultiEntityState', targets: [target], state: 1 },
    { kind: 'chasePlayer' },
  ]
  await runAdapterCommands(host, commands, { context: { self: target } })
  expect(calls).toEqual([])
})

test('projecting a batch notifies the live scene once through its first affected entity', async () => {
  const { host, calls } = recordScriptHost()
  await runAdapterCommands(host, [
    { kind: 'setEntityState', target: villageEntity('guide'), state: 7 },
    {
      kind: 'setMultiEntityState',
      targets: [forestEntity('guide'), villageEntity('guide'), villageEntity('guard')],
      state: 2,
    },
  ])
  expect(calls).toStrictEqual([
    { method: 'setEntityState', args: ['guide', 7] },
    { method: 'setEntityState', args: ['guide', 2] },
  ])
})

test('persistence-only changes stay with their world owner', async () => {
  const { host, calls } = recordScriptHost()
  await runAdapterCommands(host, [
    { kind: 'setScreenWave', level: 1, progression: 0 },
    { kind: 'setEntityLayer', target: villageEntity('guide'), layer: 3 },
    { kind: 'setFlag', flag: 'arrived', value: true },
    { kind: 'setVar', var: 'visits', value: 2 },
    { kind: 'addVar', var: 'visits', delta: 3 },
    {
      kind: 'selectEntityBehavior',
      target: villageEntity('guide'),
      channel: 'trigger',
      selection: { kind: 'disabled' },
    },
    { kind: 'selectEntityPage', target: villageEntity('guide'), selection: { kind: 'inherit' } },
    {
      kind: 'setEntityTriggerActivation',
      target: villageEntity('guide'),
      selection: { kind: 'inherit' },
    },
    { kind: 'selectSceneHooks', scene: 'village', selection: { onEnter: { kind: 'disabled' } } },
  ])
  expect(calls).toEqual([])
})

test('an absent optional position port leaves the adapter without a live operation', async () => {
  const { host, calls } = recordScriptHost({ setEntityPos: undefined })
  await runAdapterCommands(host, [
    { kind: 'setEntityPos', target: villageEntity('guide'), pos: { col: 1, row: 2, height: 0 } },
  ])
  expect(calls).toEqual([])
})

test('chase projects the owning entity and preserves both defaults and explicit pacing', async () => {
  const { host, calls } = recordScriptHost()
  const signal = new AbortController().signal
  await runAdapterCommands(
    host,
    [
      { kind: 'chasePlayer' },
      { kind: 'chasePlayer', range: 6, speed: 2, floating: true, worldStep: true },
    ],
    { signal, context: { self: villageEntity('guard') } },
  )
  expect(calls).toStrictEqual([
    { method: 'chaseStep', args: ['guard', 8, 4, false, signal] },
    { method: 'chaseStep', args: ['guard', 6, 2, true, signal, true] },
  ])
})

test('take and release own exactly the selected entity, or release all when unspecified', async () => {
  const { host, calls } = recordScriptHost()
  await runAdapterCommands(host, [
    { kind: 'takeEntity', target: villageEntity('guide') },
    { kind: 'releaseEntity', target: villageEntity('guide') },
    { kind: 'releaseEntity' },
  ])
  expect(calls).toStrictEqual([
    { method: 'takeEntity', args: ['guide'] },
    { method: 'releaseEntity', args: ['guide'] },
    { method: 'releaseEntity', args: [] },
  ])
})

test('mount, ride and unmount project the carrier and validated rider offsets', async () => {
  const { host, calls } = recordScriptHost()
  const signal = new AbortController().signal
  const target = villageEntity('boat')
  const to = { col: 4, row: 3, height: 0 }
  await runAdapterCommands(
    host,
    [
      { kind: 'mountParty', target },
      { kind: 'mountParty', target, dx: 1 },
      {
        kind: 'mountParty',
        target,
        dx: 2,
        dy: -1,
        riders: [
          { target: villageEntity('guide'), dx: 3 },
          { target: villageEntity('guard'), dy: 2 },
        ],
      },
      { kind: 'ride', target, to, speed: 'slow' },
      { kind: 'unmountParty' },
    ],
    { signal },
  )
  expect(calls).toStrictEqual([
    { method: 'mountParty', args: ['boat', 0, 0] },
    { method: 'mountParty', args: ['boat', 1, 0] },
    {
      method: 'mountParty',
      args: [
        'boat',
        2,
        -1,
        [
          { id: 'guide', dx: 3, dy: 0 },
          { id: 'guard', dx: 0, dy: 2 },
        ],
      ],
    },
    { method: 'ride', args: ['boat', to, 'slow', signal] },
    { method: 'unmountParty', args: [] },
  ])
})

test('the base command adapter retains the explicit or caller-owned visibility target', async () => {
  const { host, calls } = recordScriptHost()
  const signal = new AbortController().signal
  const context = { self: villageEntity('guide') }
  const compiled = compileBaseCommands(
    [
      { kind: 'vanishEntity', target: villageEntity('guard'), seconds: 5 },
      { kind: 'vanishEntity' },
      { kind: 'vanishEntity', target: forestEntity('guard'), seconds: 5 },
    ],
    'interactive',
  )
  for (const node of compiled) {
    if (node.kind !== 'leaf') throw new Error('visibility requires a compiled leaf')
    await executeScriptHostEffect(host, node.command, context, signal, villageScene)
  }
  expect(calls).toStrictEqual([
    { method: 'vanishEntity', args: ['guard', 5] },
    { method: 'vanishEntity', args: ['guide', 2] },
  ])
})
