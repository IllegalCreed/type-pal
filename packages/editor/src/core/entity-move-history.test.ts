import { expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import { EditSession } from './edit-session.js'
import { AddEntityCommand, MoveEntityCommand } from './entity-commands.js'

test('a move targeting an entity that is no longer in the scene does not enter history', async () => {
  const { state } = await loadBoundaryProject()
  const session = new EditSession(state)
  session.dispatch(
    new AddEntityCommand('start', {
      id: 'counter',
      sprite: 'hero',
      pos: { col: 5, row: 0, height: 0 },
    }),
  )
  const before = session.getState()
  const version = session.getHistoryVersion()

  expect(
    session.dispatch(new MoveEntityCommand('start', 'gone', { col: 6, row: 0, height: 0 })),
  ).toBe(false)
  expect(session.getState()).toBe(before)
  expect(session.getHistoryVersion()).toBe(version)
})

test('moving a registered entity keeps its neighbors and restores its position on undo', async () => {
  const { state } = await loadBoundaryProject()
  const session = new EditSession(state)
  const former = { col: 5, row: 0, height: 0 }
  session.dispatch(new AddEntityCommand('start', { id: 'counter', sprite: 'hero', pos: former }))
  const neighbor = { id: 'shelf', sprite: 'hero', pos: { col: 9, row: 0, height: 0 } }
  session.dispatch(new AddEntityCommand('start', neighbor))

  const destination = { col: 6, row: 0, height: 0 }
  const positions = () => session.getState().scenes[0]?.entities.map(({ pos }) => pos)
  expect(session.dispatch(new MoveEntityCommand('start', 'counter', destination))).toBe(true)
  expect(positions()).toEqual([destination, neighbor.pos])
  expect(session.undo()).toBe(true)
  expect(positions()).toEqual([former, neighbor.pos])
})
