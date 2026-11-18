import type { ActorDef } from '../actor.js'
import type { EnemyDef } from '../enemy.js'
import {
  validateActors,
  validateAuthorEnemies,
  validateAuthorItems,
  validateAuthorScenes,
  validateBattleSprites,
  validateMapIndex,
  validateSprites,
  validateStartWorld,
} from '../index.js'
import type { ContentBundle } from '../validate-refs.js'

export function createReferenceProject() {
  const origin = { col: 0, row: 0, height: 0 }
  const entity = { id: 'sentry', actor: 'hero', pos: { col: 1, row: 1, height: 0 } }
  const scene = {
    id: 'hall',
    mapId: 'hall-map',
    entry: { pos: origin, facing: 'down' },
    entities: [entity],
  } satisfies ContentBundle['scenes'][number]
  const entry: ContentBundle['entryPoints'][number] = {
    id: 'main',
    label: '入口',
    scene: 'hall',
    startWorld: { party: ['hero'], money: 0, inventory: [] },
  }
  const actor = {
    id: 'hero',
    name: 'name.hero',
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
      battleSprite: 'bs-hero',
    },
  } satisfies ActorDef
  const bundle: ContentBundle = {
    scenes: [scene],
    entryPoints: [entry],
    actors: [actor],
    skills: [],
    levelUp: {},
    items: [{ id: 'herb', name: '药草', desc: [], buyPrice: 2, sellPrice: 1, sellable: true }],
    locale: { 'name.hero': '主角' },
    sprites: [
      { id: 'sprite.hero', label: '主角', asset: 'sprite.hero', layout: { kind: 'static' } },
    ],
    battleSprites: [
      {
        id: 'bs-hero',
        label: '主角',
        asset: 'battle.hero',
        profile: {
          kind: 'player-fighter',
          frames: {
            idle: 0,
            dying: 1,
            dead: 2,
            defend: 3,
            hurt: 4,
            preMagic: 5,
            magic: 6,
            attackWindup: 7,
            attackRush: 8,
            attackStrike: 9,
          },
          castEffectBase: 0,
          attackEffectBase: 0,
        },
      },
    ],
    mapIndex: { version: 1, maps: [{ id: 'hall-map', name: 'Hall', path: 'maps/hall.json' }] },
  }
  validateAuthorScenes(bundle.scenes)
  validateActors(bundle.actors)
  validateSprites(bundle.sprites)
  validateBattleSprites(bundle.battleSprites)
  validateMapIndex(bundle.mapIndex)
  validateAuthorItems(bundle.items)
  validateStartWorld(entry.startWorld)
  return { bundle, actor, scene, entity, entry }
}

export function createEnemyReferenceProject(overrides: Partial<EnemyDef> = {}) {
  const project = createReferenceProject()
  const { bundle } = project
  bundle.battleSprites.push({
    id: 'bs-enemy',
    label: '敌人',
    asset: 'battle.enemy',
    profile: {
      kind: 'enemy',
      idle: { start: 0, count: 1 },
      magic: { start: 1, count: 0 },
      attack: { start: 1, count: 0 },
      idleTicksPerFrame: 1,
      actTicksPerFrame: 0,
    },
  })
  validateBattleSprites(bundle.battleSprites)
  const enemy: EnemyDef = {
    id: 'slime',
    name: 'name.slime',
    battleSprite: 'bs-enemy',
    yPosOffset: 0,
    stats: {
      health: 100,
      level: 1,
      exp: 10,
      cash: 5,
      attackStrength: 10,
      magicStrength: 10,
      defense: 10,
      dexterity: 10,
      fleeRate: 10,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
    },
    ai: { resistanceToSorcery: 0 },
    sounds: {},
    ...overrides,
  }
  bundle.enemies = [enemy]
  bundle.locale['name.slime'] = '小怪'
  validateAuthorEnemies(bundle.enemies)
  return { ...project, enemy }
}
