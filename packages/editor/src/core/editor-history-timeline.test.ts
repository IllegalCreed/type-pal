/** D-01：项目级顺序/原子性主线回归，GLM的真实配对工作流在独立文件补齐。 */
import type { AuthorItemData } from '@type-pal/content'
import {
  fsaSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  loadProjectMap,
} from '@type-pal/reforge'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { type Command, UpdateItemCommand } from './commands.js'
import { EditSession } from './edit-session.js'
import { EditorHistoryCoordinator } from './editor-history-coordinator.js'
import { toEditorState } from './project-io.js'
import {
  AddSharedScriptCommand,
  type ScriptEditorCommand,
  ScriptEditSession,
} from './script-editor.js'
import { buildBlankProject } from './seed.js'

afterEach(() => vi.restoreAllMocks())

async function fixture() {
  const files = await buildBlankProject('history-timeline')
  const item: AuthorItemData = {
    id: 'item',
    name: 'name.hero',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
  }
  files['content/items.json'] = [item]
  const project = await loadCurrentProjectFrom(fsaSource(memoryAuthorDirectory(files).dir))
  const scenes = await loadAllAuthorScenes(project)
  const main = new EditSession(toEditorState(project, scenes, {}, {}, []), {
    loadMap: (_id, path) => loadProjectMap(project.assetBase, path),
  })
  const script = new ScriptEditSession({
    scenes,
    items: project.authorContent.items,
    sharedScripts: {},
  })
  const history = new EditorHistoryCoordinator(main, script)
  const value = () => [
    main.getState().items[0]!.buyPrice,
    Object.keys(script.getState().sharedScripts),
  ]
  const versions = () => [
    main.getVersion(),
    script.getVersion(),
    main.getHistoryVersion(),
    script.getHistoryVersion(),
  ]
  return { main, script, history, value, versions }
}
const setPrice = (price: number) => new UpdateItemCommand('item', { buyPrice: price })
const addScript = (id: string) =>
  new AddSharedScriptCommand(id, { name: id, self: 'none', body: [] })

describe('D-01 project history', () => {
  test('M/S/M undo and redo use submission order, including direct session entry points', async () => {
    const { main, script, history, value } = await fixture()
    main.dispatch(setPrice(10))
    script.dispatch(addScript('one'))
    main.dispatch(setPrice(20))
    expect(history.undo()).toBe(true)
    expect(value()).toEqual([10, ['one']])
    expect(main.undo()).toBe(true)
    expect(value()).toEqual([10, []])
    expect(script.undo()).toBe(true)
    expect(value()).toEqual([0, []])
    expect(history.undo()).toBe(false)
    expect(history.redo()).toBe(true)
    expect(value()).toEqual([10, []])
    expect(script.redo()).toBe(true)
    expect(value()).toEqual([10, ['one']])
    expect(main.redo()).toBe(true)
    expect(value()).toEqual([20, ['one']])
    expect(history.redo()).toBe(false)
  })

  test('S/M/S has the same order and no domain preference', async () => {
    const { main, script, history, value } = await fixture()
    script.dispatch(addScript('one'))
    main.dispatch(setPrice(10))
    script.dispatch(addScript('two'))
    history.undo()
    expect(value()).toEqual([10, ['one']])
    history.undo()
    expect(value()).toEqual([0, ['one']])
    history.undo()
    expect(value()).toEqual([0, []])
    history.redo()
    history.redo()
    history.redo()
    expect(value()).toEqual([10, ['one', 'two']])
  })

  test('pair/main/script is three complete undo/redo units, never four halves', async () => {
    const { main, script, history, value } = await fixture()
    history.dispatch(addScript('pair'), setPrice(10))
    main.dispatch(setPrice(20))
    script.dispatch(addScript('solo'))
    history.undo()
    expect(value()).toEqual([20, ['pair']])
    history.undo()
    expect(value()).toEqual([10, ['pair']])
    history.undo()
    expect(value()).toEqual([0, []])
    expect(history.undo()).toBe(false)
    history.redo()
    expect(value()).toEqual([10, ['pair']])
    history.redo()
    history.redo()
    expect(value()).toEqual([20, ['pair', 'solo']])
  })

  test.each([
    'main',
    'script',
  ] as const)('%s new branch immediately discards both redo stacks', async (side) => {
    const { main, script, history, value } = await fixture()
    history.dispatch(addScript('pair'), setPrice(10))
    history.undo()
    const other = side === 'main' ? script : main
    const beforeOtherVersion = other.getHistoryVersion()
    if (side === 'main') main.dispatch(setPrice(30))
    else script.dispatch(addScript('branch'))
    expect(other.getHistoryVersion()).toBe(beforeOtherVersion + 1)
    expect(main.canRedo()).toBe(false)
    expect(script.canRedo()).toBe(false)
    expect(history.redo()).toBe(false)
    expect(main.redo()).toBe(false)
    expect(script.redo()).toBe(false)
    expect(value()).toEqual(side === 'main' ? [30, []] : [0, ['branch']])
  })

  test('failed second redo participant preserves the whole future and retries without compensation', async () => {
    const { main, script, history, value, versions } = await fixture()
    const command = setPrice(10)
    let fail = false
    history.dispatch(addScript('pair'), {
      label: command.label,
      apply: (state) => {
        if (fail) throw new Error('redo main failed')
        return command.apply(state)
      },
      invert: (state) => command.invert(state),
    })
    history.undo()
    main.markSaved()
    script.markSaved()
    const before = versions()
    const mainState = main.getState()
    const scriptState = script.getStateSnapshot()
    const notified = vi.fn()
    main.subscribe(notified)
    script.subscribe(notified)
    fail = true
    expect(() => history.redo()).toThrow('redo main failed')
    expect(versions()).toEqual(before)
    expect(main.getState()).toBe(mainState)
    expect(script.getStateSnapshot()).toBe(scriptState)
    expect([main.isDirty(), script.isDirty(), history.canUndo(), history.canRedo()]).toEqual([
      false,
      false,
      false,
      true,
    ])
    expect(notified).not.toHaveBeenCalled()
    fail = false
    expect(history.redo()).toBe(true)
    expect(value()).toEqual([10, ['pair']])
    expect(history.redo()).toBe(false)
  })

  test('asymmetric mixed futures are discarded in full before a new branch', async () => {
    const { main, script, history, value } = await fixture()
    main.dispatch(setPrice(1))
    main.dispatch(setPrice(2))
    history.dispatch(addScript('pair'), setPrice(3))
    script.dispatch(addScript('solo'))
    for (let i = 0; i < 4; i++) expect(history.undo()).toBe(true)
    main.dispatch(setPrice(9))
    for (let i = 0; i < 4; i++) {
      expect(main.redo()).toBe(false)
      expect(script.redo()).toBe(false)
    }
    expect(value()).toEqual([9, []])
    expect(history.undo()).toBe(true)
    expect(history.undo()).toBe(false)
    expect(history.redo()).toBe(true)
    expect(value()).toEqual([9, []])
  })

  test('map-reference observers see both committed domains, versions and global history', async () => {
    const { main, script, history, versions } = await fixture()
    await main.ensureMapLoaded('start')
    await main.ensureMapReferencesIndexed()
    const initial = main.getState().maps.start!
    const edited = {
      ...initial,
      layers: initial.layers.map((layer, i) =>
        i === 0 ? { ...layer, name: 'atomic observer' } : layer,
      ),
    }
    const before = versions()
    const seen: unknown[] = []
    main.subscribeMapReferences(() =>
      seen.push({
        map: main.getState().maps.start,
        body: script.getState().sharedScripts.pair,
        versions: versions(),
        undo: history.canUndo(),
      }),
    )
    history.dispatch(addScript('pair'), {
      label: 'map observer',
      apply: (state) => ({ ...state, maps: { ...state.maps, start: edited } }),
      invert: (state) => ({ ...state, maps: { ...state.maps, start: initial } }),
    })
    expect(seen.length).toBeGreaterThan(0)
    for (const entry of seen)
      expect(entry).toEqual({
        map: edited,
        body: { name: 'pair', self: 'none', body: [] },
        versions: before.map((v) => v + 1),
        undo: true,
      })
  })

  test('pair success notifies both domains only after both states and history are committed', async () => {
    const { main, script, history, value } = await fixture()
    const seen: unknown[] = []
    main.subscribe(() => seen.push(value()))
    script.subscribe(() => seen.push(value()))
    history.dispatch(addScript('pair'), setPrice(10))
    expect(seen.length).toBeGreaterThan(0)
    expect(seen.every((v) => JSON.stringify(v) === JSON.stringify([10, ['pair']]))).toBe(true)
    seen.length = 0
    history.undo()
    expect(seen.length).toBeGreaterThan(0)
    expect(seen.every((v) => JSON.stringify(v) === JSON.stringify([0, []]))).toBe(true)
  })

  test('second apply failure publishes nothing and preserves both domains exactly', async () => {
    const { main, script, history, value, versions } = await fixture()
    const before = { value: value(), versions: versions() }
    const listener = vi.fn()
    main.subscribe(listener)
    script.subscribe(listener)
    const failed: Command = {
      label: 'failed main',
      apply: () => {
        throw new Error('main prepare failed')
      },
      invert: (s) => s,
    }
    expect(() => history.dispatch(addScript('pair'), failed)).toThrow('main prepare failed')
    expect({ value: value(), versions: versions() }).toEqual(before)
    expect(listener).not.toHaveBeenCalled()
    expect(main.isDirty()).toBe(false)
    expect(script.isDirty()).toBe(false)
  })

  test('second inverse failure does not compensate by visible redo; retry remains possible', async () => {
    const { main, script, history, value, versions } = await fixture()
    const actual = addScript('pair')
    let fail = true
    const command: ScriptEditorCommand = {
      label: actual.label,
      affectedRecords: actual.affectedRecords,
      apply: (s) => actual.apply(s),
      invert: (s) => {
        if (fail) throw new Error('inverse failed')
        return actual.invert(s)
      },
    }
    history.dispatch(command, setPrice(10))
    main.markSaved()
    script.markSaved()
    const before = { value: value(), versions: versions() }
    const listener = vi.fn()
    main.subscribe(listener)
    script.subscribe(listener)
    expect(() => history.undo()).toThrow('inverse failed')
    expect({ value: value(), versions: versions() }).toEqual(before)
    expect(main.isDirty()).toBe(false)
    expect(script.isDirty()).toBe(false)
    expect(listener).not.toHaveBeenCalled()
    fail = false
    expect(history.undo()).toBe(true)
    expect(value()).toEqual([0, []])
  })

  test('transaction identity is not command object identity for reissued stateless commands', async () => {
    const { main, history, value } = await fixture()
    const step: Command = {
      label: 'step',
      apply: (s) => ({ ...s, items: s.items.map((i) => ({ ...i, buyPrice: i.buyPrice + 1 })) }),
      invert: (s) => ({ ...s, items: s.items.map((i) => ({ ...i, buyPrice: i.buyPrice - 1 })) }),
    }
    history.dispatch(addScript('pair'), step)
    main.dispatch(step)
    history.undo()
    expect(value()).toEqual([1, ['pair']])
    history.undo()
    expect(value()).toEqual([0, []])
    history.redo()
    history.redo()
    expect(value()).toEqual([2, ['pair']])
  })

  test('observer failure cannot roll back a committed pair or hide it from other observers', async () => {
    const { main, script, history, value } = await fixture()
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    script.subscribe(() => {
      throw new Error('observer failure')
    })
    const seen = vi.fn()
    main.subscribe(seen)
    script.subscribe(seen)
    expect(() => history.dispatch(addScript('pair'), setPrice(10))).not.toThrow()
    expect(value()).toEqual([10, ['pair']])
    expect(seen).toHaveBeenCalled()
    expect(errors).toHaveBeenCalled()
    expect(history.undo()).toBe(true)
    expect(value()).toEqual([0, []])
  })

  test('dispose/connect is idempotent, preserves history and rejects unrecorded detached edits', async () => {
    const { main, script, history, value, versions } = await fixture()
    history.dispatch(addScript('pair'), setPrice(10))
    const before = { value: value(), versions: versions(), toolbar: history.getToolbarSnapshot() }
    history.dispose()
    history.dispose()
    expect(() => main.dispatch(setPrice(30))).toThrow('断开')
    expect(() => script.dispatch(addScript('lost'))).toThrow('断开')
    expect(() => history.undo()).toThrow('断开')
    expect(() => history.redo()).toThrow('断开')
    history.connect()
    history.connect()
    expect({ value: value(), versions: versions(), toolbar: history.getToolbarSnapshot() }).toEqual(
      before,
    )
    expect(history.undo()).toBe(true)
    expect(value()).toEqual([0, []])
    expect(history.redo()).toBe(true)
    expect(value()).toEqual([10, ['pair']])
  })

  test('duplicate/foreign owner binding fails before attaching either fresh participant', async () => {
    const { main, script, history } = await fixture()
    const otherMain = new EditSession(main.getState())
    const otherScript = new ScriptEditSession(script.getState())
    expect(() => new EditorHistoryCoordinator(main, otherScript)).toThrow('其他项目历史')
    expect(() => new EditorHistoryCoordinator(otherMain, script)).toThrow('其他项目历史')
    expect(otherMain.dispatch(setPrice(1))).toBe(true)
    expect(otherScript.dispatch(addScript('independent'))).toBe(true)
    expect(history.canUndo()).toBe(false)
    expect(() => main.prepareHistoryChange('dispatch', setPrice(2), Symbol(), {})).toThrow('Owner')
    expect(() =>
      script.prepareHistoryChange('dispatch', addScript('foreign'), Symbol(), {}),
    ).toThrow('Owner')
    expect(() => main.prepareHistoryChange('undo', setPrice(1), Symbol(), history)).toThrow(
      '执行索引',
    )
    expect(() =>
      script.prepareHistoryChange('redo', addScript('foreign'), Symbol(), history),
    ).toThrow('执行索引')
  })

  test.each([
    'main-past',
    'main-future',
    'script-past',
    'script-future',
  ])('cannot infer a global order from existing %s', async (mode) => {
    const { main: originalMain, script: originalScript } = await fixture()
    const main = new EditSession(originalMain.getState())
    const script = new ScriptEditSession(originalScript.getState())
    if (mode.startsWith('main')) {
      main.dispatch(setPrice(1))
      if (mode.endsWith('future')) main.undo()
    } else {
      script.dispatch(addScript('existing'))
      if (mode.endsWith('future')) script.undo()
    }
    const before = [
      main.getState(),
      script.getState(),
      main.getHistoryVersion(),
      script.getHistoryVersion(),
    ]
    expect(() => new EditorHistoryCoordinator(main, script)).toThrow('已有独立')
    expect([
      main.getState(),
      script.getState(),
      main.getHistoryVersion(),
      script.getHistoryVersion(),
    ]).toEqual(before)
  })

  test.each([
    'main',
    'script',
  ] as const)('%s explicit discard clears the entire future, not half a pair', async (side) => {
    const { main, script, history, value } = await fixture()
    const m = setPrice(10),
      s = addScript('pair')
    history.dispatch(s, m)
    history.undo()
    expect(main.discardRedo(setPrice(30))).toBe(false)
    expect(script.discardRedo(addScript('wrong'))).toBe(false)
    const versions = [main.getHistoryVersion(), script.getHistoryVersion()]
    expect(side === 'main' ? main.discardRedo(m) : script.discardRedo(s)).toBe(true)
    expect([main.getHistoryVersion(), script.getHistoryVersion()]).toEqual(
      versions.map((v) => v + 1),
    )
    expect(main.canRedo()).toBe(false)
    expect(script.canRedo()).toBe(false)
    expect(history.redo()).toBe(false)
    expect(value()).toEqual([0, []])
  })

  test('prepare cannot reenter and notification cannot disconnect an active transaction', async () => {
    const { main, script, history, value } = await fixture()
    expect(() =>
      main.dispatch({
        label: 'reenter',
        apply: (state) => {
          script.dispatch(addScript('nested'))
          return state
        },
        invert: (state) => state,
      }),
    ).toThrow('不能重入')
    expect(value()).toEqual([0, []])
    expect(history.canUndo()).toBe(false)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const off = main.subscribe(() => history.dispose())
    history.dispatch(addScript('pair'), setPrice(10))
    expect(value()).toEqual([10, ['pair']])
    expect(errors).toHaveBeenCalled()
    off()
    history.undo()
    expect(value()).toEqual([0, []])
  })

  test('markSaved/hydrate are not author transactions and same labels keep chrome snapshot stable', async () => {
    const { main, script, history, value } = await fixture()
    main.dispatch(setPrice(10))
    const snapshot = history.getToolbarSnapshot()
    const version = history.getVersion()
    main.markSaved()
    script.markSaved()
    await main.ensureMapLoaded('start')
    expect(history.getVersion()).toBe(version)
    expect(history.getToolbarSnapshot()).toBe(snapshot)
    main.dispatch(setPrice(20))
    expect(history.getToolbarSnapshot()).toBe(snapshot)
    history.undo()
    expect(value()).toEqual([10, []])
    history.undo()
    expect(value()).toEqual([0, []])
    expect(main.getState().maps.start).toBeDefined()
  })

  test('failed paired map undo leaves revision, dirty, loaded map and reference cache untouched', async () => {
    const { main, script, history, versions } = await fixture()
    const initial = await main.ensureMapLoaded('start')
    const edited = {
      ...initial,
      layers: initial.layers.map((layer, index) =>
        index === 0 ? { ...layer, name: 'changed' } : layer,
      ),
    }
    const mapCommand: Command = {
      label: 'rename map layer',
      apply: (state) => ({ ...state, maps: { ...state.maps, start: edited } }),
      invert: (state) => ({ ...state, maps: { ...state.maps, start: initial } }),
    }
    const actual = addScript('pair')
    let fail = true
    history.dispatch(
      {
        label: actual.label,
        affectedRecords: actual.affectedRecords,
        apply: (state) => actual.apply(state),
        invert: (state) => {
          if (fail) throw new Error('map undo companion failed')
          return actual.invert(state)
        },
      },
      mapCommand,
    )
    main.markSaved()
    script.markSaved()
    await main.ensureMapReferencesIndexed()
    const before = {
      versions: versions(),
      revision: main.getMapRevision('start'),
      status: main.getMapDocumentStatus('start'),
      refVersion: main.getMapReferenceVersion(),
    }
    const batch = main.getMapReferenceBatch()
    const notified = vi.fn()
    main.subscribeMapReferences(notified)
    script.subscribe(notified)
    expect(() => history.undo()).toThrow('map undo companion failed')
    expect({
      versions: versions(),
      revision: main.getMapRevision('start'),
      status: main.getMapDocumentStatus('start'),
      refVersion: main.getMapReferenceVersion(),
    }).toEqual(before)
    expect(main.getMapReferenceBatch()).toBe(batch)
    expect(main.getState().maps.start).toBe(edited)
    expect(notified).not.toHaveBeenCalled()
    fail = false
    history.undo()
    expect(main.getState().maps.start).toBe(initial)
    expect(main.getMapRevision('start')).toBe(before.revision + 1)
    expect(main.getMapDocumentStatus('start')).toEqual({ state: 'ready', dirty: true })
    history.redo()
    expect(main.getState().maps.start).toBe(edited)
    expect(main.getMapRevision('start')).toBe(before.revision + 2)
  })
})
