/**
 * 逃跑 perform —— M3 T19。
 *
 * from `reference/sdlpal/fight.c:4119-4148` —— PAL_BattlePlayerPerformAction kBattleActionFlee。
 *
 * 公式(修复版):
 *   str = PAL_GetPlayerFleeRate(role)  (D12 W1:runtime base + 装备加成,global.c:1868-1897)
 *   def = Σ enemies ((SHORT)**fleeRate** + (level+6)*4)   ← 敌吉运,见下
 *   if ((SHORT)def < 0) def = 0
 *   success = (str >= RandomLong(0, def)) && !isBoss
 *
 * ⚠️ **有意偏离原版的 bug 修复**(docs/game-mechanics.md「原始 bug:逃跑抵抗错用敌人身法」,
 * user 2026-06-13 选修复版):原作 fight.c:4134 敌方抵抗项误用敌人**身法** wDexterity,而
 * ENEMY 结构里紧挨着的吉运字段 wFleeRate("chance for successful fleeing",global.h:283-284)
 * 全引擎零读取(死字段)——本该是"我方吉运 vs 敌方吉运"。后果:高身法敌人异常难逃,
 * 数据里设计的敌人吉运形同虚设。修复:def 改用 be.e.fleeRate,让死字段活过来;
 * 身法回归其正职(出手顺序)。**要还原原版行为:此处换回 be.e.dexterity 即可。**
 *
 * 失败:不切 phase,后续 turn 继续推进(T22 battle-system 行为)。
 * 成功 + !isBoss:触发 fleeAnim,动画结束才 phase='fleed'。
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

export function performFlee(state: BattleState, gs: GameState, playerIdx: number, _playerRoles: PlayerRoles, bus?: CommandBus): void {
  const roleId = state.players[playerIdx]!.roleId
  // D12(2026-06-01 W1):str = PAL_GetPlayerFleeRate(role)(global.c:1868-1897)= runtime base
  //   + Σ rgEquipmentEffect[i].rgwFleeRate[role]。原 M3 简化用 role.fleeRate raw 漏装备加成。
  const str = getPlayerFleeRate(gs, roleId)

  let def = 0
  for (const be of state.enemies) {
    // DM4:fight.c:4129 `if (wObjectID == 0) continue` —— 死敌清槽/0 占位空槽不计入 def。
    if (be.defeated) continue
    // 修复版:敌吉运(原版 bug 误用 be.e.dexterity 身法,详见文件头注释;还原原版改回 dexterity)
    def += asShort(be.e.fleeRate)
    def += (be.e.level + 6) * 4
  }
  if (asShort(def) < 0)
    def = 0

  // RandomLong(0, def) sdlpal 语义 = 闭区间 0..def(def+1 个值)。
  // DM5:fight.c:4143 `if (str >= RandomLong(0,def) && !fIsBoss)` —— 掷骰为 && 左操作数**恒消费**;
  //   boss 战必走失败分支(挪步演出 + FleeExp+2),不再顶部提前 return(原零反馈且 RNG 流少一位)。
  const roll = state.rng.rangeInclusive(0, def)
  if (str >= roll && !state.isBoss) {
    // 成功 → 触发逃跑动画(PAL_BattlePlayerEscape,battle.c:1438-1527):16 帧右下滑 + 移出屏,
    //   动画放完(tickBattleFleeAnim)才 phase='fleed' → finalize。不直接设 fleed(原跳过整段动画)。
    state.fleeAnim = { step: 0 }
    // M6 逃跑音(sdlpal battle.c:1459 AUDIO_PlaySound(45))→ gs.pendingSounds,shell AudioManager 播。
    ;(gs.pendingSounds ??= []).push(45)
  }
  else {
    // 失败 → 逃跑失败动画(sdlpal fight.c:4155-4168):该队员 3 步右下挪 + 帧1 濒死姿。
    //   走 battleAnim 时间线(per-player),末帧同步显示 BATTLE_LABEL_ESCAPEFAIL,播完后推进队列。
    const p = state.players[playerIdx]
    if (bus && p?.posOriginal) {
      startBattleAnim(state, buildFleeFailTimeline(playerIdx, p.posOriginal), bus)
      if (state.battleAnim) state.battleAnim.updateEnemyGesture = true // DM11:玩家动作链(fight.c:4168 Delay TRUE)
    }
    // E04:逃跑**失败**累积 rgFleeExp.wCount += 2(sdlpal fight.c:4170;成功逃跑不累积,无 RNG)。
    const fleeExp = gs.Exp.rgFleeExp[roleId]
    if (fleeExp) fleeExp.wCount = (fleeExp.wCount ?? 0) + 2
  }
}
