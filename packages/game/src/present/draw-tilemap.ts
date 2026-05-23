import type { Tilemap } from '@type-pal/shared'
import { SCREEN_W, SCREEN_H, type Framebuffer } from './framebuffer.js'

const TILE_W = 32
const TILE_H = 16
const TILE_HALF_W = TILE_W / 2
// sdlpal map.c:398-414 真实公式:每 y 步进 16 (= TILE_H);h sub-row 在 y 方向 +8。
const ROW_Y_STEP = TILE_H
const SUBROW_Y_STEP = TILE_H / 2 // h=1 相对 h=0 的 Y 偏移

export interface TileImages {
  get(index: number): { width: number; height: number; indices: Uint8Array } | undefined
}

/**
 * Tilemap 渲染分两层(sdlpal map.c PAL_MapGetTileBitmap):
 * - layer 0 (bottom):地砖、墙基,玩家走在它"之上"。先画。
 * - layer 1 (top):门、柜子侧面、柱子,**画在精灵之上**做遮挡。后画(精灵之后)。
 *
 * 每 u32 cell 同时编码两个 9-bit tile id:
 *   layer 0: (d        & 0xff) | ((d        >> 4) & 0x100)
 *   layer 1: ((d>>16)  & 0xff) | (((d>>16)  >> 4) & 0x100) - 1   (id 0 = 无,跳过)
 */
export type TileLayer = 0 | 1

function tileIdLayer0(d: number): number {
  return (d & 0xff) | ((d >> 4) & 0x100)
}

function tileIdLayer1(d: number): number {
  const hi = d >>> 16
  return ((hi & 0xff) | ((hi >> 4) & 0x100)) - 1
}

function blitTile(
  fb: Framebuffer,
  tile: { width: number; height: number; indices: Uint8Array },
  dstX: number,
  dstY: number,
): void {
  for (let y = 0; y < tile.height; y++) {
    for (let x = 0; x < tile.width; x++) {
      const idx = tile.indices[y * tile.width + x]!
      if (idx === 0) continue
      fb.writePixel(dstX + x, dstY + y, idx)
    }
  }
}

export function drawTilemap(
  fb: Framebuffer,
  map: Tilemap,
  tiles: TileImages,
  cameraCell: { col: number; row: number },
  layer: TileLayer,
): void {
  const camPxX = cameraCell.col * TILE_W
  const camPxY = cameraCell.row * ROW_Y_STEP
  const offsetX = (SCREEN_W >> 1) - camPxX
  const offsetY = (SCREEN_H >> 1) - camPxY

  const idFn = layer === 0 ? tileIdLayer0 : tileIdLayer1

  for (let r = 0; r < map.height; r++) {
    const rowCells = map.cells[r]!
    const rowPxY = r * ROW_Y_STEP + offsetY
    if (rowPxY + TILE_H <= 0 || rowPxY >= fb.height) continue
    for (let c = 0; c < map.width; c++) {
      const cell = rowCells[c]!
      const cellPxX = c * TILE_W + offsetX
      if (cellPxX + TILE_W <= 0 || cellPxX >= fb.width) continue

      // sdlpal map.c:398-414:h=0 (lower) at (col*32, row*16);h=1 (upper) at (col*32+16, row*16+8)
      const lowerId = idFn(cell.lower)
      if (lowerId >= 0) {
        const img = tiles.get(lowerId)
        if (img) blitTile(fb, img, cellPxX, rowPxY)
      }
      const upperId = idFn(cell.upper)
      if (upperId >= 0) {
        const img = tiles.get(upperId)
        if (img) blitTile(fb, img, cellPxX + TILE_HALF_W, rowPxY + SUBROW_Y_STEP)
      }
    }
  }
}
