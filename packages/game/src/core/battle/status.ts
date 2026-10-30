/**
 * 回合末在turn推进前递减全部玩家/敌人槽的正状态计数器，含已死敌槽。
 * SDLPal PAL_BattleStartFrame遍历kStatusAll；当前TS另保留slow计数器。
 * 装备授予的>999计数也参与tick；复活/战后按<=999清除由各自owner负责。
 */

import type { BattleEnemy, BattlePlayer, BattleState, BattleStatus } from './battle-state.js'

type StatusOwner = BattlePlayer | BattleEnemy

/** BattleStatus当前十个字段：SDLPal Classic九项及TS的slow计数器。 */
const STATUS_KEYS = [
  'sleep',
  'paralyzed',
  'confused',
  'haste',
  'slow',
  'silence',
  'puppet',
  'bravery',
  'protect',
  'dualAttack',
] as const satisfies readonly (keyof BattleStatus)[]

/** 每回合 -1 衰减全部 status 计数器 — sdlpal fight.c:1632-1638 同一公式(遍历 kStatusAll)。 */
function tickOwnerStatus(owner: StatusOwner): void {
  const s = owner.status
  for (const k of STATUS_KEYS) {
    const v = s[k] ?? 0
    if (v > 0) s[k] = v - 1
  }
}

/** 每回合 turn 推进前 tick 全部 player + enemy 槽位。 */
export function tickStatusEffects(state: BattleState): void {
  for (const p of state.players) tickOwnerStatus(p)
  // SDLPal fight.c:1655-1661 遍历 wMaxEnemyIndex 的全部槽位，没有按 HP 过滤。
  // 保留死槽的状态递减，避免把当前槽位状态与原版回合生命周期分叉。
  for (const e of state.enemies) tickOwnerStatus(e)
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
