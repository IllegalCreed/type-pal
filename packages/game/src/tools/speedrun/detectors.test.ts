import { describe, expect, it } from 'vitest'
import {
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

const snap = (o: Partial<ProgressSnapshot>): ProgressSnapshot => ({
  scene: 0,
  canMove: true,
  partyX: 0,
  partyY: 0,
  music: 0,
  inventory: new Set(),
  battle: null,
  ...o,
})

describe('detectors', () => {
  it('enterScene 仅在进入那一帧触发', () => {
    const d = enterScene(80)
    expect(d(snap({ scene: 80 }), snap({ scene: 62 }), {})).toBe(true)
    expect(d(snap({ scene: 80 }), snap({ scene: 80 }), {})).toBe(false)
    expect(d(snap({ scene: 80 }), null, {})).toBe(true)
  })
  it('leaveScene 仅在离开那一帧触发', () => {
    const d = leaveScene(40)
    expect(d(snap({ scene: 41 }), snap({ scene: 40 }), {})).toBe(true)
    expect(d(snap({ scene: 40 }), snap({ scene: 40 }), {})).toBe(false)
    expect(d(snap({ scene: 40 }), null, {})).toBe(false)
  })
  it('enterAnyScene 任一进入即触发', () => {
    const d = enterAnyScene([164, 165, 147])
    expect(d(snap({ scene: 165 }), snap({ scene: 100 }), {})).toBe(true)
    expect(d(snap({ scene: 165 }), snap({ scene: 164 }), {})).toBe(false) // 已在集合内不重触
    expect(d(snap({ scene: 164 }), null, {})).toBe(true)
    expect(d(snap({ scene: 100 }), null, {})).toBe(false)
    expect(enterAnyScene([])(snap({ scene: 164 }), null, {})).toBe(false)
  })
  it('atSpot 容差矩形', () => {
    const d = atSpot(19, 1000, 500, 10, 5)
    expect(d(snap({ scene: 19, partyX: 1010, partyY: 495 }), null, {})).toBe(true)
    expect(d(snap({ scene: 19, partyX: 1011, partyY: 500 }), null, {})).toBe(false)
    expect(d(snap({ scene: 19, partyX: 1000, partyY: 506 }), null, {})).toBe(false)
    expect(d(snap({ scene: 20, partyX: 1000, partyY: 500 }), null, {})).toBe(false) // 场景不符
  })
  it('bossWon 需 boss 在场且全场血≤0', () => {
    const d = bossWon(75)
    expect(d(snap({ battle: { enemyIds: new Set([75]), totalEnemyHp: 0 } }), null, {})).toBe(true)
    expect(d(snap({ battle: { enemyIds: new Set([75]), totalEnemyHp: 10 } }), null, {})).toBe(false)
    expect(d(snap({ battle: { enemyIds: new Set([12]), totalEnemyHp: 0 } }), null, {})).toBe(false)
    expect(d(snap({ battle: null }), null, {})).toBe(false)
  })
  it('hasItem 只命中背包中的指定物品', () => {
    const d = hasItem(265)
    expect(d(snap({ inventory: new Set([265]) }), null, {})).toBe(true)
    expect(d(snap({ inventory: new Set([266]) }), null, {})).toBe(false)
  })
  it('bgmIs 只命中指定音乐号', () => {
    const d = bgmIs(86)
    expect(d(snap({ music: 86 }), null, {})).toBe(true)
    expect(d(snap({ music: 85 }), null, {})).toBe(false)
  })
  it('caiyi 两段:先见 71 入场,再等其消失/血≤0', () => {
    const d = caiyiDetector(71)
    const mem: Record<string, unknown> = {}
    const untouched: Record<string, unknown> = {}
    // 战前:不触发,也不置位
    expect(d(snap({ battle: null }), null, mem)).toBe(false)
    expect(mem.seen).toBeUndefined()
    // 71 入场:置位但不触发
    expect(d(snap({ battle: { enemyIds: new Set([71]), totalEnemyHp: 100 } }), null, mem)).toBe(
      false,
    )
    expect(mem.seen).toBe(true)
    // 71 还在但血清空:触发
    expect(d(snap({ battle: { enemyIds: new Set([71]), totalEnemyHp: 0 } }), null, mem)).toBe(true)
    expect(d(snap({ battle: null }), null, untouched)).toBe(false)
    expect(untouched.seen).toBeUndefined()
  })
  it('caiyi 第二段:战斗结束(battle=null)也触发', () => {
    const d = caiyiDetector(71)
    const mem = {}
    d(snap({ battle: { enemyIds: new Set([71]), totalEnemyHp: 100 } }), null, mem) // 置位
    expect(d(snap({ battle: null }), null, mem)).toBe(true)
  })
})
