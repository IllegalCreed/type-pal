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
import type { ItemFilter } from './item-select.js'
import {
  createSelectionMenu,
  moveSelectionDown,
  moveSelectionUp,
  type SelectionMenuState,
} from './primitives.js'

/**
 * L40:用物品选目标框的默认光标 slot(sdlpal uigame.c:1311 `static SHORT sSelectedPlayer = 0`)。
 * 跨「切换物品 / 关闭重开物品菜单」持久记忆上次选中的队员 slot —— 模块级静态 = C 的 static(不入存档)。
 * 重建 targetMenu 时用作初始光标;越界(队伍变小,slot >= 人数)归 0(uigame.c:1320-1323)。
 * 仅 confirm/cancel 离开目标框时回写,READ 总在下一次重建,故等价 C 每次移动即写 static。
 */
let sSelectedItemTargetSlot = 0

/** sdlpal itemmenu.c:51 真值:`32 / dwWordLength`,中文 dwWordLength=10 → 3 列 */
export const INV_ITEMS_PER_LINE = 3
/** sdlpal itemmenu.c:53 真值:`7 - extraDescLines`,默认 extraDescLines=0 → 7 行 */
export const INV_LINES_PER_PAGE = 7
/** sdlpal itemmenu.c:52 真值:`8 * dwWordLength + 20` = 8*10+20 = 100 px / item label cell width */
export const INV_ITEM_TEXT_WIDTH = 100

// ── sdlpal ui.h 真值色(InventoryMenu / EquipMenu 共享) ─────────────────────
export const MENUITEM_COLOR = 0x4F                  // ui.h:29  默认
export const MENUITEM_COLOR_INACTIVE = 0x18         // ui.h:30  filter 不命中 + 非选
export const MENUITEM_COLOR_SELECTED_INACTIVE = 0x1C // ui.h:32  filter 不命中 + 选中
export const MENUITEM_COLOR_EQUIPPEDITEM = 0xC8     // ui.h:38  equipment 中(amount=0)
export const MENUITEM_COLOR_SELECTED_FIRST = 0xF9   // ui.h:33  闪烁起始色
export const MENUITEM_COLOR_SELECTED_TOTAL = 6      // ui.h:34  闪烁 cycle

/**
 * sdlpal itemmenu.c:135-181 真值 6-case 色规则 — InventoryMenu / EquipMenu / Shop 共享。
 *
 * | isSelected | isUsable(filter 命中 + count > inUse) | isEquipped(count==0) | color |
 * |---|---|---|---|
 * | ✓ | ✗     | -    | MENUITEM_COLOR_SELECTED_INACTIVE 0x1C |
 * | ✓ | ✓     | ✓    | MENUITEM_COLOR_EQUIPPEDITEM 0xC8 |
 * | ✓ | ✓     | ✗    | MENUITEM_COLOR_SELECTED_FIRST + tick/100 % 6(闪烁 0xF9..0xFE) |
 * | ✗ | ✗     | -    | MENUITEM_COLOR_INACTIVE 0x18 |
 * | ✗ | -     | ✓    | MENUITEM_COLOR_EQUIPPEDITEM 0xC8 |
 * | ✗ | ✓     | ✗    | MENUITEM_COLOR 0x4F |
 *
 * 抽出 pure fn 便于单测 4-case 防回归(2026-05-29 C5 session 4:user 实测 EquipMenu
 * 全装备红色,根因 isUsable hardcode `flags.usable` 而非 filter 命中)。
 *
 * `selectedFlashTickMs` 默认 `Date.now()`;单测传固定值确保 deterministic。
 */
export function pickItemRowColor(opts: {
  isSelected: boolean
  isUsable: boolean
  isEquipped: boolean
  selectedFlashTickMs?: number
}): number {
  const { isSelected, isUsable, isEquipped } = opts
  if (isSelected) {
    if (!isUsable) return MENUITEM_COLOR_SELECTED_INACTIVE
    if (isEquipped) return MENUITEM_COLOR_EQUIPPEDITEM
    const t = opts.selectedFlashTickMs ?? Date.now()
    return MENUITEM_COLOR_SELECTED_FIRST + (Math.floor(t / 100) % MENUITEM_COLOR_SELECTED_TOTAL)
  }
  if (!isUsable) return MENUITEM_COLOR_INACTIVE
  if (isEquipped) return MENUITEM_COLOR_EQUIPPEDITEM
  return MENUITEM_COLOR
}

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
  // L39:usable 入口需 catalog 查装备槽里哪些装备本身 usable(itemmenu.c:352-376);列表本身仍不按 flag 过滤。
  items: Item[],
  filter: ItemFilter = 'all',
): InventoryMenuState {
  // sdlpal `PAL_ItemSelectMenuInit`(itemmenu.c:331-377)真值:**不按 wItemFlags 过滤列表** —
  // while 循环把整个库存(wItem != 0)全部计入 g_iNumInventory。filter 只在渲染层
  // (draw-inventory.ts:276 isUsable)决定颜色:不匹配 filter 的物品照样显示,只是画成
  // INACTIVE 红色(0x18 / 光标停其上 0x1C,itemmenu.c:148/171),确认时 no-op(itemmenu.c:289)。
  // 所以「使用/装备/卖」菜单都是全显示 + 非匹配项红色,不是把非匹配项从列表删掉。
  //
  // 注(2026-05-27 session 3):items.json id 0 是真值物品(观音符),不是 "wItem=0 = no item"
  // 哨兵;inventory entries 由 addItemToInventory 维护(count=0 自动清掉),故全部保留。
  const inv: InventorySlot[] = gs.inventory.map((e) => ({
    itemId: e.itemId,
    count: e.count ?? 0,
    inUse: (e as { inUse?: number }).inUse ?? 0,
  }))
  // L39:C PAL_ItemSelectMenuInit 在 `(wItemFlags & kItemFlagUsable) && !fInBattle`(=大世界用物品入口)
  //   额外把全队 6 个装备槽里本身 usable 的装备追加进列表(nAmount=0/nAmountInUse=-1 → 0>-1 可选),
  //   让穿戴中却可用的物品(圣灵珠/五灵珠 id260/263-267)也能从「用物品」菜单使用(itemmenu.c:352-376)。
  if (filter === 'usable') {
    const rt = gs.PlayerRolesRuntime
    for (const roleId of gs.partyMembers) {
      for (let slot = 0; slot < 6; slot++) {
        const itemId = rt.rgwEquipment[slot]?.[roleId] ?? 0
        if (itemId !== 0 && items.find((it) => it.id === itemId)?.flags.usable)
          inv.push({ itemId, count: 0, inUse: -1 })
      }
    }
  }
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
  // sdlpal itemmenu.c:287-291 真值:使用菜单 g_wItemFlags == kItemFlagUsable,确认时须
  // `(wFlags & kItemFlagUsable) && nAmount > nAmountInUse`,否则返回 0xFFFF(未确认)留菜单 ——
  // 列表全显示后光标可落在非可用(红色)项上,确认它 no-op(use 动作只对可用物品有意义)。
  if (!item?.flags.usable || sel.count - sel.inUse <= 0) {
    return
  }
  state.selectedItemId = sel.itemId
  const targetItems = partyMembers
    .map((roleId) => playerRoles.roles[roleId])
    .filter((r): r is NonNullable<typeof r> => r !== undefined)
    .map((r) => ({
      id: r.id,
      label: r._name ?? `role#${r.id}`,
      // H2(2026-06-07 sdlpal 审查):PAL_ItemUseMenu(uigame.c:1383-1495)对队员目标**无** disabled /
      //   阵亡判定 —— 死人也能被选中,这是还魂香 / 孟婆汤 / 天香续命露(0x22 复活类)的必要前提。
      //   使用效果(治疗对死人无效 / 复活对死人有效)由 item 使用脚本判断成败,不在选目标阶段拦。
    }))
  const targetMenu = createSelectionMenu(targetItems)
  // L40(uigame.c:1311/1320-1323):默认光标记忆上次选中的队员 slot;越界(队伍变小)归 0。
  if (sSelectedItemTargetSlot >= targetMenu.items.length) sSelectedItemTargetSlot = 0
  targetMenu.cursor = sSelectedItemTargetSlot
  state.targetMenu = targetMenu
  state.phase = 'use-target'
}

export function confirmInventoryTarget(state: InventoryMenuState): { itemId: number; roleId: number } | null {
  if (state.phase !== 'use-target' || !state.targetMenu || state.selectedItemId === undefined) return null
  const sel = state.targetMenu.items[state.targetMenu.cursor]
  if (!sel) return null
  sSelectedItemTargetSlot = state.targetMenu.cursor // L40:回写记忆 slot(uigame.c:1495 返回不复位)
  state.phase = 'done'
  return { itemId: state.selectedItemId, roleId: sel.id }
}

/** Cancel:use-target → 回 list;list → done(关菜单)。 */
export function cancelInventoryMenu(state: InventoryMenuState): void {
  if (state.phase === 'use-target') {
    if (state.targetMenu) sSelectedItemTargetSlot = state.targetMenu.cursor // L40:取消也保留记忆 slot(uigame.c:1489 break)
    state.phase = 'list'
    state.selectedItemId = undefined
    state.targetMenu = undefined
  }
  else if (state.phase === 'list') {
    state.phase = 'done'
  }
}
