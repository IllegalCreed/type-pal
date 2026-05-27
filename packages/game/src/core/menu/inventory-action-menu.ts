/**
 * M5.6 T10b 修(2026-05-27 session 3):InventoryMenu 一级子菜单(装备/使用)。
 *
 * sdlpal 真值锚:[`reference/sdlpal/uigame.c:878-919`](../../../reference/sdlpal/uigame.c#L878-L919)
 * `PAL_InventoryMenu`(从 PAL_InGameMenu Confirm "物品" 进入):
 *
 * ```c
 * PAL_InventoryMenu() {
 *   static WORD w = 0;
 *   MENUITEM rgMenuItem[2] = {
 *     { 1, INVMENU_LABEL_EQUIP, TRUE, PAL_XY(43, 73) },        // 22 "装备"
 *     { 2, INVMENU_LABEL_USE,   TRUE, PAL_XY(43, 73 + 18) },   // 23 "使用"
 *   };
 *   PAL_CreateBox(PAL_XY(30, 60), 1, PAL_MenuTextMaxWidth(...) - 1, 0, FALSE);
 *   w = PAL_ReadMenu(NULL, rgMenuItem, 2, w - 1, MENUITEM_COLOR);
 *   switch (w) {
 *     case 1: PAL_GameEquipItem(); break;  // play.c:328-359 → ItemSelectMenu(equipable) → EquipItemMenu
 *     case 2: PAL_GameUseItem();   break;  // play.c:244-325 → ItemSelectMenu(usable)    → ItemUseMenu
 *   }
 * }
 * ```
 *
 * T10b session 1 漏:把 InGameMenu 选"物品"直接连到 fullscreen ItemSelectMenu,
 * 跳过 PAL_InventoryMenu 这一层 box submenu。该修:加 'inventory-action' kind
 * 作为 1 级子菜单(2 项 装备/使用),Confirm 后再开对应全屏 list / equip menu。
 */

import type { SelectionMenuState } from './primitives.js'
import { createSelectionMenu, moveSelectionDown, moveSelectionUp } from './primitives.js'

export type InventoryActionChoice = 'equip' | 'use'

/** sdlpal WORD.DAT 真值:22=装备 / 23=使用(verify via lookup/words.json flat[]) */
const INVENTORY_ACTION_LABELS: Array<{ id: number; choice: InventoryActionChoice; label: string }> = [
  { id: 0, choice: 'equip', label: '装备' },
  { id: 1, choice: 'use', label: '使用' },
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
  const selection = createSelectionMenu(INVENTORY_ACTION_LABELS)
  if (defaultCursor > 0 && defaultCursor < selection.items.length) {
    selection.cursor = defaultCursor
  }
  return { selection }
}

export function inventoryActionChoice(s: InventoryActionMenuState): InventoryActionChoice | undefined {
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
