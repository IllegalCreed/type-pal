/**
 * 逃跑 perform —— M3 T19。
 *
 * from `reference/sdlpal/fight.c:4119-4148` —— PAL_BattlePlayerPerformAction kBattleActionFlee。
 *
 * 公式:
 *   str = PAL_GetPlayerFleeRate(role)  (M3 简化:role.fleeRate raw)
 *   def = Σ enemies ((SHORT)dexterity + (level+6)*4)
 *   if ((SHORT)def < 0) def = 0
 *   success = (str >= RandomLong(0, def)) && !isBoss
 *
 * 注:sdlpal `def` 来自 enemy.wDexterity(不是 enemy.wDefense)+ (level+6)*4。
 * implementer verify:fight.c:4124-4126 累加循环里读 `wDexterity` 字段。
 *
 * 失败:不切 phase,后续 turn 继续推进(T22 battle-system 行为)。
 * 成功 + !isBoss:phase = 'fleed',T22 退出战斗。
 */

import type { PlayerRoles } from '@type-pal/shared'
import type { BattleState } from '../battle-state.js'

/** SHORT cast。 */
function asShort(n: number): number {
  return (n << 16) >> 16
}

export function performFlee(state: BattleState, playerIdx: number, playerRoles: PlayerRoles): void {
  // boss 不可逃(sdlpal fight.c:4143 `!g_Battle.fIsBoss` 条件)
  if (state.isBoss)
    return

  const role = playerRoles.roles[state.players[playerIdx]!.roleId]!
  const str = role.fleeRate

  let def = 0
  for (const be of state.enemies) {
    def += asShort(be.e.dexterity)
    def += (be.e.level + 6) * 4
  }
  if (asShort(def) < 0)
    def = 0

  // RandomLong(0, def) sdlpal 语义 = 闭区间 0..def(def+1 个值)
  const roll = state.rng.rangeInclusive(0, def)
  if (str >= roll) {
    state.phase = 'fleed'
  }
  // 失败:phase 不变,T22 继续推 actionQueue
}
