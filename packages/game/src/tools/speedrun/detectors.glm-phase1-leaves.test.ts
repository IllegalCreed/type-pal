/**
 * TEST-GLM-PHASE1-LEAVES-3 L08（tools/speedrun/detectors.ts）— 去重表：
 *  - detectors.test（enter/leave/enterAny 触发帧/atSpot 显式容差/bossWon/hasItem/bgmIs/caiyi
 *    两段与 battle=null）→ 不重复
 *  - 新差异：atSpot 默认容差 ±48/±24 恰好边界、atAnySpot 多点任一命中（完全未覆盖）、
 *    leaveScene prev=null 防御、enterAnyScene 集合外不触发与空集合、caiyiDetector 自定义敌 id。
 * 纯输入命中/不命中边界；不遍历剧情里程碑。
 */
import { describe, expect, it } from 'vitest'
import { atAnySpot, atSpot, caiyiDetector, enterAnyScene, leaveScene } from './detectors.js'
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

describe('L08 detectors 剩余边界', () => {
  it('atSpot 默认容差 ±48/±24：恰好边界命中、超出 1px 不命中', () => {
    const d = atSpot(19, 1000, 500) // 不传 tol → 48/24
    expect(d(snap({ scene: 19, partyX: 1048, partyY: 524 }), null, {})).toBe(true)
    expect(d(snap({ scene: 19, partyX: 1049, partyY: 500 }), null, {})).toBe(false)
    expect(d(snap({ scene: 19, partyX: 1000, partyY: 525 }), null, {})).toBe(false)
    expect(d(snap({ scene: 19, partyX: 952, partyY: 476 }), null, {})).toBe(true) // 负向边界
  })

  it('atAnySpot 多点：任一格命中即真；全部未命中/场景不符为假', () => {
    const d = atAnySpot(164, [
      [0, 0],
      [1000, 500],
    ])
    expect(d(snap({ scene: 164, partyX: 1030, partyY: 510 }), null, {})).toBe(true) // 第二格
    expect(d(snap({ scene: 164, partyX: 10, partyY: 10 }), null, {})).toBe(true) // 第一格
    expect(d(snap({ scene: 164, partyX: 500, partyY: 250 }), null, {})).toBe(false) // 都不中
    expect(d(snap({ scene: 165, partyX: 1000, partyY: 500 }), null, {})).toBe(false) // 场景不符
  })

  it('leaveScene prev=null → false（无前帧不判离开）；enterAnyScene 集合外/空集合不触发', () => {
    expect(leaveScene(40)(snap({ scene: 40 }), null, {})).toBe(false)
    const d = enterAnyScene([164, 165])
    expect(d(snap({ scene: 100 }), snap({ scene: 100 }), {})).toBe(false)
    expect(enterAnyScene([])(snap({ scene: 164 }), null, {})).toBe(false)
  })

  it('caiyiDetector 自定义敌 id：见 72 置位，其消失触发', () => {
    const d = caiyiDetector(72)
    const mem = {}
    expect(d(snap({ battle: { enemyIds: new Set([71]), totalEnemyHp: 10 } }), null, mem)).toBe(
      false,
    ) // 非 72 不置位
    expect(d(snap({ battle: { enemyIds: new Set([72]), totalEnemyHp: 10 } }), null, mem)).toBe(
      false,
    ) // 置位不触发
    expect(d(snap({ battle: { enemyIds: new Set([72, 71]), totalEnemyHp: 3 } }), null, mem)).toBe(
      false,
    )
    expect(d(snap({ battle: null }), null, mem)).toBe(true) // 消失
  })
})
