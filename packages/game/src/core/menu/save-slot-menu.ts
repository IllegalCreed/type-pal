/**
 * SaveSlotMenu — sdlpal `uigame.c:169-242` PAL_SaveSlotMenu。
 *
 * sdlpal 真值:5 个 slot(1..5),显示已存 / 空 slot;Up/Down 切,Confirm 触发
 * 当前 mode 的 save/load 动作(由 caller bus emit),Menu 关闭返回 SystemMenu。
 *
 * C8(2026-05-29):加 slotMetas 字段,异步 fetch IndexedDB SlotMeta(savedTimes /
 * partyLevel / cash / sceneId),draw 时显示。
 */

import type { SlotMeta } from '../save/api.js'
import { Save } from '../save/api.js'
import { createSelectionMenu, moveSelectionDown, moveSelectionUp, type SelectionMenuState } from './primitives.js'

export type SaveSlotMode = 'save' | 'load'

export interface SaveSlotMenuState {
  mode: SaveSlotMode
  selection: SelectionMenuState
  /** slot id → SlotMeta;async fetch 完毕后填(initial 空 Map)。 */
  slotMetas: Map<number, SlotMeta>
}

/**
 * sdlpal WORD.DAT 真值 LOADMENU_LABEL_SLOT_FIRST=43 + i(uigame.c:206 真值):
 *   id 43 "进度一" / 44 "进度二" / 45 "进度三" / 46 "进度四" / 47 "进度五"
 * GBK 解 + rstrip space。
 */
const SAVE_SLOT_LABELS = ['进度一', '进度二', '进度三', '进度四', '进度五']

/**
 * 创建 save-slot 菜单。slotMetas 起初空 Map,createSaveSlotMenuAsync 异步 fetch 后填。
 * 单测 / e2e 用本同步版本传入预 mock slotMetas。
 */
export function createSaveSlotMenu(
  mode: SaveSlotMode,
  slotMeta?: Array<{ slot: number; label: string }>,
): SaveSlotMenuState {
  const items = (slotMeta ?? [1, 2, 3, 4, 5].map((slot) => ({
    slot,
    label: SAVE_SLOT_LABELS[slot - 1] ?? `进度${slot}`,
  }))).map((s) => ({
    id: s.slot,
    label: s.label,
  }))
  return { mode, selection: createSelectionMenu(items), slotMetas: new Map() }
}

/**
 * dispatcher 在 createSaveSlotMenu 后立即 fire-and-forget 调,异步 fetch IndexedDB
 * SlotMeta 并 mutate state.slotMetas。fetch 完成后 draw 自然显真值。
 *
 * 注:state mutate 后,因 draw 每帧重新读 state.slotMetas,UI 自动刷新 — 无需 trigger。
 */
export function fetchSlotMetas(state: SaveSlotMenuState): Promise<void> {
  return Save.listSlots().then((slots) => {
    for (const { id, meta } of slots) {
      state.slotMetas.set(id, meta)
    }
  }).catch((err) => {
    console.warn('[save-slot-menu] fetchSlotMetas failed:', err)
  })
}

export function saveSlotMenuUp(s: SaveSlotMenuState): void { moveSelectionUp(s.selection) }
export function saveSlotMenuDown(s: SaveSlotMenuState): void { moveSelectionDown(s.selection) }

/** 当前光标对应 slot 号(1..5);items 空时 undefined。 */
export function saveSlotMenuCurrent(s: SaveSlotMenuState): number | undefined {
  return s.selection.items[s.selection.cursor]?.id
}
