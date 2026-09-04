import { describe, expect, test } from 'vitest'
import {
  AddWorldVariableCommand,
  DeleteWorldVariableCommand,
  UpdateWorldVariableCommand,
  WorldVariableInUseError,
} from './commands.js'
import { type EditorState, EditSession } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'

function state(): EditorState {
  return {
    manifest: {
      id: 'variables',
      name: 'Variables',
      contentVersion: 19,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: { worldVariables: 'content/world-variables.json' },
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
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

  test('identical updates are no-ops and do not create undo history', () => {
    const session = new EditSession(state())
    const before = session.getHistoryVersion()
    expect(
      session.dispatch(
        new UpdateWorldVariableCommand('used', {
          kind: 'flag',
          name: '被引用',
          description: '',
          initial: false,
        }),
      ),
    ).toBe(false)
    expect(session.getHistoryVersion()).toBe(before)
    expect(session.isDirty()).toBe(false)
  })

  test('delete blocks every referenced definition and keeps zero-reference deletion undoable', () => {
    const session = new EditSession(state())
    expect(() =>
      session.dispatch(new DeleteWorldVariableCommand('used', collectCurrentProjectReferenceIndex)),
    ).toThrow(
      WorldVariableInUseError,
    )
    expect(session.getState().worldVariables).toHaveProperty('used')

    expect(
      session.dispatch(
        new DeleteWorldVariableCommand('unused', collectCurrentProjectReferenceIndex),
      ),
    ).toBe(true)
    expect(session.getState().worldVariables).not.toHaveProperty('unused')
    expect(session.undo()).toBe(true)
    expect(session.getState().worldVariables).toHaveProperty('unused')
  })

  test('DeleteWorldVariable 在动作边界读取 current canonical，并在读取失败时 fail-closed', () => {
    const current = state()
    current.sharedScripts = {}
    const canonical = {
      scenes: [],
      items: [],
      sharedScripts: {
        live: {
          name: '当前正文',
          self: 'none' as const,
          body: [{ kind: 'setVar' as const, var: 'unused', value: 1 }],
        },
      },
    }
    expect(() =>
      new DeleteWorldVariableCommand('unused', (state) =>
        collectCurrentProjectReferenceIndex(state, canonical),
      ).apply(current),
    ).toThrow(WorldVariableInUseError)
    expect(() =>
      new DeleteWorldVariableCommand('unused', () => {
        throw new Error('无法读取当前脚本引用')
      }).apply(current),
    ).toThrow(/无法读取当前脚本引用/)
  })

  test('delete redo rechecks newly added canonical references and preserves redo on failure', () => {
    const current = state()
    current.sharedScripts = {}
    const canonical = {
      scenes: [],
      items: [],
      sharedScripts: {} as Record<
        string,
        { name: string; self: 'none'; body: { kind: 'setVar'; var: string; value: number }[] }
      >,
    }
    const session = new EditSession(current)
    const provider = (state: EditorState) => collectCurrentProjectReferenceIndex(state, canonical)

    session.dispatch(new DeleteWorldVariableCommand('unused', provider))
    expect(session.undo()).toBe(true)
    canonical.sharedScripts.live = {
      name: '当前正文',
      self: 'none',
      body: [{ kind: 'setVar', var: 'unused', value: 1 }],
    }

    expect(() => session.redo()).toThrow(WorldVariableInUseError)
    expect(session.getState().worldVariables).toHaveProperty('unused')
    expect(session.canRedo()).toBe(true)
  })
})
