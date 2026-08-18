import { describe, expect, test } from 'vitest'
import {
  AddWorldVariableCommand,
  DeleteWorldVariableCommand,
  UpdateWorldVariableCommand,
  WorldVariableInUseError,
} from './commands.js'
import { type EditorState, EditSession } from './edit-session.js'

function state(): EditorState {
  return {
    manifest: {
      id: 'variables',
      name: 'Variables',
      contentVersion: 16,
      minimumSaveVersion: 8,
      entryScene: 's',
      content: { worldVariables: 'content/world-variables.json' },
      assets: { catalog: 'assets/index.json', roles: {} },
      startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    },
    worldVariables: {
      used: { kind: 'flag', name: '被引用', description: '', initial: false },
      unused: { kind: 'number', name: '未引用', description: '', initial: 0 },
    },
    scenes: [],
    sharedScripts: {
      main: {
        name: '主线',
        self: 'none',
        body: [{ kind: 'setFlag', flag: 'used', value: true }],
      },
    },
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    maps: {},
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    stamps: [],
    tilesetBlobs: {},
    scriptChunks: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  }
}

describe('world variable EditSession commands', () => {
  test('create and metadata update participate in undo/redo without changing stable identity', () => {
    const session = new EditSession(state())
    session.dispatch(
      new AddWorldVariableCommand('score', {
        kind: 'number',
        name: '分数',
        description: '',
        initial: 3,
      }),
    )
    expect(session.getState().worldVariables?.score?.initial).toBe(3)
    expect(session.undo()).toBe(true)
    expect(session.getState().worldVariables).not.toHaveProperty('score')
    expect(session.redo()).toBe(true)

    session.dispatch(
      new UpdateWorldVariableCommand('score', {
        kind: 'number',
        name: '总分',
        description: '项目级默认值',
        initial: 5,
      }),
    )
    expect(session.getState().worldVariables?.score?.name).toBe('总分')
    expect(session.undo()).toBe(true)
    expect(session.getState().worldVariables?.score?.name).toBe('分数')
  })

  test('delete blocks every referenced definition and keeps zero-reference deletion undoable', () => {
    const session = new EditSession(state())
    expect(() => session.dispatch(new DeleteWorldVariableCommand('used'))).toThrow(
      WorldVariableInUseError,
    )
    expect(session.getState().worldVariables).toHaveProperty('used')

    expect(session.dispatch(new DeleteWorldVariableCommand('unused'))).toBe(true)
    expect(session.getState().worldVariables).not.toHaveProperty('unused')
    expect(session.undo()).toBe(true)
    expect(session.getState().worldVariables).toHaveProperty('unused')
  })
})
