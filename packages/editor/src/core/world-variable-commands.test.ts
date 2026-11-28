import { validateWorldVariableRegistryV1, type WorldVariableDefinitionV1 } from '@type-pal/content'
import { expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import {
  AddWorldVariableCommand,
  DeleteWorldVariableCommand,
  UpdateWorldVariableCommand,
  WorldVariableInUseError,
} from './commands.js'
import { type EditorState, EditSession } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import type { ScriptEditorState } from './script-editor.js'

const score: WorldVariableDefinitionV1 = {
  kind: 'number',
  name: '分数',
  description: '',
  initial: 0,
}
const flag: WorldVariableDefinitionV1 = {
  kind: 'flag',
  name: '开关',
  description: '',
  initial: false,
}

async function blankSession(): Promise<EditSession> {
  const { state } = await loadBoundaryProject('world-variable-history')
  return new EditSession({ ...state, worldVariables: {} })
}

test('creates and undoes a legal definition with an inherited property name', async () => {
  const session = await blankSession()
  const registry = validateWorldVariableRegistryV1({ constructor: flag })
  expect(registry).toEqual({ constructor: flag })

  expect(session.dispatch(new AddWorldVariableCommand('constructor', flag))).toBe(true)
  expect(session.getState().worldVariables).toEqual(registry)
  expect(session.undo()).toBe(true)
  expect(Object.hasOwn(session.getState().worldVariables ?? {}, 'constructor')).toBe(false)
  expect(session.redo()).toBe(true)
  expect(session.getState().worldVariables).toEqual(registry)
})

test.each([
  ['update', () => new UpdateWorldVariableCommand('constructor', flag)],
  [
    'delete',
    () => new DeleteWorldVariableCommand('constructor', collectCurrentProjectReferenceIndex),
  ],
])('a missing registered definition makes %s a no-op', async (_mode, command) => {
  const session = await blankSession()
  let changed: boolean | undefined
  expect(() => {
    changed = session.dispatch(command())
  }).not.toThrow()
  expect(changed).toBe(false)
  expect(session.getState().worldVariables).toEqual({})
  expect(session.undo()).toBe(false)
})

test('edits a definition in place by ID and restores its zero value and empty description', async () => {
  const session = await blankSession()
  expect(session.dispatch(new AddWorldVariableCommand('score', score))).toBe(true)
  const updated = { ...score, initial: 5, name: '总分', description: '项目级默认值' }

  expect(session.dispatch(new UpdateWorldVariableCommand('score', updated))).toBe(true)
  expect(session.getState().worldVariables).toEqual({ score: updated })
  expect(session.undo()).toBe(true)
  expect(session.getState().worldVariables).toEqual({ score })
  expect(session.undo()).toBe(true)
  expect(session.getState().worldVariables).toEqual({})
  expect(session.redo()).toBe(true)
  expect(session.redo()).toBe(true)
  expect(session.getState().worldVariables).toEqual({ score: updated })
})

test('duplicate creation and an identical patch preserve the existing history entry', async () => {
  const session = await blankSession()
  session.dispatch(new AddWorldVariableCommand('score', score))
  const state = session.getState()
  const version = session.getHistoryVersion()

  expect(session.dispatch(new AddWorldVariableCommand('score', flag))).toBe(false)
  expect(session.dispatch(new UpdateWorldVariableCommand('score', score))).toBe(false)
  expect(session.getState()).toBe(state)
  expect(session.getHistoryVersion()).toBe(version)
  expect(session.undo()).toBe(true)
  expect(session.getState().worldVariables).toEqual({})
})

test('delete and redo consult the current independent canonical script and retain failed history', async () => {
  const session = await blankSession()
  session.dispatch(new AddWorldVariableCommand('score', score))
  const canonical: ScriptEditorState = { scenes: [], items: [], sharedScripts: {} }
  const command = new DeleteWorldVariableCommand('score', (state) =>
    collectCurrentProjectReferenceIndex(state, canonical),
  )
  expect(session.dispatch(command)).toBe(true)
  expect(session.getState().worldVariables).toEqual({})
  expect(session.undo()).toBe(true)
  expect(session.getState().worldVariables).toEqual({ score })
  canonical.sharedScripts.live = {
    name: '当前脚本',
    self: 'none',
    body: [{ kind: 'setVar', var: 'score', value: 5 }],
  }

  expect(() => session.redo()).toThrow(new WorldVariableInUseError('score', 1))
  expect(session.getState().worldVariables).toEqual({ score })
  expect(session.canRedo()).toBe(true)
  delete canonical.sharedScripts.live
  expect(session.redo()).toBe(true)
  expect(session.getState().worldVariables).toEqual({})
})

test('reference inspection failure leaves the definition and the history intact', async () => {
  const session = await blankSession()
  session.dispatch(new AddWorldVariableCommand('score', score))
  const state = session.getState()
  const version = session.getHistoryVersion()
  const error = new Error('当前脚本引用不可读')

  expect(() =>
    session.dispatch(
      new DeleteWorldVariableCommand('score', () => {
        throw error
      }),
    ),
  ).toThrow(error)
  expect(session.getState()).toBe(state)
  expect(session.getHistoryVersion()).toBe(version)
})

test('reversing a deletion rejects a stable ID occupied by another definition', async () => {
  const session = await blankSession()
  session.dispatch(new AddWorldVariableCommand('score', score))
  const command = new DeleteWorldVariableCommand('score', collectCurrentProjectReferenceIndex)
  const removed = command.apply(session.getState())
  const occupied: EditorState = { ...removed, worldVariables: { score: flag } }

  expect(() => command.invert(occupied)).toThrow(/^无法撤销删除：变量 id 已被占用 score$/)
  expect(occupied.worldVariables).toEqual({ score: flag })
  expect(command.invert(removed).worldVariables).toEqual({ score })
})
