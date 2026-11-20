import { describe, expect, test } from 'vitest'
import {
  convertSourceTilemap,
  decodeSourceMapWord,
  mapIdFromSourceNumber,
  sourceWordFromProjectMap,
  tilesetIdFromSourceNumber,
} from './project-map-converter.js'

describe('PAL 地图位与 ProjectMap 转换', () => {
  test('固定原始字分别还原两层最大 tile、实例高度与碰撞位', () => {
    // PAL_MapGetTileBitmap、PAL_MapGetTileHeight、PAL_MapTileIsBlocked 各自消费的位。
    expect(decodeSourceMapWord(0x1fff_3fff)).toEqual({
      layer0Tile: 511,
      layer0Height: 15,
      layer1Tile: 510,
      layer1Height: 15,
      collision: 1,
      residualBits: 0,
      encodedLayer1Tile: 511,
    })
  })

  test('两个 PAL 半格展开为独立层，并回编码到原字', () => {
    const map = convertSourceTilemap(1, {
      width: 1,
      height: 1,
      tileset: 'tileset/1.rle',
      cells: [[{ lower: 0x1fff_3fff, upper: 0 }]],
    })
    expect(map).toMatchObject({
      version: 4,
      tilesetRefs: ['tileset-001'],
      width: 1,
      height: 1,
    })
    expect(map.layers).toEqual([
      {
        id: 'layer-0',
        name: '下层',
        tiles: [[511], [0]],
        sources: [[0], [0]],
        heights: [[15], [0]],
      },
      {
        id: 'layer-1',
        name: '上层',
        tiles: [[510], [null]],
        sources: [[0], [null]],
        heights: [[15], [0]],
      },
    ])
    expect(map.collision).toEqual([[1], [0]])
    expect(sourceWordFromProjectMap(map, 0, 0)).toBe(0x1fff_3fff)
    expect(sourceWordFromProjectMap(map, 1, 0)).toBe(0)
  })

  test('平地地图省略全零实例高度', () => {
    const { layers } = convertSourceTilemap(2, {
      width: 1,
      height: 1,
      tileset: 'tileset/2.rle',
      cells: [[{ lower: 0x0001_0004, upper: 0x0000_0005 }]],
    })
    expect(layers.map(({ heights }) => heights)).toEqual([undefined, undefined])
    expect(layers.map(({ tiles }) => tiles)).toEqual([
      [[4], [5]],
      [[0], [null]],
    ])
  })

  test('地图与瓦片集 id 使用稳定的三位源编号', () => {
    expect(mapIdFromSourceNumber(1)).toBe('map-001')
    expect(mapIdFromSourceNumber(104)).toBe('map-104')
    expect(tilesetIdFromSourceNumber(1)).toBe('tileset-001')
    expect(() => mapIdFromSourceNumber(0)).toThrow('mapNum: 期望正整数，收到 0')
  })
})
