import {
  buildWorld,
  emptyWorldScriptState,
  type RuntimeSceneDef,
  type WorldEntityBehaviorState,
  type WorldState,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { sceneFixture } from './__tests__/script-world-fixture.js'
import {
  assertSceneSwitchDependenciesCurrent,
  captureSceneSwitchDependencies,
  type SceneActorSpriteOverride,
} from './scene-switch-transaction.js'

function worldFixture(): WorldState {
  const world = buildWorld(
    { party: ['hero'], money: 10, inventory: [{ itemId: 'herb', count: 2 }] },
    {
      hero: {
        id: 'hero',
        name: 'hero',
        spriteId: 'sprite.hero',
        portraits: { default: 'portrait.hero' },
        battler: {
          baseStats: {
            level: 1,
            hp: 10,
            maxHP: 10,
            mp: 10,
            maxMP: 10,
            attack: 1,
            defense: 1,
            magicAttack: 1,
            speed: 1,
            luck: 1,
          },
          initialEquipment: {},
          initialMagic: [],
          battleSprite: 'battle-sprite.hero',
        },
      },
    },
  )
  world.script = emptyWorldScriptState()
  return world
}

describe('scene switch dependency guard', () => {
  test('所有预检依赖变化都拒绝陈旧 plan，无关世界字段不误伤', () => {
    const overrides = new Map<string, SceneActorSpriteOverride>()
    const base = worldFixture()
    const definition = sceneFixture('s002')
    const expected = captureSceneSwitchDependencies(base, base.script!, definition, overrides, true)
    const mutations: Array<
      (
        world: WorldState,
        definition: RuntimeSceneDef,
        map: Map<string, SceneActorSpriteOverride>,
      ) => void
    > = [
      (world) => {
        world.script!.mapOverride = { s002: 'map.changed' }
      },
      (world) => {
        world.party[0]!.appearance = { spriteId: 'sprite.changed' }
      },
      (world) => {
        world.party[0]!.equipment.weapon = 'sword'
      },
      (world) => {
        world.script!.followers = ['sprite.follower']
      },
      (world) => {
        world.inventory[0]!.count++
      },
      (world) => {
        world.script!.behaviors.scenes = { s002: { onEnter: { selection: { kind: 'disabled' } } } }
      },
      (world) => {
        world.script!.behaviors.scenes = {
          s002: { onEnter: { cursor: { hook: 'before', at: { kind: 'stage', stage: 'two' } } } },
        }
      },
      (_world, _projection, map) => {
        map.set('hero', { def: { id: 'sprite.override', asset: 'asset.override' } })
      },
    ]

    for (const mutate of mutations) {
      const current = structuredClone(base)
      const currentDefinition = structuredClone(definition)
      const currentOverrides = new Map(overrides)
      mutate(current, currentDefinition, currentOverrides)
      expect(() =>
        assertSceneSwitchDependenciesCurrent(
          expected,
          captureSceneSwitchDependencies(
            current,
            current.script!,
            currentDefinition,
            currentOverrides,
            true,
          ),
          '依赖已变化',
        ),
      ).toThrowError(expect.objectContaining({ name: 'AbortError', message: '依赖已变化' }))
    }

    const unrelated = structuredClone(base)
    unrelated.money++
    unrelated.script!.flags.unrelated = true
    expect(
      captureSceneSwitchDependencies(unrelated, unrelated.script!, definition, overrides, true),
    ).toEqual(expected)
  })

  test('读档计划显式忽略活动 actor override', () => {
    const world = worldFixture()
    const definition = sceneFixture('s002')
    const before = captureSceneSwitchDependencies(
      world,
      world.script!,
      definition,
      new Map(),
      false,
    )
    const overrides = new Map<string, SceneActorSpriteOverride>([
      ['hero', { def: { id: 'sprite.override', asset: 'asset.override' } }],
    ])
    expect(
      captureSceneSwitchDependencies(world, world.script!, definition, overrides, false),
    ).toEqual(before)
  })
})

describe('resolved canonical scene dependencies', () => {
  const make = () => {
    const world = worldFixture(),
      definition = sceneFixture('s002')
    const entity = definition.entities[0]!
    entity.behaviors!.auto = {
      idle: {
        label: 'idle',
        order: 0,
        flow: { kind: 'stages', initial: 'one', stages: [{ id: 'one', body: [] }] },
      },
    }
    entity.pages![0]!.auto = 'idle'
    entity.pages![0]!.animation = { sprite: 'sprite', action: 'idle', loop: true, startAtMs: 7 }
    entity.pages![1]!.animation = { sprite: 'sprite', action: 'walk', loop: false }
    const capture = () =>
      captureSceneSwitchDependencies(world, world.script!, definition, new Map(), true)
    return { world, definition, capture }
  }
  const changes: Array<[string, WorldEntityBehaviorState]> = [
    ['page/animation', { page: 'second' }],
    ['trigger selection', { trigger: { selection: { kind: 'use', value: 'second' } } }],
    ['trigger disabled', { trigger: { selection: { kind: 'disabled' } } }],
    ['auto disabled', { auto: { selection: { kind: 'disabled' } } }],
    ['activation', { triggerActivation: { kind: 'use', value: { on: 'touch', range: 3 } } }],
    ['activation disabled', { triggerActivation: { kind: 'disabled' } }],
  ]
  test.each(changes)('%s changes the actual target projection footprint', (_label, state) => {
    const h = make(),
      before = h.capture()
    h.world.script!.behaviors.entities = { s002: { entity: state } }
    expect(h.capture()).not.toEqual(before)
  })
  test('same resolved IDs/cursor order and unrelated entity cursors do not introduce false invalidation', () => {
    const h = make(),
      before = h.capture()
    h.world.script!.behaviors.entities = {
      s002: {
        entity: {
          page: 'first',
          trigger: {
            selection: { kind: 'use', value: 'first' },
            cursor: { behavior: 'first', at: { kind: 'stage', stage: 'two' } },
          },
          auto: { selection: { kind: 'use', value: 'idle' } },
        },
      },
    }
    h.world.script!.behaviors.scenes = {
      s002: {
        onEnter: {
          selection: { kind: 'use', value: 'before' },
          cursor: { hook: 'before', at: { stage: 'one', kind: 'stage' } },
        },
      },
    }
    expect(h.capture()).toEqual(before)
  })
  test('empty target and disabled hook ignore state that is not consumed', () => {
    const h = make()
    h.definition.entities = []
    h.definition.hooks = undefined
    const before = h.capture()
    h.world.script!.behaviors.entities = { s002: { unused: { page: 'unused' } } }
    h.world.script!.behaviors.scenes = { s002: { onEnter: { selection: { kind: 'disabled' } } } }
    expect(h.capture()).toEqual(before)
  })
  test('onTeleport selection is also a target scene view dependency', () => {
    const h = make(),
      before = h.capture()
    h.world.script!.behaviors.scenes = { s002: { onTeleport: { selection: { kind: 'disabled' } } } }
    expect(h.capture()).not.toEqual(before)
  })
})
