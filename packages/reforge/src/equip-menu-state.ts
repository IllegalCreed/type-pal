// 装备菜单状态机(纯逻辑;非视觉)。换装走 content equipItem(返回新 world)。
import { equipItem, equippableItems, type ItemData, type WorldState } from '@type-pal/content'

export interface EquipMenuState {
  active: boolean
  items: ItemData[] // 背包里可装物(该角色)
  cursor: number
}

export function openEquipMenu(world: WorldState, casterId: string): EquipMenuState {
  return { active: true, items: equippableItems(world, casterId), cursor: 0 }
}

export function closeEquipMenu(): EquipMenuState {
  return { active: false, items: [], cursor: 0 }
}

/** 列表上下移;越界 clamp 不动、不 wrap。 */
export function equipMoveCursor(s: EquipMenuState, dir: 'up' | 'down'): EquipMenuState {
  const n = s.items.length
  if (n === 0) return s
  const next = s.cursor + (dir === 'up' ? -1 : 1)
  if (next < 0 || next >= n) return s
  return { ...s, cursor: next }
}

/** 换装当前选中:返回新 world + 重算后的 state(穿/卸后列表变,cursor 归 0)。 */
export function equipSelected(
  s: EquipMenuState,
  world: WorldState,
  casterId: string,
): { world: WorldState; state: EquipMenuState } {
  const sel = s.items[s.cursor]
  if (!sel) return { world, state: s }
  const next = equipItem(world, casterId, sel.id)
  return { world: next, state: openEquipMenu(next, casterId) }
}
