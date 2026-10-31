import { describe, expect, it } from 'vitest'
import {
  atAnySpot,
  atSpot,
  bgmIs,
  bossWon,
  caiyiDetector,
  enterAnyScene,
  enterScene,
  hasItem,
  leaveScene,
} from './detectors.js'
import type { ProgressSnapshot } from './snapshot.js'

const progressSnapshot = (overrides: Partial<ProgressSnapshot>): ProgressSnapshot => ({
  scene: 0,
  canMove: true,
  partyX: 0,
  partyY: 0,
  music: 0,
  inventory: new Set(),
  battle: null,
  ...overrides,
})

describe('Scene edges and positions', () => {
  it('enterScene 仅在进入那一帧触发', () => {
    const d = enterScene(80)
    expect(d(progressSnapshot({ scene: 80 }), progressSnapshot({ scene: 62 }), {})).toBe(true)
    expect(d(progressSnapshot({ scene: 80 }), progressSnapshot({ scene: 80 }), {})).toBe(false)
    expect(d(progressSnapshot({ scene: 80 }), null, {})).toBe(true)
  })
  it('leaveScene 仅在离开那一帧触发', () => {
    const d = leaveScene(40)
    expect(d(progressSnapshot({ scene: 41 }), progressSnapshot({ scene: 40 }), {})).toBe(true)
    expect(d(progressSnapshot({ scene: 40 }), progressSnapshot({ scene: 40 }), {})).toBe(false)
    expect(d(progressSnapshot({ scene: 40 }), null, {})).toBe(false)
  })
  it('enterAnyScene 任一进入即触发', () => {
    const d = enterAnyScene([164, 165, 147])
    expect(d(progressSnapshot({ scene: 165 }), progressSnapshot({ scene: 100 }), {})).toBe(true)
    expect(d(progressSnapshot({ scene: 165 }), progressSnapshot({ scene: 164 }), {})).toBe(false) // 已在集合内不重触
    expect(d(progressSnapshot({ scene: 164 }), null, {})).toBe(true)
    expect(d(progressSnapshot({ scene: 100 }), null, {})).toBe(false)
    expect(enterAnyScene([])(progressSnapshot({ scene: 164 }), null, {})).toBe(false)
  })
  it('atSpot 容差矩形', () => {
    const d = atSpot(19, 1000, 500, 10, 5)
    expect(d(progressSnapshot({ scene: 19, partyX: 1010, partyY: 495 }), null, {})).toBe(true)
    expect(d(progressSnapshot({ scene: 19, partyX: 1011, partyY: 500 }), null, {})).toBe(false)
    expect(d(progressSnapshot({ scene: 19, partyX: 1000, partyY: 506 }), null, {})).toBe(false)
    expect(d(progressSnapshot({ scene: 20, partyX: 1000, partyY: 500 }), null, {})).toBe(false) // 场景不符
  })
  it('atSpot 默认容差 ±48/±24：恰好边界命中、超出 1px 不命中', () => {
    const d = atSpot(19, 1000, 500) // 不传 tol → 48/24
    expect(d(progressSnapshot({ scene: 19, partyX: 1048, partyY: 524 }), null, {})).toBe(true)
    expect(d(progressSnapshot({ scene: 19, partyX: 1049, partyY: 500 }), null, {})).toBe(false)
    expect(d(progressSnapshot({ scene: 19, partyX: 1000, partyY: 525 }), null, {})).toBe(false)
    expect(d(progressSnapshot({ scene: 19, partyX: 952, partyY: 476 }), null, {})).toBe(true) // 负向边界
  })
  it('atAnySpot 多点：任一格命中即真；全部未命中/场景不符为假', () => {
    const d = atAnySpot(164, [
      [0, 0],
      [1000, 500],
    ])
    expect(d(progressSnapshot({ scene: 164, partyX: 1030, partyY: 510 }), null, {})).toBe(true) // 第二格
    expect(d(progressSnapshot({ scene: 164, partyX: 10, partyY: 10 }), null, {})).toBe(true) // 第一格
    expect(d(progressSnapshot({ scene: 164, partyX: 500, partyY: 250 }), null, {})).toBe(false) // 都不中
    expect(d(progressSnapshot({ scene: 165, partyX: 1000, partyY: 500 }), null, {})).toBe(false) // 场景不符
  })
})

describe('Battle, inventory and music predicates', () => {
  it('bossWon 需 boss 在场且全场血≤0', () => {
    const d = bossWon(75)
    expect(
      d(progressSnapshot({ battle: { enemyIds: new Set([75]), totalEnemyHp: 0 } }), null, {}),
    ).toBe(true)
    expect(
      d(progressSnapshot({ battle: { enemyIds: new Set([75]), totalEnemyHp: 10 } }), null, {}),
    ).toBe(false)
    expect(
      d(progressSnapshot({ battle: { enemyIds: new Set([12]), totalEnemyHp: 0 } }), null, {}),
    ).toBe(false)
    expect(d(progressSnapshot({ battle: null }), null, {})).toBe(false)
  })
  it('hasItem 只命中背包中的指定物品', () => {
    const d = hasItem(265)
    expect(d(progressSnapshot({ inventory: new Set([265]) }), null, {})).toBe(true)
    expect(d(progressSnapshot({ inventory: new Set([266]) }), null, {})).toBe(false)
  })
  it('bgmIs 只命中指定音乐号', () => {
    const d = bgmIs(86)
    expect(d(progressSnapshot({ music: 86 }), null, {})).toBe(true)
    expect(d(progressSnapshot({ music: 85 }), null, {})).toBe(false)
  })
})

describe('Stateful Caiyi detection', () => {
  it('caiyi 两段:先见 71 入场,再等其消失/血≤0', () => {
    const d = caiyiDetector(71)
    const mem: Record<string, unknown> = {}
    const untouched: Record<string, unknown> = {}
    // 战前:不触发,也不置位
    expect(d(progressSnapshot({ battle: null }), null, mem)).toBe(false)
    expect(mem.seen).toBeUndefined()
    // 71 入场:置位但不触发
    expect(
      d(progressSnapshot({ battle: { enemyIds: new Set([71]), totalEnemyHp: 100 } }), null, mem),
    ).toBe(false)
    expect(mem.seen).toBe(true)
    // 71 还在但血清空:触发
    expect(
      d(progressSnapshot({ battle: { enemyIds: new Set([71]), totalEnemyHp: 0 } }), null, mem),
    ).toBe(true)
    expect(d(progressSnapshot({ battle: null }), null, untouched)).toBe(false)
    expect(untouched.seen).toBeUndefined()
  })
  it('caiyi 第二段:战斗结束(battle=null)也触发', () => {
    const d = caiyiDetector(71)
    const mem = {}
    d(progressSnapshot({ battle: { enemyIds: new Set([71]), totalEnemyHp: 100 } }), null, mem) // 置位
    expect(d(progressSnapshot({ battle: null }), null, mem)).toBe(true)
  })
  it('caiyiDetector 自定义敌 id：见 72 置位，其消失触发', () => {
    const d = caiyiDetector(72)
    const mem = {}
    expect(
      d(progressSnapshot({ battle: { enemyIds: new Set([71]), totalEnemyHp: 10 } }), null, mem),
    ).toBe(false) // 非 72 不置位
    expect(
      d(progressSnapshot({ battle: { enemyIds: new Set([72]), totalEnemyHp: 10 } }), null, mem),
    ).toBe(false) // 置位不触发
    expect(
      d(progressSnapshot({ battle: { enemyIds: new Set([72, 71]), totalEnemyHp: 3 } }), null, mem),
    ).toBe(false)
    // 72离场，但71仍存活；不能依靠battle=null或全场HP清零通过。
    expect(
      d(progressSnapshot({ battle: { enemyIds: new Set([71]), totalEnemyHp: 3 } }), null, mem),
    ).toBe(true)
    expect(d(progressSnapshot({ battle: null }), null, mem)).toBe(true) // 战斗结束也触发
  })
})
