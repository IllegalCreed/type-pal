import type { Tilemap } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { auditAndConvertSourceMaps } from './project-map-audit.js'
import {
  convertSourceTilemap,
  decodeSourceMapWord,
  encodeProjectMapWord,
  mapIdFromSourceNumber,
  sourceWordFromProjectMap,
  tilesetIdFromSourceNumber,
} from './project-map-converter.js'
import { mapNameFromSourceNumber } from './pal-map-names.js'

function source(words: [number, number][]): Tilemap {
  return {
    width: words.length,
    height: 1,
    cells: [words.map(([lower, upper]) => ({ lower, upper }))],
    tileset: 'tileset/1.rle',
  }
}

describe('旧地图到 ProjectMap', () => {
  test('逐位覆盖两层 tile、高度、碰撞、空上层与 0/15 边界', () => {
    const a = encodeProjectMapWord(0x1ff, 15, 0x1fe, 15, 1)
    const b = encodeProjectMapWord(0, 0, null, 0, 0)
    expect(decodeSourceMapWord(a)).toMatchObject({
      layer0Tile: 0x1ff,
      layer0Height: 15,
      layer1Tile: 0x1fe,
      layer1Height: 15,
      collision: 1,
      residualBits: 0,
    })
    expect(decodeSourceMapWord(b).layer1Tile).toBeNull()

    const input = source([[a, b]])
    const map = convertSourceTilemap(1, input)
    expect(map).toMatchObject({
      version: 4,
      tilesetRefs: ['tileset-001'],
      width: 1,
      height: 1,
    })
    expect(map.layers[0]!.tiles).toEqual([[0x1ff], [0]])
    expect(map.layers[0]!.sources).toEqual([[0], [0]])
    expect(map.layers[0]!.heights).toEqual([[15], [0]])
    expect(map.layers[1]!.tiles).toEqual([[0x1fe], [null]])
    expect(map.layers[1]!.sources).toEqual([[0], [null]])
    expect(map.layers[1]!.heights).toEqual([[15], [0]])
    expect(map.collision).toEqual([[1], [0]])
    expect(sourceWordFromProjectMap(map, 0, 0)).toBe(a)
    expect(sourceWordFromProjectMap(map, 1, 0)).toBe(b)
  })

  test('稳定 id 使用三位源编号', () => {
    expect(mapIdFromSourceNumber(1)).toBe('map-001')
    expect(mapIdFromSourceNumber(104)).toBe('map-104')
    expect(tilesetIdFromSourceNumber(1)).toBe('tileset-001')
    expect(() => mapIdFromSourceNumber(0)).toThrow('正整数')
  })

  test('地图显示名只采用考据真值或精确未命名 allowlist', () => {
    expect(mapNameFromSourceNumber(1)).toBe('盛渔村')
    expect(mapNameFromSourceNumber(23)).toBe('苏州城')
    expect(mapNameFromSourceNumber(174)).toBe('女娲神庙外雨季')
    expect(mapNameFromSourceNumber(225)).toBe('试炼窟遗迹')
    expect(mapNameFromSourceNumber(104)).toBe('PAL 地图 104')
    expect(mapNameFromSourceNumber(164)).toBe('PAL 地图 164')
    expect(() => mapNameFromSourceNumber(0)).toThrow('正整数')
    expect(() => mapNameFromSourceNumber(-1)).toThrow('正整数')
    expect(() => mapNameFromSourceNumber(1.5)).toThrow('正整数')
    expect(() => mapNameFromSourceNumber(999)).toThrow('999')
  })

  test('审计报告统计实例并证明逐 word 往返', () => {
    const input = source([
      [encodeProjectMapWord(2, 0, null, 0, 0), encodeProjectMapWord(2, 3, 4, 1, 1)],
    ])
    const result = auditAndConvertSourceMaps([{ mapNum: 1, source: input, sourceJsonBytes: 1000 }])
    expect(result.report).toMatchObject({
      mapCount: 1,
      latticeInstances: 2,
      residualWordCount: 0,
      emptyLayer1NonzeroHeightCount: 0,
      layer0NonzeroHeightCount: 1,
      layer1NonzeroHeightCount: 1,
      collisionInstanceCount: 1,
      multiHeightTilesetTileCount: 1,
      rawRoundTripMismatchCount: 0,
      semanticRoundTripMismatchCount: 0,
      sourceJsonBytes: 1000,
    })
  })

  test('引擎未读取的残差位与空上层孤立高度显式报告并规范化', () => {
    const residual = auditAndConvertSourceMaps([
      { mapNum: 1, source: source([[0x4000, 0]]), sourceJsonBytes: 1 },
    ]).report
    expect(residual.residualWordCount).toBe(1)
    expect(residual.rawRoundTripMismatchCount).toBe(1)
    expect(residual.semanticRoundTripMismatchCount).toBe(0)
    expect(residual.residualWords[0]).toMatchObject({ mapNum: 1, row: 0, col: 0, sub: 0 })
    const orphanHeight = auditAndConvertSourceMaps([
      { mapNum: 1, source: source([[0x01000000, 0]]), sourceJsonBytes: 1 },
    ]).report
    expect(orphanHeight.emptyLayer1NonzeroHeightCount).toBe(1)
    expect(orphanHeight.emptyLayer1NonzeroHeightWords[0]).toMatchObject({ height: 1 })
    expect(orphanHeight.semanticRoundTripMismatchCount).toBe(0)
  })
})
