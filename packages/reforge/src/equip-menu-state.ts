// 装备菜单状态机(纯逻辑;非视觉)。两阶段(对齐原版 PAL_GameEquipItem):
//   list     选可装物(网格)→ Enter 记下选中、进 pick-role(不立即换)
//   pick-role 确认面板(显角色当前 6 槽装备 + 5 属性)→ Enter 才真换 / Esc 回 list
// 换装走 content equipItem(返回新 world)。
import { equipItem, equippableItems, type ItemData, type WorldState } from '@type-pal/content'

export type EquipPhase = 'list' | 'pick-role'

export interface EquipMenuState {
  active: boolean
  phase: EquipPhase
  items: ItemData[] // 背包里可装物(该角色)
  cursor: number // list 阶段网格光标
  casterId: string // 换装目标角色(单人 demo = 李逍遥;多人时 pick-role 切角色)
  /** pick-role 阶段:list 里选中、待换上的物品 id。 */
  selectedItemId?: string
}

export function openEquipMenu(world: WorldState, casterId: string): EquipMenuState {
  return {
    active: true,
    phase: 'list',
    items: equippableItems(world, casterId),
    cursor: 0,
    casterId,
  }
}

export function closeEquipMenu(): EquipMenuState {
  return { active: false, phase: 'list', items: [], cursor: 0, casterId: '' }
}

/** 原版物品列表 3 列网格(itemmenu.c iItemsPerLine)。 */
export const EQUIP_GRID_COLS = 3

/** list 阶段网格导航:↑↓ = ±列数,←→ = ±1;越界 clamp 不动、不 wrap(对齐原版物品列表)。 */
export function equipMoveCursor(
  s: EquipMenuState,
  dir: 'up' | 'down' | 'left' | 'right',
): EquipMenuState {
  if (s.phase !== 'list') return s
  const n = s.items.length
  if (n === 0) return s
  const delta =
    dir === 'up' ? -EQUIP_GRID_COLS : dir === 'down' ? EQUIP_GRID_COLS : dir === 'left' ? -1 : 1
  const next = s.cursor + delta
  if (next < 0 || next >= n) return s
  return { ...s, cursor: next }
}

/** list Confirm:记下选中物 → 进 pick-role 确认面板(不立即换)。空列表/越界 no-op。 */
export function equipConfirmItem(s: EquipMenuState): EquipMenuState {
  if (s.phase !== 'list') return s
  const sel = s.items[s.cursor]
  if (!sel) return s
  return { ...s, phase: 'pick-role', selectedItemId: sel.id }
}

/** pick-role Esc:回 list(清选中)。 */
export function equipBackToList(s: EquipMenuState): EquipMenuState {
  if (s.phase !== 'pick-role') return s
  return { ...s, phase: 'list', selectedItemId: undefined }
}

/** pick-role Confirm:换上选中物。返回新 world + 重算后回 list(列表变,cursor 归 0)。 */
export function equipApply(
  s: EquipMenuState,
  world: WorldState,
): { world: WorldState; state: EquipMenuState } {
  if (s.phase !== 'pick-role' || !s.selectedItemId) return { world, state: s }
  const next = equipItem(world, s.casterId, s.selectedItemId)
  return { world: next, state: openEquipMenu(next, s.casterId) }
}
