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

  test('对角撞墙(x 被挡, y 开阔) → 沿 y 滑行', () => {
    const wallRight = (x: number) => x >= 108
    expect(resolveMove({ x: 100, y: 100 }, { dx: 8, dy: 8 }, wallRight)).toEqual({ x: 100, y: 108 })
  })

  test('对角撞墙(y 被挡, x 开阔) → 沿 x 滑行', () => {
    const wallDown = (_x: number, y: number) => y >= 108
    expect(resolveMove({ x: 100, y: 100 }, { dx: 8, dy: 8 }, wallDown)).toEqual({ x: 108, y: 100 })
  })
})
