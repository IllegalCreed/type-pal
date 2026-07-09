import { describe, expect, test } from 'vitest'
import { buildBlankOwnMap } from './own-map.js'

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
