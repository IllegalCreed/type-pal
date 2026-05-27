/**
 * M5.M-w1.a:InventoryMenu + ItemUseMenu 状态机(sdlpal `uigame.c:878` + `1289`)。
 *
 * 大世界打开物品菜单 → 选物品 → if usable 进 ItemUseMenu(选目标 role)→
 * Confirm → 跑 item.scriptOnUse。
 *
 * 纯数据层 + transition fn,渲染层 + 真实 script 调用留后续。
 */

import type { Item, PlayerRoles } from '@type-pal/shared'
import type { GameState } from '../game-state.js'
import { createItemSelectMenu, type ItemFilter } from './item-select.js'
import {
  createSelectionMenu,
  moveSelectionDown,
  moveSelectionUp,
  type SelectionMenuState,
} from './primitives.js'

/** 状态机阶段。 */
export type InventoryMenuPhase = 'list' | 'use-target' | 'done'

export interface InventoryMenuState {
  phase: InventoryMenuPhase
  filter: ItemFilter
  list: SelectionMenuState
  /** 选中的 item id(进入 use-target 时存)。 */
  selectedItemId?: number
  /** 选目标 role 时的 SelectionMenu。 */
  targetMenu?: SelectionMenuState
}

export function createInventoryMenu(
  gs: GameState,
  items: Item[],
  filter: ItemFilter = 'all',
): InventoryMenuState {
  return {
    phase: 'list',
    filter,
    list: createItemSelectMenu({
      inventory: gs.inventory,
      items,
      filter,
      mode: 'inventory',
    }),
  }
}

/** Confirm 在 list 阶段:选中物品 → 看是否 usable → 进 use-target;不可用则 no-op。 */
export function confirmInventoryItem(
  state: InventoryMenuState,
  items: Item[],
  playerRoles: PlayerRoles,
  partyMembers: number[],
): void {
  if (state.phase !== 'list') return
  const selected = state.list.items[state.list.cursor]
  if (!selected) return
  const item = items.find((i) => i.id === selected.id)
  if (!item || !item.flags.usable) {
    // 不可用 — sdlpal 真值:emit "不能使用" 提示;M5 简版 no-op
    return
  }
  state.selectedItemId = item.id
  // 构 targetMenu:party 成员列表
  const targetItems = partyMembers
    .map((roleId) => playerRoles.roles[roleId])
    .filter((r): r is NonNullable<typeof r> => r !== undefined)
    .map((r) => ({
      id: r.id,
      label: r._name ?? `role#${r.id}`,
      // hp=0 死亡 → disabled(M5 简版;sdlpal 还有 puppet 例外)
      disabled: r.hp <= 0,
    }))
  state.targetMenu = createSelectionMenu(targetItems)
  state.phase = 'use-target'
}

/** Confirm 在 use-target 阶段:返回选中的 roleId(caller 跑 scriptOnUse);phase → done。 */
export function confirmInventoryTarget(state: InventoryMenuState): { itemId: number; roleId: number } | null {
  if (state.phase !== 'use-target' || !state.targetMenu || state.selectedItemId === undefined) return null
  const sel = state.targetMenu.items[state.targetMenu.cursor]
  if (!sel) return null
  state.phase = 'done'
  return { itemId: state.selectedItemId, roleId: sel.id }
}

/** Cancel:use-target → 回 list;list → done(关菜单)。 */
export function cancelInventoryMenu(state: InventoryMenuState): void {
  if (state.phase === 'use-target') {
    state.phase = 'list'
    state.selectedItemId = undefined
    state.targetMenu = undefined
  } else if (state.phase === 'list') {
    state.phase = 'done'
  }
}

/** Up/Down 路由到当前 phase 的 SelectionMenu。 */
export function inventoryMoveUp(state: InventoryMenuState): void {
  if (state.phase === 'list') moveSelectionUp(state.list)
  else if (state.phase === 'use-target' && state.targetMenu) moveSelectionUp(state.targetMenu)
}

export function inventoryMoveDown(state: InventoryMenuState): void {
  if (state.phase === 'list') moveSelectionDown(state.list)
  else if (state.phase === 'use-target' && state.targetMenu) moveSelectionDown(state.targetMenu)
}
