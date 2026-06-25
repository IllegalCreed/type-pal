import { describe, expect, test } from 'vitest'
import { resolveMove } from './movement.js'

/** 永不阻挡。 */
const open = () => false

describe('resolveMove', () => {
  test('destination open → 走满意图', () => {
    const result = resolveMove({ x: 100, y: 100 }, { dx: 8, dy: 0 }, open)
    expect(result).toEqual({ x: 108, y: 100 })
  })

  test('撞墙(目标被挡, 单轴) → 原地不动', () => {
    const wallRight = (x: number) => x >= 108
    expect(resolveMove({ x: 100, y: 100 }, { dx: 8, dy: 0 }, wallRight)).toEqual({ x: 100, y: 100 })
  })

  // iso 一步 = (±16,±8)：x/16 与 y/8 各变 1，和的奇偶守恒（站立点不变量）。
  // 撞墙必须「原地停」——单轴回退 (±16,0)/(0,±8) 会翻转奇偶 → 站到格缝、之后永久半格。
  test('对角撞墙(整体目标被挡, 单轴本可走) → 原地停, 不滑行', () => {
    const pos = { x: 1216, y: 832 }
    const blockDiag = (x: number, y: number) => x === 1232 && y === 840 // 只挡斜向目标
    expect(resolveMove(pos, { dx: 16, dy: 8 }, blockDiag)).toEqual(pos)
  })

  test('撞墙保持等距格点不变量 (x/16+y/8 偶) — 回归: 单轴滑行致永久半格', () => {
    const pos = { x: 1216, y: 832 } // 76 + 104 = 180 偶
    const blockDiag = (x: number, y: number) => x === 1232 && y === 840
    const r = resolveMove(pos, { dx: 16, dy: 8 }, blockDiag)
    expect((r.x / 16 + r.y / 8) % 2).toBe(0)
  })
})
