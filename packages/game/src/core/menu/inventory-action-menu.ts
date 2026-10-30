/**
 * 物品一级子菜单：先选装备/使用，再由 menu-driver 打开对应全屏列表。
 * SDLPal PAL_InventoryMenu（uigame.c:878-919）在主菜单与物品列表之间保留这一层；
 * 此模块只拥有选项与游标，入栈、动作派发和选择记忆由 caller 负责。
 */

import { getWord } from '../word-lookup.js'
import type { SelectionMenuState } from './primitives.js'
import { createSelectionMenu, moveSelectionDown, moveSelectionUp } from './primitives.js'

export type InventoryActionChoice = 'equip' | 'use'

// sdlpal ui.h:80-81 INVMENU_LABEL_EQUIP=22 / USE=23(真 WORD id,EQUIP 在上 USE 在下,uigame.c:901-902)。
//   文案 getWord(id) 取(WORD.DAT 单一源),fallback byte-level 核 flat[id]。
const INVENTORY_ACTION_LABELS: ReadonlyArray<{
  id: number
  choice: InventoryActionChoice
  fallback: string
}> = [
  { id: 22, choice: 'equip', fallback: '装备' },
  { id: 23, choice: 'use', fallback: '使用' },
]

export interface InventoryActionMenuState {
  selection: SelectionMenuState
}

/**
 * sdlpal 真值 `static WORD w = 0` 跨调用记忆上次选择(uigame.c:896,函数 static 变量)。
 * ts 端通过 gs.iCurInvActionMenuItem 持久化(同 iCurMainMenuItem / iCurSystemMenuItem 模式)。
 *
 * @param defaultCursor 上次选择(0=equip, 1=use);首次进入 0。
 */
export function createInventoryActionMenu(defaultCursor = 0): InventoryActionMenuState {
  const selection = createSelectionMenu(
    INVENTORY_ACTION_LABELS.map((d) => ({ id: d.id, label: getWord(d.id, d.fallback) })),
  )
  if (defaultCursor > 0 && defaultCursor < selection.items.length) {
    selection.cursor = defaultCursor
  }
  return { selection }
}

export function inventoryActionChoice(
  s: InventoryActionMenuState,
): InventoryActionChoice | undefined {
  const sel = s.selection.items[s.selection.cursor]
  if (!sel) return undefined
  return INVENTORY_ACTION_LABELS.find((l) => l.id === sel.id)?.choice
}

export function inventoryActionMenuUp(s: InventoryActionMenuState): void {
  moveSelectionUp(s.selection)
}

export function inventoryActionMenuDown(s: InventoryActionMenuState): void {
  moveSelectionDown(s.selection)
}
