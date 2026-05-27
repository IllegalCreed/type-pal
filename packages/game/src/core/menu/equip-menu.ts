/**
 * M5.M-w1.b:EquipItemMenu — 装备菜单(sdlpal `uigame.c:1416` 真值)。
 *
 * 流程:选可装备 item → 选 role(限 equipableBy[roleId]=true)→ Confirm → 落
 * PlayerRolesRuntime.rgwEquipment[slot][roleId] + 重算 stat。
 *
 * 装备槽 6 个(sdlpal `palcommon.h` BODYPART):武器 / 头盔 / 衣甲 / 鞋 / 饰品 / 护身符。
 * 选 role 时按 slot 自动判定(item 不带 slot index — 通过 item.scriptOnEquip 决定);
 * M5 简版按"item 类型推断"(weapon → slot 0,others → slot 4 装饰),sdlpal 精细
 * 推断 follow-up。
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
  list: SelectionMenuState
  selectedItemId?: number
  roleMenu?: SelectionMenuState
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
  }
}

export function confirmEquipItem(
  state: EquipMenuState,
  items: Item[],
  playerRoles: PlayerRoles,
  partyMembers: number[],
): void {
  if (state.phase !== 'list') return
  const sel = state.list.items[state.list.cursor]
  if (!sel) return
  const item = items.find((i) => i.id === sel.id)
  if (!item || !item.flags.equipable) return
  state.selectedItemId = item.id

  // role 列表:partyMembers + equipableBy[roleId]=true 才可选
  const roleItems = partyMembers
    .map((roleId) => playerRoles.roles[roleId])
    .filter((r): r is NonNullable<typeof r> => r !== undefined)
    .map((r) => ({
      id: r.id,
      label: r._name ?? `role#${r.id}`,
      // sdlpal `equipableBy[roleId]` 真值:M5 简版统一 enable;follow-up 用 item.flags.equipableBy[roleId]
      disabled: !(item.flags.equipableBy?.[r.id] ?? true),
    }))
  state.roleMenu = createSelectionMenu(roleItems)
  state.phase = 'pick-role'
}

export function confirmEquipRole(state: EquipMenuState): { itemId: number; roleId: number } | null {
  if (state.phase !== 'pick-role' || !state.roleMenu || state.selectedItemId === undefined) return null
  const sel = state.roleMenu.items[state.roleMenu.cursor]
  if (!sel) return null
  state.phase = 'done'
  return { itemId: state.selectedItemId, roleId: sel.id }
}

export function cancelEquipMenu(state: EquipMenuState): void {
  if (state.phase === 'pick-role') {
    state.phase = 'list'
    state.selectedItemId = undefined
    state.roleMenu = undefined
  } else if (state.phase === 'list') {
    state.phase = 'done'
  }
}

export function equipMoveUp(s: EquipMenuState): void {
  if (s.phase === 'list') moveSelectionUp(s.list)
  else if (s.phase === 'pick-role' && s.roleMenu) moveSelectionUp(s.roleMenu)
}

export function equipMoveDown(s: EquipMenuState): void {
  if (s.phase === 'list') moveSelectionDown(s.list)
  else if (s.phase === 'pick-role' && s.roleMenu) moveSelectionDown(s.roleMenu)
}
