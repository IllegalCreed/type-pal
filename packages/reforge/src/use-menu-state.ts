// 使用菜单状态机(纯逻辑;非视觉)。两阶段 pick-item → pick-target。施用走 content useItem(返回新 world)。
import { type ItemData, usableItems, useItem, type WorldState } from '@type-pal/content'

export const USE_GRID_COLS = 3

export interface UseMenuState {
  active: boolean
  phase: 'pick-item' | 'pick-target'
  items: ItemData[]
  cursor: number
  selectedItemId?: string
}

export function openUseMenu(world: WorldState): UseMenuState {
  return { active: true, phase: 'pick-item', items: usableItems(world), cursor: 0 }
}

export function closeUseMenu(): UseMenuState {
  return { active: false, phase: 'pick-item', items: [], cursor: 0 }
}

/** pick-item 网格导航:↑↓ ±3,←→ ±1;越界 clamp。 */
export function useMoveCursor(
  s: UseMenuState,
  dir: 'up' | 'down' | 'left' | 'right',
): UseMenuState {
  if (s.phase !== 'pick-item') return s
  const n = s.items.length
  if (n === 0) return s
  const delta =
    dir === 'up' ? -USE_GRID_COLS : dir === 'down' ? USE_GRID_COLS : dir === 'left' ? -1 : 1
  const next = s.cursor + delta
  if (next < 0 || next >= n) return s
  return { ...s, cursor: next }
}

/** 选中物 → pick-target(记 selectedItemId)。空列表不进。 */
export function useConfirmItem(s: UseMenuState): UseMenuState {
  if (s.phase !== 'pick-item') return s
  const sel = s.items[s.cursor]
  if (!sel) return s
  return { ...s, phase: 'pick-target', selectedItemId: sel.id }
}

/** pick-target Esc → 回 pick-item。 */
export function useBackFromTarget(s: UseMenuState): UseMenuState {
  if (s.phase !== 'pick-target') return s
  return { ...s, phase: 'pick-item', selectedItemId: undefined }
}

/** pick-target 确认:对 targetCharId 施用 → 新 world + 回 pick-item 重算(消耗后列表变)。 */
export function useApply(
  s: UseMenuState,
  world: WorldState,
  targetCharId: string,
): { world: WorldState; state: UseMenuState } {
  if (s.phase !== 'pick-target' || !s.selectedItemId) return { world, state: s }
  const next = useItem(world, targetCharId, s.selectedItemId)
  return { world: next, state: openUseMenu(next) }
}
