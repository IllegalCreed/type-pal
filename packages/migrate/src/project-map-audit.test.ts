import { formatProjectMap } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { auditAndConvertSourceMaps, type SourceMapAuditEntry } from './project-map-audit.js'

function sourceMap(mapNum: number, lower: number, upper: number): SourceMapAuditEntry {
  const source = {
    width: 1,
    height: 1,
    tileset: `tileset/${mapNum}.rle`,
    cells: [[{ lower, upper }]],
  }
  return {
    mapNum,
    source,
    sourceJsonBytes: new TextEncoder().encode(JSON.stringify(source)).length,
  }
}

describe('PAL 原始地图审计', () => {
  test('统计半格、碰撞和同瓦片的异高实例，证明已建模的位可往返', () => {
    const source = sourceMap(1, 2, 0x0105_2302)
    const { report } = auditAndConvertSourceMaps([source])
    expect(report).toMatchObject({
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
      sourceJsonBytes: source.sourceJsonBytes,
    })
  })

  test('保留残差的原始位与半格坐标，单独统计不可往返的原始位', () => {
    const { report } = auditAndConvertSourceMaps([sourceMap(3, 0, 0x2005_4001)])
    expect(report.residualWordCount).toBe(1)
    expect(report.residualWords).toEqual([
      { mapNum: 3, row: 0, col: 0, sub: 1, word: 0x2005_4001, residualBits: 0x2000_4000 },
    ])
    expect(report.rawRoundTripMismatchCount).toBe(1)
    expect(report.semanticRoundTripMismatchCount).toBe(0)
  })

  test('拒绝不能装进一个 PAL 原始字的半格数值，并定位到原图', () => {
    const error = 'tilemap.cells[0][0].lower'
    expect(() => auditAndConvertSourceMaps([sourceMap(12, 0x1_0000_0000, 0)])).toThrow(error)
    expect(() => auditAndConvertSourceMaps([sourceMap(12, 0, -1)])).toThrow(
      'tilemap.cells[0][0].upper',
    )
    expect(() => auditAndConvertSourceMaps([sourceMap(12, 2.5, 0)])).toThrow(error)
  })

  test('保留最大合法无符号字的原值、解码结果和残差位', () => {
    const { maps, report } = auditAndConvertSourceMaps([sourceMap(1, 0xffff_ffff, 0)])
    expect(maps.get(1)?.layers[0]?.tiles[0]).toEqual([511])
    expect(report.residualWords).toEqual([
      { mapNum: 1, row: 0, col: 0, sub: 0, word: 0xffff_ffff, residualBits: 0xe000_c000 },
    ])
  })

  test('记录空覆盖层的孤立高度，转换结果没有该实例', () => {
    const { maps, report } = auditAndConvertSourceMaps([sourceMap(4, 0, 0x0100_0000)])
    expect(report.emptyLayer1NonzeroHeightCount).toBe(1)
    expect(report.emptyLayer1NonzeroHeightWords).toEqual([
      { mapNum: 4, row: 0, col: 0, sub: 1, word: 0x0100_0000, height: 1 },
    ])
    expect(maps.get(4)?.layers[1]).toMatchObject({ tiles: [[null], [null]] })
    expect(maps.get(4)?.layers[1]?.heights).toBeUndefined()
    expect(report.rawRoundTripMismatchCount).toBe(1)
    expect(report.semanticRoundTripMismatchCount).toBe(0)
  })

  test('精确拒绝重复的源地图编号', () => {
    expect(() => auditAndConvertSourceMaps([sourceMap(3, 1, 0), sourceMap(3, 2, 0)])).toThrow(
      '重复源地图编号 3',
    )
  })

  test('报告按可发布地图的 UTF-8 实际字节数累计', () => {
    const first = sourceMap(6, 0, 0)
    const second = sourceMap(7, 0x0106_2203, 0x0901_0f00)
    const { maps, report } = auditAndConvertSourceMaps([first, second])
    const documents = [...maps.values()].map(formatProjectMap)
    const encoder = new TextEncoder()
    const projectBytes = documents.reduce((total, body) => total + encoder.encode(body).length, 0)
    const sourceBytes = first.sourceJsonBytes + second.sourceJsonBytes
    expect(documents).toHaveLength(2)
    expect(projectBytes).toBeGreaterThan(documents.join('').length)
    expect(report).toMatchObject({
      sourceJsonBytes: sourceBytes,
      projectMapJsonBytes: projectBytes,
      sizeRatio: projectBytes / sourceBytes,
    })
  })

  test('没有来源字节计量时，不用零作分母', () => {
    const source = { ...sourceMap(3, 0, 0), sourceJsonBytes: 0 }
    const { report } = auditAndConvertSourceMaps([source])
    expect(report.sourceJsonBytes).toBe(0)
    expect(report.sizeRatio).toBe(0)
  })
})
