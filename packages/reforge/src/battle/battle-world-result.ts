import { effectiveStat, grantBattleRewards, lookupText, type WorldState } from '@type-pal/content'
import { clearPostBattleActorConditions } from '../actor-condition-lifecycle.js'
import { expectDefined } from '../defined.js'
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
  options?: { deferRecovery: boolean },
) {
  session.writeBackPersistentEffects(world)
  session.writeBackHp(world.party, { preserveZeroHp: true })
  const rewards = session.rewards()
  if (rewards.exp > 0) onExpReward()
  world.money += rewards.cash
  const report = grantBattleRewards(
    world.party,
    world.learnedSkills,
    project.actorsById,
    project.levelUp,
    {
      ...rewards,
      hiddenCounts: session.hiddenCounts(),
      ...options,
      isSkillExhausted: (characterId, skillId) => {
        const limit = project.skills[skillId]?.lifetimeLimit
        const uses = world.skillUseCounts?.[characterId]?.[skillId] ?? 0
        return limit !== undefined && uses >= limit
      },
    },
    rng,
  )
  const levelUps = report.levelUps.map((levelUp) => {
    const character = expectDefined(world.party.find(({ id }) => id === levelUp.characterId))
    const before = { ...levelUp.before }
    const after = { ...levelUp.after }
    for (const stat of ['attack', 'magicAttack', 'defense', 'speed', 'luck'] as const) {
      // SDLPal battle.c:1184–1212 adds the equipment bonus to both snapshots.
      // The after snapshot precedes hidden growth, which has already updated the live character.
      const equipmentBonus = effectiveStat(character, stat, project.items) - character[stat]
      before[stat] += equipmentBonus
      after[stat] += equipmentBonus
    }
    return { ...levelUp, before, after }
  })
  return buildSettlementScreens(
    { ...report, levelUps },
    world.party.map(({ id }) => id),
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
