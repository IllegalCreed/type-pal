/**
 * M5.6 W0.c:9-slice 菜单边框 + 阴影渲染。
 *
 * sdlpal 真值:[reference/sdlpal/ui.c:131-240](../../../../reference/sdlpal/ui.c#L131-L240)
 * `PAL_CreateBoxWithShadow`:9 个边框 bitmap(SPRITEUI frame `iStyle*9 + i*3 + j`,
 * i=row 0/1/2,j=col 0/1/2)排成 3×3 网格。外含 border 共 (rows+2)×(cols+2) tile。
 * iStyle 0 = 大世界菜单(灰色),1 = 战斗菜单(暗红)。
 * shadowOffset 默认 6(sdlpal `PAL_CreateBox` wrapper 真值)。
 */

import type { Framebuffer } from '../framebuffer.js'
import type { IndexedImage } from '../../assets/png.js'

// sdlpal palette 黑色 idx,用于 shadow 渲染。
const SHADOW_PALETTE_IDX = 0x0F

export interface DrawBoxInput {
  fb: Framebuffer
  /** box 左上角 x(像素,sdlpal pos.x)*/
  x: number
  /** box 左上角 y(像素,sdlpal pos.y)*/
  y: number
  /** 内部内容行数(不含边框)— sdlpal nRows 参数 */
  rows: number
  /** 内部内容列数(不含边框)— sdlpal nColumns 参数 */
  cols: number
  /** sdlpal iStyle:0 = 大世界菜单,1 = 战斗菜单 */
  style: 0 | 1
  /** sdlpal nShadowOffset 默认 6;0 = 无阴影 */
  shadowOffset?: number
  /** SPRITEUI 71 frame 全集(从 data/extracted/data/ui-sprite/spriteui.json + frame PNG dump)。
   *  draw-box 用 style*9 + i*3 + j 索引(共 18 个 frame 在前 18 位)。 */
  uiSpriteFrames: IndexedImage[]
}

/**
 * 在 fb 上画一个 9-slice 边框 box,先 shadow 再正色(sdlpal ui.c:194-197 顺序)。
 *
 * 不返回 lpBox(sdlpal 用于 PAL_DeleteBox 恢复底图)— ts 端每 tick 重绘整个 framebuffer,
 * 不存在"恢复底图"概念,所以 BOX struct N/A。
 */
export function drawBox(input: DrawBoxInput): void {
  const shadow = input.shadowOffset ?? 6
  const base = input.style * 9
  // 越界检测:9 个 frame 必须都有
  for (let k = 0; k < 9; k++) {
    if (!input.uiSpriteFrames[base + k]) {
      throw new Error(
        `draw-box: uiSpriteFrames[${base + k}] missing — style ${input.style} 需要 SPRITEUI frame ${base}-${base + 8}`,
      )
    }
  }
  const get = (i: number, j: number): IndexedImage => input.uiSpriteFrames[base + i * 3 + j]!

  const totalRows = input.rows + 2 // sdlpal ui.c:170:"Border takes 2 additional rows and columns"
  const totalCols = input.cols + 2

  // sdlpal ui.c:194-197 真值:tile-by-tile 单循环,每 tile 先 shadow(右下偏移)再正色。
  // 单循环 vs 两轮的差:tile 边缘重叠时,两轮把所有阴影画完后正色覆盖,可能让先画 tile 的阴影
  // 被后画相邻 tile 的正色压掉一部分;单循环按行扫描保证每 tile 阴影刚画完正色就盖,边缘平滑。
  let curY = input.y
  for (let i = 0; i < totalRows; i++) {
    const m = i === 0 ? 0 : i === totalRows - 1 ? 2 : 1
    let curX = input.x
    for (let j = 0; j < totalCols; j++) {
      const n = j === 0 ? 0 : j === totalCols - 1 ? 2 : 1
      const tile = get(m, n)
      if (shadow > 0) {
        blitMonoColor(input.fb, tile, curX + shadow, curY + shadow, SHADOW_PALETTE_IDX)
      }
      blitOpaque(input.fb, tile, curX, curY)
      curX += tile.width
    }
    curY += get(m, 0).height
  }
}

/**
 * 把 IndexedImage 以左上角对齐 blit 到 fb。
 * 与 draw-sprite.ts:drawSprite 不同 — 后者用 anchorX/Y(中心对齐),菜单 box 用左上角直传。
 */
function blitOpaque(fb: Framebuffer, img: IndexedImage, dstX: number, dstY: number): void {
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const off = y * img.width + x
      if (img.opaque[off] === 0) continue
      fb.writePixel(dstX + x, dstY + y, img.indices[off]!)
    }
  }
}

/**
 * 用 img.opaque mask 当形状,写入纯色 idx — 用于 shadow blit。
 * sdlpal `PAL_RLEBlitToSurfaceWithShadow` 真值:opaque 像素全写 0x0F(palette 黑)。
 */
function blitMonoColor(
  fb: Framebuffer,
  img: IndexedImage,
  dstX: number,
  dstY: number,
  paletteIdx: number,
): void {
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const off = y * img.width + x
      if (img.opaque[off] === 0) continue
      fb.writePixel(dstX + x, dstY + y, paletteIdx)
    }
  }
}

/**
 * sdlpal `ui.c:252-340` PAL_CreateSingleLineBoxWithShadow 真值 —
 * 单行 box,3 个 SPRITEUI frame:44 (left) / 45 (mid × len) / 46 (right)。
 * shadow offset 默认 6;cash 框、"获得物品"提示等单行 box 用此。
 */
const SINGLE_LINE_FRAME_LEFT = 44
const SINGLE_LINE_FRAME_MID = 45
const SINGLE_LINE_FRAME_RIGHT = 46

export interface DrawSingleLineBoxInput {
  fb: Framebuffer
  x: number
  y: number
  /** sdlpal nLen — mid sprite 重复几次。box 总宽 = leftSprite.w + mid.w * len + rightSprite.w */
  len: number
  shadowOffset?: number
  uiSpriteFrames: IndexedImage[]
}

export function drawSingleLineBox(input: DrawSingleLineBoxInput): void {
  const shadow = input.shadowOffset ?? 6
  const left = input.uiSpriteFrames[SINGLE_LINE_FRAME_LEFT]
  const mid = input.uiSpriteFrames[SINGLE_LINE_FRAME_MID]
  const right = input.uiSpriteFrames[SINGLE_LINE_FRAME_RIGHT]
  if (!left || !mid || !right) {
    throw new Error(
      `draw-box: drawSingleLineBox 需要 uiSpriteFrames[${SINGLE_LINE_FRAME_LEFT}..${SINGLE_LINE_FRAME_RIGHT}]`,
    )
  }
  // 阴影一行 + 正色一行(单行结构无 tile 边缘重叠问题,顺序不敏感)
  if (shadow > 0) {
    let sx = input.x + shadow
    blitMonoColor(input.fb, left, sx, input.y + shadow, SHADOW_PALETTE_IDX)
    sx += left.width
    for (let i = 0; i < input.len; i++) {
      blitMonoColor(input.fb, mid, sx, input.y + shadow, SHADOW_PALETTE_IDX)
      sx += mid.width
    }
    blitMonoColor(input.fb, right, sx, input.y + shadow, SHADOW_PALETTE_IDX)
  }
  let cx = input.x
  blitOpaque(input.fb, left, cx, input.y)
  cx += left.width
  for (let i = 0; i < input.len; i++) {
    blitOpaque(input.fb, mid, cx, input.y)
    cx += mid.width
  }
  blitOpaque(input.fb, right, cx, input.y)
}
