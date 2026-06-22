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
import { type RleFrame, parseSpriteChunk } from '@type-pal/shared'
import type { TileCell, Tilemap } from '@type-pal/shared'

const MAP_WIDTH_TILES = 64 // sdlpal map.c: Tiles[128][64][2]
const MAP_HEIGHT_TILES = 128

export interface MapResult {
  tilemap: Tilemap
  /** 各 tile 帧(已解 RLE 的原始帧;tileset 资源管线优化后 CLI 不再逐 tile 编 PNG,
   *  而是 gzip 原始 GOP chunk。此处保留帧列表仅供计数 / 测试,不再做 PNG 编码。*/
  tiles: RleFrame[]
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

  // GOP.MKF chunk = raw sprite chunk (frame array), no YJ2 decompression needed.
  // 只解帧(便宜),不再 framesToOut 编 PNG —— tileset 改存 gzip 原始 chunk(见 cli.ts)。
  const tiles = parseSpriteChunk(gopBytes)

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
