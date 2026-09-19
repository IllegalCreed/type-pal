/**
 * TEST-MIGRATION-BOUNDARIES-1 T04/T05：converter 子格独立与 audit 单轴。
 * 既有 converter.test 已覆盖逐位/id/residual 统计主干——不重复。本文件：两行非对称
 * 上下子格独立矩阵、audit 重复 mapNum 拒绝、residual 与 empty-upper 坐标完整、
 * sourceJsonBytes0 比率 0、源 shape 行列缺口单轴、输入保真。
 */
import { validateProjectMap } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { Tilemap } from '@type-pal/shared'
import { convertSourceTilemap, decodeSourceMapWord } from './project-map-converter.js'
import { auditAndConvertSourceMaps } from './project-map-audit.js'

function tilemap(cells: Array<Array<[number, number]>>): Tilemap {
  return {
    width: cells[0]!.length,
    height: cells.length,
    cells: cells.map((row) => row.map(([lower, upper]) => ({ lower, upper }))),
  } as unknown as Tilemap
}

describe('T04 convertSourceTilemap 子格独立', () => {
  test('两行非对称上下子格：四行 matrices 逐格独立、heights 缺省省略、过 validateProjectMap、输入保真', () => {
    const w = (l0: number, h0: number, l1: number | null, h1: number, collision: number) => {
      // 手工组 word：借 encode 语义直接位拼（与 decode 相互独立的位级手写）
      let word = l0 & 0xff
      word |= (l0 & 0x100) << 4
      word |= (h0 & 0x0f) << 8
      if (collision) word |= 0x2000
      const e1 = l1 === null ? 0 : l1 + 1
      word |= (e1 & 0xff) << 16
      word |= (h1 & 0x0f) << 24
      word |= (e1 & 0x100) << 20
      return word >>> 0
    }
    // (0,0)下:tile3/h2/上层5/h1/碰撞；(0,0)上:tile7/h0/无上层；
    // (1,0)下:tile0/h15/上层0/h9；(1,0)上:tile256/h3/上层510/h7（0x1ff 编码上限）
    // width=2 / height=1：一行两 cell，每 cell=[lower, upper]
    const source = tilemap([
      [
        [w(3, 2, 5, 1, 1), w(0, 15, 0, 9, 0)],
        [w(7, 0, null, 0, 0), w(256, 3, 510, 7, 1)],
      ],
    ])
    const snapshot = JSON.parse(JSON.stringify(source.cells))
    const map = convertSourceTilemap(12, source)
    expect(map.version).toBe(4)
    expect(map.width).toBe(2)
    expect(map.height).toBe(1)
    expect(map.tilesetRefs).toEqual(['tileset-012'])
    // 两行（height*2）逐格独立：row0=两 cell 的 lower、row1=两 cell 的 upper
    expect(map.layers[0]!.tiles).toEqual([
      [3, 7],
      [0, 256],
    ])
    expect(map.layers[0]!.heights).toEqual([
      [2, 0],
      [15, 3],
    ])
    expect(map.layers[1]!.tiles).toEqual([
      [5, null],
      [0, 510],
    ])
    expect(map.layers[1]!.heights).toEqual([
      [1, 0],
      [9, 7],
    ])
    expect(map.collision).toEqual([
      [1, 0],
      [0, 1],
    ])
    expect(validateProjectMap(map)).toEqual(map) // 合法输出过现行守卫（validator 归一化新对象）
    expect(JSON.parse(JSON.stringify(source.cells))).toEqual(snapshot) // 输入保真
  })
  test('源 shape 单轴：宽缺口/行缺口精确拒绝', () => {
    const bad = {
      width: 3,
      height: 2,
      cells: [
        [{ lower: 0, upper: 0 }, { lower: 0, upper: 0 }],
        [{ lower: 0, upper: 0 }, { lower: 0, upper: 0 }],
      ],
    } as unknown as Tilemap
    expect(() => convertSourceTilemap(1, bad)).toThrow('tilemap.cells[0]: 期望 3 列，收到 2')
    const badRows = {
      width: 2,
      height: 3,
      cells: [
        [{ lower: 0, upper: 0 }, { lower: 0, upper: 0 }],
        [{ lower: 0, upper: 0 }, { lower: 0, upper: 0 }],
      ],
    } as unknown as Tilemap
    expect(() => convertSourceTilemap(1, badRows)).toThrow('tilemap.cells: 期望 3 行，收到 2')
  })
})

describe('T05 auditAndConvertSourceMaps 单轴', () => {
  test('重复 mapNum 拒绝；residual/empty-upper 完整坐标；bytes0 比率 0', () => {
    // residual bits 14-15（0xC000）与 29-31（0xE0000000）；upper 层1 有 tile 但 height 编码位错位轴
    const word = (base: number, extra: number) => (base | extra) >>> 0
    const upperWithTile = (1 + 4) << 16 // layer1 tile 4
    const source = tilemap([
      [
        [word(0x0001 | 0x4000, 0x20000000 | upperWithTile), 0],
        [0, 0],
      ],
    ])
    const result = auditAndConvertSourceMaps([{ mapNum: 3, source, sourceJsonBytes: 0 }])
    const report = result.report
    expect(report.mapCount).toBe(1)
    expect(report.residualWordCount).toBe(1)
    expect(report.residualWords).toEqual([
      {
        mapNum: 3,
        row: 0,
        col: 0,
        sub: 0,
        word: word(0x0001 | 0x4000, 0x20000000 | upperWithTile),
        residualBits: 0x4000 | 0x20000000,
      },
    ])
    // 重复 mapNum
    expect(() =>
      auditAndConvertSourceMaps([
        { mapNum: 3, source, sourceJsonBytes: 0 },
        { mapNum: 3, source, sourceJsonBytes: 0 },
      ]),
    ).toThrow()
    // sourceJsonBytes 0 → 比率 0（不除零）
    expect(report.sourceJsonBytes).toBe(0)
    expect(report.sizeRatio).toBe(0)
  })
  test('decode 独立轴：碰撞位与上层 0 哨兵', () => {
    expect(decodeSourceMapWord(0x2001)).toMatchObject({ layer0Tile: 1, collision: 1 })
    expect(decodeSourceMapWord(0x0001)).toMatchObject({ collision: 0 })
    expect(decodeSourceMapWord(0x00010000)).toMatchObject({ layer1Tile: 0, encodedLayer1Tile: 1 })
    expect(decodeSourceMapWord(0)).toMatchObject({ layer1Tile: null, encodedLayer1Tile: 0 })
  })
})
