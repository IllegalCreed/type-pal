/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R15（reforge/battle/battle-positions.ts）。
 * 该文件此前无任何测试。合同：按人数选站位表（>3 钳到 3 人表）、idx 越界 undefined、
 * 敌方 yPosOffset 叠加、敌方 1..5 槽表形状。
 */
import { describe, expect, test } from 'vitest'
import {
  ENEMY_POSITIONS_BY_COUNT,
  getEnemyBasePos,
  getPlayerBasePos,
  PLAYER_POSITIONS_BY_COUNT,
} from './battle-positions.js'

describe('R15 battle-positions', () => {
  test('玩家 1/2/3 人表逐槽坐标；idx 越界 → undefined', () => {
    expect(getPlayerBasePos(1, 0)).toEqual(PLAYER_POSITIONS_BY_COUNT[0]![0])
    expect(getPlayerBasePos(3, 2)).toEqual(PLAYER_POSITIONS_BY_COUNT[2]![2])
    expect(getPlayerBasePos(3, 3)).toBeUndefined()
    expect(getPlayerBasePos(0, 0)).toBeUndefined() // min(-1, 2) → 表 undefined
  })

  test('partyCount > 3 钳到 3 人表（多人扩展前的稳定回退）', () => {
    expect(getPlayerBasePos(5, 1)).toEqual(PLAYER_POSITIONS_BY_COUNT[2]![1])
  })

  test('敌方 yPosOffset 叠加；idx 越界 undefined；>5 钳 5 槽表', () => {
    const base = getEnemyBasePos(5, 2)
    const shifted = getEnemyBasePos(5, 2, 30)
    expect(shifted).toEqual({ x: base!.x, y: base!.y + 30 })
    expect(getEnemyBasePos(5, 5)).toBeUndefined()
    expect(getEnemyBasePos(9, 4)).toEqual(ENEMY_POSITIONS_BY_COUNT[4]![4])
  })

  test('站位表形状：玩家/敌表各 5 档、每档槽位 = 档号 + 1 且坐标有限', () => {
    expect(PLAYER_POSITIONS_BY_COUNT).toHaveLength(5)
    expect(ENEMY_POSITIONS_BY_COUNT).toHaveLength(5)
    PLAYER_POSITIONS_BY_COUNT.forEach((layout, count) => {
      expect(layout).toHaveLength(count + 1)
    })
    ENEMY_POSITIONS_BY_COUNT.forEach((layout, count) => {
      expect(layout).toHaveLength(count + 1)
      for (const pos of layout) {
        expect(Number.isFinite(pos.x)).toBe(true)
        expect(Number.isFinite(pos.y)).toBe(true)
      }
    })
  })
})
