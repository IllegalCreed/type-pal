// 使用菜单状态机(纯逻辑;非视觉)。两阶段 pick-item → pick-target。施用走 content useItem(返回新 world)。
// 交互行为对齐第一阶段 game 包(sdlpal PAL_GameUseItem / PAL_ItemUseMenu),非自创:
//  - 单体回复/buff(use.target='oneAlly')→ 进选目标面板;用完留菜单可连用(原版 ItemUseMenu INNER while),
//    用光(该物从 usableItems 消失)才回列表。
//  - 脚本/全体类(triggerScript / target≠oneAlly,如土灵珠脱离洞窟、圣灵符全体)→ 不选目标,直接执行
//    (原版 applyToAll:RunScript; consume; return)。
//  - 光标跨开关记忆(原版 iCurInvMenuItem)→ openUseMenu 收 initialCursor,记忆由 main.ts 持有。
import {
  type ItemData,
  type ItemDataMap,
  usableItems,
  type WorldItemUseOutcome,
  type WorldState,
} from '@type-pal/content'

export const USE_GRID_COLS = 3

export interface UseMenuState {
  active: boolean
  phase: 'pick-item' | 'pick-target'
  items: ItemData[]
  cursor: number
  selectedItemId?: string
}

/** initialCursor:重开使用面板时恢复上次光标(原版 iCurInvMenuItem;越界 clamp 到末项)。 */
export function openUseMenu(
  world: WorldState,
  items: ItemDataMap,
  initialCursor = 0,
): UseMenuState {
  const list = usableItems(world, items)
  const cursor = list.length === 0 ? 0 : Math.min(Math.max(0, initialCursor), list.length - 1)
  return { active: true, phase: 'pick-item', items: list, cursor }
}

export function closeUseMenu(): UseMenuState {
  return { active: false, phase: 'pick-item', items: [], cursor: 0 }
}

/** pick-item 网格导航:↑↓ ±3,←→ ±1;越界吸附首/尾(对齐 inventory-menu setCursorClamp)。 */
export function useMoveCursor(
  s: UseMenuState,
  dir: 'up' | 'down' | 'left' | 'right',
): UseMenuState {
  if (s.phase !== 'pick-item') return s
  const n = s.items.length
  if (n === 0) return s
  const delta =
    dir === 'up' ? -USE_GRID_COLS : dir === 'down' ? USE_GRID_COLS : dir === 'left' ? -1 : 1
  // 越界吸附首/尾(对齐一阶段 inventory-menu.ts setCursorClamp,非"不动")
  const next = s.cursor + delta
  return { ...s, cursor: next < 0 ? 0 : next >= n ? n - 1 : next }
}

/** pick-item 确认结果:单体回复/buff → 进选目标;脚本/全体类 → 已直接执行(返回新 world)。 */
export type UseConfirmResult =
  | { kind: 'pick-target'; state: UseMenuState }
  | { kind: 'execute'; request: UseExecutionRequest }

export interface UseExecutionRequest {
  itemId: string
  targetCharId: string
  origin: 'pick-item' | 'pick-target'
  state: UseMenuState
}

/** pick-item Enter:单体(oneAlly)进选目标面板;脚本/全体类直接执行(不选目标)。 */
export function useConfirm(
  s: UseMenuState,
  world: WorldState,
  _items: ItemDataMap,
): UseConfirmResult {
  if (s.phase !== 'pick-item') return { kind: 'pick-target', state: s }
  const sel = s.items[s.cursor]
  if (!sel) return { kind: 'pick-target', state: s }
  if (sel.use?.target === 'oneAlly') {
    return { kind: 'pick-target', state: { ...s, phase: 'pick-target', selectedItemId: sel.id } }
  }
  return {
    kind: 'execute',
    request: {
      itemId: sel.id,
      targetCharId: world.party[0]?.id ?? '',
      origin: 'pick-item',
      state: s,
    },
  }
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
  _world: WorldState,
  targetCharId: string,
  _items: ItemDataMap,
): UseExecutionRequest | undefined {
  if (s.phase !== 'pick-target' || !s.selectedItemId) return undefined
  return { itemId: s.selectedItemId, targetCharId, origin: 'pick-target', state: s }
}

/** 异步执行完成后的唯一菜单归并；失败保持原位，成功再按来源/配置决定留菜单或关闭。 */
export function finishUseExecution(
  request: UseExecutionRequest,
  outcome: WorldItemUseOutcome,
  items: ItemDataMap,
): UseMenuState {
  if (outcome.status !== 'success') return request.state
  if (outcome.menu === 'close') return closeUseMenu()
  if (request.origin === 'pick-target') {
    const stillUsable = usableItems(outcome.world, items).some((it) => it.id === request.itemId)
    return stillUsable ? request.state : openUseMenu(outcome.world, items, 0)
  }
  return openUseMenu(outcome.world, items, request.state.cursor)
}
