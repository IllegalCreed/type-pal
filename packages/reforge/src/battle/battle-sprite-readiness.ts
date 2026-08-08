import type {
  ActorDef,
  BattleSpriteDef,
  CharacterInstance,
  EnemyDef,
  ItemData,
  SkillData,
} from '@type-pal/content'
import { effectiveBattleSpriteId, resolveSkillExecution } from '@type-pal/content'
import type {
  BattleSpriteAssetCache,
  BattleSpriteAssetReader,
  LoadedBattleSpriteDefinition,
} from '../assets.js'
import { loadBattleSpriteDefinition } from '../assets.js'
import { collectReachableEnemyDefs, collectReachableEnemySkillIds } from './enemy-closure.js'

export interface BattleSpriteReadinessInput {
  cache: BattleSpriteAssetCache
  reader: BattleSpriteAssetReader
  definitionsById: Readonly<Record<string, BattleSpriteDef>>
  party: readonly CharacterInstance[]
  actorsById: Readonly<Record<string, ActorDef>>
  itemsById: Readonly<Record<string, ItemData>>
  /** 已按 effectiveSkills 构造的每名队员技能；不得回退扫描 world.learnedSkills。 */
  playerSkillIds: readonly (readonly string[])[]
  cooperativeSkillIds: readonly string[]
  skillsById: Readonly<Record<string, SkillData>>
  enemyDefs: readonly EnemyDef[]
  enemiesById: Readonly<Record<string, EnemyDef>>
}

export interface BattleSpriteReadiness {
  byDefinitionId: ReadonlyMap<string, LoadedBattleSpriteDefinition>
  playerBaseDefinitionIds: readonly string[]
  reachableEnemyDefs: readonly EnemyDef[]
  reachableEnemySkillIds: readonly string[]
}

export function collectBattleSkillFireChunks(input: {
  playerSkillIds: readonly (readonly string[])[]
  cooperativeSkillIds: readonly string[]
  reachableEnemySkillIds: readonly string[]
  skillsById: Readonly<Record<string, SkillData>>
}): Set<number> {
  const chunks = new Set<number>()
  const include = (skillId: string, side: 'player' | 'enemy'): void => {
    const skill = input.skillsById[skillId]
    if (!skill) throw new Error(`FIRE readiness 缺 SkillData "${skillId}"`)
    const chunk = resolveSkillExecution(skill, side).animation.effectSprite
    if (chunk >= 0) chunks.add(chunk)
  }
  for (const skills of input.playerSkillIds)
    for (const skillId of skills) include(skillId, 'player')
  for (const skillId of input.cooperativeSkillIds) include(skillId, 'player')
  for (const skillId of input.reachableEnemySkillIds) include(skillId, 'enemy')
  return chunks
}

/** 战斗提交前一次性解析完整视觉闭包；任一缺失/错 profile/帧越界都会阻止开战。 */
export async function prepareBattleSpriteReadiness(
  input: BattleSpriteReadinessInput,
): Promise<BattleSpriteReadiness> {
  const requests = new Map<string, BattleSpriteDef['profile']['kind']>()
  const include = (id: string, expected: BattleSpriteDef['profile']['kind']): void => {
    const previous = requests.get(id)
    if (previous && previous !== expected)
      throw new Error(`BattleSpriteDef "${id}" 同时被要求为 ${previous}/${expected}`)
    requests.set(id, expected)
  }
  const playerBaseDefinitionIds = input.party.map((character) => {
    const actor = input.actorsById[character.template]
    const id = effectiveBattleSpriteId(character, actor, input.itemsById)
    if (!id) throw new Error(`队员 "${character.id}" 没有有效 battleSprite`)
    include(id, 'player-fighter')
    return id
  })
  const includeSkillEffects = (skillId: string, side: 'player' | 'enemy'): void => {
    const skill = input.skillsById[skillId]
    if (!skill) throw new Error(`战斗视觉 readiness 缺 SkillData "${skillId}"`)
    for (const effect of resolveSkillExecution(skill, side).effects) {
      if (effect.kind === 'summon') include(effect.battleSprite, 'summon')
      if (effect.kind === 'trance') include(effect.battleSprite, 'player-fighter')
    }
  }
  const playerSkillIds = new Set(input.cooperativeSkillIds)
  for (const skills of input.playerSkillIds)
    for (const skillId of skills) playerSkillIds.add(skillId)
  for (const skillId of playerSkillIds) includeSkillEffects(skillId, 'player')
  const reachableEnemyDefs = collectReachableEnemyDefs(input.enemyDefs, input.enemiesById)
  for (const enemy of reachableEnemyDefs) include(enemy.battleSprite, 'enemy')
  const reachableEnemySkillIds = collectReachableEnemySkillIds(input.enemyDefs, input.enemiesById)
  for (const skillId of reachableEnemySkillIds) includeSkillEffects(skillId, 'enemy')

  const loaded = await Promise.all(
    [...requests].map(async ([id, expected]) => {
      const definition = input.definitionsById[id]
      if (!definition) throw new Error(`BattleSpriteDef "${id}" 不存在`)
      return [
        id,
        await loadBattleSpriteDefinition(input.cache, input.reader, definition, expected),
      ] as const
    }),
  )
  const protectedAssets = new Set(loaded.map(([, value]) => value.definition.asset))
  input.cache.prune(protectedAssets)
  return {
    byDefinitionId: new Map(loaded),
    playerBaseDefinitionIds,
    reachableEnemyDefs,
    reachableEnemySkillIds,
  }
}
