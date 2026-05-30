/**
 * sdlpal PAL_ConfirmMenu / PAL_SelectionMenu(uigame.c:242-365)的 否/是 确认框渲染。
 *
 * 共享渲染器:商店买卖确认(shop-menu confirm phase)与脚本 opcode 0x0A goto-if-no
 * (event-system waiting='confirm')复用同一画法,避免重复。
 *
 * 真值坐标(uigame.c:272,298):
 *  - box:PAL_CreateSingleLineBox(PAL_XY(130 + 75*i, 100), w+1) → 否(130,100)/是(205,100),len=2
 *  - 文字:PAL_XY(145,110) 否 / PAL_XY(220,110) 是(否 w=1 → dx=0)
 *  - 默认 否(nDefault=0):confirmYes=false 时 否 高亮闪烁。
 */
import type { IndexedImage } from '../../assets/png.js'
import type { Framebuffer } from '../framebuffer.js'
import { renderText, type GlyphTable } from '../font.js'
import { drawSingleLineBox } from './draw-box.js'

const MENUITEM_COLOR = 0x4F                  // ui.h:29
const MENUITEM_COLOR_SELECTED_FIRST = 0xF9   // ui.h:39
const MENUITEM_COLOR_SELECTED_TOTAL = 6

/** 选中项闪烁色(sdlpal ui.h:39-40 MENUITEM_COLOR_SELECTED 动态循环 0xF9..0xFE)。 */
function selectedColor(): number {
  return MENUITEM_COLOR_SELECTED_FIRST + Math.floor(Date.now() / 100) % MENUITEM_COLOR_SELECTED_TOTAL
}

export function drawConfirmBox(
  fb: Framebuffer,
  confirmYes: boolean,
  uiSpriteFrames: IndexedImage[],
  glyphs?: GlyphTable,
): void {
  // box: PAL_CreateSingleLineBox(PAL_XY(130 + 75*(i%2), 100 + 50*(i/2)), w+1, TRUE)
  drawSingleLineBox({ fb, x: 130, y: 100, len: 2, uiSpriteFrames })
  drawSingleLineBox({ fb, x: 205, y: 100, len: 2, uiSpriteFrames })
  // 文字 PAL_XY(145, 110) 否 / PAL_XY(220, 110) 是;selected 闪烁(默认 No=index0)
  const noColor = !confirmYes ? selectedColor() : MENUITEM_COLOR
  const yesColor = confirmYes ? selectedColor() : MENUITEM_COLOR
  renderText(fb, '否', 145, 110, noColor, glyphs, true)
  renderText(fb, '是', 220, 110, yesColor, glyphs, true)
}
