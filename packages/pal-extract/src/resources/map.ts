/**
 * MAP.MKF + GOP.MKF 解析 —— 目标游戏 1998 Win9x 版瓦片地图。
 *
 * MAP.MKF chunk N:YJ2 压缩,解压后 = 128×64×2 个 u32 LE = 65536 字节固定。
 * GOP.MKF chunk N:sprite chunk(raw,不压缩),每帧 = 一个 tile bitmap。
 *
 * 参考 reference/sdlpal/map.c::PAL_LoadMap。
 * 布局:map->Tiles[128][64][2]。
 *   - [row][col][0] = lower layer u32
 *   - [row][col][1] = upper layer u32
 */
import type { TileCell, Tilemap } from '@type-pal/shared'
import { framesToOut, parseSpriteChunk, type SpriteFrameOut } from './sprite.js'

const MAP_WIDTH_TILES = 64 // sdlpal map.c: Tiles[128][64][2]
const MAP_HEIGHT_TILES = 128

export interface MapResult {
  tilemap: Tilemap
  /** 各 tile 帧(单图集 PNG 在 CLI 总装时拼好;这里只产单帧列表)*/
  tiles: SpriteFrameOut[]
}

/**
 * 把 MAP.MKF chunk 的解压字节 + GOP.MKF chunk 的字节(raw sprite chunk)解析成 { tilemap, tiles }。
 *
 * 调用约定:
 *   - mapBytes:已经过 decompressYj2 的 65536 字节
 *   - gopBytes:readChunk 取出的原始 sprite chunk(GOP.MKF 不做 YJ2 压缩)
 *
 * tileset 字段留空(占位),由 CLI 总装时填 gzip blob 相对路径。
 */
export function parseMap(mapBytes: Uint8Array, gopBytes: Uint8Array): MapResult {
  const expectedSize = MAP_WIDTH_TILES * MAP_HEIGHT_TILES * 2 * 4
  if (mapBytes.byteLength !== expectedSize) {
    throw new Error(
      `parseMap: expected ${expectedSize} bytes, got ${mapBytes.byteLength}`,
    )
  }

  const view = new DataView(mapBytes.buffer, mapBytes.byteOffset, mapBytes.byteLength)

  const cells: TileCell[][] = []
  let off = 0
  for (let row = 0; row < MAP_HEIGHT_TILES; row++) {
    const r: TileCell[] = []
    for (let col = 0; col < MAP_WIDTH_TILES; col++) {
      const lower = view.getUint32(off, true)
      off += 4
      const upper = view.getUint32(off, true)
      off += 4
      r.push({ lower, upper })
    }
    cells.push(r)
  }

  // GOP.MKF chunk = raw sprite chunk (frame array), no YJ2 decompression needed
  const frames = parseSpriteChunk(gopBytes)
  const tiles = framesToOut(frames)

  return {
    tilemap: {
      width: MAP_WIDTH_TILES,
      height: MAP_HEIGHT_TILES,
      cells,
      tileset: '', // filled by CLI when it writes the gzip blob
    },
    tiles,
  }
}
