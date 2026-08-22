import type { ItemData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { type Command, UpdateItemCommand } from './commands.js'
import { type EditorState, EditSession } from './edit-session.js'
import { EditorHistoryCoordinator } from './editor-history-coordinator.js'
import {
  AddItemPrivateScriptCommand,
  type ScriptEditorState,
  ScriptEditSession,
} from './script-editor.js'

const legacyItem = (): ItemData => ({
  id: 'private',
  name: '私有脚本物品',
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: false,
  use: { target: 'scene', consuming: true, effects: [] },
})

const legacyState = (): EditorState =>
  ({
    items: [legacyItem()],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
    stamps: [],
    manifest: {
      id: 'test',
      contentVersion: 17,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's',
          startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
        },
      ],
    },
  }) as unknown as EditorState

const scriptState = (): ScriptEditorState => ({
  scenes: [],
  items: [legacyItem() as never],
  sharedScripts: {},
})

const shellCommand = (): UpdateItemCommand =>
  new UpdateItemCommand('private', {
    use: {
      target: 'scene',
      consuming: true,
      effects: [
        {
          kind: 'runScript',
          script: { chunk: '__author-script-runtime', id: 'item:private:use' },
        },
      ],
    },
  })

class FailingLegacyCommand implements Command {
  readonly label = '注入第二笔失败'
  apply(): EditorState {
    throw new Error('legacy second dispatch failed')
  }
  invert(state: EditorState): EditorState {
    return state
  }
}

describe('EditorHistoryCoordinator', () => {
  test('私有正文与 shell ref 一次撤销/重做，顺序保持成对', () => {
    const legacy = new EditSession(legacyState())
    const script = new ScriptEditSession(scriptState())
    const coordinator = new EditorHistoryCoordinator(legacy, script)
    coordinator.dispatch(new AddItemPrivateScriptCommand('private', '私有正文'), shellCommand())
    expect(legacy.getState().items[0]!.use!.effects).toHaveLength(1)
    expect(script.getState().items[0]!.use!.effects).toHaveLength(1)

    expect(coordinator.undo()).toBe(true)
    expect(legacy.getState().items[0]!.use!.effects).toEqual([])
    expect(script.getState().items[0]!.use!.effects).toEqual([])
    expect(coordinator.redo()).toBe(true)
    expect(legacy.getState().items[0]!.use!.effects).toHaveLength(1)
    expect(script.getState().items[0]!.use!.effects).toHaveLength(1)
  })

  test('第二笔 dispatch 抛错时沉默恢复第一笔，不能 redo 复活半状态', () => {
    const legacy = new EditSession(legacyState())
    const script = new ScriptEditSession(scriptState())
    const coordinator = new EditorHistoryCoordinator(legacy, script)
    expect(() =>
      coordinator.dispatch(
        new AddItemPrivateScriptCommand('private', '私有正文'),
        new FailingLegacyCommand(),
      ),
    ).toThrow('legacy second dispatch failed')
    expect(legacy.getState().items[0]!.use!.effects).toEqual([])
    expect(script.getState().items[0]!.use!.effects).toEqual([])
    expect(legacy.canUndo()).toBe(false)
    expect(script.canUndo()).toBe(false)
    expect(legacy.redo()).toBe(false)
    expect(script.redo()).toBe(false)
    expect(legacy.isDirty()).toBe(false)
    expect(script.isDirty()).toBe(false)
  })

  test('配对撤销后任一侧新分支会清除另一侧孤儿 redo，不能重生半状态', () => {
    const legacy = new EditSession(legacyState())
    const script = new ScriptEditSession(scriptState())
    const coordinator = new EditorHistoryCoordinator(legacy, script)
    coordinator.dispatch(new AddItemPrivateScriptCommand('private', '私有正文'), shellCommand())
    expect(coordinator.undo()).toBe(true)
    legacy.dispatch(new UpdateItemCommand('private', { name: '新历史分支' }))

    expect(coordinator.redo()).toBe(false)
    expect(script.redo()).toBe(false)
    expect(script.getState().items[0]!.use!.effects).toEqual([])
    expect(legacy.getState().items[0]!.name).toBe('新历史分支')
  })
})
