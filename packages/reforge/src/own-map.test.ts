import { describe, expect, test } from 'vitest'
import { buildBlankOwnMap, encodeTileLayer0, paintCells } from './own-map.js'

describe('buildBlankOwnMap', () => {
  test('尺寸 / 全空格(lower·upper=0) / tileset 引用', () => {
    const m = buildBlankOwnMap(3, 2, 'tileset/12.rle')
    expect(m.width).toBe(3)
    expect(m.height).toBe(2)
    expect(m.cells).toHaveLength(2) // rows
    expect(m.cells[0]).toHaveLength(3) // cols
    expect(m.cells[1]?.[2]).toEqual({ lower: 0, upper: 0 })
    expect(m.tileset).toBe('tileset/12.rle')
  })

  test('每格独立对象(改一格不串改别格)', () => {
    const m = buildBlankOwnMap(2, 2, 't')
    const cell = m.cells[0]?.[0]
    if (cell) cell.lower = 99
    expect(m.cells[0]?.[1]?.lower).toBe(0)
    expect(m.cells[1]?.[0]?.lower).toBe(0)
  })
})

describe('encodeTileLayer0(W7c)', () => {
  test('与 render.ts tileIdLayer0 互逆(位 0-7 + 位 12 作第 9 位)', () => {
    const decode = (d: number): number => (d & 0xff) | ((d >> 4) & 0x100) // = tileIdLayer0
    for (const id of [0, 1, 0xff, 0x100, 0x1ff]) {
      expect(decode(encodeTileLayer0(id))).toBe(id)
    }
    expect(encodeTileLayer0(0x100)).toBe(0x1000) // 第 9 位落在位 12
    expect(encodeTileLayer0(5)).toBe(5)
  })
})

describe('paintCells(W7c)', () => {
  test('写子格 word(h=0→lower / h=1→upper);源图不动,未触及行同引用', () => {
    const m = buildBlankOwnMap(3, 3, 't')
    const out = paintCells(m, [
      { col: 1, row: 1, h: 0, word: 7 },
      { col: 2, row: 1, h: 1, word: 9 },
    ])
    expect(out.cells[1]?.[1]).toEqual({ lower: 7, upper: 0 })
    expect(out.cells[1]?.[2]).toEqual({ lower: 0, upper: 9 })
    // 源不变
    expect(m.cells[1]?.[1]).toEqual({ lower: 0, upper: 0 })
    // 未触及行浅共享,触及行新引用
    expect(out.cells[0]).toBe(m.cells[0])
    expect(out.cells[1]).not.toBe(m.cells[1])
  })

  test('界外忽略;全界外 → 返回原图同引用', () => {
    const m = buildBlankOwnMap(2, 2, 't')
    expect(paintCells(m, [{ col: 5, row: 0, h: 0, word: 1 }])).toBe(m)
    const out = paintCells(m, [
      { col: -1, row: 0, h: 0, word: 1 },
      { col: 0, row: 0, h: 0, word: 3 },
    ])
    expect(out.cells[0]?.[0]?.lower).toBe(3)
  })
})
