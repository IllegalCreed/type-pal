import type { Tilemap } from '@type-pal/shared'
import { SCREEN_W, SCREEN_H, type Framebuffer } from './framebuffer.js'

const TILE_W = 32
const TILE_H = 16
const TILE_HALF_W = TILE_W / 2
// sdlpal map.c:398-414 真实公式:每 y 步进 16 (= TILE_H);h sub-row 在 y 方向 +8。
const ROW_Y_STEP = TILE_H
const SUBROW_Y_STEP = TILE_H / 2 // h=1 相对 h=0 的 Y 偏移

export interface TileImage {
  width: number
  height: number
  indices: Uint8Array
  /** opaque mask(M3.5 fix):1 = 写入,0 = RLE-skip 透明跳过。
   *  之前 blit 用 `idx === 0 continue` 把 RLE-skip 与 opaque-palette-0 合并 → scene 16
   *  dense tile palette-0 像素被透明 → "梯子状"杂乱。改 `opaque[i] === 0 continue`。 */
  opaque: Uint8Array
}

export interface TileImages {
  get(index: number): TileImage | undefined
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
  tile: TileImage,
  dstX: number,
  dstY: number,
): void {
  for (let y = 0; y < tile.height; y++) {
    for (let x = 0; x < tile.width; x++) {
      const srcOff = y * tile.width + x
      // M3.5 fix:用 opaque mask 判透明,不再用 `idx === 0`。允许 opaque palette-0
      // 被画出来(scene 16 通道 dense tile 真的有 opaque idx 0 像素)。
      if (tile.opaque[srcOff] === 0) continue
      fb.writePixel(dstX + x, dstY + y, tile.indices[srcOff]!)
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

  // sdlpal map.c:382-417 PAL_MapBlitToSurface 真实公式:
  //   yPos = -8 + 16*y + 8*h   (h=0 在 row baseline 上方 8 px;h=1 在 row baseline)
  //   xPos = 32*x + 16*h - 16  (h=0 在 col baseline 左 16 px;h=1 在 col baseline)
  // 我们的 cell.lower = Tiles[y][x][0] = h=0 DWORD,cell.upper = Tiles[y][x][1] = h=1 DWORD。
  // 早先把 lower 当 baseline、upper 偏 (+16,+8),整体偏置反了 —— scene 1 sparse
  // 巧合不显,scene 16 dense 全图错位 + 锯齿。M3 T3 D29 baseline diff 暴露此 bug。
  //
  // ±1 fence(M3.5 T6):sdlpal sy/dy 各 ±1 fence;fence 位置 PAL_MapGetTileBitmap
  // 返回 NULL,layer 0 fallback 到 tile (0,0,h=0,layer=0)(map.c:412),layer 1 直接
  // continue。给 dense scene 右/底 strip 提供 fill;之前缺 fence → scene 16 picker
  // 左侧"梯子状"杂乱 tile。
  const fenceFill = layer === 1 ? -1 : tileIdLayer0(map.cells[0]![0]!.lower)

  for (let r = -1; r <= map.height; r++) {
    const row = (r >= 0 && r < map.height) ? map.cells[r]! : null
    const rowPxY = r * ROW_Y_STEP + offsetY
    // viewport clip:整 row 都在 viewport 外则跳过(fence row 也照样 clip 不浪费)。
    // 注意 sub-row offset 后 lower 在 rowPxY-8、upper 在 rowPxY,所以 row 实际 y 覆盖
    // [rowPxY - SUBROW_Y_STEP, rowPxY + TILE_H)。
    if (rowPxY + TILE_H <= 0 || rowPxY - SUBROW_Y_STEP >= fb.height) continue
    for (let c = -1; c <= map.width; c++) {
      const cell = (row && c >= 0 && c < map.width) ? row[c]! : null
      const cellPxX = c * TILE_W + offsetX
      // 同理 lower 在 cellPxX-16、upper 在 cellPxX,col 实际 x 覆盖
      // [cellPxX - TILE_HALF_W, cellPxX + TILE_W)。
      if (cellPxX + TILE_W <= 0 || cellPxX - TILE_HALF_W >= fb.width) continue

      // h=0 (lower):画在 (col*32 - 16, row*16 - 8)
      const lowerId = cell ? idFn(cell.lower) : fenceFill
      if (lowerId >= 0) {
        const img = tiles.get(lowerId)
        if (img) blitTile(fb, img, cellPxX - TILE_HALF_W, rowPxY - SUBROW_Y_STEP)
      }
      // h=1 (upper):画在 (col*32, row*16) = baseline
      const upperId = cell ? idFn(cell.upper) : fenceFill
      if (upperId >= 0) {
        const img = tiles.get(upperId)
        if (img) blitTile(fb, img, cellPxX, rowPxY)
      }
    }
  }
}
