/**
 * C5(2026-05-28):EquipItemMenu — sdlpal `uigame.c:1793-2056` PAL_EquipItemMenu 1:1 port。
 *
 * sdlpal 流程(uigame.c 真值):
 *  1. `PAL_GameEquipItem`(play.c:328-359):outer while → `PAL_ItemSelectMenu(equipable)` 选 item
 *     → `PAL_EquipItemMenu(wItem)` 内层 menu。
 *  2. `PAL_EquipItemMenu` 入口设 `wLastUnequippedItem = wItem`(line 1820)。
 *  3. while (TRUE) outer 渲染循环:每帧重读 `wItem = wLastUnequippedItem`(line 1859)。
 *  4. 输入:Up/Left → iCurrentPlayer-- wrap;Down/Right → ++ wrap;Menu → return;
 *     Confirm → if (item.equipableBy[role]):scriptOnEquip = RunTriggerScript(scriptOnEquip, role)。
 *  5. scriptOnEquip 内 opcode 0x18 真做 swap → 写 wLastUnequippedItem = 旧装备 id;
 *     opcode 0x17 多次写 rgEquipmentEffect 累加 stat。
 *  6. 下一帧渲染读 wLastUnequippedItem 取新值 → 显示 swap 出来的旧装备让 user 继续装。
 *  7. wItem == 0(刚 swap 出来的旧装备空)→ return(uigame.c:2016-2019)。
 *
 * ts 端 state:
 *  - phase='list' = `PAL_ItemSelectMenu`(equipable filter)— 选 item 入口
 *  - phase='pick-role' = `PAL_EquipItemMenu` — 选 role 装备
 *  - selectedItemId 等价 sdlpal `wLastUnequippedItem`(每次 Confirm swap 后被 dispatcher 重设)
 *  - playerCursor 等价 sdlpal `iCurrentPlayer`
 *  - phase='done' → dispatcher closeTopMenu;Menu key 在 pick-role 时 → 回 list 选下一个 item(等价
 *    sdlpal `PAL_EquipItemMenu` return 回 `PAL_GameEquipItem` outer while)。
 *
 * 注:phase='list' 是简版 SelectionMenu 而非 sdlpal `PAL_ItemSelectMenu` 完整 grid(留 follow-up)。
 */

import type { Item, PlayerRoles } from '@type-pal/shared'
import type { GameState } from '../game-state.js'
import { createItemSelectMenu } from './item-select.js'
import {
  createSelectionMenu,
  type SelectionMenuState,
  moveSelectionDown,
  moveSelectionUp,
} from './primitives.js'

export type EquipMenuPhase = 'list' | 'pick-role' | 'done'

export interface EquipMenuState {
  phase: EquipMenuPhase
  /** phase='list' 时 active — equipable items list(sdlpal `PAL_ItemSelectMenu` 等价)。 */
  list: SelectionMenuState
  /** phase='pick-role' 时 active — sdlpal `wLastUnequippedItem`,每次 Confirm swap 后被 dispatcher 重设。 */
  selectedItemId?: number
  /** sdlpal `iCurrentPlayer`(uigame.c:1853)— role cursor 0..wMaxPartyMemberIndex。 */
  playerCursor: number
  /** sdlpal `MENUITEM_COLOR_SELECTED + tick/100 % 6` 闪烁 — 渲染层用 Date.now() 算,state 不持。 */
  /** party members snapshot(close 判断 wrap 用)。 */
  partyMembers: number[]
}

export function createEquipMenu(gs: GameState, items: Item[]): EquipMenuState {
  return {
    phase: 'list',
    list: createItemSelectMenu({
      inventory: gs.inventory,
      items,
      filter: 'equip',
      mode: 'inventory',
    }),
    playerCursor: 0,
    partyMembers: [...gs.partyMembers],
  }
}

/** phase='list' Confirm:进 phase='pick-role',初始 wLastUnequippedItem = 选中的 item。 */
export function confirmEquipItem(
  state: EquipMenuState,
  _items: Item[],
  _playerRoles: PlayerRoles,
  _partyMembers: number[],
): void {
  if (state.phase !== 'list') return
  const sel = state.list.items[state.list.cursor]
  if (!sel) return
  // sdlpal uigame.c:1820 真值 `wLastUnequippedItem = wItem`
  state.selectedItemId = sel.id
  state.playerCursor = 0
  state.phase = 'pick-role'
}

/**
 * phase='pick-role' Confirm:返回 `{itemId, roleId}` 由 dispatcher 调 runEquipScript 跑
 * scriptOnEquip(opcode 0x18 内会真 swap + 改 wLastUnequippedItem)。返回后 dispatcher
 * 应:
 *  1. 从 gs.wLastUnequippedItem 读出新 swap 值
 *  2. state.selectedItemId = gs.wLastUnequippedItem
 *  3. if state.selectedItemId == 0 → phase = 'done'(无旧装备可继续,sdlpal uigame.c:2016 真值)
 *  4. else 保持 phase='pick-role' 让 user 继续选 role 装新 swap 出来的旧装备
 *
 * 调用方需自己 verify item.equipableBy[role] —— dispatcher 检 + 不满足时 return null 不调 script。
 */
export function confirmEquipRole(state: EquipMenuState): { itemId: number; roleId: number } | null {
  if (state.phase !== 'pick-role' || state.selectedItemId === undefined) return null
  const roleId = state.partyMembers[state.playerCursor]
  if (roleId === undefined) return null
  return { itemId: state.selectedItemId, roleId }
}

/** Menu key:pick-role → 回 list 选下一个 item(sdlpal PAL_GameEquipItem outer while 等价);
 * list → done 关菜单。 */
export function cancelEquipMenu(state: EquipMenuState): void {
  if (state.phase === 'pick-role') {
    state.phase = 'list'
    state.selectedItemId = undefined
    state.playerCursor = 0
  } else if (state.phase === 'list') {
    state.phase = 'done'
  }
}

/** sdlpal uigame.c:2021-2027 真值:Up/Left → iCurrentPlayer-- wrap to wMaxPartyMemberIndex */
export function equipMoveUp(s: EquipMenuState): void {
  if (s.phase === 'list') {
    moveSelectionUp(s.list)
    return
  }
  if (s.phase !== 'pick-role') return
  s.playerCursor--
  if (s.playerCursor < 0) s.playerCursor = s.partyMembers.length - 1
}

/** sdlpal uigame.c:2029-2035 真值:Down/Right → iCurrentPlayer++ wrap to 0 */
export function equipMoveDown(s: EquipMenuState): void {
  if (s.phase === 'list') {
    moveSelectionDown(s.list)
    return
  }
  if (s.phase !== 'pick-role') return
  s.playerCursor++
  if (s.playerCursor >= s.partyMembers.length) s.playerCursor = 0
}

// 旧 API 兼容(dispatcher 内已重写,但 export 保留防外部 import):
export type { SelectionMenuState }
export function getEquipListState(s: EquipMenuState): SelectionMenuState | undefined {
  return s.phase === 'list' ? s.list : undefined
}
// 无人引用 roleMenu 旧字段,但保留 SelectionMenuState 名供 menu-driver type-check
void createSelectionMenu // 防 lint
