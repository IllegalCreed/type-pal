import { describe, it, expect, expectTypeOf } from 'vitest'
import type { Tilemap, TileCell, Palette } from './resources.js'

describe('resources types', () => {
  it('Tilemap 有必要字段', () => {
    expectTypeOf<Tilemap>().toMatchTypeOf<{ width: number; height: number; cells: TileCell[][]; tilesetImage: string }>()
  })
  it('TileCell 有 lower 和 upper 字段', () => {
    const cell: TileCell = { lower: 0x1234, upper: 0xabcd }
    expect(cell.lower).toBe(0x1234)
    expect(cell.upper).toBe(0xabcd)
  })
  it('Palette colors 是三元组', () => {
    const p: Palette = { colors: [[0, 0, 0]], cycles: [] }
    expect(p.colors[0]).toEqual([0, 0, 0])
  })
})
