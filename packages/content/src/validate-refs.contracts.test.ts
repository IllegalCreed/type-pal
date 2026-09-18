/**
 * TEST-CONTENT-CONTRACTS-1 F1-F6：跨表引用闭包（validate-refs.ts:945 validateReferences）。
 * 先建干净非空 bundle：主载荷先过现行结构守卫（validateAuthorScenes/validateSprites/
 * validateActors/validateBattleSprites）且零 issue，再按一轴损坏核精确 Issue 多重集合
 * （确定 severity、完整 where、目标 id、无额外 issue；不用 Set 吞重复、不 .some 首错即停）。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import {
  validateActors,
  validateAuthorScenes,
  validateBattleSprites,
  validateReferences,
  validateSprites,
} from './index.js'
import type { ContentBundle } from './validate-refs.js'

const bundle = (): ContentBundle =>
  ({
    scenes: [
      {
        id: 's1',
        mapId: 'map-a',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [{ id: 'e1', actor: 'hero', pos: { col: 1, row: 1, height: 0 } }],
      },
    ],
    actors: [
      {
        id: 'hero',
        name: 'name.hero',
        spriteId: 'sprite.hero',
        battler: {
          baseStats: {
            level: 1,
            hp: 100,
            maxHP: 100,
            mp: 10,
            maxMP: 10,
            attack: 10,
            defense: 10,
            magicAttack: 10,
            speed: 10,
            luck: 5,
          },
          initialEquipment: {},
          initialMagic: [],
          battleSprite: 'bs-hero',
        },
      },
    ],
    skills: [],
    levelUp: {},
    items: [],
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
    entryPoints: [
      {
        id: 'main',
        label: '入口',
        scene: 's1',
        startWorld: { party: ['hero'], money: 0, inventory: [] },
      },
    ],
    mapIndex: { version: 1, maps: [{ id: 'map-a', name: 'A', path: 'maps/a.json' }] },
  }) as unknown as ContentBundle

describe('F1 干净 bundle 零 issue（正控基线）', () => {
  test('非空目录/真实稳定 ID 的合法 bundle：主载荷先过现行结构守卫且零 issue；输入不变', () => {
    const value = bundle()
    const before = deepSnapshot(value)
    // 引用校验不代替结构校验：scenes/sprites/actors/battleSprites 逐一过当前守卫
    validateAuthorScenes(value.scenes)
    validateSprites(value.sprites)
    validateActors(value.actors)
    validateBattleSprites(value.battleSprites)
    expect(validateReferences(value)).toEqual([])
    expect(value).toEqual(before)
  })
})

describe('F2 场景/实体/actor 引用单轴损坏', () => {
  test('实体引用悬空 actor → 精确 error（完整 where/severity/目标 id；无额外 issue）', () => {
    const value = bundle()
    ;(value.scenes[0]!.entities[0] as unknown as { actor: string }).actor = 'ghost-actor'
    // 完整多重集合比较：恰好一条、字段逐项精确（entity-locator-wrong 的 where 篡改无处可藏）
    expect(validateReferences(value)).toEqual([
      {
        severity: 'error',
        where: 'scenes[0].entities[0].actor',
        message: '角色 "ghost-actor" 不在 actors 表',
      },
    ])
  })
  test('entryPoint scene 悬空 → 精确 error；不引入任何额外 issue', () => {
    const value = bundle()
    ;(value.entryPoints[0] as unknown as { scene: string }).scene = 'ghost-scene'
    expect(validateReferences(value)).toEqual([
      {
        severity: 'error',
        where: 'entryPoints[0](main).scene',
        message: '场景 "ghost-scene" 不在 scenes',
      },
    ])
  })
  test('场景 mapId 悬空 → 精确 error（map id 引用闭包，非物理路径检查）', () => {
    const value = bundle()
    value.scenes[0]!.mapId = 'ghost-map'
    expect(validateReferences(value)).toEqual([
      {
        severity: 'error',
        where: 'scenes[0].mapId',
        message: '地图 "ghost-map" 不在 map index',
      },
    ])
  })
})

describe('F3 装备/技能数据引用与降级 warning 分层', () => {
  test('levelUp 引用悬空技能 → 确定 warn（降级不阻断升级）；恰好一条无吞并', () => {
    const value = bundle()
    value.levelUp = { hero: [{ level: 2, skillId: 'ghost-skill' }] }
    expect(validateReferences(value)).toEqual([
      {
        severity: 'warn',
        where: 'levelUp[hero][0].skillId',
        message: '升级习得 "ghost-skill" 不在 skills',
      },
    ])
  })
})

describe('F6 单轴损坏→补回恢复往返', () => {
  test('悬空 actor 补回后零 issue（完整往返非部分修复）', () => {
    const value = bundle()
    ;(value.scenes[0]!.entities[0] as unknown as { actor: string }).actor = 'ghost'
    expect(validateReferences(value)).toEqual([
      {
        severity: 'error',
        where: 'scenes[0].entities[0].actor',
        message: '角色 "ghost" 不在 actors 表',
      },
    ])
    ;(value.scenes[0]!.entities[0] as unknown as { actor: string }).actor = 'hero'
    expect(validateReferences(value)).toEqual([])
  })
})
