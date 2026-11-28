import type { AmbienceDef } from '@type-pal/content'
import { expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import { AddAmbienceCommand, DeleteAmbienceCommand, UpdateAmbienceCommand } from './commands.js'
import { EditSession } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'

function ambience(id: string): AmbienceDef {
  return { id, name: id, tint: [255, 255, 255] }
}

test('undo and redo an ambience name and tint edit with independent command input', async () => {
  const { state } = await loadBoundaryProject('ambience-history')
  const day = ambience('day')
  const before = { ...state, ambiences: [day] }
  const session = new EditSession(before)
  const patch: { name: string; tint: AmbienceDef['tint'] } = {
    name: 'Morning',
    tint: [10, 20, 30],
  }
  const command = new UpdateAmbienceCommand('day', patch)
  patch.tint[0] = 140

  expect(session.dispatch(command)).toBe(true)
  const after = [{ id: 'day', name: 'Morning', tint: [10, 20, 30] }]
  expect(session.getState().ambiences).toEqual(after)
  expect(session.undo()).toBe(true)
  expect(session.getState().ambiences).toEqual([{ id: 'day', name: 'day', tint: [255, 255, 255] }])
  expect(session.redo()).toBe(true)
  expect(session.getState().ambiences).toEqual(after)
  expect(before.ambiences).toEqual([{ id: 'day', name: 'day', tint: [255, 255, 255] }])
})

test('missing ambience leaves the optional table and edit history untouched', async () => {
  const { state } = await loadBoundaryProject('ambience-missing')
  delete state.ambiences
  const session = new EditSession(state)

  expect(session.dispatch(new UpdateAmbienceCommand('night', { tint: [10, 20, 30] }))).toBe(false)
  expect(
    session.dispatch(new DeleteAmbienceCommand('night', collectCurrentProjectReferenceIndex)),
  ).toBe(false)
  expect(session.getState().ambiences).toBeUndefined()
  expect(session.undo()).toBe(false)
})

test('first ambience initializes the optional table and duplicate ID does not enter history', async () => {
  const { state } = await loadBoundaryProject('ambience-first')
  delete state.ambiences
  const session = new EditSession(state)

  expect(session.dispatch(new AddAmbienceCommand('dusk', '黄昏'))).toBe(true)
  expect(session.getState().ambiences).toEqual([
    { id: 'dusk', name: '黄昏', tint: [255, 255, 255] },
  ])
  expect(session.dispatch(new AddAmbienceCommand('dusk', '重复'))).toBe(false)
  expect(session.undo()).toBe(true)
  expect(session.getState().ambiences).toEqual([])
})

test('undo restores a deleted ambience at its original middle position', async () => {
  const { state } = await loadBoundaryProject('ambience-middle')
  const session = new EditSession({ ...state, ambiences: ['a', 'b', 'c'].map(ambience) })
  const ids = () => session.getState().ambiences?.map(({ id }) => id)

  expect(
    session.dispatch(new DeleteAmbienceCommand('b', collectCurrentProjectReferenceIndex)),
  ).toBe(true)
  expect(ids()).toEqual(['a', 'c'])
  expect(session.undo()).toBe(true)
  expect(ids()).toEqual(['a', 'b', 'c'])
  expect(session.redo()).toBe(true)
  expect(ids()).toEqual(['a', 'c'])
})

test('restoring a deletion rejects a reoccupied stable ID without discarding either state', async () => {
  const { state } = await loadBoundaryProject('ambience-reoccupied')
  const original = { ...state, ambiences: [ambience('day')] }
  const command = new DeleteAmbienceCommand('day', collectCurrentProjectReferenceIndex)
  const removed = command.apply(original)
  const reoccupied = new AddAmbienceCommand('day', '占位').apply(removed)

  expect(() => command.invert(reoccupied)).toThrowError(/^无法撤销删除：氛围 id 已被占用 day$/)
  expect(reoccupied.ambiences).toEqual([{ id: 'day', name: '占位', tint: [255, 255, 255] }])
  expect(command.invert(removed).ambiences).toEqual(original.ambiences)
})
