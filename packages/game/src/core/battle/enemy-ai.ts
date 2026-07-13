/**
 * 敌方 AI —— sdlpal 内置 fallback 决策。
 *
 * 对照 sdlpal `battle.c` 中敌方行动选择(`PAL_BattleEnemyPerformAction` 上游),
 * 真实引擎逻辑分散在脚本(`wScriptOnTurnStart` / `wScriptOnReady`)+ 内置 fallback
 * (有 wMagic 时按 magicRate 概率出魔法,否则物理)。脚本驱动的 wMagic 改写由
 * battle opcode / battle-system 上游接入,本模块只保留最终 fallback 决策。
 *
 * 规则:
 *   - wMagic != 0 且 RandomLong(0, 9) < wMagicRate → 用 wMagic 法术
 *   - 否则                                         → 物理攻击
 *   - target = 随机活的队员
 *
 * 本模块不负责:
 *   - wScriptOnTurnStart / wScriptOnReady / wScriptOnBattleEnd 的脚本执行
 *   - dualMove 队列展开
 *   - 协力 / 召唤等具体 action perform
 *
 * 纯函数:同 seed 同 input → 必同 output(T23 baseline 对拍前提)。
 */

import type { Enemy } from '@type-pal/shared'
import type { SeedableRng } from '../rng.js'
import type { BattleAction } from './battle-state.js'

export interface DecideEnemyActionInput {
  enemy: Enemy
  /** 活着的队员列表(idx = BattleState.players 索引,hp 用于未来扩展)。 */
  alivePlayers: Array<{ idx: number; hp: number }>
  rng: SeedableRng
  /**
   * 敌方战斗状态(sdlpal `g_Battle.rgEnemy[i].rgwStatus`)。
   * B2 c1:sleep/paralyzed → do-nothing(pass);silence → 不出魔法(强制物理);
   * confused → 打友敌(c1b)。省略 → 无状态(向后兼容旧 caller)。
   */
  status?: { sleep?: number; paralyzed?: number; silence?: number; confused?: number }
  /** 本敌自身 idx(state.enemies 索引)—— confused 选中自己时 pass(fight.c:4594)。 */
  selfIdx?: number
  /** 活着的敌人列表(含自己)—— confused 从中随机选打击目标(fight.c:4593 SelectEnemyTargetIndex)。 */
  aliveEnemies?: Array<{ idx: number }>
  /**
   * 全敌槽(含死/空槽,idx = state.enemies 索引,hp = 当前血量;空槽 health=0、死敌 health 钳 0)—— confused
   * 目标选择的 sdlpal RNG 真值:`RandomLong(0, wMaxEnemyIndex) + while(wObjectID==0||wHealth==0) 重摇`
   * (fight.c:4489-4516 PAL_BattleEnemySelectEnemyTargetIndex)。type-pal 空槽/死敌 health 均 0,故 hp<=0 =
   * sdlpal 两拒绝条件之并。有死/空槽时多抽,RNG 流逐抽对齐(同玩家目标 party 路径,c10)。省略 → 回退
   * aliveEnemies 预过滤池单抽(分布相同 RNG 流不同,旧 fixture 向后兼容)。
   */
  enemySlots?: Array<{ idx: number; hp: number }>
  /**
   * 全 party(含死者,idx = state.players 索引)—— D9 RNG 对拍(c10):传入则用 sdlpal 真值选目标
   * `RandomLong(0, maxPartyIdx) + while(HP==0) 重摇`(fight.c:4540-4545),RNG 流逐抽对齐;
   * 省略 → 回退 `range over alivePlayers`(旧路径,分布相同 RNG 流不同)。
   */
  party?: Array<{ idx: number; hp: number }>
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
  const { enemy, alivePlayers, rng, status, party } = input
  const anyAlive = party ? party.some((p) => p.hp > 0) : alivePlayers.length > 0
  if (!anyAlive) {
    return { type: 'pass', target: -1 }
  }
  // sdlpal fight.c:4578:先无条件选目标(消耗 RNG),再判分支(sleep 时结果被丢弃)
  let target: number
  if (party) {
    // c10 RNG 对拍:RandomLong(0, maxPartyIdx) + while(HP==0) 拒绝重摇(fight.c:4540-4545)
    let pi = rng.rangeInclusive(0, party.length - 1)
    let guard = 0
    while ((party[pi]?.hp ?? 0) === 0 && guard++ < 64) pi = rng.rangeInclusive(0, party.length - 1)
    // 兜底(rng 越界/异常,sdlpal 靠"战斗未结束⇒至少一活者"规避无限循环):取首个活者
    target =
      (party[pi]?.hp ?? 0) > 0
        ? party[pi]!.idx
        : (party.find((p) => p.hp > 0)?.idx ?? party[0]!.idx)
  } else {
    target = alivePlayers[rng.range(0, alivePlayers.length)]!.idx
  }

  // sdlpal fight.c:4582-4589:sleep / paralyzed → do nothing(iHidingTime gate 在 c5 tick 层)
  if ((status?.sleep ?? 0) > 0 || (status?.paralyzed ?? 0) > 0) {
    return { type: 'pass', target }
  }

  // sdlpal fight.c:4591-4655:confused → 随机选一活敌(含自己)打;选中自己 → 什么不做(4594)
  if ((status?.confused ?? 0) > 0) {
    // sdlpal PAL_BattleEnemySelectEnemyTargetIndex(fight.c:4489):RandomLong(0,wMaxEnemyIndex) +
    //   while(wObjectID==0||wHealth==0) 重摇 —— 全槽(含死/空)拒绝采样,有死/空槽时多抽。enemySlots 传入 →
    //   用此真值路径(RNG 流逐抽对齐,同玩家 party 路径 c10);省略 → 回退 aliveEnemies 预过滤池单抽(旧 fixture)。
    const slots = input.enemySlots
    if (slots && slots.length > 0) {
      let ei = rng.rangeInclusive(0, slots.length - 1)
      let guard = 0
      // sdlpal 无 guard(靠"confused 敌本身活着⇒至少一非空非死槽"规避死循环);仍加 guard 兜底(同 party 路径)
      while ((slots[ei]?.hp ?? 0) <= 0 && guard++ < 64) ei = rng.rangeInclusive(0, slots.length - 1)
      const slot = slots[ei]
      if (!slot || slot.hp <= 0) return { type: 'pass', target } // 兜底(全死/空,不应发生)
      if (slot.idx === input.selfIdx) return { type: 'pass', target } // 选中自己 → goto end
      return { type: 'attack-mate', target: slot.idx }
    }
    const pool = input.aliveEnemies ?? []
    if (pool.length === 0) return { type: 'pass', target }
    const pick = pool[rng.range(0, pool.length)]!
    if (pick.idx === input.selfIdx) return { type: 'pass', target } // 选中自己 → goto end
    // 复用 'attack-mate'(打同阵营)— perform 按 actor.isEnemy 路由到 performEnemyConfusedAttack
    return { type: 'attack-mate', target: pick.idx }
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
