import {
  type BaseSceneDef,
  type BaseSceneEntity,
  type CursorHandoff,
  type EntityAddress,
  emptyWorldScriptState,
  type FlowCursor,
} from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import {
  evalAuthorCondition,
  FlowRuntimeCoordinator,
  resolveBaseEntityPage,
  resolveEntityBehavior,
  resolveSceneHook,
  selectBaseEntityPage,
  selectBaseSceneHooks,
  selectEntityBehavior,
  setEntityTriggerActivation,
} from './script-world.js'

const target: EntityAddress = { scene: 'scene', entity: 'entity' }

function entity(): BaseSceneEntity {
  return {
    id: 'entity',
    pos: { col: 1, row: 2, height: 0 },
    initialPage: 'default',
    behaviors: {
      trigger: {
        talk: {
          label: '对话',
          order: 0,
          flow: {
            kind: 'stages',
            initial: 'initial',
            stages: [
              { id: 'initial', body: [] },
              { id: 'waiting', body: [] },
            ],
          },
        },
        inspect: {
          label: '调查',
          order: 1,
          flow: {
            kind: 'stages',
            initial: 'initial',
            stages: [
              { id: 'initial', body: [], next: 'later' },
              { id: 'later', body: [] },
            ],
          },
        },
      },
      auto: {
        idle: {
          label: '待机',
          order: 0,
          flow: {
            kind: 'stateMachine',
            machine: {
              id: 'machine',
              label: '待机',
              initial: 'initial',
              states: {
                initial: {
                  label: '初始',
                  body: [],
                  next: { kind: 'stay' },
                },
              },
            },
          },
        },
      },
    },
    pages: [
      {
        id: 'default',
        label: '默认',
        trigger: 'talk',
        auto: 'idle',
        triggerActivation: { on: 'interact', range: 1 },
        animation: { sprite: 'npc', action: 'idle', loop: true },
      },
      {
        id: 'alternate',
        label: '切换',
        trigger: 'inspect',
        auto: 'idle',
        triggerActivation: { on: 'touch', range: 0 },
        animation: { sprite: 'npc', action: 'walk', loop: true },
      },
    ],
  }
}

function scene(): BaseSceneDef {
  return {
    id: 'scene',
    mapId: 'map',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
    hooks: {
      onEnter: {
        initial: 'default',
        variants: {
          default: {
            label: '默认进场',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'initial',
              stages: [{ id: 'initial', body: [] }],
            },
          },
          alternate: {
            label: '另一路径',
            order: 1,
            flow: {
              kind: 'stages',
              initial: 'initial',
              stages: [{ id: 'initial', body: [] }],
            },
          },
        },
      },
      onTeleport: {
        initial: 'default',
        variants: {
          default: {
            label: '默认出口',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'initial',
              stages: [{ id: 'initial', body: [] }],
            },
          },
        },
      },
    },
  }
}

describe('canonical script world authority', () => {
  test('page selection clears overrides atomically and preserves only matching cursors', () => {
    const world = emptyWorldScriptState()
    world.behaviors.entities = {
      scene: {
        entity: {
          trigger: {
            selection: { kind: 'use', value: 'talk' },
            cursor: {
              behavior: 'talk',
              at: { kind: 'stage', stage: 'initial' },
            },
          },
          auto: {
            selection: { kind: 'use', value: 'idle' },
            cursor: {
              behavior: 'idle',
              at: { kind: 'state', machine: 'machine', state: 'initial' },
            },
          },
          triggerActivation: { kind: 'disabled' },
        },
      },
    }
    const coordinator = new FlowRuntimeCoordinator()
    const result = selectBaseEntityPage(
      world,
      entity(),
      target,
      { kind: 'use', value: 'alternate' },
      coordinator,
    )

    expect(result).toEqual({
      previousPage: 'default',
      page: 'alternate',
      triggerChanged: true,
      autoChanged: false,
      animationChanged: true,
    })
    expect(world.behaviors.entities?.scene?.entity).toEqual({
      page: 'alternate',
      trigger: {},
      auto: {
        cursor: {
          behavior: 'idle',
          at: { kind: 'state', machine: 'machine', state: 'initial' },
        },
      },
    })
    expect(
      coordinator.epoch({
        kind: 'entity-behavior',
        target,
        channel: 'trigger',
      }),
    ).toBe(1)
    expect(
      coordinator.epoch({
        kind: 'entity-behavior',
        target,
        channel: 'auto',
      }),
    ).toBe(0)
  })

  test('inherit does not pin the current initial page', () => {
    const definition = entity()
    const world = emptyWorldScriptState()
    selectBaseEntityPage(world, definition, target, {
      kind: 'use',
      value: 'alternate',
    })
    selectBaseEntityPage(world, definition, target, { kind: 'inherit' })
    expect(world.behaviors.entities?.scene?.entity?.page).toBeUndefined()
    expect(resolveBaseEntityPage(definition, world.behaviors.entities?.scene?.entity)?.id).toBe(
      'default',
    )

    definition.initialPage = 'alternate'
    expect(resolveBaseEntityPage(definition, world.behaviors.entities?.scene?.entity)?.id).toBe(
      'alternate',
    )
  })

  test('single-slot selection preserves the other channel and bumps only on effective changes', () => {
    const world = emptyWorldScriptState()
    const coordinator = new FlowRuntimeCoordinator()
    expect(
      selectEntityBehavior(
        world,
        entity(),
        target,
        'trigger',
        { kind: 'use', value: 'inspect' },
        coordinator,
      ),
    ).toBe(true)
    expect(resolveEntityBehavior(entity(), world, target, 'trigger')?.behaviorId).toBe('inspect')
    expect(resolveEntityBehavior(entity(), world, target, 'auto')?.behaviorId).toBe('idle')
    expect(
      selectEntityBehavior(
        world,
        entity(),
        target,
        'trigger',
        { kind: 'use', value: 'inspect' },
        coordinator,
      ),
    ).toBe(false)
    expect(
      coordinator.epoch({
        kind: 'entity-behavior',
        target,
        channel: 'trigger',
      }),
    ).toBe(1)
  })

  test('state-map handoff maps the effective cursor and commits selection plus cursor atomically', () => {
    const definition = entity()
    const world = emptyWorldScriptState()
    const coordinator = new FlowRuntimeCoordinator()
    const handoff: CursorHandoff = {
      kind: 'stateMap',
      fromBehavior: 'talk',
      cases: [
        {
          from: { kind: 'stage', stage: 'initial' },
          to: { kind: 'stage', stage: 'later' },
        },
      ],
      onUnmapped: 'error',
    }
    expect(
      selectEntityBehavior(
        world,
        definition,
        target,
        'trigger',
        { kind: 'use', value: 'inspect' },
        coordinator,
        handoff,
      ),
    ).toBe(true)
    expect(world.behaviors.entities?.scene?.entity?.trigger).toEqual({
      selection: { kind: 'use', value: 'inspect' },
      cursor: {
        behavior: 'inspect',
        at: { kind: 'stage', stage: 'later' },
      },
    })
    expect(resolveEntityBehavior(definition, world, target, 'trigger')?.cursor).toEqual({
      kind: 'stage',
      stage: 'later',
    })
  })

  test('state-map handoff uses a persisted source cursor and rejects invalid mappings before writing', () => {
    const definition = entity()
    const world = emptyWorldScriptState()
    const coordinator = new FlowRuntimeCoordinator()
    world.behaviors.entities = {
      scene: {
        entity: {
          trigger: {
            cursor: {
              behavior: 'talk',
              at: { kind: 'stage', stage: 'waiting' },
            },
          },
        },
      },
    }
    const valid: CursorHandoff = {
      kind: 'stateMap',
      fromBehavior: 'talk',
      cases: [
        {
          from: { kind: 'stage', stage: 'waiting' },
          to: { kind: 'stage', stage: 'later' },
        },
      ],
      onUnmapped: 'error',
    }
    const before = structuredClone(world)
    expect(() =>
      selectEntityBehavior(
        world,
        definition,
        target,
        'trigger',
        { kind: 'use', value: 'inspect' },
        coordinator,
        {
          ...valid,
          cases: [
            {
              from: { kind: 'stage', stage: 'initial' },
              to: { kind: 'stage', stage: 'later' },
            },
          ],
        },
      ),
    ).toThrow(/命中 0 条映射/)
    expect(world).toEqual(before)
    expect(() =>
      selectEntityBehavior(
        world,
        definition,
        target,
        'trigger',
        { kind: 'use', value: 'inspect' },
        coordinator,
        {
          ...valid,
          cases: [
            {
              from: { kind: 'stage', stage: 'waiting' },
              to: { kind: 'stage', stage: 'missing' },
            },
          ],
        },
      ),
    ).toThrow(/stage cursor 不存在 missing/)
    expect(world).toEqual(before)
    expect(() =>
      selectEntityBehavior(
        world,
        definition,
        target,
        'trigger',
        { kind: 'use', value: 'inspect' },
        coordinator,
        {
          ...valid,
          cases: [
            ...valid.cases,
            {
              from: { stage: 'waiting', kind: 'stage' },
              to: { kind: 'stage', stage: 'initial' },
            },
          ],
        },
      ),
    ).toThrow(/来源游标重复/)
    expect(world).toEqual(before)
    expect(
      selectEntityBehavior(
        world,
        definition,
        target,
        'trigger',
        { kind: 'use', value: 'inspect' },
        coordinator,
        valid,
      ),
    ).toBe(true)
    expect(resolveEntityBehavior(definition, world, target, 'trigger')?.cursor).toEqual({
      kind: 'stage',
      stage: 'later',
    })
  })

  test('state-map handoff requires a coordinator and leaves world state untouched without one', () => {
    const definition = entity()
    const world = emptyWorldScriptState()
    const before = structuredClone(world)
    expect(() =>
      selectEntityBehavior(
        world,
        definition,
        target,
        'trigger',
        { kind: 'use', value: 'inspect' },
        undefined,
        {
          kind: 'stateMap',
          fromBehavior: 'talk',
          cases: [
            {
              from: { kind: 'stage', stage: 'initial' },
              to: { kind: 'stage', stage: 'later' },
            },
          ],
          onUnmapped: 'error',
        },
      ),
    ).toThrow(/缺少 FlowRuntimeCoordinator/)
    expect(world).toEqual(before)
  })

  test('explicit same-behavior handoff bumps the epoch and stale leases cannot overwrite it', async () => {
    const definition = entity()
    const world = emptyWorldScriptState()
    const coordinator = new FlowRuntimeCoordinator()
    const activation = coordinator.beginEntityBehavior(world, definition, target, 'trigger')
    if (!activation) throw new Error('expected activation')
    expect(
      selectEntityBehavior(
        world,
        definition,
        target,
        'trigger',
        { kind: 'use', value: 'talk' },
        coordinator,
        {
          kind: 'stateMap',
          fromBehavior: 'talk',
          cases: [
            {
              from: { kind: 'stage', stage: 'initial' },
              to: { kind: 'stage', stage: 'waiting' },
            },
          ],
          onUnmapped: 'error',
        },
      ),
    ).toBe(true)
    expect(
      coordinator.epoch({
        kind: 'entity-behavior',
        target,
        channel: 'trigger',
      }),
    ).toBe(1)
    expect(
      await activation.lease.reachSafePoint({
        kind: 'stage',
        stage: 'initial',
      }),
    ).toBe('stop')
    expect(world.behaviors.entities?.scene?.entity?.trigger?.cursor).toEqual({
      behavior: 'talk',
      at: { kind: 'stage', stage: 'waiting' },
    })
  })

  test('trigger activation inherit follows the selected page', () => {
    const world = emptyWorldScriptState()
    setEntityTriggerActivation(world, entity(), target, {
      kind: 'disabled',
    })
    expect(world.behaviors.entities?.scene?.entity?.triggerActivation).toEqual({ kind: 'disabled' })
    setEntityTriggerActivation(world, entity(), target, {
      kind: 'inherit',
    })
    expect(world.behaviors.entities?.scene?.entity?.triggerActivation).toBeUndefined()
  })

  test('scene hook selection validates the whole transaction before writing', () => {
    const definition = scene()
    const world = emptyWorldScriptState()
    const before = structuredClone(world)
    expect(() =>
      selectBaseSceneHooks(world, definition, {
        onEnter: { kind: 'use', value: 'alternate' },
        onTeleport: { kind: 'use', value: 'missing' },
      }),
    ).toThrow(/onTeleport hook 不存在 missing/)
    expect(world).toEqual(before)

    const changed = selectBaseSceneHooks(world, definition, {
      onEnter: { kind: 'use', value: 'alternate' },
      onTeleport: { kind: 'disabled' },
    })
    expect(changed).toEqual({ onEnter: true, onTeleport: true })
    expect(resolveSceneHook(definition, world, 'onEnter')?.hookId).toBe('alternate')
    expect(resolveSceneHook(definition, world, 'onTeleport')).toBeUndefined()
  })

  test('activation leases CAS cursor commits against behavior epochs', async () => {
    const definition = entity()
    const world = emptyWorldScriptState()
    const coordinator = new FlowRuntimeCoordinator()
    const activation = coordinator.beginEntityBehavior(world, definition, target, 'trigger')
    if (!activation) throw new Error('expected activation')
    expect(activation.cursor).toEqual({ kind: 'stage', stage: 'initial' })

    selectEntityBehavior(
      world,
      definition,
      target,
      'trigger',
      { kind: 'use', value: 'inspect' },
      coordinator,
    )
    expect(
      await activation.lease.reachSafePoint({
        kind: 'stage',
        stage: 'initial',
      }),
    ).toBe('stop')
    expect(world.behaviors.entities?.scene?.entity?.trigger?.cursor).toBeUndefined()
  })

  test('a current activation commits a behavior-guarded stable cursor', async () => {
    const definition = entity()
    const world = emptyWorldScriptState()
    const coordinator = new FlowRuntimeCoordinator()
    const activation = coordinator.beginEntityBehavior(world, definition, target, 'trigger')
    if (!activation) throw new Error('expected activation')

    expect(
      await activation.lease.reachSafePoint({
        kind: 'stage',
        stage: 'initial',
      }),
    ).toBe('continue')
    activation.lease.close()
    expect(world.behaviors.entities?.scene?.entity?.trigger?.cursor).toEqual({
      behavior: 'talk',
      at: { kind: 'stage', stage: 'initial' },
    })
  })

  test('one persistent owner has at most one live activation lease', () => {
    const coordinator = new FlowRuntimeCoordinator()
    const owner = {
      kind: 'entity-behavior' as const,
      target,
      channel: 'auto' as const,
    }
    const first = coordinator.begin(owner, vi.fn())
    if (!first) throw new Error('expected first lease')

    expect(coordinator.begin(owner, vi.fn())).toBeUndefined()
    expect(
      coordinator.begin(
        {
          kind: 'entity-behavior',
          target,
          channel: 'trigger',
        },
        vi.fn(),
      ),
    ).toBeDefined()

    first.close()
    expect(coordinator.begin(owner, vi.fn())).toBeDefined()
  })

  test('save barrier closes the activation gate until all live flows reach a safe-point', async () => {
    const coordinator = new FlowRuntimeCoordinator()
    const committed: FlowCursor[] = []
    const first = coordinator.begin(
      {
        kind: 'entity-behavior',
        target,
        channel: 'trigger',
      },
      (cursor) => committed.push(cursor),
    )
    const second = coordinator.begin(
      {
        kind: 'scene-hook',
        scene: 'scene',
        slot: 'onEnter',
      },
      (cursor) => committed.push(cursor),
    )
    if (!first || !second) throw new Error('expected leases')

    const barrier = coordinator.requestSaveBarrier()
    let ready = false
    void barrier.ready.then(() => {
      ready = true
    })
    await Promise.resolve()
    expect(ready).toBe(false)
    expect(
      coordinator.begin(
        {
          kind: 'scene-hook',
          scene: 'scene',
          slot: 'onTeleport',
        },
        vi.fn(),
      ),
    ).toBeUndefined()

    expect(await first.reachSafePoint({ kind: 'stage', stage: 'next' })).toBe('stop')
    await Promise.resolve()
    expect(ready).toBe(false)
    second.close()
    await barrier.ready
    expect(ready).toBe(true)
    expect(committed).toEqual([{ kind: 'stage', stage: 'next' }])

    barrier.release()
    const resumed = coordinator.begin(
      {
        kind: 'scene-hook',
        scene: 'scene',
        slot: 'onTeleport',
      },
      vi.fn(),
    )
    expect(resumed).toBeDefined()
    resumed?.close()
  })

  test('transient activities share the persistent active registry used by save barriers', async () => {
    const coordinator = new FlowRuntimeCoordinator()
    const activity = coordinator.beginActivity()
    if (!activity) throw new Error('expected transient activity')

    const barrier = coordinator.requestSaveBarrier()
    let ready = false
    void barrier.ready.then(() => {
      ready = true
    })
    await Promise.resolve()
    expect(ready).toBe(false)
    expect(coordinator.beginActivity()).toBeUndefined()

    activity.close()
    await barrier.ready
    expect(ready).toBe(true)
    barrier.release()

    const resumed = coordinator.beginActivity()
    expect(resumed).toBeDefined()
    resumed?.close()
  })

  test('condition evaluation uses composite entity addresses', () => {
    const world = emptyWorldScriptState()
    world.entityState.scene = { entity: 2 }
    const query = {
      hasItem: vi.fn(() => false),
      ownsItem: vi.fn(() => false),
      itemEquipped: vi.fn(() => false),
      allFullHp: vi.fn(() => false),
      money: vi.fn(() => 0),
      inParty: vi.fn(() => false),
      entityInScene: vi.fn(() => true),
      facingEntity: vi.fn(() => true),
    }

    expect(evalAuthorCondition({ kind: 'entityState', target, is: 2 }, { world, query })).toBe(true)
    expect(
      evalAuthorCondition(
        {
          kind: 'all',
          of: [
            { kind: 'entityInScene', target },
            { kind: 'facingEntity', target, range: 1 },
          ],
        },
        { world, query },
      ),
    ).toBe(true)
    expect(query.entityInScene).toHaveBeenCalledWith(target)
    expect(query.facingEntity).toHaveBeenCalledWith(target, 1)
  })
})
