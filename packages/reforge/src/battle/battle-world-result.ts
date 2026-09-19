import { grantBattleRewards, lookupText, type WorldState } from '@type-pal/content'
import { clearPostBattleActorConditions } from '../actor-condition-lifecycle.js'
import type { LoadedCurrentProjectCore } from '../project-loader.js'
import type { BattleResult } from './battle-result.js'
import type { BattleSession } from './battle-session.js'
import { buildSettlementScreens } from './settlement.js'

export function settleBattleVictory(
  session: BattleSession,
  world: WorldState,
  project: LoadedCurrentProjectCore,
  onExpReward: () => void,
  rng: () => number = Math.random,
) {
  session.writeBackPersistentEffects(world)
  session.writeBackHp(world.party)
  const rewards = session.rewards()
  if (rewards.exp > 0) onExpReward()
  world.money += rewards.cash
  const report = grantBattleRewards(
    world.party,
    world.learnedSkills,
    project.actorsById,
    project.levelUp,
    { ...rewards, hiddenCounts: session.hiddenCounts() },
    rng,
  )
  return buildSettlementScreens(
    report.exp,
    report.cash,
    report.levelUps,
    report.hiddenUps,
    (id) =>
      lookupText(`name.${world.party.find((c) => c.id === id)?.template ?? ''}`, project.locale),
    (id) => project.skills[id]?.name ?? id,
  )
}

/** Does not execute scene onDefeated scripts or save anything. */
export function finishBattleWorldState(
  session: BattleSession,
  result: BattleResult,
  world: WorldState,
  project: LoadedCurrentProjectCore,
): void {
  session.writeBackPersistentEffects(world)
  if (result !== 'victory') session.writeBackHp(world.party)
  session.writeBackInventory(world.inventory)
  if (session.moneyDelta() !== 0) world.money = Math.max(0, world.money + session.moneyDelta())
  if (session.collectGained() > 0)
    world.collectValue = (world.collectValue ?? 0) + session.collectGained()
  clearPostBattleActorConditions(result, world.party, project.poisonsById)
}
