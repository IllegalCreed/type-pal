import * as content from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { catalogControlsEditorState } from '../ui/catalog-controls-test-utils.js'
import { RenameProjectCommand } from './commands.js'
import { type Command, EditSession } from './edit-session.js'
import * as assetReferences from './editor-asset-references.js'
import type {
  EditorDerivedData,
  EditorDerivedInput,
  EditorDerivedReply,
  EditorDerivedRequest,
} from './editor-derived-contract.js'
import { createEditorDerivedWorkerRuntime } from './editor-derived-core.js'
import {
  createEditorDerivedStore,
  type EditorDerivedWorkerPort,
  editorDiagnosticState,
  effectiveEditorDerivedStatus,
} from './editor-derived-store.js'
import * as entityReferences from './entity-address-references.js'
import * as diagnostics from './project-diagnostics.js'
import { assertProjectSaveValid, collectEditorDiagnosticsSnapshot } from './project-diagnostics.js'
import {
  AddSharedScriptCommand,
  type ScriptEditorState,
  ScriptEditSession,
  UpdateSharedScriptMetadataCommand,
} from './script-editor.js'
import * as projection from './script-editor-projection.js'

class ManualWorker implements EditorDerivedWorkerPort {
  onmessage: ((event: { data: EditorDerivedReply }) => void) | null = null
  onerror: ((event: { message?: string }) => void) | null = null
  onmessageerror: ((event: { data?: unknown }) => void) | null = null
  readonly requests: EditorDerivedRequest[] = []
  terminated = false

  postMessage(message: EditorDerivedRequest): void {
    this.requests.push(structuredClone(message))
  }

  terminate(): void {
    this.terminated = true
  }

  reply(reply: EditorDerivedReply): void {
    this.onmessage?.({ data: structuredClone(reply) })
  }
}

function canonical(): ScriptEditorState {
  return { scenes: [], items: [], sharedScripts: {} }
}

function fixture(): {
  state: ReturnType<typeof catalogControlsEditorState>
  canonical: ScriptEditorState
} {
  const state = catalogControlsEditorState()
  state.scenes = [
    {
      id: 's001',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [
        {
          id: 'entity-ok',
          sprite: 'sprite-ok',
          pos: { col: 0, row: 0, height: 0 },
          facing: 'down',
        },
      ],
    },
  ] as never
  state.mapIndex = {
    version: 1,
    maps: [{ id: 'map-001', name: '测试地图', path: 'content/maps/map-001.json' }],
  }
  state.sprites = [
    {
      id: 'sprite-ok',
      asset: 'sprite.ok',
      label: '测试精灵',
      layout: { kind: 'directional', framesPerDir: 3 },
    },
  ]
  state.assetCatalog = {
    version: 1,
    assets: {
      'video.ok': {
        kind: 'video',
        path: 'assets/authored/video/ok.mp4',
        mediaType: 'video/mp4',
        bytes: 1,
        sha256: 'a'.repeat(64),
        origin: { kind: 'authored' },
      },
      'sprite.ok': {
        kind: 'sprite',
        path: 'assets/generated/sprites/ok.rle',
        mediaType: 'application/vnd.type-pal.rle',
        bytes: 1,
        sha256: 'b'.repeat(64),
        origin: { kind: 'generated' },
      },
    },
  }
  state.worldVariables = {}
  return {
    state,
    canonical: {
      scenes: structuredClone(state.scenes) as ScriptEditorState['scenes'],
      items: [],
      sharedScripts: {},
    },
  }
}

const DIAGNOSTIC_DIFFERENTIAL_FIXTURES = [
  {
    name: 'invalid asset reference',
    invalid: (state: ReturnType<typeof catalogControlsEditorState>) => {
      state.manifest.entryPoints[0]!.introVideo = 'video.missing'
    },
    valid: (state: ReturnType<typeof catalogControlsEditorState>) => {
      state.manifest.entryPoints[0]!.introVideo = 'video.ok'
    },
    matches: (issue: { path: string }) => issue.path === 'entryPoint:main:introVideo',
    saveError: /保存前资源引用校验失败/,
  },
  {
    name: 'invalid startWorld seed',
    invalid: (state: ReturnType<typeof catalogControlsEditorState>) => {
      state.manifest.entryPoints[0]!.startWorld.seedStats = { hero: { hp: -1 } }
    },
    valid: (state: ReturnType<typeof catalogControlsEditorState>) => {
      state.manifest.entryPoints[0]!.startWorld.seedStats = { hero: { hp: 1 } }
    },
    matches: (issue: { path: string }) => issue.path.includes('seedStats.hero.hp'),
    saveError: /保存前开局数据校验失败/,
  },
  {
    name: 'dangling entity address',
    invalid: (_state: ReturnType<typeof catalogControlsEditorState>, script: ScriptEditorState) => {
      script.sharedScripts.bad = {
        name: 'bad',
        self: 'none',
        body: [
          {
            kind: 'setEntityState',
            target: { scene: 's001', entity: 'entity-missing' },
            state: 1,
          },
        ],
      }
    },
    valid: (_state: ReturnType<typeof catalogControlsEditorState>, script: ScriptEditorState) => {
      script.sharedScripts.good = {
        name: 'good',
        self: 'none',
        body: [
          {
            kind: 'setEntityState',
            target: { scene: 's001', entity: 'entity-ok' },
            state: 1,
          },
        ],
      }
    },
    matches: (issue: { message: string }) => issue.message.includes('entity-missing'),
    saveError: /保存前实体引用校验失败/,
  },
  {
    name: 'missing canonical shared script',
    invalid: (_state: ReturnType<typeof catalogControlsEditorState>, script: ScriptEditorState) => {
      script.sharedScripts.bad = {
        name: 'bad',
        self: 'none',
        body: [{ kind: 'callScript', script: 'shared/missing' }],
      }
    },
    valid: (_state: ReturnType<typeof catalogControlsEditorState>, script: ScriptEditorState) => {
      script.sharedScripts.target = { name: 'target', self: 'none', body: [] }
      script.sharedScripts.good = {
        name: 'good',
        self: 'none',
        body: [{ kind: 'callScript', script: 'target' }],
      }
    },
    matches: (issue: { message: string }) => issue.message.includes('shared/missing'),
    saveError: /保存前脚本引用校验失败.*shared\/missing/,
  },
  {
    name: 'undeclared world variable',
    invalid: (_state: ReturnType<typeof catalogControlsEditorState>, script: ScriptEditorState) => {
      script.sharedScripts.bad = {
        name: 'bad',
        self: 'none',
        body: [{ kind: 'setFlag', flag: 'quest.open', value: true }],
      }
    },
    valid: (state: ReturnType<typeof catalogControlsEditorState>, script: ScriptEditorState) => {
      state.worldVariables = {
        'quest.open': { kind: 'flag', name: '任务开启', description: '', initial: false },
      }
      script.sharedScripts.good = {
        name: 'good',
        self: 'none',
        body: [{ kind: 'setFlag', flag: 'quest.open', value: true }],
      }
    },
    matches: (issue: { message: string }) => issue.message.includes('quest.open'),
    saveError: /保存前世界变量校验失败/,
  },
] as const

function inputOf(
  state: ReturnType<typeof catalogControlsEditorState>,
  script: ScriptEditorState,
): EditorDerivedInput {
  return { state: editorDiagnosticState(state), canonical: script }
}

function fullWorkerData(
  state: ReturnType<typeof catalogControlsEditorState>,
  script: ScriptEditorState,
): EditorDerivedData {
  const reply = createEditorDerivedWorkerRuntime().handle({
    kind: 'init',
    epoch: 1,
    jobId: 1,
    revision: { mainHistoryVersion: 0, scriptHistoryVersion: 0 },
    input: inputOf(state, script),
  })
  if (reply.kind !== 'ready') throw new Error(reply.message)
  return reply.data
}

function synchronousData(
  state: ReturnType<typeof catalogControlsEditorState>,
  script: ScriptEditorState,
): EditorDerivedData {
  const shell = {
    ...editorDiagnosticState(state),
    maps: {},
    assetBlobs: {},
    tilesetBlobs: {},
  }
  const snapshot = collectEditorDiagnosticsSnapshot(shell, script)
  return {
    statusIssues: snapshot.statusIssues,
    projectIssues: snapshot.projectIssues,
    projectReferences: snapshot.projectReferences,
    assetReferences: snapshot.assetSnapshot.references,
    worldVariableReferences: snapshot.worldVariableReferences,
    canonicalBehaviorReferences: [...snapshot.canonicalSchemeReferenceIndexes.behavior],
    canonicalSceneHookReferences: [...snapshot.canonicalSchemeReferenceIndexes.sceneHook],
    assetDiagnostics: snapshot.assetDiagnostics,
    itemReferenceIndex: [...snapshot.itemReferenceIndex],
  }
}

async function flushRefresh(): Promise<void> {
  await Promise.resolve()
}

describe('editor derived worker store', () => {
  test('initializes without maps or blobs and incrementally patches metadata', async () => {
    const main = new EditSession(catalogControlsEditorState())
    const script = new ScriptEditSession(canonical())
    const worker = new ManualWorker()
    const runtime = createEditorDerivedWorkerRuntime()
    const store = createEditorDerivedStore({
      mainSession: main,
      scriptSession: script,
      workerFactory: () => worker,
    })
    const stop = store.start()

    const init = worker.requests[0]!
    expect(init.kind).toBe('init')
    if (init.kind !== 'init') throw new Error('expected init')
    expect(init.input.state).not.toHaveProperty('maps')
    expect(init.input.state).not.toHaveProperty('assetBlobs')
    expect(init.input.state).not.toHaveProperty('tilesetBlobs')
    worker.reply(runtime.handle(init))
    expect(store.getSnapshot().status).toBe('current')

    main.dispatch(new RenameProjectCommand('新的项目名'))
    await flushRefresh()
    expect(store.getSnapshot().status).toBe('stale')
    const patch = worker.requests[1]!
    expect(patch.kind).toBe('patch')
    if (patch.kind !== 'patch') throw new Error('expected patch')
    expect(Object.keys(patch.main.replace)).toEqual(['manifest'])
    expect(patch.main.scenes).toBeUndefined()
    expect(patch.main.items).toBeUndefined()
    expect(patch.script).toEqual({})
    worker.reply(runtime.handle(patch))
    expect(store.getSnapshot()).toMatchObject({
      status: 'current',
      revision: { mainHistoryVersion: 1, scriptHistoryVersion: 0 },
    })
    stop()
  })

  test('runs no global scanner synchronously for a metadata commit', async () => {
    const scanners = {
      validateReferences: vi.spyOn(content, 'validateReferences'),
      projectCurrentAuthorReferenceSlices: vi.spyOn(
        projection,
        'projectCurrentAuthorReferenceSlices',
      ),
      mergeEditorProjectionWithCurrentAuthorState: vi.spyOn(
        projection,
        'mergeEditorProjectionWithCurrentAuthorState',
      ),
      collectEntityAddressReferences: vi.spyOn(entityReferences, 'collectEntityAddressReferences'),
      collectProjectIssues: vi.spyOn(diagnostics, 'collectProjectIssues'),
      collectEditorAssetReferences: vi.spyOn(assetReferences, 'collectEditorAssetReferences'),
    }
    const main = new EditSession(catalogControlsEditorState())
    const script = new ScriptEditSession(canonical())
    const worker = new ManualWorker()
    const runtime = createEditorDerivedWorkerRuntime()
    const store = createEditorDerivedStore({
      mainSession: main,
      scriptSession: script,
      workerFactory: () => worker,
    })
    const stop = store.start()
    worker.reply(runtime.handle(worker.requests[0]!))
    for (const scanner of Object.values(scanners)) scanner.mockClear()

    main.dispatch(new RenameProjectCommand('只改元数据'))
    await flushRefresh()
    expect(worker.requests[1]?.kind).toBe('patch')
    for (const [name, scanner] of Object.entries(scanners))
      expect(scanner, name).toHaveBeenCalledTimes(0)

    stop()
    for (const scanner of Object.values(scanners)) scanner.mockRestore()
  })

  test('discards an old result, coalesces to latest revision and fails closed', async () => {
    const main = new EditSession(catalogControlsEditorState())
    const script = new ScriptEditSession(canonical())
    const worker = new ManualWorker()
    const runtime = createEditorDerivedWorkerRuntime()
    const store = createEditorDerivedStore({
      mainSession: main,
      scriptSession: script,
      workerFactory: () => worker,
    })
    store.start()
    worker.reply(runtime.handle(worker.requests[0]!))

    main.dispatch(new RenameProjectCommand('第一版'))
    await flushRefresh()
    const firstPatch = worker.requests[1]!
    main.dispatch(new RenameProjectCommand('第二版'))
    await flushRefresh()
    expect(worker.requests).toHaveLength(2)

    worker.reply(runtime.handle(firstPatch))
    expect(store.getSnapshot()).toMatchObject({
      status: 'stale',
      targetRevision: { mainHistoryVersion: 2, scriptHistoryVersion: 0 },
    })
    expect(worker.requests).toHaveLength(3)
    const latest = worker.requests[2]!
    worker.reply(runtime.handle(latest))
    expect(store.getSnapshot()).toMatchObject({
      status: 'current',
      revision: { mainHistoryVersion: 2, scriptHistoryVersion: 0 },
    })

    main.dispatch(new RenameProjectCommand('第三版'))
    await flushRefresh()
    const failingRequest = worker.requests[3]!
    worker.reply({
      kind: 'failed',
      epoch: failingRequest.epoch,
      jobId: failingRequest.jobId,
      revision: failingRequest.revision,
      message: 'worker boom',
    })
    expect(store.getSnapshot()).toMatchObject({
      status: 'failed',
      message: 'worker boom',
      lastKnown: { revision: { mainHistoryVersion: 2, scriptHistoryVersion: 0 } },
    })
  })

  test('restarts from the latest revision after stale/current failures and ignores the old worker', async () => {
    const main = new EditSession(catalogControlsEditorState())
    const script = new ScriptEditSession(canonical())
    const workers: ManualWorker[] = []
    const runtime = createEditorDerivedWorkerRuntime()
    const store = createEditorDerivedStore({
      mainSession: main,
      scriptSession: script,
      workerFactory: () => {
        const worker = new ManualWorker()
        workers.push(worker)
        return worker
      },
    })
    store.start()
    const first = workers[0]!
    first.reply(runtime.handle(first.requests[0]!))
    const listener = vi.fn()
    store.subscribe(listener)

    main.dispatch(new RenameProjectCommand('第一版'))
    await flushRefresh()
    const staleRequest = first.requests[1]!
    main.dispatch(new RenameProjectCommand('第二版'))
    await flushRefresh()
    listener.mockClear()
    first.reply({
      kind: 'failed',
      epoch: staleRequest.epoch,
      jobId: staleRequest.jobId,
      revision: staleRequest.revision,
      message: 'stale boom',
    })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(first.terminated).toBe(true)
    expect(workers).toHaveLength(2)
    const second = workers[1]!
    expect(second.requests[0]).toMatchObject({
      kind: 'init',
      revision: { mainHistoryVersion: 2, scriptHistoryVersion: 0 },
    })
    expect(store.getSnapshot()).toMatchObject({
      status: 'stale',
      lastKnown: { revision: { mainHistoryVersion: 0, scriptHistoryVersion: 0 } },
    })
    first.onerror?.({ message: 'late old-worker error' })
    expect(store.getSnapshot().status).toBe('stale')
    second.reply(runtime.handle(second.requests[0]!))
    expect(store.getSnapshot()).toMatchObject({
      status: 'current',
      revision: { mainHistoryVersion: 2, scriptHistoryVersion: 0 },
    })

    main.dispatch(new RenameProjectCommand('第三版'))
    await flushRefresh()
    const currentFailure = second.requests[1]!
    second.reply({
      kind: 'failed',
      epoch: currentFailure.epoch,
      jobId: currentFailure.jobId,
      revision: currentFailure.revision,
      message: 'current boom',
    })
    expect(store.getSnapshot()).toMatchObject({ status: 'failed', message: 'current boom' })

    listener.mockClear()
    main.dispatch(new RenameProjectCommand('第四版'))
    await flushRefresh()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(workers).toHaveLength(3)
    const third = workers[2]!
    expect(third.requests[0]).toMatchObject({
      kind: 'init',
      revision: { mainHistoryVersion: 4, scriptHistoryVersion: 0 },
    })
    expect(store.getSnapshot()).toMatchObject({
      status: 'stale',
      lastKnown: { revision: { mainHistoryVersion: 2, scriptHistoryVersion: 0 } },
    })
    third.reply(runtime.handle(third.requests[0]!))
    expect(store.getSnapshot()).toMatchObject({
      status: 'current',
      revision: { mainHistoryVersion: 4, scriptHistoryVersion: 0 },
    })
  })

  test('preserves last-known data while retrying a failed current revision', () => {
    const main = new EditSession(catalogControlsEditorState())
    const script = new ScriptEditSession(canonical())
    const workers: ManualWorker[] = []
    const runtime = createEditorDerivedWorkerRuntime()
    const store = createEditorDerivedStore({
      mainSession: main,
      scriptSession: script,
      workerFactory: () => {
        const worker = new ManualWorker()
        workers.push(worker)
        return worker
      },
    })
    store.start()
    const first = workers[0]!
    first.reply(runtime.handle(first.requests[0]!))
    const lastKnown = store.getSnapshot()
    if (lastKnown.status !== 'current') throw new Error('expected current snapshot')
    first.onerror?.({ message: 'worker crashed' })
    expect(store.getSnapshot().status).toBe('failed')
    first.reply(runtime.handle(first.requests[0]!))
    expect(store.getSnapshot()).toMatchObject({ status: 'failed', message: 'worker crashed' })

    store.retry()
    expect(workers).toHaveLength(2)
    expect(store.getSnapshot()).toEqual({
      status: 'stale',
      targetRevision: lastKnown.revision,
      lastKnown: { revision: lastKnown.revision, data: lastKnown.data },
    })
    first.reply(runtime.handle(first.requests[0]!))
    expect(store.getSnapshot()).toEqual({
      status: 'stale',
      targetRevision: lastKnown.revision,
      lastKnown: { revision: lastKnown.revision, data: lastKnown.data },
    })
  })

  test('derives display status from the exact current revision', () => {
    const oldRevision = { mainHistoryVersion: 1, scriptHistoryVersion: 2 }
    const currentRevision = { mainHistoryVersion: 2, scriptHistoryVersion: 2 }
    const data = {} as EditorDerivedData
    const lastKnown = { revision: oldRevision, data }

    expect(
      effectiveEditorDerivedStatus(
        { status: 'failed', targetRevision: oldRevision, message: 'old failure' },
        currentRevision,
      ),
    ).toBe('checking')
    expect(
      effectiveEditorDerivedStatus(
        { status: 'failed', targetRevision: oldRevision, message: 'old failure', lastKnown },
        currentRevision,
      ),
    ).toBe('stale')
    expect(
      effectiveEditorDerivedStatus(
        { status: 'current', revision: oldRevision, data },
        currentRevision,
      ),
    ).toBe('stale')
    expect(
      effectiveEditorDerivedStatus(
        { status: 'failed', targetRevision: currentRevision, message: 'current failure' },
        currentRevision,
      ),
    ).toBe('failed')
  })

  test('stop cancels a queued refresh and ignores late worker events', async () => {
    const main = new EditSession(catalogControlsEditorState())
    const script = new ScriptEditSession(canonical())
    const workers: ManualWorker[] = []
    const runtime = createEditorDerivedWorkerRuntime()
    const store = createEditorDerivedStore({
      mainSession: main,
      scriptSession: script,
      workerFactory: () => {
        const worker = new ManualWorker()
        workers.push(worker)
        return worker
      },
    })
    const stop = store.start()
    const worker = workers[0]!
    const initRequest = worker.requests[0]!
    worker.reply(runtime.handle(initRequest))
    const beforeStop = store.getSnapshot()
    const listener = vi.fn()
    store.subscribe(listener)

    main.dispatch(new RenameProjectCommand('停止后不再刷新'))
    stop()
    listener.mockClear()
    await flushRefresh()
    expect(workers).toHaveLength(1)
    expect(worker.requests).toHaveLength(1)
    worker.onerror?.({ message: 'late error' })
    worker.reply(runtime.handle(initRequest))
    expect(listener).not.toHaveBeenCalled()
    expect(store.getSnapshot()).toBe(beforeStop)
  })

  test('encodes deletion of an optional diagnostic slice and matches a cold full scan', async () => {
    const initial = catalogControlsEditorState()
    initial.worldVariables = {
      temporary: { kind: 'flag', name: '临时', description: '', initial: false },
    }
    const main = new EditSession(initial)
    const script = new ScriptEditSession(canonical())
    const worker = new ManualWorker()
    const runtime = createEditorDerivedWorkerRuntime()
    const store = createEditorDerivedStore({
      mainSession: main,
      scriptSession: script,
      workerFactory: () => worker,
    })
    store.start()
    worker.reply(runtime.handle(worker.requests[0]!))
    main.dispatch({
      label: '删除可选变量切片',
      apply: (state) => {
        const next = { ...state }
        delete next.worldVariables
        return next
      },
      invert: () => initial,
    })
    await flushRefresh()
    const request = worker.requests[1]!
    expect(request).toMatchObject({ kind: 'patch', main: { removeKeys: ['worldVariables'] } })
    const reply = runtime.handle(request)
    if (reply.kind !== 'ready') throw new Error(reply.message)
    expect(reply.data).toEqual(fullWorkerData(main.getState(), script.getStateSnapshot()))
    worker.reply(reply)
    expect(store.getSnapshot().status).toBe('current')
  })

  test('keeps the current-state save validator authoritative while the worker snapshot is stale', async () => {
    const source = fixture()
    const main = new EditSession(source.state)
    const script = new ScriptEditSession(source.canonical)
    const worker = new ManualWorker()
    const runtime = createEditorDerivedWorkerRuntime()
    const store = createEditorDerivedStore({
      mainSession: main,
      scriptSession: script,
      workerFactory: () => worker,
    })
    const stop = store.start()
    worker.reply(runtime.handle(worker.requests[0]!))
    expect(store.getSnapshot().status).toBe('current')

    const duplicateEntry: Command = {
      label: '制造重复入口测试态',
      apply: (state) => ({
        ...state,
        manifest: {
          ...state.manifest,
          defaultEntryId: 'duplicate',
          entryPoints: [
            {
              id: 'duplicate',
              label: '入口 A',
              scene: 's001',
              startWorld: { party: [], money: 0, inventory: [] },
            },
            {
              id: 'duplicate',
              label: '入口 B',
              scene: 's001',
              startWorld: { party: [], money: 0, inventory: [] },
            },
          ],
        },
      }),
      invert: () => source.state,
    }
    main.dispatch(duplicateEntry)
    await flushRefresh()
    expect(store.getSnapshot()).toMatchObject({
      status: 'stale',
      lastKnown: { revision: { mainHistoryVersion: 0, scriptHistoryVersion: 0 } },
      targetRevision: { mainHistoryVersion: 1, scriptHistoryVersion: 0 },
    })
    expect(() => assertProjectSaveValid(main.getState())).toThrow(/重复/)
    stop()
  })

  test.each(
    DIAGNOSTIC_DIFFERENTIAL_FIXTURES,
  )('stale worker cannot authorize save for $name', async ({ invalid, saveError }) => {
    const current = fixture()
    const broken = fixture()
    current.state.manifest.content.worldVariables = 'content/world-variables.json'
    broken.state.manifest.content.worldVariables = 'content/world-variables.json'
    invalid(broken.state, broken.canonical)
    const main = new EditSession(current.state)
    const script = new ScriptEditSession(current.canonical)
    const worker = new ManualWorker()
    const runtime = createEditorDerivedWorkerRuntime()
    const store = createEditorDerivedStore({
      mainSession: main,
      scriptSession: script,
      workerFactory: () => worker,
    })
    const stop = store.start()
    worker.reply(runtime.handle(worker.requests[0]!))
    expect(store.getSnapshot().status).toBe('current')
    expect(() =>
      assertProjectSaveValid(
        projection.mergeEditorProjectionWithCurrentAuthorState(
          script.getStateSnapshot(),
          main.getState(),
        ),
      ),
    ).not.toThrow()

    const beforeMain = main.getState()
    main.dispatch({
      label: '注入保存门非法 main fixture',
      apply: () => broken.state,
      invert: () => beforeMain,
    })
    const beforeScript = script.getStateSnapshot()
    script.dispatch({
      label: '注入保存门非法 canonical fixture',
      affectedRecords: { all: true },
      apply: () => broken.canonical,
      invert: () => beforeScript,
    })
    await flushRefresh()
    expect(store.getSnapshot()).toMatchObject({
      status: 'stale',
      targetRevision: { mainHistoryVersion: 1, scriptHistoryVersion: 1 },
    })
    expect(() =>
      assertProjectSaveValid(
        projection.mergeEditorProjectionWithCurrentAuthorState(
          script.getStateSnapshot(),
          main.getState(),
        ),
      ),
    ).toThrow(saveError)
    stop()
  })

  test('publishes only the affected canonical record after script edits', async () => {
    const main = new EditSession(catalogControlsEditorState())
    const script = new ScriptEditSession({
      scenes: [],
      items: [],
      sharedScripts: {
        first: { name: '第一段', self: 'none', body: [] },
        second: { name: '第二段', self: 'none', body: [] },
      },
    })
    const worker = new ManualWorker()
    const runtime = createEditorDerivedWorkerRuntime()
    const store = createEditorDerivedStore({
      mainSession: main,
      scriptSession: script,
      workerFactory: () => worker,
    })
    store.start()
    worker.reply(runtime.handle(worker.requests[0]!))

    script.dispatch(new UpdateSharedScriptMetadataCommand('second', { name: '第二段（改）' }))
    await flushRefresh()
    const patch = worker.requests[1]!
    expect(patch.kind).toBe('patch')
    if (patch.kind !== 'patch') throw new Error('expected patch')
    expect(patch.main).toEqual({ replace: {} })
    expect(patch.script.scenes).toBeUndefined()
    expect(patch.script.items).toBeUndefined()
    expect(patch.script.sharedScripts?.keys).toEqual(['first', 'second'])
    expect(Object.keys(patch.script.sharedScripts?.upserts ?? {})).toEqual(['second'])
    worker.reply(runtime.handle(patch))
    expect(store.getSnapshot()).toMatchObject({
      status: 'current',
      revision: { mainHistoryVersion: 0, scriptHistoryVersion: 1 },
    })
  })

  test('diagnostic state helper never exposes binary or map working sets', () => {
    const diagnostic = editorDiagnosticState(catalogControlsEditorState())
    expect(structuredClone(diagnostic)).toEqual(diagnostic)
    expect(diagnostic).not.toHaveProperty('maps')
    expect(diagnostic).not.toHaveProperty('assetBlobs')
    expect(diagnostic).not.toHaveProperty('tilesetBlobs')
  })

  test.each(
    DIAGNOSTIC_DIFFERENTIAL_FIXTURES,
  )('worker/sync differential covers $name positive and negative fixtures', ({
    invalid,
    valid,
    matches,
  }) => {
    const broken = fixture()
    invalid(broken.state, broken.canonical)
    const workerBroken = fullWorkerData(broken.state, broken.canonical)
    expect(workerBroken).toEqual(synchronousData(broken.state, broken.canonical))
    expect(workerBroken.statusIssues.some(matches)).toBe(true)

    const healthy = fixture()
    valid(healthy.state, healthy.canonical)
    const workerHealthy = fullWorkerData(healthy.state, healthy.canonical)
    expect(workerHealthy).toEqual(synchronousData(healthy.state, healthy.canonical))
    expect(workerHealthy.statusIssues.some(matches)).toBe(false)
  })

  test('20 seeded random mutations from one base keep patches equal to cold worker and sync', async () => {
    let seed = 0x1
    const random = (): number => {
      seed += 0x6d2b79f5
      let value = seed
      value = Math.imul(value ^ (value >>> 15), value | 1)
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
      return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000
    }
    const lanes = ['manifest', 'scene', 'item', 'world-variable', 'shared-script'] as const
    const visited = new Set<(typeof lanes)[number]>()

    for (let round = 1; round <= 20; round += 1) {
      const current = fixture()
      const main = new EditSession(current.state)
      const script = new ScriptEditSession(current.canonical)
      const worker = new ManualWorker()
      const runtime = createEditorDerivedWorkerRuntime()
      const store = createEditorDerivedStore({
        mainSession: main,
        scriptSession: script,
        workerFactory: () => worker,
      })
      const stop = store.start()
      worker.reply(runtime.handle(worker.requests[0]!))

      const lane = lanes[Math.floor(random() * lanes.length)]!
      const suffix = Math.floor(random() * 0x1_0000_0000).toString(36)
      visited.add(lane)
      const dispatchMain = (
        label: string,
        transform: (state: ReturnType<typeof main.getState>) => ReturnType<typeof main.getState>,
      ): void => {
        const before = main.getState()
        main.dispatch({ label, apply: transform, invert: () => before })
      }

      if (lane === 'manifest') main.dispatch(new RenameProjectCommand(`随机项目 ${suffix}`))
      else if (lane === 'scene')
        dispatchMain(`随机场景 ${suffix}`, (state) => {
          const target = state.scenes[Math.floor(random() * state.scenes.length)]!
          return {
            ...state,
            scenes: state.scenes.map((scene) =>
              scene.id === target.id ? { ...scene, mapId: `map-${suffix}` } : scene,
            ),
          }
        })
      else if (lane === 'item')
        dispatchMain(`随机物品 ${suffix}`, (state) => {
          const target = state.items[Math.floor(random() * state.items.length)]
          return target
            ? {
                ...state,
                items: state.items.map((item) =>
                  item.id === target.id ? { ...item, name: `随机物品 ${suffix}` } : item,
                ),
              }
            : {
                ...state,
                items: [
                  ...state.items,
                  {
                    id: `item-${suffix}`,
                    name: `随机物品 ${suffix}`,
                    desc: [],
                    buyPrice: 0,
                    sellPrice: 0,
                    sellable: false,
                  },
                ],
              }
        })
      else if (lane === 'world-variable')
        dispatchMain(`随机变量 ${suffix}`, (state) => ({
          ...state,
          worldVariables: {
            ...(state.worldVariables ?? {}),
            [`random.flag.${suffix}`]: {
              kind: 'flag',
              name: `随机变量 ${suffix}`,
              description: '',
              initial: false,
            },
          },
        }))
      else
        script.dispatch(
          new AddSharedScriptCommand(`random/${suffix}`, {
            name: `随机共享脚本 ${suffix}`,
            self: 'none',
            body: [{ kind: 'playVideo', asset: `video.${suffix}` }],
          }),
        )

      await flushRefresh()
      const request = worker.requests[1]!
      expect(request, `round ${round} / ${lane}`).toBeDefined()
      const reply = runtime.handle(request)
      if (reply.kind !== 'ready') throw new Error(reply.message)
      const currentState = main.getState()
      const currentScript = script.getStateSnapshot()
      expect(reply.data, `round ${round} / ${lane} vs cold worker`).toEqual(
        fullWorkerData(currentState, currentScript),
      )
      expect(reply.data, `round ${round} / ${lane} vs sync`).toEqual(
        synchronousData(currentState, currentScript),
      )
      worker.reply(reply)
      stop()
    }

    expect(visited.size).toBe(lanes.length)
  })
})
