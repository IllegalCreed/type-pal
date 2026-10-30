/**
 * M5.6 T17:OpeningMenu 渲染层 — sdlpal `uigame.c:42-167` PAL_OpeningMenu。
 *
 * 跟其它 menu(box-based)不同:OpeningMenu **不画 9-slice box**(`PAL_ReadMenu(NULL,...)`
 * 真值),直接画字在 320×200 fbp 全屏背景上。背景图源 = FBP.MKF chunk 2
 * (`MAINMENU_BACKGROUND_FBPNUM (fIsWIN95?2:60)`,我们 WIN95 走 2)。
 *
 * 选中项 MENUITEM_COLOR_SELECTED 闪烁(ui.h:36-39 `0xF9 + tick/100 % 6`),
 * 未选项 MENUITEM_COLOR 0x4F(ui.h:29)。
 */

import { MENUITEM_COLOR, selectedMenuItemColor } from '../../core/menu/menu-colors.js'
import type { OpeningMenuState } from '../../core/menu/opening-menu.js'
import { openingMenuLabels } from '../../core/menu/opening-menu.js'
import type { BattleBgAsset } from '../battle/draw-battle-bg.js'
import { drawBattleBg } from '../battle/draw-battle-bg.js'
import { type GlyphTable, palWordWidth, renderText } from '../font.js'
import type { Framebuffer } from '../framebuffer.js'

/**
 * PAL_OpeningMenu 的选项坐标公式(uigame.c:107-108):
 *   x = 125 - (w > 4 ? (w - 4) * 8 : 0),w = PAL_WordWidth(label)(font.ts palWordWidth)。
 * 当前两个四字词条从 x=125 起笔；较长词条按量化字宽左移。
 * 字宽计算复用 palWordWidth，不能用 string.length 代替 ASCII 的半宽规则。
 * y 固定为新游戏 95、读档 112。
 */
export function openingItemX(label: string): number {
  const w = palWordWidth(label)
  return 125 - (w > 4 ? (w - 4) * 8 : 0)
}

const ITEM_Y = [95, 112]

export interface DrawOpeningMenuInput {
  fb: Framebuffer
  state: OpeningMenuState
  /** FBP chunk 2 全屏背景(bootstrap 注入 PresentContext.openingMenuBg)。
   *  缺失则跳过 bg blit,fb 保留上一帧 — debug 防御。 */
  bg?: BattleBgAsset
  glyphs?: GlyphTable
}

export function drawOpeningMenu(input: DrawOpeningMenuInput): void {
  const { fb, state, bg, glyphs } = input

  // 1. 全屏背景 blit(sdlpal uigame.c:71 PAL_MKFDecompressChunk + PAL_FBPBlitToSurface)
  if (bg) {
    drawBattleBg(fb, bg)
  }

  // 2. 2 行字(无 box)— sdlpal ui.c:458 PAL_ReadMenu 真值 PAL_DrawText(...fShadow=TRUE)
  //    triple shadow(黑色 color 0,offset (+1,0)/(0,+1)/(+1,+1))+ 主色字
  const labels = openingMenuLabels()
  labels.forEach((entry, i) => {
    const y = ITEM_Y[i]
    if (y === undefined) return
    const x = openingItemX(entry.label) // uigame.c:107-108 公式(对 4 字 label 退化为 125)
    const color = i === state.selection.cursor ? selectedMenuItemColor(Date.now()) : MENUITEM_COLOR
    renderText(fb, entry.label, x, y, color, glyphs, true)
  })
}
