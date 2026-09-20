import { lookupText } from '@type-pal/content'
import { BattleSession, type BattleSessionAssets } from './battle/battle-session.js'
import { settleBattleVictory } from './battle/battle-world-result.js'
import type { prepareBattleTrial } from './battle-trial-prepare.js'
import type { LoadedCurrentProjectCore } from './project-loader.js'

type Options = NonNullable<ConstructorParameters<typeof BattleSession>[5]>
type Prepared = ReturnType<typeof prepareBattleTrial>
/** The browser host and headless workflow regression instantiate this same real session. */
export function createBattleTrialSession(
  prepared: Prepared,
  project: LoadedCurrentProjectCore,
  assets: BattleSessionAssets,
  hooks: Pick<Options, 'playMusic' | 'stopMusic' | 'prepareTurnSounds' | 'reportReadinessError'> & {
    active: () => void
    onExpReward: () => void
    rng?: () => number
  },
): BattleSession {
  hooks.active()
  const { world, players, items, enemySlots, field, config } = prepared
  const rng = hooks.rng ?? Math.random
  const session: BattleSession = new BattleSession(
    players,
    enemySlots,
    assets,
    (id) => {
      const template = world.party.find((c) => c.id === id)?.template
      return lookupText(
        template ? (project.actorsById[template]?.name ?? template) : id,
        project.locale,
      )
    },
    rng,
    {
      skills: project.skills,
      enemiesById: project.enemiesById,
      actorsById: project.actorsById,
      items,
      inventory: world.inventory.map((entry) => ({ ...entry })),
      money: world.money,
      locale: project.locale,
      difficulty: 'normal',
      auto: config.auto,
      boss: config.boss,
      fieldWave: field.screenWave,
      fieldEffect: field.magicEffect,
      poisonDefs: project.poisonsById,
      skillUseCounts: world.skillUseCounts,
      playerSounds: world.party.map((c) => project.actorsById[c.template]?.battler?.sounds),
      soundRoles: project.manifest.assets.roles,
      encounterChoreo: enemySlots.flatMap((enemy) => enemy?.choreography ?? []),
      worldPartyIdentities: world.party.map(({ id, template }) => ({ id, template })),
      playMusic: hooks.playMusic,
      stopMusic: hooks.stopMusic,
      prepareTurnSounds: hooks.prepareTurnSounds,
      reportReadinessError: hooks.reportReadinessError,
      buildSettlement: () => {
        hooks.active()
        return settleBattleVictory(session, world, project, hooks.onExpReward, rng)
      },
    },
  )
  return session
}
