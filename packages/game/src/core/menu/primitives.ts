/** Selection state and one-dimensional cursor/window movement. Rendering and confirmation eligibility belong to the concrete menu callers. */

export interface SelectionMenuItem {
  id: number
  label: string
  /** disabled 不可确认(灰色),光标可停留。 */
  disabled?: boolean
  /** 可选附加文本(MP cost / 数量 / 价格等,渲染层接);primitive 不消费。 */
  rightText?: string
}

export interface SelectionMenuState {
  items: SelectionMenuItem[]
  /** 全局 item index(不是 page-local;翻页时调整 pageOffset 让 cursor 仍可见)。 */
  cursor: number
  /** 一屏显示多少行。 */
  pageSize: number
  /** 当前页起始 index。 */
  pageOffset: number
}

// ── SelectionMenu ─────────────────────────────────────────────────────────

export function createSelectionMenu(
  items: SelectionMenuItem[],
  pageSize: number = 8,
  defaultCursor = 0,
): SelectionMenuState {
  // sdlpal PAL_ReadMenu / MagicSelectionMenuInit:初始 cursor 按 default item,
  // 不因 disabled/fEnabled=FALSE 改跳到第一个可选项。
  const cursor = items.length === 0 ? 0 : Math.min(Math.max(0, defaultCursor), items.length - 1)
  const state = {
    items,
    cursor,
    pageSize,
    pageOffset: 0,
  }
  ensureCursorVisible(state)
  return state
}

// L38:逐项 ±1 环绕,**不跳过** disabled(对齐 sdlpal PAL_ReadMenu ui.c:510-572 wCurrentItem±1 环绕 /
//   选人 uigame.c:1473-1488):光标可停在 fEnabled=FALSE 项(present 画 MENUITEM_COLOR_SELECTED_INACTIVE),
//   确认时各菜单各自 `!sel.disabled` no-op(in-game-magic-menu / battle-system handle*SelectInput)。
//   以前用 findNextSelectable 跳过禁用项,导致渲染层"落禁用项画灰"分支永不触发、节奏与原版不一致。
export function moveSelectionUp(s: SelectionMenuState): void {
  const n = s.items.length
  if (n > 0) s.cursor = (s.cursor - 1 + n) % n
  ensureCursorVisible(s)
}

export function moveSelectionDown(s: SelectionMenuState): void {
  const n = s.items.length
  if (n > 0) s.cursor = (s.cursor + 1) % n
  ensureCursorVisible(s)
}

function ensureCursorVisible(s: SelectionMenuState): void {
  if (s.cursor < s.pageOffset) {
    s.pageOffset = s.cursor
  } else if (s.cursor >= s.pageOffset + s.pageSize) {
    s.pageOffset = s.cursor - s.pageSize + 1
  }
}

/** 当前光标对应的 item(可能 undefined when items 空)。 */
export function getSelected(s: SelectionMenuState): SelectionMenuItem | undefined {
  return s.items[s.cursor]
}
