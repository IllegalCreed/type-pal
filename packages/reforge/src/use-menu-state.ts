// MenuSession owns asynchronous use and remembered selection. This module derives requests and
// rebuilds the selection against the latest world after execution.
import {
  type ItemData,
  type ItemDataMap,
  usableItems,
  type WorldItemUseOutcome,
  type WorldState,
} from '@type-pal/content'
import { type GridDirection, stepMenuGridCursor } from './menu/grid-cursor.js'

export interface UseMenuState {
  active: boolean
  phase: 'pick-item' | 'pick-target'
  items: ItemData[]
  cursor: number
  /** 选人光标的位置。执行请求使用该槽位的角色 ID。 */
  targetIdx: number
  selectedItemId?: string
}

/** initialCursor:重开使用面板时恢复上次光标(原版 iCurInvMenuItem;越界 clamp 到末项)。 */
export function openUseMenu(
  world: WorldState,
  items: ItemDataMap,
  initialCursor = 0,
  initialTargetIdx = 0,
): UseMenuState {
  const list = usableItems(world, items)
  const cursor = list.length === 0 ? 0 : Math.min(Math.max(0, initialCursor), list.length - 1)
  const targetIdx = world.party[initialTargetIdx] ? initialTargetIdx : 0
  return { active: true, phase: 'pick-item', items: list, cursor, targetIdx }
}

export function closeUseMenu(): UseMenuState {
  return { active: false, phase: 'pick-item', items: [], cursor: 0, targetIdx: 0 }
}

export function useMoveCursor(s: UseMenuState, direction: GridDirection): UseMenuState {
  if (s.phase !== 'pick-item' || s.items.length === 0) return s
  return { ...s, cursor: stepMenuGridCursor(s.cursor, s.items.length, direction) }
}

/** 单体目标按队伍顺序前后环绕，包括可由复活道具选中的倒地队员。 */
export function useMoveTarget(s: UseMenuState, partySize: number, step: -1 | 1): UseMenuState {
  if (s.phase !== 'pick-target' || partySize <= 1) return s
  return { ...s, targetIdx: (s.targetIdx + step + partySize) % partySize }
}

/** A list selection either enters the target picker or yields work for the caller to execute. */
export type UseConfirmResult =
  | { kind: 'pick-target'; state: UseMenuState }
  | { kind: 'execute'; request: UseExecutionRequest }

export interface UseExecutionRequest {
  itemId: string
  targetCharId: string
  origin: 'pick-item' | 'pick-target'
  state: UseMenuState
}

/** The item target decides whether to pick a recipient. Effect kinds are resolved by the executor. */
export function useConfirm(s: UseMenuState, world: Pick<WorldState, 'party'>): UseConfirmResult {
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

/** Request one use on this recipient. The completion policy is applied by finishUseExecution. */
export function useApply(s: UseMenuState, targetCharId: string): UseExecutionRequest | undefined {
  if (s.phase !== 'pick-target' || !s.selectedItemId) return undefined
  return { itemId: s.selectedItemId, targetCharId, origin: 'pick-target', state: s }
}

/** 异步执行完成后的菜单归并。放置不成功也走该道具配置的退场方式。 */
export function finishUseExecution(
  request: UseExecutionRequest,
  outcome: WorldItemUseOutcome,
  items: ItemDataMap,
): UseMenuState {
  if (
    outcome.menu === 'close' &&
    (outcome.status === 'success' || outcome.reason === 'placement-unavailable')
  )
    return closeUseMenu()
  if (outcome.status !== 'success') return request.state
  if (request.origin === 'pick-target') {
    const stillUsable = usableItems(outcome.world, items).some((it) => it.id === request.itemId)
    return stillUsable
      ? request.state
      : openUseMenu(outcome.world, items, 0, request.state.targetIdx)
  }
  return openUseMenu(outcome.world, items, request.state.cursor, request.state.targetIdx)
}
