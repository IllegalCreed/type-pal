import type { Enemy } from '@type-pal/shared'
import type { SeedableRng } from '../rng.js'
import type { BattleAction } from './battle-state.js'

export interface DecideEnemyActionInput {
  enemy: Enemy
  rng: SeedableRng
  /**
   * 敌方战斗状态(sdlpal `g_Battle.rgEnemy[i].rgwStatus`)。
   * sleep/paralyzed → pass；silence阻止施法；confused可攻击其它活敌。
   */
  status?: { sleep?: number; paralyzed?: number; silence?: number; confused?: number }
  /** 本敌自身 idx(state.enemies 索引)—— confused 选中自己时 pass(fight.c:4594)。 */
  selfIdx?: number
  /** 全敌槽（含自己、死亡和空槽），idx为BattleState.enemies索引；空槽hp=0。 */
  enemySlots: Array<{ idx: number; hp: number }>
  /** 完整队伍（含死亡队员），idx为BattleState.players索引。 */
  party: Array<{ idx: number; hp: number }>
}

/** sdlpal `wMagic == 0xFFFF` 哨兵:进魔法分支即 goto end 什么不做(fight.c:4663)。 */
const MAGIC_SENTINEL_NOOP = 0xffff

/** Select a target before status/magic gates, consuming the supplied mutable RNG.
 * Full-slot rejection sampling follows SDLPal fight.c::PAL_BattleEnemyPerformAction.
 * The caller owns script execution, hiding, queue expansion, and applying the action.
 */
export function decideEnemyAction(input: DecideEnemyActionInput): BattleAction {
  const { enemy, rng, status, party } = input
  const anyAlive = party.some((p) => p.hp > 0)
  if (!anyAlive) {
    return { type: 'pass', target: -1 }
  }
  // sdlpal fight.c:4578:先无条件选目标(消耗 RNG),再判分支(sleep 时结果被丢弃)
  let pi = rng.rangeInclusive(0, party.length - 1)
  let guard = 0
  // TS retains a bounded retry guard; SDLPal assumes an eventual live draw.
  while ((party[pi]?.hp ?? 0) === 0 && guard++ < 64) pi = rng.rangeInclusive(0, party.length - 1)
  const target =
    (party[pi]?.hp ?? 0) > 0 ? party[pi]!.idx : (party.find((p) => p.hp > 0)?.idx ?? party[0]!.idx)

  // sdlpal fight.c:4582-4589:sleep / paralyzed → do nothing(iHidingTime gate 在 c5 tick 层)
  if ((status?.sleep ?? 0) > 0 || (status?.paralyzed ?? 0) > 0) {
    return { type: 'pass', target }
  }

  // sdlpal fight.c:4591-4655:confused → 随机选一活敌(含自己)打;选中自己 → 什么不做(4594)
  if ((status?.confused ?? 0) > 0) {
    // Select from all slots so rejection of dead/empty enemies preserves draw order.
    const slots = input.enemySlots
    if (slots.length === 0) return { type: 'pass', target }
    let ei = rng.rangeInclusive(0, slots.length - 1)
    let guard = 0
    while ((slots[ei]?.hp ?? 0) <= 0 && guard++ < 64) ei = rng.rangeInclusive(0, slots.length - 1)
    const slot = slots[ei]
    if (!slot || slot.hp <= 0 || slot.idx === input.selfIdx) return { type: 'pass', target }
    return { type: 'attack-mate', target: slot.idx }
  }

  // sdlpal fight.c:4656-4658 魔法门:wMagic!=0 && RandomLong(0,9)<magicRate && silence==0
  // DL7:短路序与 C 一致(fight.c:4656-4658),被沉默敌**仍先消耗**一次掷骰(原前置短路不耗,RNG 流偏移)。
  if (enemy.magic !== 0 && rng.range(0, 10) < enemy.magicRate && (status?.silence ?? 0) === 0) {
    // fight.c:4663:wMagic==0xFFFF 进魔法分支即 goto end(什么不做)→ pass
    if (enemy.magic === MAGIC_SENTINEL_NOOP) {
      return { type: 'pass', target }
    }
    return { type: 'magic', actionId: enemy.magic, target }
  }
  return { type: 'attack', target }
}
