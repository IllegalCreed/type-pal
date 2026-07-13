/**
 * M5.M-w0.1:底层菜单 primitive — 数据 + cursor 操作。
 *
 * 4 个 primitive 对照 sdlpal `uigame.c:242-451` 真值:
 *  - SelectionMenu:列表光标(物品 / 法术 / 队员 选择)
 *  - ConfirmMenu:Yes/No 确认框
 *  - TripleMenu:3 选 1(常见于"上 / 下 / 取消")
 *  - SwitchMenu:多选项循环切换(战斗 主菜单 5 项类似)
 *
 * 渲染层(draw-menu.ts)由 M-w0.1 Step 3 实现;本文件不持任何 DOM / canvas
 * 引用,纯 pure data + tick fn,方便 unit test + L2 baseline 比对。
 */

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

export interface ConfirmMenuState {
  message: string
  selection: 'yes' | 'no'
}

export interface TripleMenuState {
  options: [string, string, string]
  selection: 0 | 1 | 2
}

export interface SwitchMenuState {
  options: string[]
  current: number
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

/**
 * 跳过 disabled 找下一个可选 index;循环;无任何可选时返回当前。
 * L38 后**仅供翻页(pageUp/Down)落到可选项**;逐项移动(moveSelectionUp/Down)改为不跳过、
 * 可停在 disabled 上(对齐 sdlpal PAL_ReadMenu)。带 disabled 的菜单(法术 / 选施法者)不走翻页,无冲突。
 */
function findNextSelectable(items: SelectionMenuItem[], from: number, dir: 1 | -1): number {
  const n = items.length
  if (n === 0) return 0
  for (let step = 1; step <= n; step++) {
    const idx = (from + dir * step + n * step) % n
    if (!items[idx]?.disabled) return idx
  }
  return from
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

/**
 * M5.6 T6:PgUp 翻页 — cursor 跳到上一页第一个可选项;若已在第一页,跳到首项。
 * sdlpal ui.c:540+ PAL_ReadMenu kKeyPgUp 真值。
 */
export function pageUp(s: SelectionMenuState): void {
  const target = Math.max(0, s.cursor - s.pageSize)
  s.cursor = findNextSelectable(s.items, target - 1, 1) // 从 target-1 之后找下一个可选
  if (s.cursor < target) s.cursor = target // 边界
  ensureCursorVisible(s)
}

/**
 * M5.6 T6:PgDn 翻页 — cursor 跳到下一页第一个可选项;末页时跳到末项。
 */
export function pageDown(s: SelectionMenuState): void {
  const target = Math.min(s.items.length - 1, s.cursor + s.pageSize)
  s.cursor = findNextSelectable(s.items, target - 1, 1)
  if (s.cursor > target) s.cursor = target
  ensureCursorVisible(s)
}

/** 当前光标对应的 item(可能 undefined when items 空)。 */
export function getSelected(s: SelectionMenuState): SelectionMenuItem | undefined {
  return s.items[s.cursor]
}

// ── ConfirmMenu ──────────────────────────────────────────────────────────

export function createConfirmMenu(message: string, defaultYes = true): ConfirmMenuState {
  return { message, selection: defaultYes ? 'yes' : 'no' }
}

export function toggleConfirm(s: ConfirmMenuState): void {
  s.selection = s.selection === 'yes' ? 'no' : 'yes'
}

// ── TripleMenu ───────────────────────────────────────────────────────────

export function createTripleMenu(
  options: [string, string, string],
  defaultSel: 0 | 1 | 2 = 0,
): TripleMenuState {
  return { options, selection: defaultSel }
}

export function moveTripleUp(s: TripleMenuState): void {
  s.selection = ((s.selection - 1 + 3) % 3) as 0 | 1 | 2
}

export function moveTripleDown(s: TripleMenuState): void {
  s.selection = ((s.selection + 1) % 3) as 0 | 1 | 2
}

// ── SwitchMenu(循环切换) ─────────────────────────────────────────────────

export function createSwitchMenu(options: string[], current = 0): SwitchMenuState {
  return { options, current: options.length === 0 ? 0 : Math.min(current, options.length - 1) }
}

export function switchLeft(s: SwitchMenuState): void {
  if (s.options.length === 0) return
  s.current = (s.current - 1 + s.options.length) % s.options.length
}

export function switchRight(s: SwitchMenuState): void {
  if (s.options.length === 0) return
  s.current = (s.current + 1) % s.options.length
}
