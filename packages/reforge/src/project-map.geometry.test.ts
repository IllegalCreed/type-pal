import { describe, expect, test } from 'vitest'
import {
  buildBlankProjectMap,
  isLatticeInside,
  latticeCenter,
  latticeInMapRect,
  latticeInRect,
  pixelToLattice,
  projectMapTileBlitRect,
} from './project-map.js'

const SOURCE_A = 'tileset-001'
const blank = () => buildBlankProjectMap(2, 1, SOURCE_A)

describe('lattice 几何', () => {
  test('中心命中往返；奇数行右错半格', () => {
    for (const [col, row, x, y] of [
      [0, 0, 0, 0],
      [0, 1, 16, 8],
      [2, 4, 64, 32],
      [3, 5, 112, 40],
    ] as const) {
      expect(latticeCenter({ col: col, row: row })).toEqual({ x, y })
      expect(pixelToLattice(x, y)).toEqual({ col, row })
    }
    expect(latticeCenter({ col: 1, row: 2 })).toEqual({ x: 32, y: 16 })
    expect(latticeCenter({ col: 1, row: 3 })).toEqual({ x: 48, y: 24 })
  })

  test('矩形枚举两类错排行，端点反序等价', () => {
    const got = latticeInRect(15, 7, 49, 17)
    const expected = [
      { col: 0, row: 1 },
      { col: 1, row: 1 },
      { col: 1, row: 2 },
    ]
    expect(got).toEqual(expected)
    expect(latticeInRect(49, 17, 15, 7)).toEqual(expected)
  })

  test('命中矩形与 tile blit 几何规范化负零', () => {
    const nearOrigin = latticeInRect(-1, -1, 1, 1)
    expect(nearOrigin.some((pos) => Object.is(pos.row, -0) || Object.is(pos.col, -0))).toBe(false)
    expect(projectMapTileBlitRect({ col: 2, row: 3 }, { width: 48, height: 40 })).toEqual({
      x: 64,
      y: 16,
      width: 48,
      height: 40,
    })
  })

  test('地图边界矩形先裁剪再枚举', () => {
    const map = buildBlankProjectMap(3, 2, SOURCE_A)
    const got = latticeInMapRect(map, -1e9, -1e9, 1e9, 1e9)
    expect(got).toHaveLength(map.width * map.height * 2)
    expect(got[0]).toEqual({ col: 0, row: 0 })
    expect(got.at(-1)).toEqual({ col: 2, row: 3 })
  })
})

describe('lattice 的界限与负坐标', () => {
  test('isLatticeInside 四边精确拒绝；界外像素命中最近格', () => {
    const map = blank()
    expect(isLatticeInside(map, { col: 0, row: 0 })).toBe(true)
    expect(isLatticeInside(map, { col: 1, row: 1 })).toBe(true)
    expect(isLatticeInside(map, { col: 2, row: 0 })).toBe(false)
    expect(isLatticeInside(map, { col: 0, row: 2 })).toBe(false)
    expect(isLatticeInside(map, { col: -1, row: 0 })).toBe(false)
    // 视口外的负坐标像素折回最近错排格（模运算归一）。
    expect(pixelToLattice(-1, -1)).toEqual({ col: 0, row: 0 })
  })

  test('latticeInRect 全图外矩形与 -0 规范化', () => {
    // 界外枚举允许负 row/col（调用方写入函数负责忽略）。
    expect(latticeInRect(-100, -100, -90, -90)).toEqual([{ col: -3, row: -12 }])
    // 端点落在 -0 时不产生 -0 键。
    const got = latticeInRect(-0, 0, 0, 0)
    expect(got).toEqual([{ col: 0, row: 0 }])
    expect(Object.is(got[0]?.col, -0)).toBe(false)
    expect(Object.is(got[0]?.row, -0)).toBe(false)
  })
})
