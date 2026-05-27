/**
 * M5.6 T10b:InventoryMenu fullscreen — sdlpal `itemmenu.c:28-466` PAL_ItemSelectMenu 1:1 port。
 *
 * sdlpal 真值锚:
 *  - `gpGlobals->iCurInvMenuItem` linear cursor across full inventory(itemmenu.c:107-112)
 *  - grid layout:`iItemsPerLine = 32 / dwWordLength`(palcfg.c:570 中文 dwWordLength=10 → 3)
 *  - `iLinesPerPage = 7 - extraDescLines`(默认 extraDescLines=0 → 7)
 *  - input:
 *    - Up = -iItemsPerLine(跨行)
 *    - Down = +iItemsPerLine
 *    - Left = -1
 *    - Right = +1
 *    - PgUp = -(iItemsPerLine * iLinesPerPage)
 *    - PgDn = +(iItemsPerLine * iLinesPerPage)
 *    - Home = -current(jump 0)
 *    - End = +(numInventory - 1 - current)
 *    - Menu = cancel return 0
 *    - Search = if usable return wObject
 *  - cursor clamp [0, numInventory - 1](itemmenu.c:107-112,不 wrap)
 *
 * 大世界打开物品菜单 → 选物品 → if usable 进 ItemUseMenu(选目标 role)→
 * Confirm → 跑 item.scriptOnUse(M5 stub log)。
 */

import type { Item, PlayerRoles } from '@type-pal/shared'
import type { GameState } from '../game-state.js'
import { matchesFilter, type ItemFilter } from './item-select.js'
import {
  createSelectionMenu,
  moveSelectionDown,
  moveSelectionUp,
  type SelectionMenuState,
} from './primitives.js'

/** sdlpal itemmenu.c:51 真值:`32 / dwWordLength`,中文 dwWordLength=10 → 3 列 */
export const INV_ITEMS_PER_LINE = 3
/** sdlpal itemmenu.c:53 真值:`7 - extraDescLines`,默认 extraDescLines=0 → 7 行 */
export const INV_LINES_PER_PAGE = 7
/** sdlpal itemmenu.c:52 真值:`8 * dwWordLength + 20` = 8*10+20 = 100 px / item label cell width */
export const INV_ITEM_TEXT_WIDTH = 100

export type InventoryMenuPhase = 'list' | 'use-target' | 'done'

export interface InventorySlot {
  itemId: number
  count: number
  inUse: number
}

export interface InventoryMenuState {
  phase: InventoryMenuPhase
  /** sdlpal gpGlobals->iCurInvMenuItem — linear inventory cursor。 */
  cursor: number
  /** 当前 inventory snapshot(开菜单时 copy 自 gs.inventory + filter)。 */
  inventory: InventorySlot[]
  filter: ItemFilter
  /** 选中的 item id(进入 use-target 时存)。 */
  selectedItemId?: number
  /** 选目标 role 时的 SelectionMenu(复用 primitives)。 */
  targetMenu?: SelectionMenuState
}

export function createInventoryMenu(
  gs: GameState,
  items: Item[],
  filter: ItemFilter = 'all',
): InventoryMenuState {
  const inv: InventorySlot[] = gs.inventory
    .filter((e) => e.itemId > 0)
    .filter((e) => {
      const item = items.find((i) => i.id === e.itemId)
      return item ? matchesFilter(item, filter) : false
    })
    .map((e) => ({
      itemId: e.itemId,
      count: e.count ?? 0,
      inUse: (e as { inUse?: number }).inUse ?? 0,
    }))
  const cur = gs.iCurInvMenuItem ?? 0
  const safeCur = inv.length === 0 ? 0 : Math.min(cur, inv.length - 1)
  return {
    phase: 'list',
    cursor: safeCur,
    inventory: inv,
    filter,
  }
}

/** clamp [0, inventory.length - 1],不 wrap(sdlpal itemmenu.c:107-112 真值)。 */
function setCursorClamp(s: InventoryMenuState, target: number): void {
  if (s.inventory.length === 0) {
    s.cursor = 0
    return
  }
  if (target < 0) s.cursor = 0
  else if (target >= s.inventory.length) s.cursor = s.inventory.length - 1
  else s.cursor = target
}

// ── grid 输入(sdlpal itemmenu.c:63-94 真值)──────────────────────────────────

export function inventoryMoveUp(s: InventoryMenuState): void {
  if (s.phase === 'use-target' && s.targetMenu) {
    moveSelectionUp(s.targetMenu)
    return
  }
  if (s.phase !== 'list') return
  setCursorClamp(s, s.cursor - INV_ITEMS_PER_LINE)
}

export function inventoryMoveDown(s: InventoryMenuState): void {
  if (s.phase === 'use-target' && s.targetMenu) {
    moveSelectionDown(s.targetMenu)
    return
  }
  if (s.phase !== 'list') return
  setCursorClamp(s, s.cursor + INV_ITEMS_PER_LINE)
}

export function inventoryMoveLeft(s: InventoryMenuState): void {
  if (s.phase !== 'list') return
  setCursorClamp(s, s.cursor - 1)
}

export function inventoryMoveRight(s: InventoryMenuState): void {
  if (s.phase !== 'list') return
  setCursorClamp(s, s.cursor + 1)
}

export function inventoryPageUp(s: InventoryMenuState): void {
  if (s.phase !== 'list') return
  setCursorClamp(s, s.cursor - INV_ITEMS_PER_LINE * INV_LINES_PER_PAGE)
}

export function inventoryPageDown(s: InventoryMenuState): void {
  if (s.phase !== 'list') return
  setCursorClamp(s, s.cursor + INV_ITEMS_PER_LINE * INV_LINES_PER_PAGE)
}

export function inventoryHome(s: InventoryMenuState): void {
  if (s.phase !== 'list') return
  s.cursor = 0
}

export function inventoryEnd(s: InventoryMenuState): void {
  if (s.phase !== 'list') return
  s.cursor = Math.max(0, s.inventory.length - 1)
}

// ── Confirm / Cancel(sdlpal itemmenu.c:287-308 / 95-98) ─────────────────────

export function confirmInventoryItem(
  state: InventoryMenuState,
  items: Item[],
  playerRoles: PlayerRoles,
  partyMembers: number[],
): void {
  if (state.phase !== 'list') return
  const sel = state.inventory[state.cursor]
  if (!sel) return
  const item = items.find((i) => i.id === sel.itemId)
  if (!item || !item.flags.usable) {
    // sdlpal itemmenu.c:289 真值:wFlags & g_wItemFlags 不匹配 → 没动作
    return
  }
  state.selectedItemId = sel.itemId
  const targetItems = partyMembers
    .map((roleId) => playerRoles.roles[roleId])
    .filter((r): r is NonNullable<typeof r> => r !== undefined)
    .map((r) => ({
      id: r.id,
      label: r._name ?? `role#${r.id}`,
      // sdlpal global.c PAL_IsRoleDying / hp<=0 disabled
      disabled: r.hp <= 0,
    }))
  state.targetMenu = createSelectionMenu(targetItems)
  state.phase = 'use-target'
}

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
  }
  else if (state.phase === 'list') {
    state.phase = 'done'
  }
}
