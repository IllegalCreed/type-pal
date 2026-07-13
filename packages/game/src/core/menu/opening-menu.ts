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

import { getWord } from '../word-lookup.js'
import type { SelectionMenuState } from './primitives.js'
import { createSelectionMenu, moveSelectionDown, moveSelectionUp } from './primitives.js'

export type OpeningMenuChoice = 'new-game' | 'load-game'

/**
 * sdlpal `uigame.c:105-109` 真值菜单项 — 顺序:新游戏(value=0)/ 读档(value=1)。
 *
 * label 文案 = WORD.DAT id 7 / 8 真值 GBK 解码(`MAINMENU_LABEL_NEWGAME=7` / `LOADGAME=8`):
 *   id 7 hex `d0 c2 b5 c4 b9 ca ca c2` GBK → "新的故事"
 *   id 8 hex `be c9 b5 c4 bb d8 d2 e4` GBK → "旧的回忆"
 * 每 word fixed 10 byte 长度,中文 2 byte/字,4 字 + 2 空格右补 = 10 byte。
 *
 * W3 C1/C2:文案改 lookup-driven —— id = 真 WORD id(ui.h:48-49 MAINMENU_LABEL_NEWGAME=7 / LOADGAME=8),
 *   label 由 getWord(id) 取(words.json flat[],单一源),fallback = byte-level 核过的硬编码兜底。
 *
 * 坐标在渲染层 PAL_XY(125±padding, 95/112);state machine 不持坐标。
 */
const OPENING_LABELS: ReadonlyArray<{ id: number; choice: OpeningMenuChoice; fallback: string }> = [
  { id: 7, choice: 'new-game', fallback: '新的故事' },
  { id: 8, choice: 'load-game', fallback: '旧的回忆' },
]

export interface OpeningMenuState {
  selection: SelectionMenuState
}

/** OpeningMenu 渲染层用的 label 表(draw-opening-menu.ts 取真字符串);label = getWord(真id)。 */
export function openingMenuLabels(): ReadonlyArray<{ id: number; label: string }> {
  return OPENING_LABELS.map(({ id, fallback }) => ({ id, label: getWord(id, fallback) }))
}

/**
 * 创建 OpeningMenu state。
 * sdlpal `wDefaultItem = 0` 起手 — 默认光标在 "新游戏"。
 * Cancel 回 OpeningMenu 时 sdlpal 把 wDefaultItem 重置回 0(uigame.c:150)。
 */
export function createOpeningMenu(): OpeningMenuState {
  return {
    selection: createSelectionMenu(
      OPENING_LABELS.map((d) => ({ id: d.id, label: getWord(d.id, d.fallback) })),
      2,
    ),
  }
}

/** 当前光标对应的 choice。 */
export function openingMenuChoice(s: OpeningMenuState): OpeningMenuChoice | undefined {
  const sel = s.selection.items[s.selection.cursor]
  if (!sel) return undefined
  return OPENING_LABELS.find((l) => l.id === sel.id)?.choice
}

export function openingMenuUp(s: OpeningMenuState): void {
  moveSelectionUp(s.selection)
}
export function openingMenuDown(s: OpeningMenuState): void {
  moveSelectionDown(s.selection)
}
