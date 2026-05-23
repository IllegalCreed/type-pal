import type { Tilemap } from '@type-pal/shared'
import { SCREEN_W, SCREEN_H, type Framebuffer } from './framebuffer.js'

const TILE_W = 32
const TILE_H = 16
const TILE_HALF_W = TILE_W / 2
const ROW_Y_STEP = TILE_H / 2

export interface TileImages {
  get(index: number): { width: number; height: number; indices: Uint8Array } | undefined
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
): void {
  const camPxX = cameraCell.col * TILE_W + (cameraCell.row & 1) * TILE_HALF_W
  const camPxY = cameraCell.row * ROW_Y_STEP
  const offsetX = (SCREEN_W >> 1) - camPxX
  const offsetY = (SCREEN_H >> 1) - camPxY

  for (let r = 0; r < map.height; r++) {
    const rowCells = map.cells[r]!
    const rowPxY = r * ROW_Y_STEP + offsetY
    if (rowPxY + TILE_H <= 0 || rowPxY >= fb.height) continue
    for (let c = 0; c < map.width; c++) {
      const cell = rowCells[c]!
      const cellPxX = c * TILE_W + (r & 1) * TILE_HALF_W + offsetX
      if (cellPxX + TILE_W <= 0 || cellPxX >= fb.width) continue

      // sdlpal map.c:249 —— tile bitmap id 是 9-bit,中间隔位:
      //   id = (d & 0xff) | ((d >> 4) & 0x100)
      // (低 8 位 + bit 12 升到 bit 8)
      const lowerId = (cell.lower & 0xff) | ((cell.lower >> 4) & 0x100)
      const upperId = (cell.upper & 0xff) | ((cell.upper >> 4) & 0x100)
      // sdlpal map.h Tiles[row][col][h] h=0/1 是两个子行,**不是同位置叠加**:
      //   h=0 (lower) → (c*32,        r*16)
      //   h=1 (upper) → (c*32 + 16,   r*16 + 8)
      // 直接画 → upper 整体往右下错开半个 tile,与原版菱形排布一致。
      const lowerImg = tiles.get(lowerId)
      if (lowerImg) blitTile(fb, lowerImg, cellPxX, rowPxY)
      const upperImg = tiles.get(upperId)
      if (upperImg) blitTile(fb, upperImg, cellPxX + TILE_HALF_W, rowPxY + ROW_Y_STEP)
    }
  }
}
