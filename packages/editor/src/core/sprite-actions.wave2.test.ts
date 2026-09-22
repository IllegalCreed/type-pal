import {
  type ActorDef,
  type EntityDef,
  type SpriteDef,
  validateActors,
  validateSprites,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  defaultActionTargetForEntity,
  nextSpriteActionId,
  sortedSpriteActions,
} from './sprite-actions.js'

function sprite(): SpriteDef {
  const action = (label: string, order?: number) => ({
    label,
    ...(order === undefined ? {} : { order }),
    steps: [{ frame: 0, durationMs: 40 }],
  })
  const value: SpriteDef = {
    id: 'sprite.hero',
    label: 'Hero',
    asset: 'asset.hero',
    layout: { kind: 'static' },
    poses: {
      z: action('same'),
      b: action('same', 1),
      a: action('same', 1),
      c: action('zz', 1),
      action: action('early', 0),
      'action-2': action('same'),
    },
  }
  validateSprites([value])
  return value
}
test('action order falls through label then stable id, missing orders sort last without rewriting poses', () => {
  const input = sprite(),
    before = structuredClone(input)
  expect(sortedSpriteActions(input)).toEqual(
    ['action', 'a', 'b', 'c', 'action-2', 'z'].map((id, index) => ({
      id,
      index,
      action: input.poses![id],
    })),
  )
  expect(input).toEqual(before)
  expect(sortedSpriteActions(undefined)).toEqual([])
})
test('next action identity fills the first free suffix and never uses display order as identity', () => {
  const input = sprite(),
    before = structuredClone(input)
  expect(nextSpriteActionId(input)).toBe('action-3')
  delete input.poses!['action-2']
  expect(nextSpriteActionId(input)).toBe('action-2')
  expect(nextSpriteActionId({ ...input, poses: undefined })).toBe('action')
  expect(before.poses!['action-2']).toBeDefined()
})
test('default action rejects missing actor/sprite/poses rather than borrowing another definition', () => {
  const definition = sprite(),
    before = structuredClone(definition)
  const actors: Record<string, ActorDef> = {
    hero: { id: 'hero', name: 'hero', spriteId: definition.id },
  }
  validateActors(Object.values(actors))
  const entity: EntityDef = {
    id: 'actor-instance',
    actor: 'hero',
    pos: { col: 0, row: 0, height: 0 },
  }
  expect(defaultActionTargetForEntity(entity, actors, [definition])).toEqual({
    sprite: definition,
    action: { id: 'action', action: definition.poses!.action, index: 0 },
  })
  expect(defaultActionTargetForEntity(entity, {}, [definition])).toBeUndefined()
  expect(defaultActionTargetForEntity(entity, actors, [])).toBeUndefined()
  expect(
    defaultActionTargetForEntity(entity, actors, [{ ...definition, poses: undefined }]),
  ).toBeUndefined()
  expect(defaultActionTargetForEntity(undefined, actors, [definition])).toBeUndefined()
  expect(
    defaultActionTargetForEntity({ id: 'zone', zone: true, pos: entity.pos }, actors, [definition]),
  ).toBeUndefined()
  expect(definition).toEqual(before)
})
