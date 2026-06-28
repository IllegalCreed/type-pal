import type { GridPos } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { resolveMove } from './movement.js'

/** 永不阻挡。 */
const open = () => false

describe('resolveMove(菱形轴 GridPos)', () => {
  test('目标开阔 → 走满意图(单轴步进)', () => {
    const pos: GridPos = { col: 90, row: 14, height: 0 }
    // 右下 = col+1
    expect(resolveMove(pos, { dcol: 1, drow: 0 }, open)).toEqual({ col: 91, row: 14, height: 0 })
    // 左下 = row+1
    expect(resolveMove(pos, { dcol: 0, drow: 1 }, open)).toEqual({ col: 90, row: 15, height: 0 })
  })

  test('撞墙(目标被挡) → 原地不动', () => {
    const pos: GridPos = { col: 90, row: 14, height: 0 }
    const wallRight = (p: GridPos) => p.col >= 91 // 右边一格挡
    expect(resolveMove(pos, { dcol: 1, drow: 0 }, wallRight)).toEqual(pos)
  })

  test('height 随位置保留(移动不改 height)', () => {
    const pos: GridPos = { col: 90, row: 14, height: 3 }
    const r = resolveMove(pos, { dcol: 1, drow: 0 }, open)
    expect(r).toEqual({ col: 91, row: 14, height: 3 })
  })

  test('撞墙保持站位(菱形轴下撞墙即停,无滑行歧义) — 回归: commit e7253ad', () => {
    const pos: GridPos = { col: 90, row: 14, height: 0 }
    const blockTarget = (p: GridPos) => p.col === 91 && p.row === 14
    const r = resolveMove(pos, { dcol: 1, drow: 0 }, blockTarget)
    expect(r).toEqual(pos) // 撞墙 → 原位,不偏移
  })
})
