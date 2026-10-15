/**
 * SaveSlotMenu — sdlpal `uigame.c:169-242` PAL_SaveSlotMenu。
 *
 * 默认 5 个 slot(1..5)，Up/Down 切换；本层只提供选择状态与元数据读取。
 * Confirm 由 menu-driver 直接调 Save/注入 handler。Menu 也由 driver 处理：
 * 标题读档上下文 pop 回 opening；游戏内上下文清整栈，不返回 SystemMenu。
 *
 * slotMetas 经 Save.listSlots 读取（浏览器 IndexedDB；无 IDB 时内存路径）。
 * present 的 draw-menu 每帧读取元数据中的 savedTimes。
 */

import type { SlotMeta } from '../save/api.js'
import { Save } from '../save/api.js'
import {
  createSelectionMenu,
  moveSelectionDown,
  moveSelectionUp,
  type SelectionMenuState,
} from './primitives.js'

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
 * 创建 save-slot 菜单（同步工厂）。slotMetas 起初空 Map；caller(menu-driver)在
 * openMenu 前启动 fetchSlotMetas，异步结果随后填入同一 state；不另建异步工厂。
 */
export function createSaveSlotMenu(
  mode: SaveSlotMode,
  slotMeta?: Array<{ slot: number; label: string }>,
  /** DM24:默认选中槽号(1-based;uigame.c:582/605 PAL_SaveSlotMenu(bCurrentSaveSlot) → :225 cursor=slot-1)。 */
  defaultSlot?: number,
): SaveSlotMenuState {
  const items = (
    slotMeta ??
    [1, 2, 3, 4, 5].map((slot) => ({
      slot,
      label: SAVE_SLOT_LABELS[slot - 1] ?? `进度${slot}`,
    }))
  ).map((s) => ({
    id: s.slot,
    label: s.label,
  }))
  const selection = createSelectionMenu(items)
  if (defaultSlot !== undefined) {
    const idx = items.findIndex((it) => it.id === defaultSlot)
    if (idx >= 0) selection.cursor = idx
  }
  return { mode, selection, slotMetas: new Map() }
}

/**
 * dispatcher 在 createSaveSlotMenu 后 fire-and-forget 调；经 Save 门面读取 SlotMeta，
 * 完成后 mutate state.slotMetas。失败记录 warning，由本函数收束 Promise。
 *
 * 注:state mutate 后,因 draw 每帧重新读 state.slotMetas,UI 自动刷新 — 无需 trigger。
 */
export function fetchSlotMetas(state: SaveSlotMenuState): Promise<void> {
  return Save.listSlots()
    .then((slots) => {
      for (const { id, meta } of slots) {
        state.slotMetas.set(id, meta)
      }
    })
    .catch((err) => {
      console.warn('[save-slot-menu] fetchSlotMetas failed:', err)
    })
}

export function saveSlotMenuUp(s: SaveSlotMenuState): void {
  moveSelectionUp(s.selection)
}
export function saveSlotMenuDown(s: SaveSlotMenuState): void {
  moveSelectionDown(s.selection)
}

/** 当前 item 的 slot id（默认1..5，自定义列表透传其id）；空表返回 undefined。 */
export function saveSlotMenuCurrent(s: SaveSlotMenuState): number | undefined {
  return s.selection.items[s.selection.cursor]?.id
}
