import type { ActorDef, EntityDef, SpriteDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { defaultActionTargetForEntity, sortedSpriteActions } from './sprite-actions.js'

const sprites: SpriteDef[] = [
  {
    id: 'other',
    label: '其它',
    asset: 'sprite.other',
    layout: { kind: 'static' },
    poses: { wrong: { label: '错误候选', steps: [{ frame: 0, durationMs: 100 }] } },
  },
  {
    id: 'hero',
    label: '主角',
    asset: 'sprite.hero',
    layout: { kind: 'static' },
    poses: {
      late: { label: '较后', order: 2, steps: [{ frame: 2, durationMs: 100 }] },
      first: { label: '较前', order: 1, steps: [{ frame: 1, durationMs: 100 }] },
    },
  },
]

describe('sprite action editor helpers', () => {
  test('按 order/label/id 稳定排序并派生零基显示编号', () => {
    expect(sortedSpriteActions(sprites[1])).toMatchObject([
      { id: 'first', index: 0 },
      { id: 'late', index: 1 },
    ])
  })

  test('prop 实体只从自身精灵选择动作，不借用全项目第一项', () => {
    const entity: EntityDef = {
      id: 'e1',
      sprite: 'hero',
      pos: { col: 0, row: 0, height: 0 },
    }
    expect(defaultActionTargetForEntity(entity, {}, sprites)).toMatchObject({
      sprite: { id: 'hero' },
      action: { id: 'first' },
    })
  })

  test('actor 实体经角色表解析；没有动作时明确返回 undefined', () => {
    const entity: EntityDef = {
      id: 'e2',
      actor: 'hero-actor',
      pos: { col: 0, row: 0, height: 0 },
    }
    const actors = {
      'hero-actor': { id: 'hero-actor', name: 'hero', spriteId: 'hero' },
    } as Record<string, ActorDef>
    expect(defaultActionTargetForEntity(entity, actors, sprites)?.action.id).toBe('first')
    expect(defaultActionTargetForEntity(entity, actors, [sprites[0]!])).toBeUndefined()
  })
})
