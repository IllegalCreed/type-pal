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

  // 先一轮全画阴影(纯黑 0x0F),再一轮覆盖正色 —
  // sdlpal ui.c:194-197 把两个 blit 嵌在同一循环;为简化 + 视觉一致,这里分两轮:
  // 阴影 offset 让正色 box 看起来浮在背景上(右下偏移)。
  if (shadow > 0) {
    let curY = input.y + shadow
    for (let i = 0; i < totalRows; i++) {
      const m = i === 0 ? 0 : i === totalRows - 1 ? 2 : 1
      let curX = input.x + shadow
      for (let j = 0; j < totalCols; j++) {
        const n = j === 0 ? 0 : j === totalCols - 1 ? 2 : 1
        const tile = get(m, n)
        blitMonoColor(input.fb, tile, curX, curY, SHADOW_PALETTE_IDX)
        curX += tile.width
      }
      curY += get(m, 0).height
    }
  }

  // 正色边框
  let curY = input.y
  for (let i = 0; i < totalRows; i++) {
    const m = i === 0 ? 0 : i === totalRows - 1 ? 2 : 1
    let curX = input.x
    for (let j = 0; j < totalCols; j++) {
      const n = j === 0 ? 0 : j === totalCols - 1 ? 2 : 1
      const tile = get(m, n)
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
