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
import { renderText, type GlyphTable } from '../font.js'

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
 * sdlpal uigame.c:107-109 真值坐标公式:
 *   x = 125 - (w > 4 ? (w - 4) * 8 : 0),y = 95 / 112
 *   w = PAL_WordWidth(wordNum)
 *
 * 中文 "新游戏"(3 字)/ "读取存档"(4 字)— PAL_WordWidth 返回的"词宽"通常 <= 4
 * (每 word 单位 = 字符数 / 2 类),所以 padding 公式取 0 → x = 125 起点。
 *
 * 简版直接用 x = 125;真精确坐标需 PAL_WordWidth 实测(留 T20 audit v2)。
 */
const ITEM_NEW_GAME_POS = { x: 125, y: 95 }
const ITEM_LOAD_GAME_POS = { x: 125, y: 112 }

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
  const positions = [ITEM_NEW_GAME_POS, ITEM_LOAD_GAME_POS]
  labels.forEach((entry, i) => {
    const pos = positions[i]
    if (!pos) return
    const color = i === state.selection.cursor ? selectedColor() : MENUITEM_COLOR
    renderText(fb, entry.label, pos.x, pos.y, color, glyphs, true)
  })
}
