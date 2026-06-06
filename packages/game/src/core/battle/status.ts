/**
 * M5.B-w1.a / B1:Status tick(回合末 turn++ 前调)。
 *
 * sdlpal 真值(fight.c:1632-1638 player / 1655-1661 enemy):回合末对**全部** kStatusAll
 * 逐项 `if (rgwStatus[j] > 0) rgwStatus[j]--`。**所有** status 都是 WORD 计数器,统一递减
 * —— 含 boolean 类 haste/slow/bravery/protect/dualAttack(B1 修:此前只减 sleep/paralyzed/
 * confused/silence/puppet,boolean 类不衰减是 bug)。>999 = 装备永久效果(战末 ClearAll≤999 保留)。
 */

import type { BattleEnemy, BattlePlayer, BattleState, BattleStatus } from './battle-state.js'

type StatusOwner = BattlePlayer | BattleEnemy

/** BattleStatus 全部计数器字段(对齐 sdlpal kStatusAll = 9 项 + Slow 兼容)。 */
const STATUS_KEYS = [
  'sleep', 'paralyzed', 'confused', 'haste', 'slow',
  'silence', 'puppet', 'bravery', 'protect', 'dualAttack',
] as const satisfies readonly (keyof BattleStatus)[]

/** 每回合 -1 衰减全部 status 计数器 — sdlpal fight.c:1632-1638 同一公式(遍历 kStatusAll)。 */
function tickOwnerStatus(owner: StatusOwner): void {
  const s = owner.status
  for (const k of STATUS_KEYS) {
    const v = s[k] ?? 0
    if (v > 0) s[k] = v - 1
  }
}

/** 每回合 turn 推进前 tick 全部 player + enemy(只 alive)。 */
export function tickStatusEffects(state: BattleState): void {
  for (const p of state.players) tickOwnerStatus(p)
  for (const e of state.enemies) {
    if (e.e.health > 0) tickOwnerStatus(e)
  }
}

/** 可行动检查:sleep/paralyzed 跳过正常行动;confused 由 battle-system 改派 attack-mate。 */
export function canAct(owner: StatusOwner): boolean {
  const s = owner.status
  return s.sleep <= 0 && s.paralyzed <= 0
}

/** silence 阻止施法(sdlpal:silence > 0 时 magic menu disabled)。 */
export function canCastMagic(owner: StatusOwner): boolean {
  return (owner.status.silence ?? 0) <= 0
}
