/**
 * 9-slice菜单边框与单行框；只写caller持有的framebuffer，不推进菜单状态。
 *
 * SDLPal参考：ui.c的PAL_CreateBoxWithShadow。
 * `PAL_CreateBoxWithShadow`:9 个边框 bitmap(SPRITEUI frame `iStyle*9 + i*3 + j`,
 * i=row 0/1/2,j=col 0/1/2)排成 3×3 网格。外含 border 共 (rows+2)×(cols+2) tile。
 * iStyle 0 = 大世界菜单(灰色),1 = 战斗菜单(暗红)。
 * shadowOffset 默认 6(sdlpal `PAL_CreateBox` wrapper 真值)。
 */

import type { IndexedImage } from '../../assets/png.js'
import { type GlyphTable, measureText } from '../font.js'
import type { Framebuffer } from '../framebuffer.js'

/**
 * port sdlpal `PAL_MenuTextMaxWidth` - 1(ui.c:762-794 + 797-833 PAL_WordMaxWidth):
 * 一组菜单项文本的最大宽度(以**全角字符数**计)再减 1 —— 即 `PAL_CreateBox` 的 nColumns。
 *   每项宽 = `(PAL_TextWidth(text) + 8) >> 4`(像素 → 全角字符数;PAL_CharWidth 全角 16 / 半角 8)。
 *   PAL_CreateBox(..., PAL_MenuTextMaxWidth(...) - 1, ...) → box 内容列数。
 *
 * 本项目按实际GlyphTable测量；缺字形按16px，不能与静态palWordWidth混用。
 * 当前菜单列表caller用它决定内容列数；空文本仍保留至少一列。
 * @returns nColumns(>= 1)
 */
export function menuTextMaxCols(texts: readonly string[], glyphs?: GlyphTable): number {
  let maxW = 0
  for (const t of texts) {
    const w = (measureText(t, glyphs) + 8) >> 4
    if (w > maxW) maxW = w
  }
  return Math.max(1, maxW - 1)
}

// PAL_CalcShadowColor保留高4位色组、低4位亮度减半；依赖落点当前像素。
function palCalcShadowColor(srcColor: number): number {
  return (srcColor & 0xf0) | ((srcColor & 0x0f) >> 1)
}

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

  // ui.c PAL_CreateBoxWithShadow逐tile先影后正色；后画tile的影可能落在先画的正色上。
  // 不改成全框先影后正色两轮，那会改变重叠处的像素。
  let curY = input.y
  for (let i = 0; i < totalRows; i++) {
    const m = i === 0 ? 0 : i === totalRows - 1 ? 2 : 1
    let curX = input.x
    for (let j = 0; j < totalCols; j++) {
      const n = j === 0 ? 0 : j === totalCols - 1 ? 2 : 1
      const tile = get(m, n)
      if (shadow > 0) {
        blitShadowMask(input.fb, tile, curX + shadow, curY + shadow)
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
 * 用 img.opaque mask 当形状,对落点 fb 当前 pixel 应用 PAL_CalcShadowColor → 写回。
 *
 * sdlpal `PAL_RLEBlitToSurfaceWithShadow`(palcommon.c:46-220 + 201)真值:
 *   if (bShadow) p[x] = PAL_CalcShadowColor(p[x])
 *
 * 视觉效果:原 fb pixel 被替换成"低 4 位除 2"的同色调 darker 版本 — 像半透明黑色
 * overlay 落在 box 周围的 scene 像素上。
 */
function blitShadowMask(fb: Framebuffer, img: IndexedImage, dstX: number, dstY: number): void {
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const off = y * img.width + x
      if (img.opaque[off] === 0) continue
      const fbX = dstX + x
      const fbY = dstY + y
      if (fbX < 0 || fbX >= fb.width || fbY < 0 || fbY >= fb.height) continue
      const curIdx = fb.indices[fbY * fb.width + fbX]!
      fb.writePixel(fbX, fbY, palCalcShadowColor(curIdx))
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
  // PAL_CreateSingleLineBoxWithShadow先画整行阴影，再从左起画整行正色；保持此顺序。
  if (shadow > 0) {
    let sx = input.x + shadow
    blitShadowMask(input.fb, left, sx, input.y + shadow)
    sx += left.width
    for (let i = 0; i < input.len; i++) {
      blitShadowMask(input.fb, mid, sx, input.y + shadow)
      sx += mid.width
    }
    blitShadowMask(input.fb, right, sx, input.y + shadow)
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
