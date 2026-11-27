// Legal authored definitions used by scene preparation and persistent script host tests.
import {
  buildEntityLifecycleReferenceIndex,
  buildWorld,
  type RuntimeSceneDef,
  type WorldState,
} from '@type-pal/content'
import type { ProjectScriptHostOptions } from '../runtime-script-project.js'

export const digest = 'c'.repeat(64)

export const hero = {
  id: 'hero',
  name: 'hero',
  spriteId: 'sprite.hero',
  battler: {
    baseStats: {
      level: 1,
      hp: 10,
      maxHP: 10,
      mp: 5,
      maxMP: 5,
      attack: 1,
      defense: 1,
      magicAttack: 1,
      speed: 1,
      luck: 1,
    },
    initialEquipment: {},
    initialMagic: [],
    battleSprite: 'battle.hero',
  },
}
export function worldFixture(): WorldState {
  return buildWorld({ party: ['hero'], money: 10, inventory: [] }, { hero })
}
export function sceneFixture(id = 'target'): RuntimeSceneDef {
  return {
    id,
    mapId: 'map.old',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'entity',
        zone: true,
        pos: { col: 1, row: 1, height: 0 },
        initialPage: 'first',
        behaviors: {
          trigger: {
            first: {
              label: 'first',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'one',
                stages: [
                  { id: 'one', body: [] },
                  { id: 'two', body: [] },
                ],
              },
            },
            second: {
              label: 'second',
              order: 1,
              flow: { kind: 'stages', initial: 'one', stages: [{ id: 'one', body: [] }] },
            },
          },
        },
        pages: [
          {
            id: 'first',
            label: 'first',
            trigger: 'first',
            triggerActivation: { on: 'interact', range: 1 },
          },
          {
            id: 'second',
            label: 'second',
            trigger: 'second',
            triggerActivation: { on: 'touch', range: 2 },
          },
        ],
      },
    ],
    hooks: {
      onEnter: {
        initial: 'before',
        variants: {
          before: {
            label: 'before',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'one',
              stages: [
                {
                  id: 'one',
                  body: [],
                  entry: { prepare: [], reveal: { kind: 'fade', outMs: 10, inMs: 10 } },
                },
                { id: 'two', body: [], entry: { prepare: [], reveal: { kind: 'cut' } } },
              ],
            },
          },
          after: {
            label: 'after',
            order: 1,
            flow: {
              kind: 'stages',
              initial: 'one',
              stages: [
                { id: 'one', body: [], entry: { prepare: [], reveal: { kind: 'cut' } } },
                {
                  id: 'two',
                  body: [],
                  entry: { prepare: [], reveal: { kind: 'fade', outMs: 20, inMs: 20 } },
                },
              ],
            },
          },
        },
      },
      onTeleport: {
        initial: 'exit',
        variants: {
          exit: {
            label: 'exit',
            order: 0,
            flow: { kind: 'stages', initial: 'one', stages: [{ id: 'one', body: [] }] },
          },
        },
      },
    },
  }
}
export function hostOptions(
  scene: RuntimeSceneDef,
  overrides: Partial<ProjectScriptHostOptions> = {},
): ProjectScriptHostOptions {
  return {
    lifecycleReferences: buildEntityLifecycleReferenceIndex([scene]),
    scene: () => scene,
    currentSceneId: () => 'source',
    currentSceneSessionId: () => 'session-1',
    executeEffect: () => {},
    query: {
      hasItem: () => false,
      ownsItem: () => false,
      itemEquipped: () => false,
      allFullHp: () => true,
      money: () => 10,
      inParty: () => true,
      entityInScene: () => true,
      entitiesNear: () => false,
      facingEntity: () => false,
    },
    confirm: async () => true,
    startBattle: async () => 'victory',
    teleportOut: async () => true,
    wait: async () => {},
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
    ...overrides,
  }
}
