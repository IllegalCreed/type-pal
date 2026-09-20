/** D-01：由 GLM G-H08/12/15 取证转正；断言和生产链复核由 Codex 编写。 */
import type { AuthorItemData } from '@type-pal/content'
import { fsaSource, loadAllAuthorScenes, loadCurrentProjectFrom } from '@type-pal/reforge'
import { describe, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { UpdateItemCommand } from './commands.js'
import { EditSession } from './edit-session.js'
import { EditorHistoryCoordinator } from './editor-history-coordinator.js'
import { serializeProjectWithMapCopies, toEditorState } from './project-io.js'
import {
  AddSharedScriptCommand,
  type ScriptEditorCommand,
  type ScriptEditorState,
  ScriptEditSession,
} from './script-editor.js'
import {
  mergeEditorProjectionWithCurrentAuthorState,
  projectActiveScriptEditorState,
  projectCurrentAuthorReferenceSlices,
} from './script-editor-projection.js'
import { buildBlankProject } from './seed.js'

const emptyState = (): ScriptEditorState => ({ scenes: [], items: [], sharedScripts: {} })
const definition = { name: 'history.script', self: 'none' as const, body: [] }
const addScript = () => new AddSharedScriptCommand('history-script', definition)

function snapshot(session: ScriptEditSession) {
  return {
    state: session.getState(),
    dirty: session.isDirty(),
    undo: session.canUndo(),
    redo: session.canRedo(),
    version: session.getVersion(),
    historyVersion: session.getHistoryVersion(),
  }
}

describe('D-01 script history failure boundaries', () => {
  test('failed invert preserves the pending undo, state, versions and affected records; retry succeeds', () => {
    const session = new ScriptEditSession(emptyState())
    const actual = addScript()
    let reject = true
    const command: ScriptEditorCommand = {
      label: actual.label,
      affectedRecords: actual.affectedRecords,
      apply: (state) => actual.apply(state),
      invert: (state) => {
        if (reject) throw new Error('injected invert failure')
        return actual.invert(state)
      },
    }
    session.dispatch(command)
    session.markSaved()
    const before = snapshot(session)
    const affected = session.getAffectedRecordsSince(0)
    const listener = vi.fn()
    session.subscribe(listener)
    expect(() => session.undo()).toThrow('injected invert failure')
    expect(snapshot(session)).toEqual(before)
    expect(session.getAffectedRecordsSince(0)).toEqual(affected)
    expect(listener).not.toHaveBeenCalled()
    reject = false
    expect(session.undo()).toBe(true)
    expect(session.getState().sharedScripts).toEqual({})
    expect(session.redo()).toBe(true)
    expect(session.getState().sharedScripts['history-script']).toEqual(definition)
  })

  test('failed redo preserves its future entry and can retry without new dispatch', () => {
    const session = new ScriptEditSession(emptyState())
    const actual = addScript()
    let reject = false
    session.dispatch({
      label: actual.label,
      affectedRecords: actual.affectedRecords,
      apply: (state) => {
        if (reject) throw new Error('injected redo failure')
        return actual.apply(state)
      },
      invert: (state) => actual.invert(state),
    })
    session.undo()
    const before = snapshot(session)
    reject = true
    expect(() => session.redo()).toThrow('injected redo failure')
    expect(snapshot(session)).toEqual(before)
    reject = false
    expect(session.redo()).toBe(true)
    expect(session.getState().sharedScripts['history-script']).toEqual(definition)
  })

  test.each([
    'empty',
    'undo',
    'redo',
  ] as const)('same-reference no-op preserves %s history and notifications', (position) => {
    const session = new ScriptEditSession(emptyState())
    if (position !== 'empty') session.dispatch(addScript())
    if (position === 'redo') session.undo()
    session.markSaved()
    const before = snapshot(session)
    const affected = session.getAffectedRecordsSince(0)
    const listener = vi.fn()
    session.subscribe(listener)
    expect(
      session.dispatch({
        label: 'explicit no-op',
        affectedRecords: { all: true },
        apply: (state) => state,
        invert: (state) => state,
      }),
    ).toBe(false)
    expect(snapshot(session)).toEqual(before)
    expect(session.getAffectedRecordsSince(0)).toEqual(affected)
    expect(listener).not.toHaveBeenCalled()
    if (position === 'redo') {
      expect(session.redo()).toBe(true)
      expect(session.getState().sharedScripts['history-script']).toEqual(definition)
    }
  })
})

async function projectFixture(surface: 'lowered' | 'canonical') {
  const files = await buildBlankProject('history-save-guard')
  const item: AuthorItemData = {
    id: 'history-item',
    name: 'history.item',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    use: {
      target: 'scene',
      consuming: true,
      effects: [{ kind: 'itemPrivateScript', script: { id: 'use', label: '使用', body: [] } }],
    },
  }
  files['content/items.json'] = [item]
  files['content/locale.json'] = {
    ...(files['content/locale.json'] as object),
    'history.item': '测试物品',
  }
  const disk = memoryAuthorDirectory(files)
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  let shell = toEditorState(project, scenes, {}, {}, [])
  const canonical: ScriptEditorState = {
    scenes,
    items: project.authorContent.items,
    sharedScripts: project.authorContent.sharedScripts,
  }
  expect(shell.items[0]!.use!.effects[0]).toMatchObject({ kind: 'itemPrivateScript' })
  if (surface === 'lowered') {
    // ItemTab 当前配对命令仍可生成这个内部引用；不是 loader 输出形态。
    shell = new UpdateItemCommand('history-item', {
      use: {
        target: 'scene',
        consuming: true,
        effects: [
          {
            kind: 'runScript',
            script: { chunk: '__author-item-private-runtime', id: 'history-item' },
          },
        ],
      },
    }).apply(shell)
  }
  return { shell, canonical, source, disk }
}

describe.each([
  'lowered',
  'canonical',
] as const)('D-01 save completeness: %s reference', (surface) => {
  test.each([
    'item absent',
    'script absent',
    'body absent',
  ] as const)('rejects %s before serialization reads, without breaking UI projection', async (missing) => {
    const { shell, canonical, source, disk } = await projectFixture(surface)
    const broken = structuredClone(canonical)
    if (missing === 'item absent') broken.items = []
    else if (missing === 'script absent') broken.items[0]!.use!.effects = []
    else {
      const effect = broken.items[0]!.use!.effects[0]!
      if (effect.kind !== 'itemPrivateScript') throw new Error('fixture has no private script')
      Reflect.deleteProperty(effect.script, 'body')
    }
    const before = structuredClone({ shell, broken })
    const read = vi.spyOn(source, 'readText')
    await expect(
      (async () =>
        serializeProjectWithMapCopies(
          mergeEditorProjectionWithCurrentAuthorState(broken, shell),
          source,
        ))(),
    ).rejects.toThrow(/history-item.*use.*正文缺失/)
    expect(read).not.toHaveBeenCalled()
    expect({ shell, broken }).toEqual(before)
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
    expect(() => projectActiveScriptEditorState(broken, shell.items)).not.toThrow()
    expect(() => projectCurrentAuthorReferenceSlices(broken, shell)).not.toThrow()
    // 同一输入恢复合法正文后必须可保存/正式重开，空正文不是缺席。
    const output = await serializeProjectWithMapCopies(
      mergeEditorProjectionWithCurrentAuthorState(canonical, shell),
      source,
    )
    const reopened = await loadCurrentProjectFrom(fsaSource(memoryAuthorDirectory(output).dir))
    expect(reopened.authorContent.items[0]!.use!.effects).toEqual(canonical.items[0]!.use!.effects)
  })

  test('unreferenced canonical record is not resurrected or rejected at save', async () => {
    const { shell, canonical, source } = await projectFixture(surface)
    shell.items[0]!.use!.effects = []
    const output = await serializeProjectWithMapCopies(
      mergeEditorProjectionWithCurrentAuthorState(canonical, shell),
      source,
    )
    const reopened = await loadCurrentProjectFrom(fsaSource(memoryAuthorDirectory(output).dir))
    expect(reopened.authorContent.items[0]!.use!.effects).toEqual([])
  })
})

test('paired dispatch rejects a script no-op before applying the main command', async () => {
  const { shell, canonical } = await projectFixture('canonical')
  const main = new EditSession(shell)
  const script = new ScriptEditSession(canonical)
  const coordinator = new EditorHistoryCoordinator(main, script)
  const beforeScript = snapshot(script)
  const apply = vi.fn((state) => ({ ...state, items: [] }))
  expect(() =>
    coordinator.dispatch(
      {
        label: 'no-op script',
        affectedRecords: {},
        apply: (state) => state,
        invert: (state) => state,
      },
      { label: 'main must not run', apply, invert: (state) => state },
    ),
  ).toThrow('未修改脚本')
  expect(apply).not.toHaveBeenCalled()
  expect(main.getState()).toBe(shell)
  expect(main.isDirty()).toBe(false)
  expect(main.canUndo()).toBe(false)
  expect(snapshot(script)).toEqual(beforeScript)
})
