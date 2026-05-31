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
  /**
   * 敌方战斗状态(sdlpal `g_Battle.rgEnemy[i].rgwStatus`)。
   * B2 c1:sleep/paralyzed → do-nothing(pass);silence → 不出魔法(强制物理);
   * confused → 打友敌(c1b)。省略 → 无状态(向后兼容旧 caller)。
   */
  status?: { sleep?: number, paralyzed?: number, silence?: number, confused?: number }
}

/** sdlpal `wMagic == 0xFFFF` 哨兵:进魔法分支即 goto end 什么不做(fight.c:4663)。 */
const MAGIC_SENTINEL_NOOP = 0xffff

/**
 * 决策一个敌人的本回合 action。
 *
 * 上游 caller(T22 battle-system)负责过滤 alivePlayers(hp > 0)。本函数空列表 → pass。
 *
 * rng.range(0, 10) 等价 sdlpal `RandomLong(0, 9)`(rng range 上限 exclusive,
 * 即 [0, 10) = 0..9)。
 */
export function decideEnemyAction(input: DecideEnemyActionInput): BattleAction {
  const { enemy, alivePlayers, rng, status } = input
  if (alivePlayers.length === 0) {
    return { type: 'pass', target: -1 }
  }
  // sdlpal fight.c:4578:先无条件选目标(消耗 RNG),再判分支(sleep 时结果被丢弃)
  const targetIdx = rng.range(0, alivePlayers.length)
  const target = alivePlayers[targetIdx]!.idx

  // sdlpal fight.c:4582-4589:sleep / paralyzed → do nothing(iHidingTime gate 在 c5 tick 层)
  if ((status?.sleep ?? 0) > 0 || (status?.paralyzed ?? 0) > 0) {
    return { type: 'pass', target }
  }

  // confused(打友敌)在 c1b 的 decideEnemyAction 上游(battle-system)解算 — 此处暂 fall through。

  // sdlpal fight.c:4656-4658 魔法门:wMagic!=0 && RandomLong(0,9)<magicRate && silence==0
  if (
    enemy.magic !== 0
    && (status?.silence ?? 0) === 0
    && rng.range(0, 10) < enemy.magicRate
  ) {
    // fight.c:4663:wMagic==0xFFFF 进魔法分支即 goto end(什么不做)→ pass
    if (enemy.magic === MAGIC_SENTINEL_NOOP) {
      return { type: 'pass', target }
    }
    return { type: 'magic', actionId: enemy.magic, target }
  }
  return { type: 'attack', target }
}
