import type { CharacterInstance, PoisonDef, WorldState } from '@type-pal/content'
import { curePoisons } from './battle/battle-core.js'
import type { BattleResult } from './battle/battle-result.js'

function assertNever(value: never): never {
  throw new Error(`未处理的战斗结果: ${String(value)}`)
}

/**
 * 战斗会话结束后的原版“三件套”：清定时状态、清装备临时毒抗，并只解到 severe。
 * 调用方显式传入本次参战者；后备队员没有进入战斗，不应被战后结算波及。
 */
export function clearPostBattleActorConditions(
  result: BattleResult,
  participants: readonly CharacterInstance[],
  poisonDefs: Record<number, PoisonDef>,
): void {
  switch (result) {
    case 'victory':
    case 'defeat':
    case 'playerFled':
    case 'enemyFled':
    case 'terminated':
      for (const actor of participants) {
        if (actor.extraStatuses?.length) actor.extraStatuses = []
        if (actor.extraPoisonRes !== undefined) actor.extraPoisonRes = undefined
        if (actor.poisons?.length) curePoisons(actor, poisonDefs, 'severe')
      }
      return
    default:
      assertNever(result)
  }
}

/**
 * 读档边界恢复的是持久快照，不继承当前运行会话的临时状态。
 * 当前队伍和后备队伍共用同一清理规则，包含不可解毒。
 */
export function clearRestoredWorldActorConditions(world: WorldState): void {
  for (const actor of [...world.party, ...(world.reserve ?? [])]) {
    actor.poisons = undefined
    actor.extraStatuses = undefined
    actor.extraPoisonRes = undefined
  }
}
