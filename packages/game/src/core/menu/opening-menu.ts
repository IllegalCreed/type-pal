/**
 * M5.6 T17:OpeningMenu(主菜单)— sdlpal `uigame.c:42-167` PAL_OpeningMenu。
 *
 * 大世界启动后第一个菜单 — 2 项固定:新游戏 / 读取存档。
 *
 * sdlpal 真值锚:
 *  - 2 个 MENUITEM:`MAINMENU_LABEL_NEWGAME`(value=0)、`MAINMENU_LABEL_LOADGAME`(value=1)
 *  - Cancel / 选 NEWGAME 都返回 0(新游戏);选 LOADGAME 返回 1 → 进 PAL_SaveSlotMenu
 *  - 不画 box(`PAL_ReadMenu(NULL, ...)`)— 直接画字在 fbp 背景图上
 *
 * 数据 state machine,渲染 / dispatch / bootstrap 接入由 caller(draw-opening-menu.ts /
 * menu-driver.ts / bootstrap.ts)做。
 */

import type { SelectionMenuState } from './primitives.js'
import { createSelectionMenu, moveSelectionDown, moveSelectionUp } from './primitives.js'

export type OpeningMenuChoice = 'new-game' | 'load-game'

/**
 * sdlpal `uigame.c:105-109` 真值菜单项 — 顺序:新游戏(value=0)/ 读档(value=1)。
 * 坐标在渲染层 PAL_XY(125±padding, 95/112);state machine 不持坐标。
 */
const OPENING_LABELS: Array<{ id: number; choice: OpeningMenuChoice; label: string }> = [
  { id: 0, choice: 'new-game', label: '新游戏' },
  { id: 1, choice: 'load-game', label: '读取存档' },
]

export interface OpeningMenuState {
  selection: SelectionMenuState
}

/** OpeningMenu 渲染层用的 label 表(draw-opening-menu.ts 取真字符串)。 */
export function openingMenuLabels(): ReadonlyArray<{ id: number; label: string }> {
  return OPENING_LABELS.map(({ id, label }) => ({ id, label }))
}

/**
 * 创建 OpeningMenu state。
 * sdlpal `wDefaultItem = 0` 起手 — 默认光标在 "新游戏"。
 * Cancel 回 OpeningMenu 时 sdlpal 把 wDefaultItem 重置回 0(uigame.c:150)。
 */
export function createOpeningMenu(): OpeningMenuState {
  return { selection: createSelectionMenu(OPENING_LABELS, 2) }
}

/** 当前光标对应的 choice。 */
export function openingMenuChoice(s: OpeningMenuState): OpeningMenuChoice | undefined {
  const sel = s.selection.items[s.selection.cursor]
  if (!sel) return undefined
  return OPENING_LABELS.find((l) => l.id === sel.id)?.choice
}

export function openingMenuUp(s: OpeningMenuState): void { moveSelectionUp(s.selection) }
export function openingMenuDown(s: OpeningMenuState): void { moveSelectionDown(s.selection) }
