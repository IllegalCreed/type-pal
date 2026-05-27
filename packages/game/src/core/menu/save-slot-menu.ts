/**
 * M5.6 W0.f:存档/读档槽位选择菜单 — sdlpal `uigame.c:169-242` PAL_SaveSlotMenu。
 *
 * sdlpal 真值:5 个 slot(1..5),显示已存 / 空 slot;Up/Down 切,Confirm 触发
 * 当前 mode 的 save/load 动作(由 caller bus emit),Menu 关闭返回 SystemMenu。
 */

import { createSelectionMenu, moveSelectionDown, moveSelectionUp, type SelectionMenuState } from './primitives.js'

export type SaveSlotMode = 'save' | 'load'

export interface SaveSlotMenuState {
  mode: SaveSlotMode
  selection: SelectionMenuState
}

/**
 * 创建 save-slot 菜单。slotMeta 缺省时,每 slot 标 "Slot N(空)";真实存档读出后会在
 * draw-menu 端取 IndexedDB meta 补 "Lv X / scene Y" 等信息(M5 Save 已有 API)。
 */
export function createSaveSlotMenu(mode: SaveSlotMode, slotMeta?: Array<{ slot: number; label: string }>): SaveSlotMenuState {
  const items = (slotMeta ?? [1, 2, 3, 4, 5].map((slot) => ({ slot, label: `Slot ${slot}(空)` }))).map((s) => ({
    id: s.slot,
    label: s.label,
  }))
  return { mode, selection: createSelectionMenu(items) }
}

export function saveSlotMenuUp(s: SaveSlotMenuState): void { moveSelectionUp(s.selection) }
export function saveSlotMenuDown(s: SaveSlotMenuState): void { moveSelectionDown(s.selection) }

/** 当前光标对应 slot 号(1..5);items 空时 undefined。 */
export function saveSlotMenuCurrent(s: SaveSlotMenuState): number | undefined {
  return s.selection.items[s.selection.cursor]?.id
}
