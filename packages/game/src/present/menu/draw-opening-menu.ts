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

import type { OpeningMenuState } from '../../core/menu/opening-menu.js'
import { openingMenuLabels } from '../../core/menu/opening-menu.js'
import type { BattleBgAsset } from '../battle/draw-battle-bg.js'
import { drawBattleBg } from '../battle/draw-battle-bg.js'
import type { Framebuffer } from '../framebuffer.js'
import { renderText, palWordWidth, type GlyphTable } from '../font.js'

// sdlpal ui.h:29 / 33-34
const MENUITEM_COLOR = 0x4F
const MENUITEM_COLOR_SELECTED_FIRST = 0xF9
const MENUITEM_COLOR_SELECTED_TOTAL = 6

function selectedColor(): number {
  return (
    MENUITEM_COLOR_SELECTED_FIRST
    + (Math.floor(Date.now() / 100) % MENUITEM_COLOR_SELECTED_TOTAL)
  )
}

/**
 * sdlpal uigame.c:107-108 真值坐标公式(已忠实移植,非简版):
 *   x = 125 - (w > 4 ? (w - 4) * 8 : 0),w = PAL_WordWidth(label)(font.ts palWordWidth)。
 * shipped 真 label '新的故事'/'读取存档' 都是 4 全宽字 → w=4 → 公式退化 x=125(与旧硬编码一致,零像素变化);
 * 长于 4 全宽单位的文案(modded WORD.DAT / 其它语言)按公式左移对齐。y 恒 95(新)/ 112(读档)。
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
    const color = i === state.selection.cursor ? selectedColor() : MENUITEM_COLOR
    renderText(fb, entry.label, x, y, color, glyphs, true)
  })
}
