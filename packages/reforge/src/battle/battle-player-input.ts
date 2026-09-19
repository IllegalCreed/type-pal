/** Shared live derivation for ordinary encounters and isolated simulator battles. */
import {
  type ActorDef,
  effectiveGrantedStatuses,
  effectiveRegen,
  effectiveResistances,
  effectiveSkills,
  effectiveStat,
  equipGrantsAttackAll,
  type ItemDataMap,
  type WorldState,
} from '@type-pal/content'
import type { CreatePlayerInput } from './battle-core.js'

export function createBattlePlayers(
  world: Pick<WorldState, 'party' | 'learnedSkills'>,
  project: { items: ItemDataMap; actorsById: Record<string, ActorDef> },
  debug: { dualLeader?: string | null; allLeader?: string | null } = {},
): CreatePlayerInput[] {
  return world.party.map((c) => {
    const res = effectiveResistances(c, project.items)
    const regen = effectiveRegen(c, project.items)
    const granted = effectiveGrantedStatuses(c, project.items)
    const battler = project.actorsById[c.template]?.battler
    const guardian = battler?.coveredBy
      ? world.party.find((x) => x.template === battler.coveredBy)
      : undefined
    return {
      roleId: c.id,
      actorTemplateId: c.template,
      hp: c.hp,
      maxHp: c.maxHP,
      mp: c.mp,
      maxMp: c.maxMP,
      attackStrength: effectiveStat(c, 'attack', project.items),
      defense: effectiveStat(c, 'defense', project.items),
      magicStrength: effectiveStat(c, 'magicAttack', project.items),
      baseDexterity: effectiveStat(c, 'speed', project.items),
      skills: effectiveSkills(world.learnedSkills[c.id] ?? [], c, project.items),
      ...(battler?.cooperativeMagicSkillId
        ? { cooperativeMagicSkillId: battler.cooperativeMagicSkillId }
        : {}),
      ...(guardian ? { coveredBy: guardian.id } : {}),
      fleeRate: effectiveStat(c, 'luck', project.items),
      elemRes: res.elemRes,
      poisonRes: res.poisonRes + (c.extraPoisonRes ?? 0),
      ...(c.extraPoisonRes ? { itemPoisonResBonus: c.extraPoisonRes } : {}),
      ...(c.poisons?.length ? { poisons: c.poisons.map((x) => ({ ...x })) } : {}),
      ...(c.extraStatuses?.length
        ? { carriedStatuses: c.extraStatuses.map((x) => ({ ...x })) }
        : {}),
      attackAll: equipGrantsAttackAll(c, project.items) || debug.allLeader === c.id,
      regenHp: regen.hp,
      regenMp: regen.mp,
      grantedStatuses:
        debug.dualLeader === c.id && !granted.includes('dualAttack')
          ? [...granted, 'dualAttack' as const]
          : granted,
      persistentProgress: {
        level: c.level,
        exp: c.exp,
        maxHP: c.maxHP,
        maxMP: c.maxMP,
        attack: c.attack,
        magicAttack: c.magicAttack,
        defense: c.defense,
        speed: c.speed,
        luck: c.luck,
      },
    }
  })
}
