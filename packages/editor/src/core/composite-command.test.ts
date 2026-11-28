import { expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import { CompositeCommand } from './composite-command.js'
import { EditSession } from './edit-session.js'
import { UpdateLocaleCommand } from './locale-commands.js'

test('commands on the same author field apply in order and undo in reverse order', async () => {
  const { state } = await loadBoundaryProject()
  const session = new EditSession(state)
  const command = new CompositeCommand('登记场景入口名称', [
    new UpdateLocaleCommand('entry.name', '初稿'),
    new UpdateLocaleCommand('entry.name', '入口'),
  ])

  expect(session.dispatch(command)).toBe(true)
  expect(session.getState().locale['entry.name']).toBe('入口')
  expect(session.getHistoryVersion()).toBe(1)
  expect(session.undo()).toBe(true)
  expect(session.getState().locale).not.toHaveProperty('entry.name')
  expect(session.redo()).toBe(true)
  expect(session.getState().locale['entry.name']).toBe('入口')
})
