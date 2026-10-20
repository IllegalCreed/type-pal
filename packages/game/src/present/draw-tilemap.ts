import type { Tilemap } from '@type-pal/shared'
import type { Framebuffer } from './framebuffer.js'

/** Y-sort 绘制条目。present.ts 收集后按 baseY 排序、依序执行 draw 回调。 */
export interface DrawEntry {
  /** Y-sort key(≈ sdlpal PAL_Y(pos) 的 world-pixel 值)。 */
  baseY: number
  /** 实际绘制回调。 */
  draw: (fb: Framebuffer) => void
  /** 调试 / 测试用 id。 */
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
 * Tilemap 的两个位图层(sdlpal map.c PAL_MapGetTileBitmap)。presentFrame 先画
 * layer 0、layer 1，再 Y-sort 精灵与 cover entries；遮挡由后者重画候选瓦片实现。
 *
 * 每 u32 cell 同时编码两个 9-bit tile id:
 *   layer 0: (d        & 0xff) | ((d        >> 4) & 0x100)
 *   layer 1: (((d>>16) & 0xff) | (((d>>16) >> 4) & 0x100)) - 1
 *            编码 0 表示无位图，解码后 -1 跳过。
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
  // 可选 coverage mask:标记被瓦片实际画过的屏幕像素(下标 = y*fb.width+x)。
  // 用于 repairTilemapSeams 区分"漏黑(没瓦片)"与"瓦片画的 opaque index-0"。
  coverage?: Uint8Array,
): void {
  const fbW = fb.width
  const fbH = fb.height
  for (let y = 0; y < tile.height; y++) {
    const py = dstY + y
    if (py < 0 || py >= fbH) continue
    for (let x = 0; x < tile.width; x++) {
      const srcOff = y * tile.width + x
      // M3.5 fix:用 opaque mask 判透明,不再用 `idx === 0`。允许 opaque palette-0
      // 被画出来(scene 16 通道 dense tile 真的有 opaque idx 0 像素)。
      if (tile.opaque[srcOff] === 0) continue
      const px = dstX + x
      if (px < 0 || px >= fbW) continue
      fb.writePixel(px, py, tile.indices[srcOff]!)
      if (coverage) coverage[py * fbW + px] = 1
    }
  }
}

export function drawTilemap(
  fb: Framebuffer,
  map: Tilemap,
  tiles: TileImages,
  cameraPx: { x: number; y: number },
  layer: TileLayer,
  // 传入则记录每个被瓦片画过的像素;供 repairTilemapSeams 修复接缝漏黑。
  coverage?: Uint8Array,
): void {
  // M5 P0.0 System A:camera 已是 sdlpal pixel(tile 32×16),无需缩放,直接做 viewport offset。
  // camera 语义 = sdlpal viewport(屏幕左上 world 坐标),screen = world - viewport。
  const offsetX = -cameraPx.x
  const offsetY = -cameraPx.y

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
    const row = r >= 0 && r < map.height ? map.cells[r]! : null
    const rowPxY = r * ROW_Y_STEP + offsetY
    // viewport clip:整 row 都在 viewport 外则跳过(fence row 也照样 clip 不浪费)。
    // 注意 sub-row offset 后 lower 在 rowPxY-8、upper 在 rowPxY,所以 row 实际 y 覆盖
    // [rowPxY - SUBROW_Y_STEP, rowPxY + TILE_H)。
    if (rowPxY + TILE_H <= 0 || rowPxY - SUBROW_Y_STEP >= fb.height) continue
    for (let c = -1; c <= map.width; c++) {
      const cell = row && c >= 0 && c < map.width ? row[c]! : null
      const cellPxX = c * TILE_W + offsetX
      // 同理 lower 在 cellPxX-16、upper 在 cellPxX,col 实际 x 覆盖
      // [cellPxX - TILE_HALF_W, cellPxX + TILE_W)。
      if (cellPxX + TILE_W <= 0 || cellPxX - TILE_HALF_W >= fb.width) continue

      // h=0 (lower):画在 (col*32 - 16, row*16 - 8)
      const lowerId = cell ? idFn(cell.lower) : fenceFill
      if (lowerId >= 0) {
        // h=0 的位图缺失时回落资源帧 0；h=1 缺图则跳过。
        // h 选择 cell.lower/upper，与当前 layer 0/1 分开。
        const img = tiles.get(lowerId) ?? tiles.get(0)
        if (img) blitTile(fb, img, cellPxX - TILE_HALF_W, rowPxY - SUBROW_Y_STEP, coverage)
      }
      // h=1 (upper):画在 (col*32, row*16) = baseline
      const upperId = cell ? idFn(cell.upper) : fenceFill
      if (upperId >= 0) {
        const img = tiles.get(upperId)
        if (img) blitTile(fb, img, cellPxX, rowPxY, coverage)
      }
    }
  }
}

/**
 * 当前每帧清屏后的接缝补偿；不重建 SDLPal 持久屏幕的上一帧内容，也不保证像素等价。
 * 对未覆盖像素，按 dy=-1..1、dx=-1..1 的固定顺序取首个已覆盖八邻居。
 * 一趟先收集再落盘，最多扩散 maxPasses 圈；大片空洞也可能被邻接地形逐圈填入。
 * coverage 由两层 base tilemap 共同写入，必须在 wave 和精灵之前使用。
 * 已覆盖的 index 0 是合法不透明黑色，不得作为接缝改写。
 */
export function repairTilemapSeams(fb: Framebuffer, coverage: Uint8Array, maxPasses = 16): void {
  const { width, height, indices } = fb
  const fills: number[] = []
  for (let pass = 0; pass < maxPasses; pass++) {
    fills.length = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x
        if (coverage[i]) continue
        // 取一个已覆盖的 8-邻居(用本趟开始时的 coverage 快照,避免趟内顺序偏置)。
        let v = -1
        for (let dy = -1; dy <= 1 && v < 0; dy++) {
          const ny = y + dy
          if (ny < 0 || ny >= height) continue
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            const nx = x + dx
            if (nx < 0 || nx >= width) continue
            if (coverage[ny * width + nx]) {
              v = indices[ny * width + nx]!
              break
            }
          }
        }
        if (v >= 0) fills.push(i, v)
      }
    }
    if (fills.length === 0) break
    // 本趟收集的填充统一落盘 + 提升为已覆盖(供下一趟向更深处扩散)。
    for (let k = 0; k < fills.length; k += 2) {
      const i = fills[k]!
      indices[i] = fills[k + 1]!
      coverage[i] = 1
    }
  }
}

/**
 * PAL_CalcCoverTiles 的候选收集(sdlpal scene.c:77-178)。两层中高度足够的瓦片
 * 都可成为 cover entry，由 presentFrame 与精灵共同排序后重画；不在这里推进状态。
 * sx 是扣除半宽和半 iLayer 的扫描起点，sy 是 caller 传入排序 Y 再减 iLayer。
 * dh 选择 lower/upper DWORD(h=0/1)，l 再选择该 DWORD 的低/高 16 位(layer 0/1)。
 * 回调保留本次位图与屏幕坐标；调用期间资源由 presentFrame 的 TileImages 持有。
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
  iLayer: number = 0, // Sync.2 fix10:sdlpal `lpSpriteToDraw->iLayer`(party=6, NPC=2)
): void {
  // camera 语义 = sdlpal viewport(屏幕左上 world 坐标),screen = world - viewport。
  const offsetX = -camera.x
  const offsetY = -camera.y

  // sdlpal scene.c:99-101 — PAL_CalcCoverTiles 真值:
  //   sx = viewport.x + pos.x - iLayer/2,其中 pos.x = world.x - viewport.x - width/2
  //   → sx = world.x - width/2 - iLayer/2
  //   sy = viewport.y + pos.y - iLayer,其中 pos.y = world.y - viewport.y + wLayer + 10(party)或 + 9(NPC)
  //   → sy = world.y + wLayer + offset_param - iLayer(caller 把 wLayer+offset 加进 spriteWorldY 传入)
  // 注:caller 传入的 spriteWorldY 已包含 wLayer+offset(party=+10, NPC=+9),这里只减 iLayer。
  const sx = spriteWorldX - Math.floor(spriteW / 2) - Math.floor(iLayer / 2)
  const sy = spriteWorldY - iLayer
  const sh = sx % 32 !== 0 ? 1 : 0

  // L31:cover-tile 边界用向零截断(C 整数除法,scene.c:113-117),非 Math.floor;sx/sy 为负(NPC 贴
  //   地图左/上边缘)时与 floor 分叉。内层 spriteW/2 仍 floor(width 正,等价)。
  const yStart = Math.trunc((sy - spriteH - 15) / 16)
  const yEnd = Math.trunc(sy / 16)
  const xStart = Math.trunc((sx - Math.floor(spriteW / 2)) / 32)
  const xEnd = Math.trunc((sx + Math.floor(spriteW / 2)) / 32)

  for (let y = yStart; y <= yEnd; y++) {
    for (let x = xStart; x <= xEnd; x++) {
      // sdlpal case i=0..4:leftmost col (x == xStart) 处理 i=0..2,其余 x 处理 i=3..4
      const iStart = x === xStart ? 0 : 3
      for (let i = iStart; i < 5; i++) {
        let dx = 0,
          dy = 0,
          dh = 0

        // sdlpal scene.c:127-154
        switch (i) {
          case 0:
            dx = x
            dy = y
            dh = sh
            break
          case 1:
            dx = x - 1
            dy = y
            dh = sh
            break
          case 2:
            dx = sh ? x : x - 1
            dy = sh ? y + 1 : y
            dh = 1 - sh
            break
          case 3:
            dx = x + 1
            dy = y
            dh = sh
            break
          case 4:
            dx = sh ? x + 1 : x
            dy = sh ? y + 1 : y
            dh = 1 - sh
            break
        }

        // bounds check (once per (dx,dy,dh) candidate — outside l loop)
        if (dy < 0 || dy >= map.height || dx < 0 || dx >= map.width) continue

        const row = map.cells[dy]
        if (!row) continue
        const cell = row[dx]
        if (!cell) continue

        // sdlpal map.c PAL_MapGetTileBitmap / PAL_MapGetTileHeight:
        //   Tiles[y][x][h] — h=dh selects lower(h=0) or upper(h=1) DWORD.
        //   ucLayer=l then selects layer 0 (low 16 bits) or layer 1 (high 16 bits).
        const d = dh === 0 ? cell.lower : cell.upper

        // sdlpal scene.c:156 内层 for (l = 0; l < 2; l++) — l selects layer 0 or layer 1.
        for (let l = 0; l < 2; l++) {
          // layer tile id:
          //   l=0 (bottom layer): (d & 0xff) | ((d >> 4) & 0x100)  [no -1; 0 = valid tile]
          //   l=1 (top layer):    ((d>>>16 & 0xff) | ((d>>>16 >> 4) & 0x100)) - 1  [0 = no tile]
          const tileId = l === 0 ? tileIdLayer0(d) : tileIdLayer1(d)

          // sdlpal map.c PAL_MapGetTileHeight:
          //   l=0: (d >> 8) & 0xf   (bits 8-11 of low 16-bit half)
          //   l=1: (d >> 24) & 0xf  (bits 24-27 = bits 8-11 of high 16-bit half)
          const iTileHeight = l === 0 ? (d >>> 8) & 0xf : (d >>> 24) & 0xf

          // sdlpal scene.c:164 condition: lpTile != NULL && iTileHeight > 0 && cover check
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
