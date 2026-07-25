import {
  type EntityAddress,
  type EntityBaseV5,
  emptyWorldScriptStateV5,
  type FlowCursor,
  type SceneDefV5,
} from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import {
  evalAuthorConditionV5,
  FlowRuntimeCoordinatorV5,
  resolveEntityBehaviorV5,
  resolveEntityPageV5,
  resolveSceneHookV5,
  selectEntityBehaviorV5,
  selectEntityPageV5,
  selectSceneHooksV5,
  setEntityTriggerActivationV5,
} from './script-world-v5.js'

const target: EntityAddress = { scene: 'scene', entity: 'entity' }

function entity(): EntityBaseV5 {
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
            stages: [{ id: 'initial', body: [] }],
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

function scene(): SceneDefV5 {
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

describe('script v5 world authority', () => {
  test('page selection clears overrides atomically and preserves only matching cursors', () => {
    const world = emptyWorldScriptStateV5()
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
    const coordinator = new FlowRuntimeCoordinatorV5()
    const result = selectEntityPageV5(
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
    const world = emptyWorldScriptStateV5()
    selectEntityPageV5(world, definition, target, {
      kind: 'use',
      value: 'alternate',
    })
    selectEntityPageV5(world, definition, target, { kind: 'inherit' })
    expect(world.behaviors.entities?.scene?.entity?.page).toBeUndefined()
    expect(resolveEntityPageV5(definition, world.behaviors.entities?.scene?.entity)?.id).toBe(
      'default',
    )

    definition.initialPage = 'alternate'
    expect(resolveEntityPageV5(definition, world.behaviors.entities?.scene?.entity)?.id).toBe(
      'alternate',
    )
  })

  test('single-slot selection preserves the other channel and bumps only on effective changes', () => {
    const world = emptyWorldScriptStateV5()
    const coordinator = new FlowRuntimeCoordinatorV5()
    expect(
      selectEntityBehaviorV5(
        world,
        entity(),
        target,
        'trigger',
        { kind: 'use', value: 'inspect' },
        coordinator,
      ),
    ).toBe(true)
    expect(resolveEntityBehaviorV5(entity(), world, target, 'trigger')?.behaviorId).toBe('inspect')
    expect(resolveEntityBehaviorV5(entity(), world, target, 'auto')?.behaviorId).toBe('idle')
    expect(
      selectEntityBehaviorV5(
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

  test('trigger activation inherit follows the selected page', () => {
    const world = emptyWorldScriptStateV5()
    setEntityTriggerActivationV5(world, entity(), target, {
      kind: 'disabled',
    })
    expect(world.behaviors.entities?.scene?.entity?.triggerActivation).toEqual({ kind: 'disabled' })
    setEntityTriggerActivationV5(world, entity(), target, {
      kind: 'inherit',
    })
    expect(world.behaviors.entities?.scene?.entity?.triggerActivation).toBeUndefined()
  })

  test('scene hook selection validates the whole transaction before writing', () => {
    const definition = scene()
    const world = emptyWorldScriptStateV5()
    const before = structuredClone(world)
    expect(() =>
      selectSceneHooksV5(world, definition, {
        onEnter: { kind: 'use', value: 'alternate' },
        onTeleport: { kind: 'use', value: 'missing' },
      }),
    ).toThrow(/onTeleport hook 不存在 missing/)
    expect(world).toEqual(before)

    const changed = selectSceneHooksV5(world, definition, {
      onEnter: { kind: 'use', value: 'alternate' },
      onTeleport: { kind: 'disabled' },
    })
    expect(changed).toEqual({ onEnter: true, onTeleport: true })
    expect(resolveSceneHookV5(definition, world, 'onEnter')?.hookId).toBe('alternate')
    expect(resolveSceneHookV5(definition, world, 'onTeleport')).toBeUndefined()
  })

  test('activation leases CAS cursor commits against behavior epochs', async () => {
    const definition = entity()
    const world = emptyWorldScriptStateV5()
    const coordinator = new FlowRuntimeCoordinatorV5()
    const activation = coordinator.beginEntityBehavior(world, definition, target, 'trigger')
    if (!activation) throw new Error('expected activation')
    expect(activation.cursor).toEqual({ kind: 'stage', stage: 'initial' })

    selectEntityBehaviorV5(
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
    const world = emptyWorldScriptStateV5()
    const coordinator = new FlowRuntimeCoordinatorV5()
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

  test('save barrier closes the activation gate until all live flows reach a safe-point', async () => {
    const coordinator = new FlowRuntimeCoordinatorV5()
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

  test('condition evaluation uses composite entity addresses', () => {
    const world = emptyWorldScriptStateV5()
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

    expect(evalAuthorConditionV5({ kind: 'entityState', target, is: 2 }, { world, query })).toBe(
      true,
    )
    expect(
      evalAuthorConditionV5(
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
