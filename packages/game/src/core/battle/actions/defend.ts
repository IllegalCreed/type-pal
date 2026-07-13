/**
 * 防御 perform —— M3 T19。
 *
 * from `reference/sdlpal/fight.c:4115` —— PAL_BattlePlayerPerformAction kBattleActionDefend:
 *   g_Battle.rgPlayer[wPlayerIndex].fDefending = TRUE
 *   gpGlobals->Exp.rgDefenseExp[wPlayerRole].wCount += 2  (battle-system perform dispatch 累积)
 *
 * 「减伤」的真值不在 defend 自身,而在 enemy 攻击 player 时 `def *= 2`
 * (fight.c:4926),由 performAttack 自动消费 defending flag。
 *
 * 注:本轮 defending flag 在 postAction phase 被清(fight.c:1604 的
 * `g_Battle.rgPlayer[i].fDefending = FALSE`);T22 battle-system 处理。
 */

import type { BattleState } from '../battle-state.js'

export function performDefend(state: BattleState, playerIdx: number): void {
  const p = state.players[playerIdx]
  if (p) p.defending = true
}
