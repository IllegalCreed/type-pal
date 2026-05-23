/**
 * 敌方 AI —— M3 简化版决策。
 *
 * 对照 sdlpal `battle.c` 中敌方行动选择(`PAL_BattleEnemyPerformAction` 上游),
 * 真实引擎逻辑分散在脚本(`wScriptOnTurnStart` / `wScriptOnReady`)+ 内置 fallback
 * (有 wMagic 时按 magicRate 概率出魔法,否则物理)。M3 只做 fallback,scripted AI
 * 在 M5 真做。
 *
 * 规则:
 *   - wMagic != 0 且 RandomLong(0, 9) < wMagicRate → 用 wMagic 法术
 *   - 否则                                         → 物理攻击
 *   - target = 随机活的队员
 *
 * **M3 简化版,M5 真做 scripted AI** —— 不实现:
 *   - wScriptOnTurnStart / wScriptOnReady / wScriptOnBattleEnd
 *   - dualMove 第二次行动
 *   - status effects(confused / sleep / paralyzed)对 AI 的影响
 *   - 协力 / 召唤
 *
 * 纯函数:同 seed 同 input → 必同 output(T23 baseline 对拍前提)。
 */

import type { Enemy } from '@type-pal/shared'
import type { SeedableRng } from '../rng.js'
import type { BattleAction } from './battle-state.js'

export interface DecideEnemyActionInput {
  enemy: Enemy
  /** 活着的队员列表(idx = BattleState.players 索引,hp 用于未来扩展)。 */
  alivePlayers: Array<{ idx: number, hp: number }>
  rng: SeedableRng
}

/**
 * 决策一个敌人的本回合 action。
 *
 * 上游 caller(T22 battle-system)负责过滤 alivePlayers(hp > 0)。本函数空列表 → pass。
 *
 * rng.range(0, 10) 等价 sdlpal `RandomLong(0, 9)`(rng range 上限 exclusive,
 * 即 [0, 10) = 0..9)。
 */
export function decideEnemyAction(input: DecideEnemyActionInput): BattleAction {
  const { enemy, alivePlayers, rng } = input
  if (alivePlayers.length === 0) {
    return { type: 'pass', target: -1 }
  }
  const targetIdx = rng.range(0, alivePlayers.length)
  const target = alivePlayers[targetIdx]!.idx

  if (enemy.magic !== 0 && rng.range(0, 10) < enemy.magicRate) {
    return { type: 'magic', actionId: enemy.magic, target }
  }
  return { type: 'attack', target }
}
