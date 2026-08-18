import { latticeCenter } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { isometricBrushDraftRowExtension, isometricBrushPoints } from './isometric-brush.js'

describe('isometricBrushPoints', () => {
  test.each([
    [
      '偶数行',
      { row: 2, col: 3 },
      [
        { row: 2, col: 3 },
        { row: 3, col: 3 },
        { row: 3, col: 2 },
        { row: 4, col: 3 },
      ],
    ],
    [
      '奇数行',
      { row: 3, col: 3 },
      [
        { row: 3, col: 3 },
        { row: 4, col: 4 },
        { row: 4, col: 3 },
        { row: 5, col: 3 },
      ],
    ],
  ] as const)('2 × 2 沿菱形 row/col 双轴展开（%s）', (_label, anchor, expected) => {
    const points = isometricBrushPoints(anchor, 2)
    expect(points).toEqual(expected)

    const origin = latticeCenter(anchor)
    expect(points.map(latticeCenter)).toEqual([
      origin,
      { x: origin.x + 16, y: origin.y + 8 },
      { x: origin.x - 16, y: origin.y + 8 },
      { x: origin.x, y: origin.y + 16 },
    ])
  })

  test('3 × 3 是菱形双轴九格，不会退化为 raw row/col 矩形', () => {
    const points = isometricBrushPoints({ row: 2, col: 3 }, 3)
    expect(points).toHaveLength(9)
    expect(points).toContainEqual({ row: 6, col: 3 })
    expect(points).not.toContainEqual({ row: 2, col: 4 })
  })

  test('5 × 5 是菱形双轴二十五格，草稿边界覆盖最远偏移', () => {
    const points = isometricBrushPoints({ row: 2, col: 3 }, 5)
    expect(points).toHaveLength(25)
    expect(points).toContainEqual({ row: 10, col: 3 })
    expect(isometricBrushDraftRowExtension(5)).toBe(6)
  })
})
