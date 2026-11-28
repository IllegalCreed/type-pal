import { expect, test } from 'vitest'
import { legalCommandState, mkEnemy, realRefs } from './__tests__/glm-state-commands-b.js'
import { EditSession } from './edit-session.js'
import { AddEnemyCommand, DeleteEnemyCommand, UpdateEnemyCommand } from './enemy-commands.js'

test('creating an enemy captures the original stats through undo and redo', async () => {
  const first = mkEnemy('first')
  const session = new EditSession(await legalCommandState({ enemies: [first] }))
  const draft = mkEnemy('second')
  const command = new AddEnemyCommand(draft)
  draft.stats.health = 100

  expect(session.dispatch(command)).toBe(true)
  expect(session.getState().enemies).toEqual([first, mkEnemy('second')])
  expect(session.undo()).toBe(true)
  expect(session.getState().enemies).toEqual([first])
  expect(session.redo()).toBe(true)
  expect(session.getState().enemies).toEqual([first, mkEnemy('second')])
})

test('editing an enemy preserves its slot and undo removes the previously absent reward', async () => {
  const first = mkEnemy('first')
  const middle = mkEnemy('middle')
  const last = mkEnemy('last')
  const session = new EditSession(await legalCommandState({ enemies: [first, middle, last] }))
  const patch = { yPosOffset: 9 }
  const command = new UpdateEnemyCommand('middle', patch)
  patch.yPosOffset = 5

  expect(session.dispatch(command)).toBe(true)
  expect(session.getState().enemies).toEqual([first, { ...middle, yPosOffset: 9 }, last])
  expect(session.undo()).toBe(true)
  expect(session.getState().enemies).toEqual([first, middle, last])
  expect(session.redo()).toBe(true)
  expect(session.getState().enemies?.[1]?.yPosOffset).toBe(9)

  session.dispatch(new UpdateEnemyCommand('middle', { onDefeated: [] }))
  expect(session.getState().enemies?.[1]?.onDefeated).toEqual([])
  expect(session.undo()).toBe(true)
  expect(session.getState().enemies?.[1]).not.toHaveProperty('onDefeated')
})

test('update and deletion of a missing enemy leave the list and history unchanged', async () => {
  const first = mkEnemy('first')
  const session = new EditSession(await legalCommandState({ enemies: [first] }))

  expect(session.dispatch(new UpdateEnemyCommand('absent', { yPosOffset: 5 }))).toBe(false)
  expect(session.dispatch(new DeleteEnemyCommand('absent', realRefs))).toBe(false)
  expect(session.getState().enemies).toEqual([first])
  expect(session.canUndo()).toBe(false)
})

test('deleting an unused enemy restores its original position on undo', async () => {
  const enemies = [mkEnemy('first'), mkEnemy('middle'), mkEnemy('last')]
  const session = new EditSession(await legalCommandState({ enemies }))

  expect(session.dispatch(new DeleteEnemyCommand('middle', realRefs))).toBe(true)
  expect(session.getState().enemies?.map(({ id }) => id)).toEqual(['first', 'last'])
  expect(session.undo()).toBe(true)
  expect(session.getState().enemies).toEqual(enemies)
  expect(session.redo()).toBe(true)
  expect(session.getState().enemies?.map(({ id }) => id)).toEqual(['first', 'last'])
})

test('deletion exposes the actual blocking enemy team with its typed error', async () => {
  const original = await legalCommandState({
    enemies: [mkEnemy('first')],
    enemyTeams: [{ id: 'guard', slots: ['first'] }],
  })
  const session = new EditSession(original)

  expect(() => session.dispatch(new DeleteEnemyCommand('first', realRefs))).toThrow(
    expect.objectContaining({
      name: 'BattleDataInUseError',
      message: '敌人 first 仍被 1 处引用',
      references: [expect.objectContaining({ target: { kind: 'enemy', id: 'first' } })],
    }),
  )
  expect(session.getState()).toBe(original)
  expect(session.canUndo()).toBe(false)
})
