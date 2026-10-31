import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { openMkf, readChunk } from '../io/mkf.js'
import { decompressYj2 } from '../io/yj2.js'
import { parseMap } from './map.js'

const MAP_MKF = resolve(__dirname, '../../../../data/raw/MAP.MKF')
const GOP_MKF = resolve(__dirname, '../../../../data/raw/GOP.MKF')

describe('parseMap', () => {
  it('非零byteOffset、跨行和尾格完整u32保留；其余格为0且空GOP不产帧', () => {
    const parent = new Uint8Array(7 + 65536 + 3).fill(0xee)
    const mapBytes = parent.subarray(7, 7 + 65536)
    mapBytes.fill(0)
    const view = new DataView(mapBytes.buffer, mapBytes.byteOffset, mapBytes.byteLength)
    // row0/col0、row0/col1、row1/col0、row127/col63；两半格互异。
    const positions: ReadonlyArray<readonly [number, number]> = [
      [0, 1],
      [4, 2],
      [8, 3],
      [12, 4],
      [512, 5],
      [516, 6],
      [65528, 0xffffffff],
      [65532, 0x80000000],
    ]
    for (const [offset, value] of positions) view.setUint32(offset, value, true)
    const expected = Array.from({ length: 128 }, () =>
      Array.from({ length: 64 }, () => ({ lower: 0, upper: 0 })),
    )
    expected[0]![0] = { lower: 1, upper: 2 }
    expected[0]![1] = { lower: 3, upper: 4 }
    expected[1]![0] = { lower: 5, upper: 6 }
    expected[127]![63] = { lower: 0xffffffff, upper: 0x80000000 }
    expect(parseMap(mapBytes, new Uint8Array([0, 0]))).toEqual({
      tilemap: { width: 64, height: 128, cells: expected, tileset: '' },
      tiles: [],
    })
  })

  it('尺寸不对抛错', () => {
    const bad = new Uint8Array(100)
    const gop = new Uint8Array([0x00, 0x00])
    expect(() => parseMap(bad, gop)).toThrow('parseMap: expected 65536 bytes, got 100')
  })

  it('真实 MAP.MKF chunk 1 解出 cells + 真实 GOP.MKF chunk 1 解出 tiles', () => {
    const mapMkf = openMkf(new Uint8Array(readFileSync(MAP_MKF)))
    const gopMkf = openMkf(new Uint8Array(readFileSync(GOP_MKF)))

    // chunk 0 = "no map" sentinel; chunk 1 = first real map
    const mapChunk = readChunk(mapMkf, 1)
    const gopChunk = readChunk(gopMkf, 1)

    // MAP.MKF chunks are YJ2-compressed (sdlpal map.c:103 Decompress(buf, map->Tiles, ...))
    const mapBytes = decompressYj2(mapChunk)
    // GOP.MKF chunks are raw sprite chunks (map.c:142 PAL_MKFReadChunk without Decompress)
    const gopBytes = gopChunk

    const result = parseMap(mapBytes, gopBytes)

    expect(result.tilemap.cells.length).toBe(128)
    expect(result.tilemap.cells[0]!.length).toBe(64)

    // 至少有一个 tile 不是全零(否则地图就是全空,可能数据有误)
    const anyNonZero = result.tilemap.cells.some((row) =>
      row.some((c) => c.lower !== 0 || c.upper !== 0),
    )
    expect(anyNonZero).toBe(true)

    // tileset 帧数应该大于 0(每张地图有几十到几百个 tile)
    expect(result.tiles.length).toBeGreaterThan(0)
  })
})
