/**
 * M5.M-w2.b:InGameMenu(主菜单)+ SystemMenu(系统菜单)。
 *
 * 大世界主菜单 4 项:物品 / 法术 / 状态 / 系统;系统菜单 4 项:存档 / 读档 / 设置 / 退出。
 *
 * 数据 state machine,渲染 + 跳到子菜单(InventoryMenu / InGameMagicMenu / PlayerStatus /
 * SaveSlotMenu)留 caller 接。
 */

import type { SelectionMenuState } from './primitives.js'
import { createSelectionMenu, moveSelectionDown, moveSelectionUp } from './primitives.js'
import { getWord } from '../word-lookup.js'

/** {真 WORD id, choice, fallback文案} → SelectionMenuItem{id, label=getWord(id, fallback)}。 */
function toItems<C>(defs: ReadonlyArray<{ id: number; choice: C; fallback: string }>) {
  return defs.map((d) => ({ id: d.id, label: getWord(d.id, d.fallback) }))
}

export type InGameMenuChoice = 'status' | 'magic' | 'inventory' | 'system'
export type SystemMenuChoice = 'save' | 'load' | 'music' | 'sound' | 'quit'

/**
 * sdlpal `uigame.c:961-966` PAL_InGameMenu 真值菜单项 — 顺序:状态/法术/物品/系统。
 * 每行 PAL_XY(16, 50 + i*18)— 间距 18px,起点 (16, 50);box 在 PAL_XY(3, 37) rows=3 cols=auto。
 */
// sdlpal ui.h:61-64 GAMEMENU_LABEL_* = 真 WORD id;文案由 getWord(id) 取(words.json flat[],单一源),
//   fallback = 表未载时的硬编码兜底(byte-level 核 flat[id] 验过):3 状态 / 4 仙术 / 5 物品 / 6 系统。
const IN_GAME_LABELS: ReadonlyArray<{ id: number; choice: InGameMenuChoice; fallback: string }> = [
  { id: 3, choice: 'status', fallback: '状态' },
  { id: 4, choice: 'magic', fallback: '仙术' },
  { id: 5, choice: 'inventory', fallback: '物品' },
  { id: 6, choice: 'system', fallback: '系统' },
]

/**
 * sdlpal `uigame.c:543-552` PAL_SystemMenu PAL_CLASSIC 真值 — 5 项:存档/读档/音乐/音效/退出。
 * box pos (40, 60),items PAL_XY(53, 72 + i*18)。ATB build 还有第 6 项 battlemode,classic 省略。
 */
// sdlpal ui.h:66-70 SYSMENU_LABEL_* = 真 WORD id(classic 5 项,第 6 项 BATTLEMODE=606 被 PAL_CLASSIC 编译掉)。
//   fallback byte-level 核 flat[id]:11 储存进度 / 12 读取进度 / 13 音乐 / 14 音效 / 15 结束游戏。
const SYSTEM_LABELS: ReadonlyArray<{ id: number; choice: SystemMenuChoice; fallback: string }> = [
  { id: 11, choice: 'save', fallback: '储存进度' },
  { id: 12, choice: 'load', fallback: '读取进度' },
  { id: 13, choice: 'music', fallback: '音乐' },
  { id: 14, choice: 'sound', fallback: '音效' },
  { id: 15, choice: 'quit', fallback: '结束游戏' },
]

export interface InGameMenuState {
  selection: SelectionMenuState
}

/**
 * 创建 InGame 主菜单 state。
 * @param defaultCursor sdlpal iCurMainMenuItem 全局记忆 — 上次选哪项,这次默认那项(M5.6 T6)。
 */
export function createInGameMenu(defaultCursor = 0): InGameMenuState {
  const selection = createSelectionMenu(toItems(IN_GAME_LABELS))
  if (defaultCursor > 0 && defaultCursor < selection.items.length) {
    selection.cursor = defaultCursor
  }
  return { selection }
}

export function inGameMenuChoice(s: InGameMenuState): InGameMenuChoice | undefined {
  const sel = s.selection.items[s.selection.cursor]
  if (!sel) return undefined
  return IN_GAME_LABELS.find((l) => l.id === sel.id)?.choice
}

export function inGameMenuUp(s: InGameMenuState): void { moveSelectionUp(s.selection) }
export function inGameMenuDown(s: InGameMenuState): void { moveSelectionDown(s.selection) }

export interface SystemMenuState {
  selection: SelectionMenuState
}

/**
 * 创建 System 菜单 state。
 * @param defaultCursor sdlpal iCurSystemMenuItem 全局记忆(M5.6 T6)。
 */
export function createSystemMenu(defaultCursor = 0): SystemMenuState {
  const selection = createSelectionMenu(toItems(SYSTEM_LABELS))
  if (defaultCursor > 0 && defaultCursor < selection.items.length) {
    selection.cursor = defaultCursor
  }
  return { selection }
}

export function systemMenuChoice(s: SystemMenuState): SystemMenuChoice | undefined {
  const sel = s.selection.items[s.selection.cursor]
  if (!sel) return undefined
  return SYSTEM_LABELS.find((l) => l.id === sel.id)?.choice
}

export function systemMenuUp(s: SystemMenuState): void { moveSelectionUp(s.selection) }
export function systemMenuDown(s: SystemMenuState): void { moveSelectionDown(s.selection) }
