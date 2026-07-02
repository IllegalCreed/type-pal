import { describe, expect, test } from 'vitest'
import { type ActorDef, isActorEntity, resolveEntitySpriteId } from './actor.js'
import type { EntityDef } from './index.js'

const actors: Record<string, ActorDef> = {
  youhun: { id: 'youhun', name: 'name.youhun', spriteId: 'ghost' },
}
const actorEnt: EntityDef = { id: 'e1', pos: { col: 0, row: 0, height: 0 }, actor: 'youhun' }
const propEnt: EntityDef = { id: 'e2', pos: { col: 0, row: 0, height: 0 }, sprite: 'vase' }

describe('实体引用判别 + 精灵解析', () => {
  test('isActorEntity:actor 实体 true / prop 实体 false', () => {
    expect(isActorEntity(actorEnt)).toBe(true)
    expect(isActorEntity(propEnt)).toBe(false)
  })
  test('resolveEntitySpriteId:actor 实体经表解析到 spriteId', () => {
    expect(resolveEntitySpriteId(actorEnt, actors)).toBe('ghost')
  })
  test('resolveEntitySpriteId:prop 实体直取 sprite', () => {
    expect(resolveEntitySpriteId(propEnt, actors)).toBe('vase')
  })
  test('resolveEntitySpriteId:actor 不在表 → undefined', () => {
    const dangling: EntityDef = { id: 'e3', pos: { col: 0, row: 0, height: 0 }, actor: 'nobody' }
    expect(resolveEntitySpriteId(dangling, actors)).toBeUndefined()
  })
})
