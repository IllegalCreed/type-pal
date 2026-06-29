// 使用菜单状态机(纯逻辑;非视觉)。两阶段 pick-item → pick-target。施用走 content useItem(返回新 world)。
// 交互行为对齐第一阶段 game 包(sdlpal PAL_GameUseItem / PAL_ItemUseMenu),非自创:
//  - 单体回复/buff(use.target='oneAlly')→ 进选目标面板;用完留菜单可连用(原版 ItemUseMenu INNER while),
//    用光(该物从 usableItems 消失)才回列表。
//  - 脚本/全体类(triggerScript / target≠oneAlly,如土灵珠脱离洞窟、圣灵符全体)→ 不选目标,直接执行
//    (原版 applyToAll:RunScript; consume; return)。
//  - 光标跨开关记忆(原版 iCurInvMenuItem)→ openUseMenu 收 initialCursor,记忆由 main.ts 持有。
import { type ItemData, usableItems, useItem, type WorldState } from '@type-pal/content'

export const USE_GRID_COLS = 3

export interface UseMenuState {
  active: boolean
  phase: 'pick-item' | 'pick-target'
  items: ItemData[]
  cursor: number
  selectedItemId?: string
}

/** initialCursor:重开使用面板时恢复上次光标(原版 iCurInvMenuItem;越界 clamp 到末项)。 */
export function openUseMenu(world: WorldState, initialCursor = 0): UseMenuState {
  const items = usableItems(world)
  const cursor = items.length === 0 ? 0 : Math.min(Math.max(0, initialCursor), items.length - 1)
  return { active: true, phase: 'pick-item', items, cursor }
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

/** pick-item 确认结果:单体回复/buff → 进选目标;脚本/全体类 → 已直接执行(返回新 world)。 */
export type UseConfirmResult =
  | { kind: 'pick-target'; state: UseMenuState }
  | { kind: 'direct'; world: WorldState; state: UseMenuState }

/** pick-item Enter:单体(oneAlly)进选目标面板;脚本/全体类直接执行(不选目标)。 */
export function useConfirm(s: UseMenuState, world: WorldState): UseConfirmResult {
  if (s.phase !== 'pick-item') return { kind: 'pick-target', state: s }
  const sel = s.items[s.cursor]
  if (!sel) return { kind: 'pick-target', state: s }
  if (sel.use?.target === 'oneAlly') {
    return { kind: 'pick-target', state: { ...s, phase: 'pick-target', selectedItemId: sel.id } }
  }
  // 脚本/全体类:直接执行(脱离洞窟等脚本 / 全体回复)。demo:triggerScript 为桩 → 无视觉变化;
  // 真脚本系统建好后由 triggerScript 实跑(可能换场景/关菜单)。光标留原处(记忆)。
  const next = useItem(world, world.party[0]?.id ?? '', sel.id)
  return { kind: 'direct', world: next, state: openUseMenu(next, s.cursor) }
}

/** pick-target Esc → 回 pick-item(光标留在该物上)。 */
export function useBackFromTarget(s: UseMenuState): UseMenuState {
  if (s.phase !== 'pick-target') return s
  return { ...s, phase: 'pick-item', selectedItemId: undefined }
}

/** pick-target 确认:对 targetCharId 施用。单体物用完**留选目标**可连用(原版 ItemUseMenu INNER while);
 *  用光(该物从 usableItems 消失)才回 pick-item。只有 oneAlly 能到 pick-target,故恒为单体物。 */
export function useApply(
  s: UseMenuState,
  world: WorldState,
  targetCharId: string,
): { world: WorldState; state: UseMenuState } {
  if (s.phase !== 'pick-target' || !s.selectedItemId) return { world, state: s }
  const next = useItem(world, targetCharId, s.selectedItemId)
  const stillUsable = usableItems(next).some((it) => it.id === s.selectedItemId)
  return stillUsable
    ? { world: next, state: s } // 还有 → 留选目标连用(选中/光标不变)
    : { world: next, state: openUseMenu(next, 0) } // 用光 → 回列表重算
}
