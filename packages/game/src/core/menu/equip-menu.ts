/**
 * 装备列表与队员选择状态，参考 PAL_GameEquipItem / PAL_EquipItemMenu。
 * 本模块持有 phase、列表与队员光标，只返回装备请求。
 * dispatcher 负责角色装备许可、执行脚本、换装后的库存刷新和菜单栈；呈现由 present 负责。
 * 列表复用 InventoryMenuState；取消选人回列表，取消列表结束本菜单。
 */

import type { Item } from '@type-pal/shared'
import type { GameState } from '../game-state.js'
import { createInventoryMenu, type InventoryMenuState } from './inventory-menu.js'
import { matchesFilter } from './item-select.js'

export type EquipMenuPhase = 'list' | 'pick-role' | 'done'

export interface EquipMenuState {
  phase: EquipMenuPhase
  /** phase='list' active — 复用 InventoryMenu grid(sdlpal PAL_ItemSelectMenu equivalent)。 */
  list: InventoryMenuState
  /** sdlpal `wLastUnequippedItem`(uigame.c:1820 入口 / 1859 每帧重读)。
   * Confirm role 跑 scriptOnEquip 后,dispatcher 从 gs.wLastUnequippedItem 读 swap 出来的旧装备 ID 重设。 */
  selectedItemId?: number
  /** sdlpal `iCurrentPlayer`(uigame.c:1853)— role cursor 0..wMaxPartyMemberIndex,wrap。 */
  playerCursor: number
  /** 队伍roleId快照；角色导航按长度环绕，确认时由位置映射为roleId。 */
  partyMembers: number[]
}

export function createEquipMenu(gs: GameState, items: Item[]): EquipMenuState {
  // sdlpal PAL_ItemSelectMenu(equipable) — filter='equip' 用 matchesFilter f.equipable
  return {
    phase: 'list',
    list: createInventoryMenu(gs, items, 'equip'),
    playerCursor: 0,
    partyMembers: [...gs.partyMembers],
  }
}

/** phase='list' Confirm:取 grid cursor 对应 itemId 进 phase='pick-role'。 */
export function confirmEquipItem(state: EquipMenuState, items: Item[]): void {
  if (state.phase !== 'list') return
  const slot = state.list.inventory[state.list.cursor]
  if (!slot) return
  // sdlpal itemmenu.c:287-291 真值:确认时须 `(wFlags & kItemFlagEquipable) && nAmount > nAmountInUse`,
  // 否则返回 0xFFFF(未确认)留菜单 —— 列表全显示后光标可落在非可装备(红色)项上,确认它 no-op。
  const item = items.find((i) => i.id === slot.itemId)
  if (!item || !matchesFilter(item, 'equip') || slot.count - slot.inUse <= 0) return
  // sdlpal uigame.c:1820 真值 `wLastUnequippedItem = wItem`
  state.selectedItemId = slot.itemId
  state.playerCursor = 0
  state.phase = 'pick-role'
}

/**
 * phase='pick-role' Confirm:返回 {itemId, roleId}。dispatcher 自己:
 *  1. 检 item.equipableBy[role](sdlpal kItemFlagEquipableByPlayerRole_First flag)
 *  2. 跑 runEquipScript(scriptOnEquip, role)— opcode 0x18 真 swap + 改 gs.wLastUnequippedItem
 *  3. state.selectedItemId = gs.wLastUnequippedItem(swap 链)
 *  4. selectedItem == 0 → phase='list'(回选另一件;sdlpal uigame.c:2016-2019 真值)
 */
export function confirmEquipRole(state: EquipMenuState): { itemId: number; roleId: number } | null {
  if (state.phase !== 'pick-role' || state.selectedItemId === undefined) return null
  const roleId = state.partyMembers[state.playerCursor]
  if (roleId === undefined) return null
  return { itemId: state.selectedItemId, roleId }
}

/** Menu key:pick-role → 回 list 选下一个 item(sdlpal PAL_GameEquipItem outer while);
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
  if (s.phase !== 'pick-role') return
  s.playerCursor--
  if (s.playerCursor < 0) s.playerCursor = s.partyMembers.length - 1
}

/** sdlpal uigame.c:2029-2035 真值:Down/Right → iCurrentPlayer++ wrap to 0 */
export function equipMoveDown(s: EquipMenuState): void {
  if (s.phase !== 'pick-role') return
  s.playerCursor++
  if (s.playerCursor >= s.partyMembers.length) s.playerCursor = 0
}
