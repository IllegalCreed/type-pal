/**
 * TEST-CONTENT-CONTRACTS-1 F1-F6：跨表引用闭包（validate-refs.ts:945 validateReferences）。
 * 先建干净非空 bundle（零 issue），再按一轴损坏核 severity/where/目标 id 与非目标保持。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import type { ContentBundle } from './validate-refs.js'
import { validateReferences } from './validate-refs.js'

const bundle = (): ContentBundle =>
  ({
    scenes: [
      {
        id: 's1',
        mapId: 'map-a',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [{ id: 'e1', actor: 'hero', pos: { col: 1, row: 1, height: 0 } }],
        onEnter: [{ body: [{ kind: 'setFlag', flag: 'ok', value: true }] }],
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
    sprites: [{ id: 'sprite.hero', asset: 'sprite.hero', layout: { kind: 'static' } }],
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
  test('非空目录/真实稳定 ID 的合法 bundle → 零 issue；输入不变', () => {
    const value = bundle()
    const before = deepSnapshot(value)
    expect(validateReferences(value)).toEqual([])
    expect(value).toEqual(before)
  })
})

describe('F2 场景/实体/actor 引用单轴损坏', () => {
  test('实体引用悬空 actor → error 含目标 id 与路径；非目标保持零', () => {
    const value = bundle()
    ;(value.scenes[0]!.entities[0] as unknown as { actor: string }).actor = 'ghost-actor'
    const issues = validateReferences(value)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ severity: 'error' })
    expect(issues[0]!.where).toContain('entities')
    expect(issues[0]!.message).toContain('ghost-actor')
  })
  test('entryPoint scene 悬空 → error；mapIndex 路径悬空 → error', () => {
    const value = bundle()
    ;(value.entryPoints[0] as unknown as { scene: string }).scene = 'ghost-scene'
    const issues = validateReferences(value)
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('ghost-scene'))).toBe(
      true,
    )
    const map = bundle()
    map.scenes[0]!.mapId = 'ghost-map'
    expect(
      validateReferences(map).some(
        (i) => i.severity === 'error' && i.message.includes('ghost-map'),
      ),
    ).toBe(true)
  })
})

describe('F3 装备/技能数据引用与降级 warning 分层', () => {
  test('levelUp 引用悬空技能 → error 或 warn 按合同；不吞并其它 issue', () => {
    const value = bundle()
    value.levelUp = { hero: [{ level: 2, skillId: 'ghost-skill' }] }
    const issues = validateReferences(value)
    expect(issues.length).toBeGreaterThanOrEqual(1)
    expect(issues.every((i) => i.severity === 'error' || i.severity === 'warn')).toBe(true)
    expect(issues.some((i) => i.message.includes('ghost-skill'))).toBe(true)
  })
})

describe('F6 单轴损坏→补回恢复往返', () => {
  test('悬空 actor 补回后零 issue（完整往返非部分修复）', () => {
    const value = bundle()
    ;(value.scenes[0]!.entities[0] as unknown as { actor: string }).actor = 'ghost'
    expect(validateReferences(value).length).toBeGreaterThanOrEqual(1)
    ;(value.scenes[0]!.entities[0] as unknown as { actor: string }).actor = 'hero'
    expect(validateReferences(value)).toEqual([])
  })
})
