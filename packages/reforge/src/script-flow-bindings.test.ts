import {
  type BaseSceneDef,
  type BaseSceneEntityDef,
  type BaseScriptFlow,
  emptyWorldScriptState,
  validateBaseScenes,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import { expectDefined } from './defined.js'
import {
  assertFlowCursor,
  initialFlowCursor,
  resolveBaseEntityPage,
  resolveEntityBehavior,
  resolveEntityTriggerActivation,
  resolveSceneHook,
  selectBaseEntityPage,
  selectBaseSceneHooks,
  selectEntityBehavior,
  setEntityTriggerActivation,
} from './script-flow-bindings.js'
import { FlowRuntimeCoordinator, type PersistentFlowOwner } from './script-world.js'

const target = { scene: 'village', entity: 'keeper' }
const triggerOwner: PersistentFlowOwner = { kind: 'entity-behavior', target, channel: 'trigger' }
const autoOwner: PersistentFlowOwner = { kind: 'entity-behavior', target, channel: 'auto' }
const talkStart = { kind: 'stage', stage: 'greet' } as const
const inspectionStart = { kind: 'stage', stage: 'inspect' } as const
const completed = { kind: 'completed' } as const

function oneStage(initial: string): BaseScriptFlow {
  return { kind: 'stages', initial, stages: [{ id: initial, body: [] }] }
}

function fixture() {
  const talk = oneStage('greet')
  const inspection: BaseScriptFlow = {
    kind: 'stages',
    initial: 'inspect',
    stages: [
      { id: 'inspect', body: [], next: 'finish' },
      { id: 'finish', body: [], next: { kind: 'complete' } },
    ],
  }
  const entity: BaseSceneEntityDef = {
    id: target.entity,
    pos: { col: 1, row: 2, height: 0 },
    zone: true,
    initialPage: 'welcome',
    behaviors: {
      trigger: {
        talk: { label: 'Talk', order: 0, flow: talk },
        inspect: { label: 'Inspect', order: 1, flow: inspection },
      },
      auto: {
        idle: { label: 'Idle', order: 0, flow: oneStage('idle') },
        patrol: { label: 'Patrol', order: 1, flow: oneStage('patrol') },
      },
    },
    pages: [
      {
        id: 'welcome',
        label: 'Welcome',
        trigger: 'talk',
        auto: 'idle',
        triggerActivation: { on: 'interact', range: 1 },
        animation: { sprite: 'keeper', action: 'idle', loop: true },
      },
      {
        id: 'search',
        label: 'Search',
        trigger: 'inspect',
        auto: 'idle',
        triggerActivation: { on: 'touch', range: 0 },
        animation: { sprite: 'keeper', action: 'walk', loop: true },
      },
      { id: 'search-patrol', label: 'Patrol', trigger: 'inspect', auto: 'patrol' },
    ],
  }
  const scene: BaseSceneDef = {
    id: target.scene,
    mapId: 'map.root',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [entity],
    hooks: {
      onEnter: {
        initial: 'welcome',
        variants: {
          welcome: { label: 'Welcome', order: 0, flow: oneStage('arrival') },
          quiet: { label: 'Quiet', order: 1, flow: oneStage('quiet-arrival') },
        },
      },
      onTeleport: {
        initial: 'depart',
        variants: { depart: { label: 'Depart', order: 0, flow: oneStage('exit') } },
      },
    },
  }
  validateBaseScenes([scene])
  return { talk, inspection, entity, scene, world: emptyWorldScriptState() }
}

test('a page change clears overrides and keeps only the cursor for the unchanged behavior', () => {
  const { entity, world } = fixture()
  world.behaviors.entities = {
    village: {
      keeper: {
        trigger: {
          selection: { kind: 'use', value: 'talk' },
          cursor: { behavior: 'talk', at: talkStart },
        },
        auto: {
          selection: { kind: 'use', value: 'idle' },
          cursor: { behavior: 'idle', at: { kind: 'stage', stage: 'idle' } },
        },
        triggerActivation: { kind: 'disabled' },
      },
    },
  }
  const coordinator = new FlowRuntimeCoordinator()
  expect(
    selectBaseEntityPage(world, entity, target, { kind: 'use', value: 'search' }, coordinator),
  ).toEqual({
    previousPage: 'welcome',
    page: 'search',
    triggerChanged: true,
    autoChanged: false,
    animationChanged: true,
  })
  expect(world.behaviors.entities.village?.keeper).toEqual({
    page: 'search',
    trigger: {},
    auto: { cursor: { behavior: 'idle', at: { kind: 'stage', stage: 'idle' } } },
  })
  expect(coordinator.epoch(triggerOwner)).toBe(1)
  expect(coordinator.epoch(autoOwner)).toBe(0)
})

test('inheriting the initial page follows a later authored default', () => {
  const { entity, world } = fixture()
  selectBaseEntityPage(world, entity, target, { kind: 'use', value: 'search' })
  selectBaseEntityPage(world, entity, target, { kind: 'inherit' })
  const binding = world.behaviors.entities?.village?.keeper
  expect(binding?.page).toBeUndefined()
  expect(resolveBaseEntityPage(entity, binding)?.id).toBe('welcome')
  entity.initialPage = 'search'
  expect(resolveBaseEntityPage(entity, binding)?.id).toBe('search')
})

test('a page change invalidates only the lease for its changed automatic behavior', async () => {
  const { entity, world } = fixture()
  const coordinator = new FlowRuntimeCoordinator()
  selectBaseEntityPage(world, entity, target, { kind: 'use', value: 'search' }, coordinator)
  const trigger = expectDefined(coordinator.beginEntityBehavior(world, entity, target, 'trigger'))
  const auto = expectDefined(coordinator.beginEntityBehavior(world, entity, target, 'auto'))

  selectBaseEntityPage(world, entity, target, { kind: 'use', value: 'search-patrol' }, coordinator)
  expect(await auto.lease.reachSafePoint({ kind: 'stage', stage: 'idle' })).toBe('stop')
  expect(await trigger.lease.reachSafePoint({ kind: 'stage', stage: 'finish' })).toBe('continue')
  expect(world.behaviors.entities?.village?.keeper?.auto?.cursor).toBeUndefined()
  expect(world.behaviors.entities?.village?.keeper?.trigger?.cursor).toEqual({
    behavior: 'inspect',
    at: { kind: 'stage', stage: 'finish' },
  })
  trigger.lease.close()
})

test('inheriting a page leaves an entity without authored pages unbound', () => {
  const entity: BaseSceneEntityDef = {
    id: target.entity,
    pos: { col: 0, row: 0, height: 0 },
    zone: true,
  }
  const world = emptyWorldScriptState()
  expect(resolveBaseEntityPage(entity)).toBeUndefined()
  expect(selectBaseEntityPage(world, entity, target, { kind: 'inherit' })).toEqual({
    triggerChanged: false,
    autoChanged: false,
    animationChanged: false,
  })
})

test('an initial page must name an authored page', () => {
  const { entity } = fixture()
  entity.initialPage = 'unknown'
  expect(() => resolveBaseEntityPage(entity)).toThrow('entity keeper: page 不存在 unknown')
})

test('an inherited or explicit behavior must name an authored definition', () => {
  const { entity, world } = fixture()
  expect(() =>
    selectEntityBehavior(world, entity, target, 'trigger', { kind: 'use', value: 'unknown' }),
  ).toThrow('entity keeper: trigger behavior 不存在 unknown')
  expectDefined(entity.pages?.[0]).trigger = 'unknown'
  expect(() => selectEntityBehavior(world, entity, target, 'trigger', { kind: 'inherit' })).toThrow(
    'entity keeper: trigger behavior 不存在 unknown',
  )
  expect(world.behaviors.entities).toBeUndefined()
})

test('a single behavior selection starts at its own step and preserves the other channel', () => {
  const { entity, world } = fixture()
  const coordinator = new FlowRuntimeCoordinator()
  const selection = { kind: 'use', value: 'inspect' } as const
  expect(selectEntityBehavior(world, entity, target, 'trigger', selection, coordinator)).toBe(true)
  expect(resolveEntityBehavior(entity, world, target, 'trigger')).toMatchObject({
    behaviorId: 'inspect',
    cursor: inspectionStart,
  })
  expect(resolveEntityBehavior(entity, world, target, 'auto')?.behaviorId).toBe('idle')
  expect(selectEntityBehavior(world, entity, target, 'trigger', selection, coordinator)).toBe(false)
  expect(coordinator.epoch(triggerOwner)).toBe(1)
  expect(coordinator.epoch(autoOwner)).toBe(0)
})

test('inheriting a behavior clears its override and starts the authored default', () => {
  const { entity, world } = fixture()
  selectEntityBehavior(world, entity, target, 'trigger', { kind: 'use', value: 'inspect' })
  expect(selectEntityBehavior(world, entity, target, 'trigger', { kind: 'inherit' })).toBe(true)
  expect(world.behaviors.entities?.village?.keeper?.trigger?.selection).toBeUndefined()
  expect(resolveEntityBehavior(entity, world, target, 'trigger')).toMatchObject({
    behaviorId: 'talk',
    cursor: talkStart,
  })
  expect(selectEntityBehavior(world, entity, target, 'trigger', { kind: 'inherit' })).toBe(false)
})

test('a behavior cannot use an address for another entity', () => {
  const { entity, world } = fixture()
  expect(() =>
    resolveEntityBehavior(entity, world, { ...target, entity: 'neighbor' }, 'trigger'),
  ).toThrow('entity address neighbor 与定义 keeper 不匹配')
})

test('clearing a trigger activation override follows the selected page', () => {
  const { entity, world } = fixture()
  selectBaseEntityPage(world, entity, target, { kind: 'use', value: 'search' })
  setEntityTriggerActivation(world, entity, target, { kind: 'disabled' })
  expect(resolveEntityTriggerActivation(entity, world, target)).toBeUndefined()
  setEntityTriggerActivation(world, entity, target, { kind: 'inherit' })
  expect(resolveEntityTriggerActivation(entity, world, target)).toEqual({ on: 'touch', range: 0 })
  expect(world.behaviors.entities?.village?.keeper?.triggerActivation).toBeUndefined()
})

test('trigger activation rejects a negative range before accepting the same action at zero', () => {
  const { entity, world } = fixture()
  expect(() =>
    setEntityTriggerActivation(world, entity, target, {
      kind: 'use',
      value: { on: 'touch', range: -1 },
    }),
  ).toThrow('trigger activation.range: 期望非负有限数')
  expect(world.behaviors.entities).toBeUndefined()
  setEntityTriggerActivation(world, entity, target, {
    kind: 'use',
    value: { on: 'touch', range: 0 },
  })
  expect(resolveEntityTriggerActivation(entity, world, target)).toEqual({ on: 'touch', range: 0 })
})

test('hook selection validates both slots before changing either one', () => {
  const { scene, world } = fixture()
  expect(() => selectBaseSceneHooks(world, scene, {})).toThrow('至少需要一个 own slot')
  expect(() =>
    selectBaseSceneHooks(world, scene, {
      onEnter: { kind: 'use', value: 'quiet' },
      onTeleport: { kind: 'use', value: 'unknown' },
    }),
  ).toThrow('onTeleport hook 不存在 unknown')
  expect(world.behaviors.scenes).toBeUndefined()

  expect(
    selectBaseSceneHooks(world, scene, {
      onEnter: { kind: 'use', value: 'quiet' },
      onTeleport: { kind: 'disabled' },
    }),
  ).toEqual({ onEnter: true, onTeleport: true })
  expect(resolveSceneHook(scene, world, 'onEnter')?.hookId).toBe('quiet')
  expect(resolveSceneHook(scene, world, 'onTeleport')).toBeUndefined()
})

test('an unmentioned hook slot is untouched and an undeclared hook cannot run', () => {
  const { scene, world } = fixture()
  expect(resolveSceneHook(scene, world, 'onEnter')?.hookId).toBe('welcome')
  expect(
    selectBaseSceneHooks(world, scene, {
      onEnter: { kind: 'use', value: 'welcome' },
      onTeleport: undefined,
    }),
  ).toEqual({ onEnter: false, onTeleport: false })
  expect(resolveSceneHook(scene, world, 'onTeleport')?.hookId).toBe('depart')
  Reflect.deleteProperty(expectDefined(scene.hooks), 'onTeleport')
  expect(resolveSceneHook(scene, world, 'onTeleport')).toBeUndefined()
})

test('inheriting the same hook preserves its cursor and lease epoch', async () => {
  const { scene, world } = fixture()
  const coordinator = new FlowRuntimeCoordinator()
  const onEnter: PersistentFlowOwner = { kind: 'scene-hook', scene: scene.id, slot: 'onEnter' }
  selectBaseSceneHooks(world, scene, { onEnter: { kind: 'use', value: 'welcome' } }, coordinator)
  const lease = expectDefined(coordinator.beginSceneHook(world, scene, 'onEnter')).lease
  const cursor = { kind: 'stage', stage: 'arrival' } as const
  expect(await lease.reachSafePoint(cursor)).toBe('continue')
  lease.close()

  expect(selectBaseSceneHooks(world, scene, { onEnter: { kind: 'inherit' } }, coordinator)).toEqual(
    {
      onEnter: false,
      onTeleport: false,
    },
  )
  expect(world.behaviors.scenes?.village?.onEnter).toEqual({
    cursor: { hook: 'welcome', at: cursor },
  })
  expect(coordinator.epoch(onEnter)).toBe(0)
})

test('only steps and completion declared by the bound flow are valid cursors', () => {
  const { talk, inspection } = fixture()
  expect(initialFlowCursor(talk)).toEqual(talkStart)
  expect(initialFlowCursor(inspection)).toEqual(inspectionStart)
  expect(() => assertFlowCursor(talk, { kind: 'stage', stage: 'unknown' })).toThrow(
    'stage cursor 不存在 unknown',
  )
  expect(() => assertFlowCursor(inspection, talkStart)).toThrow('stage cursor 不存在 greet')
  expect(() => assertFlowCursor(talk, completed)).toThrow('flow 未声明 complete')
  expect(() => assertFlowCursor(talk, talkStart)).not.toThrow()
  expect(() => assertFlowCursor(inspection, { kind: 'stage', stage: 'finish' })).not.toThrow()
  expect(() => assertFlowCursor(inspection, completed)).not.toThrow()
})

test('completion preserves the binding until an effective selection change resets it', async () => {
  const { entity, world } = fixture()
  const notifications: PersistentFlowOwner[] = []
  const coordinator = new FlowRuntimeCoordinator((owner) => notifications.push(owner))
  selectEntityBehavior(
    world,
    entity,
    target,
    'trigger',
    { kind: 'use', value: 'inspect' },
    coordinator,
  )
  const { lease } = expectDefined(coordinator.beginEntityBehavior(world, entity, target, 'trigger'))
  expect(await lease.reachSafePoint(completed)).toBe('continue')
  lease.close()

  expect(notifications).toEqual([triggerOwner])
  expect(coordinator.beginEntityBehavior(world, entity, target, 'trigger')).toBeUndefined()
  selectBaseEntityPage(world, entity, target, { kind: 'use', value: 'search' }, coordinator)
  expect(resolveEntityBehavior(entity, world, target, 'trigger')).toMatchObject({
    behaviorId: 'inspect',
    cursor: completed,
  })
  selectEntityBehavior(world, entity, target, 'trigger', { kind: 'disabled' }, coordinator)
  selectEntityBehavior(world, entity, target, 'trigger', { kind: 'inherit' }, coordinator)
  expect(resolveEntityBehavior(entity, world, target, 'trigger')?.cursor).toEqual(inspectionStart)
})

test('a replaced behavior cannot commit a late cursor or report completion', async () => {
  const { entity, world } = fixture()
  const notifications: PersistentFlowOwner[] = []
  const coordinator = new FlowRuntimeCoordinator((owner) => notifications.push(owner))
  selectBaseEntityPage(world, entity, target, { kind: 'use', value: 'search' }, coordinator)
  const { lease } = expectDefined(coordinator.beginEntityBehavior(world, entity, target, 'trigger'))
  expect(await lease.reachSafePoint({ kind: 'stage', stage: 'finish' })).toBe('continue')
  expect(world.behaviors.entities?.village?.keeper?.trigger?.cursor).toEqual({
    behavior: 'inspect',
    at: { kind: 'stage', stage: 'finish' },
  })

  selectEntityBehavior(
    world,
    entity,
    target,
    'trigger',
    { kind: 'use', value: 'talk' },
    coordinator,
  )
  expect(await lease.reachSafePoint(completed)).toBe('stop')
  expect(world.behaviors.entities?.village?.keeper?.trigger).toEqual({
    selection: { kind: 'use', value: 'talk' },
  })
  expect(resolveEntityBehavior(entity, world, target, 'trigger')?.cursor).toEqual(talkStart)
  expect(notifications).toEqual([])
})
