import { validateProjectMap } from '@type-pal/content'
import type { Tilemap } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { convertSourceTilemap, decodeSourceMapWord } from './project-map-converter.js'

function twoRowSource(): Tilemap {
  // 位图索引、覆盖层的 +1 编码和半格碰撞位取自 reference/sdlpal/map.c。
  return {
    width: 2,
    height: 2,
    tileset: 'tileset/12.rle',
    cells: [
      [
        { lower: 0x0106_2203, upper: 0x0901_0f00 },
        { lower: 7, upper: 0x17ff_3300 },
      ],
      [
        { lower: 10, upper: 12 },
        { lower: 11, upper: 13 },
      ],
    ],
  }
}

describe('PAL 地图输入与格点投影', () => {
  test('两行逻辑格展开为四行半格，并保留输入和每格高度', () => {
    const source = twoRowSource()
    const originalCells = structuredClone(source.cells)
    const map = convertSourceTilemap(12, source)
    expect([map.width, map.height]).toEqual([2, 2])
    expect(map.layers[0]!.tiles).toEqual([
      [3, 7],
      [0, 256],
      [10, 11],
      [12, 13],
    ])
    expect(map.layers[0]!.heights).toEqual([
      [2, 0],
      [15, 3],
      [0, 0],
      [0, 0],
    ])
    expect(map.layers[1]!.tiles).toEqual([
      [5, null],
      [0, 510],
      [null, null],
      [null, null],
    ])
    expect(map.layers[1]!.heights).toEqual([
      [1, 0],
      [9, 7],
      [0, 0],
      [0, 0],
    ])
    expect(map.collision).toEqual([
      [1, 0],
      [0, 1],
      [0, 0],
      [0, 0],
    ])
    expect(validateProjectMap(map)).toEqual(map)
    expect(source.cells).toEqual(originalCells)
  })

  test('拒绝声明尺寸和实际行或列不符的源图', () => {
    const source = twoRowSource()
    expect(() => convertSourceTilemap(12, { ...source, width: 3 })).toThrow(
      'tilemap.cells[0]: 期望 3 列，收到 2',
    )
    expect(() => convertSourceTilemap(12, { ...source, height: 3 })).toThrow(
      'tilemap.cells: 期望 3 行，收到 2',
    )
  })

  test('独立读取碰撞位，区分空覆盖层与编号 0 的覆盖瓦片', () => {
    expect(decodeSourceMapWord(0x2001)).toMatchObject({ layer0Tile: 1, collision: 1 })
    expect(decodeSourceMapWord(0x0001)).toMatchObject({ layer0Tile: 1, collision: 0 })
    expect(decodeSourceMapWord(0x0001_0000)).toMatchObject({ layer1Tile: 0, encodedLayer1Tile: 1 })
    expect(decodeSourceMapWord(0)).toMatchObject({ layer1Tile: null, encodedLayer1Tile: 0 })
  })
})
