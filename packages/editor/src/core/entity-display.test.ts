import { expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import { entityDisplayLabel, entityDisplayName } from './entity-display.js'

test('instance name overrides actor name without altering actor identity and clear restores inheritance', async () => {
  const { state } = await loadBoundaryProject('entity-display-precedence')
  const actor = state.actors[0]!
  const actors = { [actor.id]: actor }
  const entity = { id: 'e56', actor: actor.id, label: '大厅李大娘' }
  const snapshot = structuredClone(actor)
  expect(entityDisplayName(entity, actors, state.locale)).toBe('大厅李大娘')
  expect(entityDisplayLabel(entity, actors, state.locale)).toBe('大厅李大娘 · e56')
  expect(
    entityDisplayName({ ...entity, label: undefined }, actors, { [actor.name]: '李大娘' }),
  ).toBe('李大娘')
  expect(entityDisplayName({ id: 'e59' })).toBe('e59')
  expect(actor).toEqual(snapshot)
})

test('same display name retains distinct stable instance IDs', () => {
  expect(entityDisplayLabel({ id: 'e59', label: '苗人随从' })).toBe('苗人随从 · e59')
  expect(entityDisplayLabel({ id: 'e60', label: '苗人随从' })).toBe('苗人随从 · e60')
})
