/**
 * M5.B-w1.a:Status apply tick(每回合 turn 推进前调)。
 *
 * sdlpal 真值(fight.c::PAL_BattlePlayerCheckReady 等):每回合开始时,number 类
 * status(sleep/paralyzed/confused/silence/puppet)各自 wDuration > 0 时 --1,到
 * 0 时自动失效(player/enemy 可重新行动)。boolean 类(haste/slow/bravery/protect/
 * dualAttack)sdlpal 真值也有衰减计数,简版不衰减(常驻),fine-tune 由 B-w1.a 后续
 * 真做装备/法术触发场景时补。
 */

import type { BattleEnemy, BattlePlayer, BattleState } from './battle-state.js'

type StatusOwner = BattlePlayer | BattleEnemy

/** 每回合 -1 衰减 number 类 5 status — sdlpal 真值同一公式。 */
function tickOwnerStatus(owner: StatusOwner): void {
  const s = owner.status
  if (s.sleep > 0) s.sleep -= 1
  if (s.paralyzed > 0) s.paralyzed -= 1
  if (s.confused > 0) s.confused -= 1
  if ((s.silence ?? 0) > 0) s.silence = (s.silence ?? 0) - 1
  if ((s.puppet ?? 0) > 0) s.puppet = (s.puppet ?? 0) - 1
}

/** 每回合 turn 推进前 tick 全部 player + enemy(只 alive)。 */
export function tickStatusEffects(state: BattleState): void {
  for (const p of state.players) tickOwnerStatus(p)
  for (const e of state.enemies) {
    if (e.e.health > 0) tickOwnerStatus(e)
  }
}

/** 简版可行动检查:sleep/paralyzed/confused > 0 时不能正常 select action(sdlpal `fight.c:840`)。
 *  M5 简版接 selectAction phase 用;实际 sdlpal confused 是攻击友军,paralyzed/sleep 跳过该回合。 */
export function canAct(owner: StatusOwner): boolean {
  const s = owner.status
  return s.sleep <= 0 && s.paralyzed <= 0
}

/** silence 阻止施法(sdlpal:silence > 0 时 magic menu disabled)。 */
export function canCastMagic(owner: StatusOwner): boolean {
  return (owner.status.silence ?? 0) <= 0
}
