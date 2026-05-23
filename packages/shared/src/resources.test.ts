import { describe, it, expect, expectTypeOf } from 'vitest'
import type { Tilemap, TileCell, Palette, SceneObjects, SceneEventObject } from './resources.js'

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

describe('SceneObjects', () => {
  it('单个 eventObject 字段', () => {
    const eo: SceneEventObject = {
      id: 5,
      x: 10,
      y: 20,
      spriteNum: 78,
      triggerLabel: 'L_59',
      autoLabel: 'L_71',
    }
    expect(eo.id).toBe(5)
  })

  it('SceneObjects 整体', () => {
    const so: SceneObjects = {
      sceneId: 1,
      mapNum: 12,
      onEnterLabel: 'L_0',
      eventObjects: [],
    }
    expect(so.eventObjects).toEqual([])
  })

  it('triggerLabel / autoLabel 可缺', () => {
    const eo: SceneEventObject = { id: 0, x: 0, y: 0, spriteNum: 0 }
    expect(eo.triggerLabel).toBeUndefined()
  })
})
