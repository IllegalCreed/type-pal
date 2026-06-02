/**
 * 逃跑 perform —— M3 T19。
 *
 * from `reference/sdlpal/fight.c:4119-4148` —— PAL_BattlePlayerPerformAction kBattleActionFlee。
 *
 * 公式:
 *   str = PAL_GetPlayerFleeRate(role)  (D12 W1:runtime base + 装备加成,global.c:1868-1897)
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
import type { CommandBus } from '../../command-bus.js'
import type { GameState } from '../../game-state.js'
import { getPlayerFleeRate } from '../../equip-effect.js'
import { buildFleeFailTimeline } from '../anim-timeline.js'
import { startBattleAnim } from '../battle-anim-driver.js'
import type { BattleState } from '../battle-state.js'

/** SHORT cast。 */
function asShort(n: number): number {
  return (n << 16) >> 16
}

export function performFlee(state: BattleState, gs: GameState, playerIdx: number, playerRoles: PlayerRoles, bus?: CommandBus): void {
  // boss 不可逃(sdlpal fight.c:4143 `!g_Battle.fIsBoss` 条件)
  if (state.isBoss)
    return

  const roleId = state.players[playerIdx]!.roleId
  // D12(2026-06-01 W1):str = PAL_GetPlayerFleeRate(role)(global.c:1868-1897)= runtime base
  //   + Σ rgEquipmentEffect[i].rgwFleeRate[role]。原 M3 简化用 role.fleeRate raw 漏装备加成。
  const str = getPlayerFleeRate(gs, roleId)

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
    // 成功 → 触发逃跑动画(PAL_BattlePlayerEscape,battle.c:1438-1527):16 帧右下滑 + 移出屏,
    //   动画放完(tickBattleFleeAnim)才 phase='fleed' → finalize。不直接设 fleed(原跳过整段动画)。
    state.fleeAnim = { step: 0 }
  }
  else {
    // 失败 → 逃跑失败动画(sdlpal fight.c:4155-4168):该队员 3 步右下挪 + 帧1 濒死姿。
    //   走 battleAnim 时间线(per-player),播完 tickPerformAction 复位 + 推进队列(下个队员/敌人继续)。
    //   逃跑失败文字 BATTLE_LABEL_ESCAPEFAIL 由战斗消息条另接(follow-up)。
    const p = state.players[playerIdx]
    if (bus && p?.posOriginal) {
      startBattleAnim(state, buildFleeFailTimeline(playerIdx, p.posOriginal), bus)
      // 逃跑失败文字(WORD.DAT 31 "逃跑失败",sdlpal label 31 @130,75;8 帧 ×40ms=320ms)
      bus.emit({ op: 'showBattleMessage', text: '逃跑失败', durationMs: 320 })
    }
    // E04:逃跑**失败**累积 rgFleeExp.wCount += 2(sdlpal fight.c:4170;成功逃跑不累积,无 RNG)。
    const fleeExp = gs.Exp.rgFleeExp[roleId]
    if (fleeExp) fleeExp.wCount = (fleeExp.wCount ?? 0) + 2
  }
}
