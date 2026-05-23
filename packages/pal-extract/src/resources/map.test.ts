import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { openMkf, readChunk } from '../io/mkf.js'
import { decompressYj2 } from '../io/yj2.js'
import { parseMap } from './map.js'

const MAP_MKF = resolve(__dirname, '../../../../data/raw/MAP.MKF')
const GOP_MKF = resolve(__dirname, '../../../../data/raw/GOP.MKF')

describe('parseMap', () => {
  it('合成 fixture:64×128 全零格 + 空 GOP', () => {
    const mapBytes = new Uint8Array(64 * 128 * 2 * 4)
    // 空 sprite chunk:帧数 = 0(u16 LE)
    const gopBytes = new Uint8Array([0x00, 0x00])
    const result = parseMap(mapBytes, gopBytes)
    expect(result.tilemap.width).toBe(64)
    expect(result.tilemap.height).toBe(128)
    expect(result.tilemap.cells).toHaveLength(128)
    expect(result.tilemap.cells[0]).toHaveLength(64)
    expect(result.tilemap.cells[0]![0]).toEqual({ lower: 0, upper: 0 })
    expect(result.tiles).toHaveLength(0)
  })

  it('尺寸不对抛错', () => {
    const bad = new Uint8Array(100)
    const gop = new Uint8Array([0x00, 0x00])
    expect(() => parseMap(bad, gop)).toThrow('parseMap: expected 65536 bytes')
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
