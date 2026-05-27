/**
 * M5.6 v2(T2/T3/T4 修):大世界菜单渲染入口 — 严格对照 sdlpal `uigame.c` / `ui.c` / `ui.h` 真值。
 *
 * v1 走损纠正:
 *  - InGame box pos 真值 (3, 37) 非臆造 (57, 60)
 *  - item 起点 PAL_XY(16, 50) 绝对屏幕坐标,LINE_HEIGHT = 18
 *  - MENUITEM_COLOR = 0x4F / SELECTED = (0xF9 + tick/100 % 6) 动态闪烁(ui.h:29-39)
 *  - cols = PAL_MenuTextMaxWidth - 1((maxPixWidth + 8) >> 4 - 1)
 *  - SystemMenu pos (40, 60) item 起 (53, 72) rows = nItems - 1
 *  - 主菜单弹时左上角 PAL_ShowCash 单行 box + "金钱" label + dwCash 数字
 */

import type { IndexedImage } from '../../assets/png.js'
import type {
  ActiveMenuEntry,
  ActiveMenuKind,
  GameState,
} from '../../core/game-state.js'
import type { InGameMenuState, SystemMenuState } from '../../core/menu/in-game-menu.js'
import type { OpeningMenuState } from '../../core/menu/opening-menu.js'
import type { SaveSlotMenuState } from '../../core/menu/save-slot-menu.js'
import type { SelectionMenuState } from '../../core/menu/primitives.js'
import type { BattleBgAsset } from '../battle/draw-battle-bg.js'
import type { Framebuffer } from '../framebuffer.js'
import { measureText, renderText, type GlyphTable } from '../font.js'
import { drawBox, drawSingleLineBox } from './draw-box.js'
import { drawNumber } from '../draw-number.js'
import { drawOpeningMenu } from './draw-opening-menu.js'

// ── sdlpal ui.h / text.c 真值色 ──────────────────────────────────────────────
const MENUITEM_COLOR = 0x4F            // ui.h:29
const MENUITEM_COLOR_SELECTED_FIRST = 0xF9 // ui.h:33
const MENUITEM_COLOR_SELECTED_TOTAL = 6    // ui.h:34
const FONT_COLOR_YELLOW = 0x2D         // text.c:30 — cash 数字

// ── sdlpal uigame.c 真值坐标 ──────────────────────────────────────────────────
const IN_GAME_MENU_BOX = { x: 3, y: 37, rows: 3 }      // uigame.c:990 PAL_CreateBox(PAL_XY(3, 37), 3, ...)
const IN_GAME_MENU_ITEM_START = { x: 16, y: 50 }       // uigame.c:961-966 PAL_XY(16, 50+i*18)
const SYSTEM_MENU_BOX = { x: 40, y: 60 }               // uigame.c:559 PAL_CreateBox(PAL_XY(40, 60), ...)
const SYSTEM_MENU_ITEM_START = { x: 53, y: 72 }        // uigame.c:543-552 PAL_XY(53, 72+i*18)
const LINE_HEIGHT = 18                                  // sdlpal 真值菜单项 y 间距

// cash 框 — uigame.c:475 PAL_CreateSingleLineBox(PAL_XY(0, 0), 5, TRUE)
const CASH_BOX = { x: 0, y: 0, len: 5 }
const CASH_LABEL_POS = { x: 10, y: 10 }       // uigame.c:485 PAL_DrawText label
const CASH_NUMBER_RIGHT = { x: 49, y: 14 }     // uigame.c:490 PAL_DrawNumber right-align

/**
 * sdlpal ui.h:36-39 真值:`MENUITEM_COLOR_SELECTED_FIRST + tick/100 % 6` 闪烁。
 * SDL_GetTicks ms → ts 用 Date.now() 等价。
 */
function selectedColor(): number {
  return MENUITEM_COLOR_SELECTED_FIRST + Math.floor(Date.now() / 100) % MENUITEM_COLOR_SELECTED_TOTAL
}

/**
 * sdlpal ui.c:783-794 PAL_MenuTextMaxWidth 真值:
 *   for each item: w = (TextWidth(label) + 8) >> 4;return max(w)
 */
function menuTextMaxWidth(labels: string[], glyphs?: GlyphTable): number {
  let max = 0
  for (const label of labels) {
    const w = (measureText(label, glyphs) + 8) >> 4
    if (w > max) max = w
  }
  return max
}

// ─────────────────────────────────────────────────────────────────────────────

export function drawMenuStack(
  fb: Framebuffer,
  gs: GameState,
  uiSpriteFrames: IndexedImage[],
  glyphs?: GlyphTable,
  openingMenuBg?: BattleBgAsset,
): void {
  for (const entry of gs.menuStack) {
    drawMenuEntry(fb, entry, gs, uiSpriteFrames, glyphs, openingMenuBg)
  }
}

function drawMenuEntry(
  fb: Framebuffer,
  entry: ActiveMenuEntry,
  gs: GameState,
  uiSpriteFrames: IndexedImage[],
  glyphs?: GlyphTable,
  openingMenuBg?: BattleBgAsset,
): void {
  switch (entry.kind) {
    case 'opening':
      drawOpeningMenu({
        fb,
        state: entry.state as OpeningMenuState,
        bg: openingMenuBg,
        glyphs,
      })
      break
    case 'in-game':
      // sdlpal uigame.c:472 PAL_InGameMenu 先 PAL_ShowCash 再 CreateBox
      drawCashBox(fb, gs.dwCash, uiSpriteFrames, glyphs)
      drawInGameMenu(fb, entry.state as InGameMenuState, uiSpriteFrames, glyphs)
      break
    case 'system':
      drawSystemMenu(fb, entry.state as SystemMenuState, uiSpriteFrames, glyphs)
      break
    case 'save-slot':
      // T10a 完工:5 个 SingleLineBox + slot 文字 + 存档次数(sdlpal uigame.c:169-242)
      drawSaveSlotMenu(fb, entry.state as SaveSlotMenuState, uiSpriteFrames, glyphs)
      break
    case 'inventory':
    case 'equip':
    case 'in-game-magic':
    case 'player-status':
    case 'shop-buy':
    case 'shop-sell':
      // T10b-e 待真做 fullscreen UI;此处显式标 TODO 不再装"接通"
      drawPlaceholderTodo(fb, entry.kind, uiSpriteFrames, glyphs)
      break
  }
}

// ── In-Game hub ──────────────────────────────────────────────────────────────

function drawInGameMenu(
  fb: Framebuffer,
  state: InGameMenuState,
  uiSpriteFrames: IndexedImage[],
  glyphs?: GlyphTable,
): void {
  const items = state.selection.items
  const labels = items.map((it) => it.label)
  const maxWidth = menuTextMaxWidth(labels, glyphs)
  // sdlpal uigame.c:990 真值:cols = PAL_MenuTextMaxWidth - 1
  const cols = Math.max(1, maxWidth - 1)
  drawBox({
    fb, x: IN_GAME_MENU_BOX.x, y: IN_GAME_MENU_BOX.y,
    rows: IN_GAME_MENU_BOX.rows, cols, style: 0,
    uiSpriteFrames,
  })
  items.forEach((item, i) => {
    const y = IN_GAME_MENU_ITEM_START.y + i * LINE_HEIGHT
    const color = i === state.selection.cursor ? selectedColor() : MENUITEM_COLOR
    // sdlpal ui.c:458 PAL_ReadMenu 真值 PAL_DrawText(...fShadow=TRUE)— triple shadow
    renderText(fb, item.label, IN_GAME_MENU_ITEM_START.x, y, color, glyphs, true)
  })
}

// ── System menu ──────────────────────────────────────────────────────────────

function drawSystemMenu(
  fb: Framebuffer,
  state: SystemMenuState,
  uiSpriteFrames: IndexedImage[],
  glyphs?: GlyphTable,
): void {
  const items = state.selection.items
  const labels = items.map((it) => it.label)
  const maxWidth = menuTextMaxWidth(labels, glyphs)
  const cols = Math.max(1, maxWidth - 1)
  // sdlpal uigame.c:559:rows = nSystemMenuItem - 1(5 items → rows 4)
  const rows = Math.max(1, items.length - 1)
  drawBox({
    fb, x: SYSTEM_MENU_BOX.x, y: SYSTEM_MENU_BOX.y,
    rows, cols, style: 0,
    uiSpriteFrames,
  })
  items.forEach((item, i) => {
    const y = SYSTEM_MENU_ITEM_START.y + i * LINE_HEIGHT
    const color = i === state.selection.cursor ? selectedColor() : MENUITEM_COLOR
    // sdlpal ui.c:458 PAL_ReadMenu 真值 fShadow=TRUE
    renderText(fb, item.label, SYSTEM_MENU_ITEM_START.x, y, color, glyphs, true)
  })
}

// ── Cash box(主菜单弹出时左上角) ─────────────────────────────────────────

function drawCashBox(
  fb: Framebuffer,
  dwCash: number,
  uiSpriteFrames: IndexedImage[],
  glyphs?: GlyphTable,
): void {
  drawSingleLineBox({
    fb, x: CASH_BOX.x, y: CASH_BOX.y, len: CASH_BOX.len, uiSpriteFrames,
  })
  // sdlpal uigame.c:483 真值:PAL_DrawText("金钱", PAL_XY(10, 10), 0, FALSE, ...)
  //   color=0(黑色) + fShadow=FALSE(无阴影)— 不要带 shadow 也不要用 MENUITEM_COLOR
  renderText(fb, '金钱', CASH_LABEL_POS.x, CASH_LABEL_POS.y, 0, glyphs, false)
  // sdlpal uigame.c:488 真值:PAL_DrawNumber(dwCash, 6, PAL_XY(49, 14), kNumColorYellow, kNumAlignRight)
  // M5.6 Step A:port PAL_DrawNumber 真做 sprite-based digit(SPRITEUI frame 19-28
  // yellow,每 digit 6px),不再用 Unifont char measureText 算右对齐(位置不准)。
  drawNumber(fb, dwCash, 6, CASH_NUMBER_RIGHT, 'yellow', 'right', uiSpriteFrames)
}

// ── Save Slot menu(T10a:sdlpal uigame.c:169-242 真值) ────────────────────

// sdlpal 真值:
//   每 slot box pos (195-dx, 7 + 38*i),slot 文字 (210-dx, 17 + 38*i)
//   存档次数数字 right-align at (270, 38*i - 17),黄色
//   ts 简版:dx=0(假设 "Slot N" label 短),len=6
const SAVE_SLOT_BOX_X = 195
const SAVE_SLOT_BOX_Y_BASE = 7
const SAVE_SLOT_LINE_HEIGHT = 38
const SAVE_SLOT_LABEL_OFFSET = { x: 15, y: 10 }
const SAVE_SLOT_NUMBER_X_RIGHT = 270

function drawSaveSlotMenu(
  fb: Framebuffer,
  state: SaveSlotMenuState,
  uiSpriteFrames: IndexedImage[],
  glyphs?: GlyphTable,
): void {
  const items = state.selection.items
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!
    const boxY = SAVE_SLOT_BOX_Y_BASE + i * SAVE_SLOT_LINE_HEIGHT
    drawSingleLineBox({ fb, x: SAVE_SLOT_BOX_X, y: boxY, len: 6, uiSpriteFrames })
    const color = i === state.selection.cursor ? selectedColor() : MENUITEM_COLOR
    // sdlpal ui.c:458 PAL_ReadMenu 真值 fShadow=TRUE
    renderText(
      fb, item.label,
      SAVE_SLOT_BOX_X + SAVE_SLOT_LABEL_OFFSET.x,
      boxY + SAVE_SLOT_LABEL_OFFSET.y,
      color, glyphs, true,
    )
    // sdlpal uigame.c:218 真值:PAL_DrawNumber(GetSavedTimes(i), 4, PAL_XY(270, 38*i-17), kNumColorYellow, kNumAlignRight)
    // i 是 1-based(uigame.c:213 for i=1..5),y = 38*i-17 = 21/59/97/135/173;
    // ts 端 cursor i 是 0-based,等价 y = 38*(i+1)-17 = 21+38*i。
    // M5.6 简版固定 savedTimes=0;真 Save.listSlots 异步注入留 follow-up。
    drawNumber(
      fb, 0, 4,
      { x: SAVE_SLOT_NUMBER_X_RIGHT, y: 21 + 38 * i },
      'yellow', 'right', uiSpriteFrames,
    )
  }
  // sdlpal PAL_SaveSlotMenu(uigame.c:169-242)真值无独立标题 — caller(InGameMenu /
  // OpeningMenu)按 mode 自行处理。我之前简版加 "存档/读档" 标题是错的,user 怒怼删。
}

// ── Placeholder TODO(T10b-e 完成前,显式标 TODO 不装"接通") ────────────────

function drawPlaceholderTodo(
  fb: Framebuffer,
  kind: ActiveMenuKind,
  uiSpriteFrames: IndexedImage[],
  glyphs?: GlyphTable,
): void {
  const pos = { x: 80, y: 80 }
  drawBox({ fb, x: pos.x, y: pos.y, rows: 1, cols: 14, style: 0, uiSpriteFrames })
  renderText(fb, `TODO M5.6 T10:${kind}`, pos.x + 16, pos.y + 8, MENUITEM_COLOR, glyphs)
}

// 防 lint warn — SelectionMenuState 未直接用,但下面调用通过 state.selection 间接用
void (null as unknown as SelectionMenuState)
