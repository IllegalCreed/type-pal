import type { WorldState } from '@type-pal/content'

type SkillUseCounts = NonNullable<WorldState['skillUseCounts']>

export function readBattleSkillUses(
  counts: SkillUseCounts | undefined,
  characterId: string,
  skillId: string,
): number {
  const character = counts && Object.hasOwn(counts, characterId) ? counts[characterId] : undefined
  return character && Object.hasOwn(character, skillId) ? (character[skillId] ?? 0) : 0
}

export function recordBattleSkillUses(
  counts: SkillUseCounts,
  characterId: string,
  skillId: string,
  uses: number,
): void {
  let character = Object.hasOwn(counts, characterId) ? counts[characterId] : undefined
  if (!character) {
    character = {}
    // Both keys are authored IDs. Keep them as data properties even when a name is inherited.
    Object.defineProperty(counts, characterId, {
      value: character,
      enumerable: true,
      writable: true,
      configurable: true,
    })
  }
  Object.defineProperty(character, skillId, {
    value: uses,
    enumerable: true,
    writable: true,
    configurable: true,
  })
}
