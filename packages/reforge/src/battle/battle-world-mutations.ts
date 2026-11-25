import type { CharacterInstance, LevelGrowthDelta, WorldState } from '@type-pal/content'
import { expectDefined } from '../defined.js'
import type { BattleWorldMutation } from './battle-core.js'
import { recordBattleSkillUses } from './battle-skill-uses.js'

const GROWTH_FIELDS = [
  'maxHP',
  'maxMP',
  'attack',
  'magicAttack',
  'defense',
  'speed',
  'luck',
] as const

function addGrowthStats(character: CharacterInstance, delta: LevelGrowthDelta): void {
  for (const key of GROWTH_FIELDS) character[key] += delta[key]
}

/** Check every fixed-growth target before applying any of this battle's world changes. */
export function applyBattleWorldMutations(
  world: WorldState,
  mutations: readonly BattleWorldMutation[],
): void {
  for (const mutation of mutations) {
    if (mutation.kind !== 'fixedCharacterGrowth') continue
    const byId = world.party.filter((candidate) => candidate.id === mutation.characterId)
    const byTemplate = world.party.filter(
      (candidate) => candidate.template === mutation.actorTemplateId,
    )
    if (byId.length !== 1 || byTemplate.length !== 1 || byId[0] !== byTemplate[0])
      throw new Error(
        `fixedCharacterGrowth 写回定位失败：actor=${mutation.actorTemplateId}, character=${mutation.characterId}`,
      )
  }
  for (const mutation of mutations) {
    switch (mutation.kind) {
      case 'characterGrowth': {
        const character = world.party.find((candidate) => candidate.id === mutation.characterId)
        if (!character) break
        character.level = Math.min(99, character.level + mutation.delta.level)
        character.exp = mutation.expAfter
        addGrowthStats(character, mutation.delta)
        break
      }
      case 'fixedCharacterGrowth': {
        const character = expectDefined(
          world.party.find((candidate) => candidate.id === mutation.characterId),
        )
        character.level += mutation.delta.level
        addGrowthStats(character, mutation.delta)
        break
      }
      case 'hostileAwareness':
        world.hostileAwareness = { ...mutation.value }
        break
      case 'skillUse': {
        world.skillUseCounts ??= {}
        recordBattleSkillUses(
          world.skillUseCounts,
          mutation.characterId,
          mutation.skillId,
          mutation.usesAfter,
        )
        if (!mutation.removed || !Object.hasOwn(world.learnedSkills, mutation.characterId)) break
        const learned = world.learnedSkills[mutation.characterId]
        if (learned?.includes(mutation.skillId))
          world.learnedSkills[mutation.characterId] = learned.filter(
            (id) => id !== mutation.skillId,
          )
        break
      }
    }
  }
}
