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

export type InGameMenuChoice = 'status' | 'magic' | 'inventory' | 'system'
export type SystemMenuChoice = 'save' | 'load' | 'music' | 'sound' | 'quit'

/**
 * sdlpal `uigame.c:961-966` PAL_InGameMenu 真值菜单项 — 顺序:状态/法术/物品/系统。
 * 每行 PAL_XY(16, 50 + i*18)— 间距 18px,起点 (16, 50);box 在 PAL_XY(3, 37) rows=3 cols=auto。
 */
// sdlpal WORD.DAT 真值(verify by `flat[id]` from extracted/lookup/words.json):
//   GAMEMENU_LABEL_STATUS=3    → "状态"
//   GAMEMENU_LABEL_MAGIC=4     → "仙术"(我之前 hardcode "法术" 错)
//   GAMEMENU_LABEL_INVENTORY=5 → "物品"
//   GAMEMENU_LABEL_SYSTEM=6    → "系统"
const IN_GAME_LABELS: Array<{ id: number; choice: InGameMenuChoice; label: string }> = [
  { id: 0, choice: 'status', label: '状态' },
  { id: 1, choice: 'magic', label: '仙术' },
  { id: 2, choice: 'inventory', label: '物品' },
  { id: 3, choice: 'system', label: '系统' },
]

/**
 * sdlpal `uigame.c:543-552` PAL_SystemMenu PAL_CLASSIC 真值 — 5 项:存档/读档/音乐/音效/退出。
 * box pos (40, 60),items PAL_XY(53, 72 + i*18)。ATB build 还有第 6 项 battlemode,classic 省略。
 */
// sdlpal WORD.DAT 真值(verify by `flat[id]` from extracted/lookup/words.json):
//   SYSMENU_LABEL_SAVE=11   → "储存进度"(我之前 hardcode "存档" 错)
//   SYSMENU_LABEL_LOAD=12   → "读取进度"(我之前 hardcode "读档" 错)
//   SYSMENU_LABEL_MUSIC=13  → "音乐"
//   SYSMENU_LABEL_SOUND=14  → "音效"
//   SYSMENU_LABEL_QUIT=15   → "结束游戏"(我之前 hardcode "退出" 错)
const SYSTEM_LABELS: Array<{ id: number; choice: SystemMenuChoice; label: string }> = [
  { id: 0, choice: 'save', label: '储存进度' },
  { id: 1, choice: 'load', label: '读取进度' },
  { id: 2, choice: 'music', label: '音乐' },
  { id: 3, choice: 'sound', label: '音效' },
  { id: 4, choice: 'quit', label: '结束游戏' },
]

export interface InGameMenuState {
  selection: SelectionMenuState
}

/**
 * 创建 InGame 主菜单 state。
 * @param defaultCursor sdlpal iCurMainMenuItem 全局记忆 — 上次选哪项,这次默认那项(M5.6 T6)。
 */
export function createInGameMenu(defaultCursor = 0): InGameMenuState {
  const selection = createSelectionMenu(IN_GAME_LABELS)
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
  const selection = createSelectionMenu(SYSTEM_LABELS)
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
