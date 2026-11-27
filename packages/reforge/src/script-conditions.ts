import type { AuthorCondition, EntityAddress, WorldScriptState } from '@type-pal/content'
import { readOwnEntry } from './scene-entity-values.js'

export function evalAuthorCondition(
  condition: AuthorCondition,
  args: {
    world: WorldScriptState
    currentSceneId?: () => string
    query: {
      hasItem(itemId: string, atLeast: number): boolean
      ownsItem(itemId: string, atLeast: number): boolean
      itemEquipped(itemId: string, atLeast: number): boolean
      allFullHp(): boolean
      money(): number
      inParty(actorId: string): boolean
      entityInScene(target: EntityAddress): boolean
      entitiesNear(from: EntityAddress, to: EntityAddress, range: number): boolean
      facingEntity(target: EntityAddress, range: number): boolean
    }
    random?: () => number
  },
): boolean {
  const random = args.random ?? Math.random
  switch (condition.kind) {
    case 'flag':
      return (readOwnEntry(args.world.flags, condition.flag) ?? false) === condition.is
    case 'var': {
      const value = readOwnEntry(args.world.vars, condition.var) ?? 0
      switch (condition.op) {
        case '==':
          return value === condition.value
        case '!=':
          return value !== condition.value
        case '>=':
          return value >= condition.value
        case '<=':
          return value <= condition.value
        case '>':
          return value > condition.value
        case '<':
          return value < condition.value
      }
      return false
    }
    case 'currentScene': {
      const scene = args.currentSceneId?.()
      if (!scene) throw new Error('currentScene 条件缺当前场景查询')
      return scene === condition.scene
    }
    case 'entityState':
      return (
        readOwnEntry(
          readOwnEntry(args.world.entityState, condition.target.scene),
          condition.target.entity,
        ) === condition.is
      )
    case 'entityInScene':
      return args.query.entityInScene(condition.target)
    case 'entitiesNear':
      return args.query.entitiesNear(condition.from, condition.to, condition.range)
    case 'facingEntity':
      return args.query.facingEntity(condition.target, condition.range ?? 0)
    case 'chance':
      return random() * 100 < condition.percent
    case 'hasItem':
      return args.query.hasItem(condition.itemId, condition.atLeast ?? 1)
    case 'ownsItem':
      return args.query.ownsItem(condition.itemId, condition.atLeast ?? 1)
    case 'itemEquipped':
      return args.query.itemEquipped(condition.itemId, condition.atLeast ?? 1)
    case 'allFullHp':
      return args.query.allFullHp()
    case 'hasMoney':
      return args.query.money() >= condition.atLeast
    case 'inParty':
      return args.query.inParty(condition.actorId)
    case 'all':
      return condition.of.every((child) => evalAuthorCondition(child, args))
    case 'any':
      return condition.of.some((child) => evalAuthorCondition(child, args))
    case 'not':
      return !evalAuthorCondition(condition.cond, args)
  }
}
