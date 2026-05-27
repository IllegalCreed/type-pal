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

export type InGameMenuChoice = 'inventory' | 'magic' | 'status' | 'system'
export type SystemMenuChoice = 'save' | 'load' | 'setting' | 'quit'

/** sdlpal `uigame.c` 真值标签;名字按 WORD.DAT 反查,简版用中文字面值。 */
const IN_GAME_LABELS: Array<{ id: number; choice: InGameMenuChoice; label: string }> = [
  { id: 0, choice: 'inventory', label: '物品' },
  { id: 1, choice: 'magic', label: '法术' },
  { id: 2, choice: 'status', label: '状态' },
  { id: 3, choice: 'system', label: '系统' },
]

const SYSTEM_LABELS: Array<{ id: number; choice: SystemMenuChoice; label: string }> = [
  { id: 0, choice: 'save', label: '存档' },
  { id: 1, choice: 'load', label: '读档' },
  { id: 2, choice: 'setting', label: '设置' },
  { id: 3, choice: 'quit', label: '退出' },
]

export interface InGameMenuState {
  selection: SelectionMenuState
}

export function createInGameMenu(): InGameMenuState {
  return { selection: createSelectionMenu(IN_GAME_LABELS) }
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

export function createSystemMenu(): SystemMenuState {
  return { selection: createSelectionMenu(SYSTEM_LABELS) }
}

export function systemMenuChoice(s: SystemMenuState): SystemMenuChoice | undefined {
  const sel = s.selection.items[s.selection.cursor]
  if (!sel) return undefined
  return SYSTEM_LABELS.find((l) => l.id === sel.id)?.choice
}

export function systemMenuUp(s: SystemMenuState): void { moveSelectionUp(s.selection) }
export function systemMenuDown(s: SystemMenuState): void { moveSelectionDown(s.selection) }
