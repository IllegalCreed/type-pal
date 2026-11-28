import { validateEnemyTeams } from '@type-pal/content'
import { expect, test } from 'vitest'
import { legalCommandState, mkEnemy, realRefs } from './__tests__/glm-state-commands-b.js'
import { EditSession } from './edit-session.js'
import {
  AddEnemyTeamCommand,
  DeleteEnemyTeamCommand,
  UpdateEnemyTeamCommand,
} from './enemy-team-commands.js'

test('updating slots preserves the stable team ID and keeps holes through undo and redo', async () => {
  const enemies = [mkEnemy('first'), mkEnemy('second')]
  const start = { id: 'guard', slots: ['first'] }
  const session = new EditSession(await legalCommandState({ enemies, enemyTeams: [start] }))
  const slots = ['second', null, 'first']
  const command = new UpdateEnemyTeamCommand(start.id, { id: 'changed', slots })
  slots[0] = 'first'

  expect(session.dispatch(command)).toBe(true)
  const expected = [{ id: 'guard', slots: ['second', null, 'first'] }]
  expect(validateEnemyTeams(session.getState().enemyTeams, new Set(['first', 'second']))).toEqual(
    expected,
  )
  expect(session.undo()).toBe(true)
  expect(session.getState().enemyTeams).toEqual([start])
  expect(session.redo()).toBe(true)
  expect(session.getState().enemyTeams).toEqual(expected)
})

test('a duplicate creation and operations on undefined teams leave history untouched', async () => {
  const team = { id: 'guard', slots: [] }
  const session = new EditSession(await legalCommandState({ enemyTeams: [team] }))
  expect(session.dispatch(new AddEnemyTeamCommand(team))).toBe(false)
  expect(session.dispatch(new UpdateEnemyTeamCommand('later', { id: 'later', slots: [] }))).toBe(
    false,
  )
  expect(session.dispatch(new DeleteEnemyTeamCommand('later', realRefs))).toBe(false)
  expect(session.getState().enemyTeams).toEqual([team])
  expect(session.canUndo()).toBe(false)
})

test('an unused team deleted from the middle returns to the same slot on undo', async () => {
  const original = [
    { id: 'first', slots: [] },
    { id: 'guard', slots: [] },
    { id: 'last', slots: [] },
  ]
  const session = new EditSession(await legalCommandState({ enemyTeams: original }))
  expect(session.dispatch(new DeleteEnemyTeamCommand('guard', realRefs))).toBe(true)
  expect(session.getState().enemyTeams?.map(({ id }) => id)).toEqual(['first', 'last'])
  expect(session.undo()).toBe(true)
  expect(session.getState().enemyTeams).toEqual(original)
  expect(session.redo()).toBe(true)
  expect(session.getState().enemyTeams?.map(({ id }) => id)).toEqual(['first', 'last'])
})
