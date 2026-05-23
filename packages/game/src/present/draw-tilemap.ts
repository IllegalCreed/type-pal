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

      // M2 简化:lower / upper 都画在同一 cell 位置 (cellPxX, rowPxY)。
      // sdlpal map.h 实际 Tiles[row][col][h] h=0/1 是子行,位置不同:
      //   h=0 → (c*32, r*16)
      //   h=1 → (c*32+16, r*16+8)
      // 若 Task 22 dev 验证发现 tile 错位 / 重叠,upper 改画到 (cellPxX + 16, rowPxY + 8)。
      const lowerImg = tiles.get(cell.lower & 0xff)
      if (lowerImg) blitTile(fb, lowerImg, cellPxX, rowPxY)
      const upperImg = tiles.get(cell.upper & 0xff)
      if (upperImg) blitTile(fb, upperImg, cellPxX, rowPxY)
    }
  }
}
