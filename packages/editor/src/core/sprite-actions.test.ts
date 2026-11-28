import {
  type EntityDef,
  type SpriteActionDef,
  type SpriteDef,
  validateSprites,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import {
  defaultActionTargetForEntity,
  nextSpriteActionId,
  sortedSpriteActions,
} from './sprite-actions.js'

function pose(label: string, order?: number): SpriteActionDef {
  return { label, ...(order === undefined ? {} : { order }), steps: [{ frame: 0, durationMs: 40 }] }
}

async function spriteWithActions(poses: Record<string, SpriteActionDef>) {
  const { state } = await loadBoundaryProject()
  const hero = state.sprites.find(({ id }) => id === 'hero')
  if (!hero) throw new Error('registered hero sprite missing')
  const sprite: SpriteDef = { ...hero, poses }
  validateSprites([sprite], state.assetCatalog)
  return { state, sprite }
}

test('the displayed index follows numeric order, then label and stable ID', async () => {
  const { sprite } = await spriteWithActions({
    none: pose('A missing'),
    a10: pose('First', 90),
    a2: pose('First', 90),
    laterLabel: pose('Z later', 90),
    first: pose('Z explicit zero', 0),
  })
  const original = structuredClone(sprite)

  expect(sortedSpriteActions(sprite).map(({ id, index }) => [id, index])).toEqual([
    ['first', 0],
    ['a10', 1],
    ['a2', 2],
    ['laterLabel', 3],
    ['none', 4],
  ])
  expect(sprite).toEqual(original)
  expect(sortedSpriteActions({ ...sprite, poses: {} })).toEqual([])
  expect(sortedSpriteActions({ ...sprite, poses: undefined })).toEqual([])
})

test('an explicit maximum safe order still precedes actions without an order', async () => {
  const { sprite } = await spriteWithActions({
    missing: pose('A optional'),
    explicit: pose('Z explicit', Number.MAX_SAFE_INTEGER),
  })
  expect(sortedSpriteActions(sprite).map(({ id }) => id)).toEqual(['explicit', 'missing'])
})

test('an allocated action fills the first free identity rather than using display order', async () => {
  const { sprite } = await spriteWithActions({
    action: pose('Base', 200),
    'action-3': pose('Third', 0),
    'action-x': pose('Named', 2),
  })
  expect(nextSpriteActionId(sprite)).toBe('action-2')
  const { sprite: occupied } = await spriteWithActions({
    ...sprite.poses,
    'action-2': pose('Second'),
  })
  expect(nextSpriteActionId(occupied)).toBe('action-4')
  expect(nextSpriteActionId({ ...sprite, poses: { 'action-2': pose('Second') } })).toBe('action')
})

test('actor and prop defaults choose only actions registered on the current sprite', async () => {
  const { sprite, state } = await spriteWithActions({ talk: pose('交谈') })
  const decoy = { ...sprite, id: 'decoy', poses: { other: pose('无关动作') } }
  const sprites = [decoy, sprite]
  const pos = { col: 5, row: 0, height: 0 }
  const actor: EntityDef = { id: 'actor', actor: 'hero', pos }
  const prop: EntityDef = { id: 'prop', sprite: 'hero', pos }
  const actors = Object.fromEntries(state.actors.map((entry) => [entry.id, entry]))

  expect(defaultActionTargetForEntity(actor, actors, sprites)?.action.id).toBe('talk')
  expect(defaultActionTargetForEntity(prop, actors, sprites)?.action.id).toBe('talk')
  expect(defaultActionTargetForEntity(actor, {}, sprites)).toBeUndefined()
  expect(defaultActionTargetForEntity(prop, actors, [decoy])).toBeUndefined()
  expect(
    defaultActionTargetForEntity(prop, actors, [decoy, { ...sprite, poses: undefined }]),
  ).toBeUndefined()
  expect(
    defaultActionTargetForEntity({ id: 'zone', zone: true, pos }, actors, sprites),
  ).toBeUndefined()
  expect(defaultActionTargetForEntity(undefined, actors, sprites)).toBeUndefined()
})
