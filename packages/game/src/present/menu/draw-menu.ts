/**
 * M5.6 W0.d:大世界菜单渲染入口 — 从 gs.menuStack 底到顶遍历画。
 *
 * sdlpal `uigame.c` 各 PAL_*Menu 函数内部:CreateBoxWithShadow + 画 box 内 SelectionMenuItem
 * 列表(label + rightText)+ 高亮当前 cursor 项。ts 端 menu state machine 数据层已 port
 * (M5),W0.d 把它接到 framebuffer 上。
 *
 * 字体真值:sdlpal 用 PALFONT 字模(GBK/Big5);ts 用 GNU Unifont(M4 P4)— 中文字宽相同(16px)。
 */

import type { IndexedImage } from '../../assets/png.js'
import type {
  ActiveMenuEntry,
  GameState,
  ActiveMenuKind,
} from '../../core/game-state.js'
import type { InGameMenuState, SystemMenuState } from '../../core/menu/in-game-menu.js'
import type { Framebuffer } from '../framebuffer.js'
import { renderText, type GlyphTable } from '../font.js'
import { drawBox } from './draw-box.js'

// sdlpal palette idx 真值:
//   FONT_COLOR_DEFAULT = 0x4F(亮黄,亮色文字)
//   FONT_COLOR_HIGHLIGHT = 0x1F(亮白,选中项)— 用于光标当前 item
const COLOR_NORMAL = 0x4F
const COLOR_HIGHLIGHT = 0x1F

// sdlpal uigame.c:953 PAL_InGameMenu 真值坐标
const IN_GAME_MENU_POS = { x: 57, y: 60 }
// sdlpal uigame.c:516+ PAL_SystemMenu — 弹在 InGameMenu 右侧
const SYSTEM_MENU_POS = { x: 130, y: 60 }

// 列表行间距(sdlpal 默认 16px)
const LINE_HEIGHT = 16
// label 内容相对 box 左上偏移(box 边框约 8px 厚)
const LABEL_OFFSET_X = 16
const LABEL_OFFSET_Y = 8

export function drawMenuStack(
  fb: Framebuffer,
  gs: GameState,
  uiSpriteFrames: IndexedImage[],
  glyphs?: GlyphTable,
): void {
  // 多层 menu 都画(底层 → 顶层堆叠);顶层是当前焦点(高亮位置基于栈顶 cursor)
  for (const entry of gs.menuStack) {
    drawMenuEntry(fb, entry, uiSpriteFrames, glyphs)
  }
}

function drawMenuEntry(
  fb: Framebuffer,
  entry: ActiveMenuEntry,
  uiSpriteFrames: IndexedImage[],
  glyphs?: GlyphTable,
): void {
  switch (entry.kind) {
    case 'in-game':
      drawInGameMenu(fb, entry.state as InGameMenuState, uiSpriteFrames, glyphs)
      break
    case 'system':
      drawSystemMenu(fb, entry.state as SystemMenuState, uiSpriteFrames, glyphs)
      break
    case 'save-slot':
    case 'inventory':
    case 'equip':
    case 'in-game-magic':
    case 'player-status':
    case 'shop-buy':
    case 'shop-sell':
      // W0.e/f 内填实各 kind 的 draw fn;暂画 placeholder box
      drawPlaceholderBox(fb, entry.kind, uiSpriteFrames, glyphs)
      break
  }
}

// ── In-Game hub(物品/法术/状态/系统) ──────────────────────────────────────

function drawInGameMenu(
  fb: Framebuffer,
  state: InGameMenuState,
  uiSpriteFrames: IndexedImage[],
  glyphs?: GlyphTable,
): void {
  drawSelectionBox(fb, state, IN_GAME_MENU_POS, uiSpriteFrames, glyphs)
}

// ── System menu(存档/读档/设置/退出) ─────────────────────────────────────

function drawSystemMenu(
  fb: Framebuffer,
  state: SystemMenuState,
  uiSpriteFrames: IndexedImage[],
  glyphs?: GlyphTable,
): void {
  drawSelectionBox(fb, state, SYSTEM_MENU_POS, uiSpriteFrames, glyphs)
}

// ── 通用 selection menu render(box + labels + 高亮当前 cursor) ────────────

function drawSelectionBox(
  fb: Framebuffer,
  state: InGameMenuState | SystemMenuState,
  pos: { x: number; y: number },
  uiSpriteFrames: IndexedImage[],
  glyphs?: GlyphTable,
): void {
  const items = state.selection.items
  const cursor = state.selection.cursor
  // box 大小:行数 = items 数;列数留 5(够 4 字中文 + 边距)
  drawBox({
    fb,
    x: pos.x,
    y: pos.y,
    rows: Math.max(items.length, 1),
    cols: 5,
    style: 0,
    uiSpriteFrames,
  })
  items.forEach((item, i) => {
    const y = pos.y + LABEL_OFFSET_Y + i * LINE_HEIGHT
    const color = i === cursor ? COLOR_HIGHLIGHT : COLOR_NORMAL
    renderText(fb, item.label, pos.x + LABEL_OFFSET_X, y, color, glyphs)
  })
}

// ── Placeholder(W0.e/f 填实前的占位) ─────────────────────────────────────

function drawPlaceholderBox(
  fb: Framebuffer,
  kind: ActiveMenuKind,
  uiSpriteFrames: IndexedImage[],
  glyphs?: GlyphTable,
): void {
  const pos = { x: 80, y: 80 }
  drawBox({ fb, x: pos.x, y: pos.y, rows: 1, cols: 8, style: 0, uiSpriteFrames })
  renderText(fb, `[${kind}]`, pos.x + LABEL_OFFSET_X, pos.y + LABEL_OFFSET_Y, COLOR_NORMAL, glyphs)
}
