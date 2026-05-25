import type { Tilemap } from '@type-pal/shared'
import { SCREEN_W, SCREEN_H, type Framebuffer } from './framebuffer.js'

/** Y-sort エントリ。present.ts の sortedDraw ループに渡す。 */
export interface DrawEntry {
  /** Y-sort キー(sdlpal PAL_Y(pos) 相当の world-pixel 値)。 */
  baseY: number
  /** 実際の描画コールバック。 */
  draw: (fb: Framebuffer) => void
  /** デバッグ / テスト用 id。 */
  id: string
}

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

/** 内部 blitTile を外部に公開(cover-tile 単体描画用)。 */
export function blitTileAt(
  fb: Framebuffer,
  tile: TileImage,
  dstX: number,
  dstY: number,
): void {
  blitTile(fb, tile, dstX, dstY)
}

export function drawTilemap(
  fb: Framebuffer,
  map: Tilemap,
  tiles: TileImages,
  cameraPx: { x: number; y: number },
  layer: TileLayer,
): void {
  // M5 P0.0 System A:camera 已是 sdlpal pixel(tile 32×16),无需缩放,直接做 viewport offset。
  const offsetX = (SCREEN_W >> 1) - cameraPx.x
  const offsetY = (SCREEN_H >> 1) - cameraPx.y

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

/**
 * PAL_CalcCoverTiles port(sdlpal scene.c:77-178)。
 *
 * 对给定的 sprite 世界像素坐标 `(spriteWorldX, spriteWorldY)`,
 * 计算可能覆盖该精灵的所有 layer-1(top layer)tile,
 * 把每个 cover tile 封装为 DrawEntry 推入 `entries`。
 *
 * 算法说明(忠实 sdlpal scene.c:95-177):
 *
 *   sx ≈ spriteWorldX - spriteWidth/2   (精灵水平中心的世界 x)
 *   sy = spriteWorldY                   (精灵排序用的世界 y,≈ pos.y in sdlpal)
 *   sh = (sx % 32 !== 0) ? 1 : 0       (sub-row 偏移标志)
 *
 *   扫描范围:
 *     row y: (sy - spriteHeight - 15) / 16  .. sy / 16
 *     col x: (sx - spriteWidth/2) / 32      .. (sx + spriteWidth/2) / 32
 *
 *   对每个 (x, y):5 个候选 (dx, dy, dh) — 参见 sdlpal case 0..4。
 *
 *   对每个 (dx, dy, dh):检查 layer 0 和 layer 1(l=0/1)。
 *   这里 "l" 对应原始 MAP DWORD 的哪个半字(lower = h-variant 0, upper = h-variant 1)。
 *   注:TileCell.lower/upper 对应 Tiles[row][col][0/1]。
 *
 *   对于每个 (dx, dy, dh, l):
 *     DWORD d = l==0 ? cells[dy][dx].lower : cells[dy][dx].upper
 *     tileId (layer 1) = ((d >> 16) & 0xff) | (((d >> 16) >> 4) & 0x100) - 1
 *     iTileHeight = (d >> 24) & 0xf   (layer 1 的高度字段)
 *     条件: tileId >= 0 && iTileHeight > 0 && (dy + iTileHeight)*16 + dh*8 >= sy
 *     若满足:
 *       DrawEntry.baseY = dy*16 + dh*8 + 7 + l + iTileHeight*8
 *       blit 屏幕位 = (dx*32 + dh*16 - 16 + offsetX, dy*16 + dh*8 - 8 + offsetY)
 *       (h=0 时 dh=0: offsetX-16, offsetY-8;h=1 时 dh=1: offsetX, offsetY)
 *
 * 注意:只检查 layer 1(cover tile 只在 layer 1 有意义;layer 0 不遮挡精灵)。
 * dh 字段 = 0 对应 lower DWORD(h=0);dh = 1 对应 upper DWORD(h=1)。
 *
 * @param entries        DrawEntry 数组,cover tile entries 会 push 进去
 * @param map            当前场景 tilemap
 * @param tileImgs       tile 位图集
 * @param spriteWorldX   精灵世界像素 x(sdlpal eo.x / party.x)
 * @param spriteWorldY   精灵排序世界像素 y(sdlpal pos.y = eo.y + 7 after offset)
 * @param spriteW        精灵位图宽度(用于扫描范围计算)
 * @param spriteH        精灵位图高度(用于扫描范围计算)
 * @param camera         当前相机像素坐标
 * @param idPrefix       DrawEntry.id 前缀(debug)
 */
export function addCoverTileEntries(
  entries: DrawEntry[],
  map: Tilemap,
  tileImgs: TileImages,
  spriteWorldX: number,
  spriteWorldY: number,
  spriteW: number,
  spriteH: number,
  camera: { x: number; y: number },
  idPrefix: string,
): void {
  const offsetX = (SCREEN_W >> 1) - camera.x
  const offsetY = (SCREEN_H >> 1) - camera.y

  // sdlpal scene.c:99-101
  const sx = spriteWorldX - Math.floor(spriteW / 2)
  const sy = spriteWorldY
  const sh = (sx % 32 !== 0) ? 1 : 0

  const yStart = Math.floor((sy - spriteH - 15) / 16)
  const yEnd   = Math.floor(sy / 16)
  const xStart = Math.floor((sx - Math.floor(spriteW / 2)) / 32)
  const xEnd   = Math.floor((sx + Math.floor(spriteW / 2)) / 32)

  for (let y = yStart; y <= yEnd; y++) {
    for (let x = xStart; x <= xEnd; x++) {
      // sdlpal case i=0..4:leftmost col (x == xStart) 处理 i=0..2,其余 x 处理 i=3..4
      const iStart = (x === xStart) ? 0 : 3
      for (let i = iStart; i < 5; i++) {
        let dx = 0, dy = 0, dh = 0

        // sdlpal scene.c:127-154
        switch (i) {
          case 0:
            dx = x; dy = y; dh = sh
            break
          case 1:
            dx = x - 1; dy = y; dh = sh
            break
          case 2:
            dx = sh ? x : (x - 1)
            dy = sh ? (y + 1) : y
            dh = 1 - sh
            break
          case 3:
            dx = x + 1; dy = y; dh = sh
            break
          case 4:
            dx = sh ? (x + 1) : x
            dy = sh ? (y + 1) : y
            dh = 1 - sh
            break
        }

        // l = 0 → lower DWORD (h-variant 0);l = 1 → upper DWORD (h-variant 1)
        for (let l = 0; l < 2; l++) {
          // bounds check
          if (dy < 0 || dy >= map.height || dx < 0 || dx >= map.width) continue

          const row = map.cells[dy]
          if (!row) continue
          const cell = row[dx]
          if (!cell) continue

          // raw DWORD: l=0 → cell.lower, l=1 → cell.upper
          const d = l === 0 ? cell.lower : cell.upper

          // layer-1 tile id: ((d>>16) & 0xff) | (((d>>16)>>4) & 0x100) - 1
          const hi = d >>> 16
          const tileId = ((hi & 0xff) | ((hi >> 4) & 0x100)) - 1

          // layer-1 tile height: (d >> 24) & 0xf
          const iTileHeight = (d >>> 24) & 0xf

          // sdlpal scene.c:164 condition
          if (tileId < 0) continue
          if (iTileHeight <= 0) continue
          if ((dy + iTileHeight) * 16 + dh * 8 < sy) continue

          const img = tileImgs.get(tileId)
          if (!img) continue

          // sdlpal scene.c:171 cover tile DrawEntry sort key
          const baseY = dy * 16 + dh * 8 + 7 + l + iTileHeight * 8

          // 屏幕绘制位 — port sdlpal scene.c:164-172 PAL_AddSpriteToDraw + scene.c:357-360 真实 blit。
          // PAL_AddSpriteToDraw 把 (pos.x, pos.y) 入数组:
          //   pos.x = dx*32 + dh*16 - 16 - viewport.x
          //   pos.y = dy*16 + dh*8  + 7 + l + iTileHeight*8 - viewport.y
          //   iLayer = iTileHeight*8 + l
          // 真实 blit (scene.c:358):
          //   blit_x = pos.x
          //   blit_y = pos.y - bitmap.height - iLayer
          // 代入相消(iTileHeight*8 + l 项在 pos.y 与 iLayer 之间相消):
          //   blit_x = dx*32 + dh*16 - 16 - viewport.x
          //   blit_y = dy*16 + dh*8 + 7 - bitmap.height - viewport.y
          //
          // 之前用 drawTilemap 常规 tile 排版位置(dy*16-8 for h=0 / dy*16 for h=1),
          // 差 = `15 - bitmap.height`:短 tile (H=16) 差 -1 几乎不显;高柱子 / 屋顶
          // (H=48 之类)差 -33 → user 看到的"错位"主要是高 cover tile 偏位。
          const screenX = dx * TILE_W + dh * TILE_HALF_W - TILE_HALF_W + offsetX
          const screenY = dy * ROW_Y_STEP + dh * SUBROW_Y_STEP + 7 - img.height + offsetY

          // capture closure vars
          const capturedImg = img
          const capturedX = screenX
          const capturedY = screenY
          const entryId = `${idPrefix}-cover-${dx}-${dy}-${dh}-l${l}`

          entries.push({
            baseY,
            draw: (fb) => blitTile(fb, capturedImg, capturedX, capturedY),
            id: entryId,
          })
        }
      }
    }
  }
}
