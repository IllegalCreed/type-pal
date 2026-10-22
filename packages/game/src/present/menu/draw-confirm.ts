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
import { MENUITEM_COLOR, selectedMenuItemColor } from '../../core/menu/menu-colors.js'
import { getWord } from '../../core/word-lookup.js'
import { type GlyphTable, renderText } from '../font.js'
import type { Framebuffer } from '../framebuffer.js'
import { drawSingleLineBox } from './draw-box.js'

/**
 * 2 项左右选框(sdlpal PAL_SelectionMenu 2 项布局)。默认 否/是(PAL_ConfirmMenu);
 * 音乐/音效 开关(PAL_SwitchMenu,uigame.c:368-388)传 labels={left:'关', right:'开'} 复用同布局。
 * rightSelected = 右项高亮(confirmYes / switch 的"开")。
 * 此helper固定单字双框，不实现PAL_SelectionMenu对任意长标签的动态扩框。
 */
export function drawConfirmBox(
  fb: Framebuffer,
  rightSelected: boolean,
  uiSpriteFrames: IndexedImage[],
  glyphs?: GlyphTable,
  labels: { left: string; right: string } = { left: getWord(19, '否'), right: getWord(20, '是') },
): void {
  // box: PAL_CreateSingleLineBox(PAL_XY(130 + 75*(i%2), 100 + 50*(i/2)), w+1, TRUE)
  drawSingleLineBox({ fb, x: 130, y: 100, len: 2, uiSpriteFrames })
  drawSingleLineBox({ fb, x: 205, y: 100, len: 2, uiSpriteFrames })
  // 文字 PAL_XY(145, 110) 左 / PAL_XY(220, 110) 右;selected 闪烁(默认左 index0)
  const leftColor = !rightSelected ? selectedMenuItemColor(Date.now()) : MENUITEM_COLOR
  const rightColor = rightSelected ? selectedMenuItemColor(Date.now()) : MENUITEM_COLOR
  renderText(fb, labels.left, 145, 110, leftColor, glyphs, true)
  renderText(fb, labels.right, 220, 110, rightColor, glyphs, true)
}
