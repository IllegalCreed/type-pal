import type { AuthorScriptFlow, ItemData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { type Command, UpdateItemCommand } from './commands.js'
import { type EditorState, EditSession } from './edit-session.js'
import { EditorHistoryCoordinator } from './editor-history-coordinator.js'
import {
  AddItemPrivateScriptCommand,
  DeleteItemPrivateScriptCommand,
  type ScriptEditorState,
  ScriptEditSession,
  UpdateSceneHookCommand,
} from './script-editor.js'
import { emptyScriptPreviewLibrary } from './script-preview-library.js'

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
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
    stamps: [],
    manifest: {
      id: 'test',
      contentVersion: 22,
      minimumSaveVersion: 12,
      defaultEntryId: 'main',
      content: {},
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
          script: { chunk: '__author-item-private-runtime', id: 'private' },
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
  test('deleting a bound step removes its preview binding atomically and undo restores both', () => {
    const flow: AuthorScriptFlow = {
      kind: 'stages',
      initial: 'stage-1',
      stages: [
        { id: 'stage-1', body: [] },
        { id: 'stage-2', body: [] },
      ],
    }
    const main = new EditSession({
      ...legacyState(),
      scriptPreview: {
        ...emptyScriptPreviewLibrary(),
        states: [{ id: 'door', sceneId: 's', name: '门口', entities: [] }],
        bindings: [
          {
            entry: { sceneId: 's', channel: 'onEnter', schemeId: 'main', stageId: 'stage-2' },
            stateId: 'door',
          },
        ],
      },
    })
    const script = new ScriptEditSession({
      ...scriptState(),
      scenes: [
        {
          id: 's',
          mapId: 'map',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [],
          hooks: {
            onEnter: { initial: 'main', variants: { main: { label: '入场', order: 0, flow } } },
          },
        },
      ],
    })
    const history = new EditorHistoryCoordinator(main, script)
    const observed: number[] = []
    script.subscribe(() => observed.push(main.getState().scriptPreview!.bindings.length))
    script.dispatch(
      new UpdateSceneHookCommand('s', 'onEnter', 'main', {
        flow: { ...flow, stages: [flow.stages[0]!] },
      }),
    )
    expect(main.getState().scriptPreview!.bindings).toEqual([])
    expect(observed).toEqual([0])
    expect(history.undo()).toBe(true)
    expect(main.getState().scriptPreview!.bindings[0]?.stateId).toBe('door')
    expect(script.getState().scenes[0]!.hooks!.onEnter!.variants.main!.flow).toEqual(flow)
    expect(history.redo()).toBe(true)
    // The real UI may reuse the deleted last step's ID; the new step must stay unbound.
    script.dispatch(new UpdateSceneHookCommand('s', 'onEnter', 'main', { flow }))
    expect(main.getState().scriptPreview!.bindings).toEqual([])
    expect(main.getState().scriptPreview!.states).toHaveLength(1)
  })

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

  test('删除私有正文与 shell ref 也是一次可撤销的成对动作', () => {
    const legacy = new EditSession(legacyState())
    const script = new ScriptEditSession(scriptState())
    const coordinator = new EditorHistoryCoordinator(legacy, script)
    coordinator.dispatch(new AddItemPrivateScriptCommand('private', '私有正文'), shellCommand())
    coordinator.dispatch(
      new DeleteItemPrivateScriptCommand('private', 'use', 'use'),
      new UpdateItemCommand('private', {
        use: { target: 'scene', consuming: true, effects: [] },
      }),
    )
    expect(legacy.getState().items[0]!.use!.effects).toHaveLength(0)
    expect(script.getState().items[0]!.use!.effects).toHaveLength(0)

    expect(coordinator.undo()).toBe(true)
    expect(legacy.getState().items[0]!.use!.effects).toHaveLength(1)
    expect(script.getState().items[0]!.use!.effects).toHaveLength(1)
    expect(coordinator.redo()).toBe(true)
    expect(legacy.getState().items[0]!.use!.effects).toHaveLength(0)
    expect(script.getState().items[0]!.use!.effects).toHaveLength(0)
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
