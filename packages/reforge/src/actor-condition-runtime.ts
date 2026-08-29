import {
  type ApplyActorCondition,
  applyActorCondition,
  type CharacterInstance,
  type ClearActorCondition,
  clearActorCondition,
  type PoisonDef,
  type WorldState,
} from '@type-pal/content'

function requireActor(
  world: Pick<WorldState, 'party' | 'reserve'>,
  actor: string,
  operation: 'applyActorCondition' | 'clearActorCondition',
): CharacterInstance {
  const matches = [...world.party, ...(world.reserve ?? [])].filter(
    (candidate) => candidate.template === actor,
  )
  const match = matches[0]
  if (!match) throw new Error(`${operation}: 角色 ${actor} 不在队伍或后备队伍`)
  if (matches.length !== 1)
    throw new Error(`${operation}: 角色 ${actor} 在队伍与后备队伍中存在重复实例`)
  return match
}

export function applyWorldActorCondition(
  world: Pick<WorldState, 'party' | 'reserve'>,
  actor: string,
  condition: ApplyActorCondition,
  poisonDefs: Readonly<Record<number, PoisonDef>>,
): boolean {
  return applyActorCondition(
    requireActor(world, actor, 'applyActorCondition'),
    condition,
    poisonDefs,
  )
}

export function clearWorldActorCondition(
  world: Pick<WorldState, 'party' | 'reserve'>,
  actor: string,
  condition: ClearActorCondition,
  poisonDefs: Readonly<Record<number, PoisonDef>>,
): boolean {
  return clearActorCondition(
    requireActor(world, actor, 'clearActorCondition'),
    condition,
    poisonDefs,
  )
}
