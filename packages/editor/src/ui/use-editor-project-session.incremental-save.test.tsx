// @vitest-environment jsdom
import {
  fsaSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  loadProjectMapById,
  loadStampTemplates,
} from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { deferred, memoryAuthorDirectory } from '../core/__tests__/author-save-fixture.js'
import {
  authorSaveStorage,
  memoryAuthorSaveStore,
} from '../core/__tests__/author-save-store-fixture.js'
import { previewAuthorScene, previewLibrary } from '../core/__tests__/script-preview-fixture.js'
import { observeAuthorSource } from '../core/author-disk-baseline.js'
import { loadBattleSimulatorLibrary } from '../core/battle-simulator-library.js'
import { EditSession } from '../core/edit-session.js'
import { CreateMapAssetCommand } from '../core/map-asset-commands.js'
import { PaintCollisionCommand } from '../core/map-edit-commands.js'
import { openLocalProject } from '../core/open-local.js'
import { toEditorState } from '../core/project-io.js'
import { ProjectLeaveGuard } from '../core/project-leave-guard.js'
import { ScriptEditSession } from '../core/script-editor.js'
import {
  loadScriptPreviewLibrary,
  SCRIPT_PREVIEW_PATH,
  SetScriptPreviewLibraryCommand,
} from '../core/script-preview-library.js'
import { buildBlankProject } from '../core/seed.js'
import {
  createLocalWorkspaceContext,
  createPalDevelopmentWorkspaceContext,
  PAL_DEVELOPMENT_SENTINEL_PATH,
} from '../core/workspace-context.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import { type EditorProjectSession, useEditorProjectSession } from './use-editor-project-session.js'

// Replace only browser storage ports. Loader, policy, source checks, journal and hook stay real.
const bindings = vi.hoisted(
  () => new Map<string, import('../core/handle-store.js').WorkspaceHandleRecord>(),
)
vi.mock('../core/author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('../core/author-save-store.js')>()),
)
vi.mock('../core/handle-store.js', async (original) => {
  const actual = await original<typeof import('../core/handle-store.js')>()
  return {
    ...actual,
    loadWorkspaceRecord: async (id: string) => bindings.get(id) ?? null,
    findWorkspaceRecordByHandle: async (handle: FileSystemDirectoryHandle) => {
      for (const record of bindings.values())
        if (await record.handle.isSameEntry(handle)) return record
      return null
    },
    saveWorkspaceHandleUnderLock: async (
      lock: import('../core/handle-store.js').WorkspaceRegistrationLock,
      context: import('../core/workspace-context.js').WorkspaceContext,
      name: string,
      handle: FileSystemDirectoryHandle,
    ) => {
      actual.assertWorkspaceRegistrationLock(lock, context.workspaceId)
      bindings.set(context.workspaceId, { ...context, name, handle, updatedAt: 1 })
    },
  }
})

let root: Root
let host: HTMLDivElement
let disconnect: (() => void) | undefined
beforeEach(async () => {
  await stubNodeTestHost()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('isSecureContext', true)
  bindings.clear()
  authorSaveStorage.receipts.clear()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  disconnect?.()
  disconnect = undefined
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function mountProject(mode: 'bound' | 'pal-first') {
  const files = await buildBlankProject(mode === 'pal-first' ? 'pal' : 'incremental-save')
  files['content/scenes/start.json'] = previewAuthorScene()
  files[SCRIPT_PREVIEW_PATH] = previewLibrary()
  if (mode === 'pal-first')
    files[PAL_DEVELOPMENT_SENTINEL_PATH] = {
      kind: 'type-pal-editor-pal-development',
      version: 1,
      projectId: 'pal',
      workspaceId: crypto.randomUUID(),
    }
  // Independent disk oracle: valid compact JSON must remain byte-for-byte untouched by a sidecar edit.
  for (const [path, value] of Object.entries(files))
    if (path.startsWith('content/') || path === 'manifest.json' || path === SCRIPT_PREVIEW_PATH)
      files[path] = JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value)
  const target = memoryAuthorDirectory(files)
  const source = mode === 'bound' ? target : memoryAuthorDirectory(files)
  const observed = observeAuthorSource(fsaSource(source.dir))
  const project = await loadCurrentProjectFrom(observed.source)
  const [scenes, stamps, simulator, preview] = await Promise.all([
    loadAllAuthorScenes(project),
    loadStampTemplates(project),
    loadBattleSimulatorLibrary(observed.source),
    loadScriptPreviewLibrary(observed.source),
  ])
  // HTTP first binding has read evidence, but no FSA source-directory authority.
  const authorBaseline = await observed.finish(project, mode === 'bound' ? target.dir : undefined)
  const workspace =
    mode === 'bound'
      ? createLocalWorkspaceContext(project.manifest.id, 'local-directory')
      : await createPalDevelopmentWorkspaceContext(observed.source)
  if (mode === 'bound')
    bindings.set(workspace.workspaceId, {
      ...workspace,
      name: target.dir.name,
      handle: target.dir,
      updatedAt: 1,
    })
  const main = new EditSession(toEditorState(project, scenes, {}, {}, stamps, simulator, preview), {
    loadMap: (id) => loadProjectMapById(project, id),
  })
  const script = new ScriptEditSession({
    scenes,
    items: project.authorContent.items,
    sharedScripts: project.authorContent.sharedScripts,
  })
  const projectGuard = new ProjectLeaveGuard(main, script)
  let latest: EditorProjectSession
  function Harness() {
    latest = useEditorProjectSession({
      main,
      script,
      projectGuard,
      projectSource: observed.source,
      workspace,
      initialDirectory: mode === 'bound' ? target.dir : undefined,
      authorBaseline,
    })
    return null
  }
  disconnect = projectGuard.connect()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  vi.stubGlobal(
    'showDirectoryPicker',
    vi.fn(async () => target.dir),
  )
  await act(async () => root.render(<Harness />))
  target.resetChanges()
  return { session: () => latest, main, project, source, target }
}

function renamePreview(main: EditSession, name: string) {
  const library = structuredClone(main.getState().scriptPreview!)
  library.states[0]!.name = name
  main.dispatch(new SetScriptPreviewLibraryCommand(library))
}

test.each([
  'bound',
  'pal-first',
] as const)('first %s sidecar save preserves untouched author, clean hydrated map and resource bytes', async (mode) => {
  const { session, main, project, target } = await mountProject(mode)
  const before = new Map(target.files)
  await main.ensureMapLoaded(project.mapIndex.maps[0]!.id)
  renamePreview(main, '只改初态名称')
  await act(async () => expect(await session().save()).toBe('committed'))
  expect(target.changes.closes.filter((path) => !path.startsWith('.type-pal/'))).toEqual([
    SCRIPT_PREVIEW_PATH,
  ])
  for (const [path, bytes] of before)
    if (path !== SCRIPT_PREVIEW_PATH) expect(target.files.get(path), path).toEqual(bytes)
  const reopened = await openLocalProject(target.dir)
  expect(reopened.scriptPreview!.states[0]!.name).toBe('只改初态名称')
  expect(main.isDirty()).toBe(false)
  expect(session().getLocalDirectory()).toBe(target.dir)
  target.resetChanges()
  renamePreview(main, '第二次仍只改初态')
  await act(async () => expect(await session().save()).toBe('committed'))
  expect(target.changes.closes.filter((path) => !path.startsWith('.type-pal/'))).toEqual([
    SCRIPT_PREVIEW_PATH,
  ])
})

test.each([
  'missing-resource',
  'changed-resource',
  'source-drift',
] as const)('PAL first binding rejects %s without repairing the target or clearing edits', async (fault) => {
  const { session, main, project, source, target } = await mountProject('pal-first')
  const resource = Object.values(project.assetCatalog.assets).find(
    (record) => record.kind === 'sprite',
  )!
  if (fault === 'missing-resource') target.files.delete(resource.path)
  if (fault === 'changed-resource') target.set(resource.path, new Uint8Array(resource.bytes).buffer)
  if (fault === 'source-drift')
    source.set('content/scenes/start.json', {
      ...previewAuthorScene(),
      entry: { pos: { col: 2, row: 1, height: 0 }, facing: 'down' },
    })
  const before = new Map(target.files)
  renamePreview(main, '未保存修改必须保留')
  await act(async () => expect(await session().save()).toBe('failed'))
  expect(session().error).toContain(
    fault === 'source-drift' ? 'content/scenes/start.json' : resource.path,
  )
  expect(target.changes.closes.filter((path) => !path.startsWith('.type-pal/'))).toEqual([])
  for (const [path, bytes] of before) expect(target.files.get(path), path).toEqual(bytes)
  expect(main.isDirty()).toBe(true)
  expect(session().getLocalDirectory()).toBeNull()
})

test('new map saves its captured revision, retains later edits, then copies clean bytes after HTTP binding', async () => {
  const { session, main, project, source, target } = await mountProject('pal-first')
  const original = await main.ensureMapLoaded(project.mapIndex.maps[0]!.id)
  const path = 'content/maps/annex.json'
  main.dispatch(new CreateMapAssetCommand({ id: 'annex', name: '新地图', path }, original))
  const initialValue = original.collision[0]![0]!
  const changedValue = initialValue === 0 ? 1 : 0
  const reached = deferred()
  const release = deferred()
  let paused = false
  target.hooks.beforeClose = async (path) => {
    if (!paused && path.includes('/blobs/')) {
      paused = true
      reached.resolve()
      await release.promise
    }
  }
  let saving: ReturnType<EditorProjectSession['save']> | undefined
  try {
    await act(async () => {
      saving = session().save()
      await Promise.race([saving, reached.promise])
    })
    main.dispatch(new PaintCollisionCommand('annex', [{ col: 0, row: 0, value: changedValue }]))
  } finally {
    await act(async () => {
      release.resolve()
      await saving
    })
    target.hooks.beforeClose = undefined
  }
  expect(await saving!).toBe('committed')
  expect(target.json(path).collision[0][0]).toBe(initialValue)
  expect(main.isDirty()).toBe(true)
  await act(async () => expect(await session().save()).toBe('committed'))
  expect(target.json(path).collision[0][0]).toBe(changedValue)
  expect(main.isDirty()).toBe(false)
  expect(source.files.has(path)).toBe(false)
  const committedMap = target.files.get(path)
  target.resetChanges()
  renamePreview(main, '新地图保存后继续修改初态')
  await act(async () => expect(await session().save()).toBe('committed'))
  expect(target.changes.closes.filter((path) => !path.startsWith('.type-pal/'))).toEqual([
    SCRIPT_PREVIEW_PATH,
  ])
  expect(target.files.get(path)).toEqual(committedMap)
  const reopened = await openLocalProject(target.dir)
  expect((await loadProjectMapById(reopened.project, 'annex')).collision[0]![0]).toBe(changedValue)
})

test('Save As still publishes a complete independent project with unsaved changes and clean map bytes', async () => {
  const { session, main, project, source } = await mountProject('bound')
  await main.ensureMapLoaded(project.mapIndex.maps[0]!.id)
  const sourceBefore = new Map(source.files)
  renamePreview(main, '另存副本初态')
  const copy = memoryAuthorDirectory()
  vi.stubGlobal(
    'showDirectoryPicker',
    vi.fn(async () => copy.dir),
  )
  await act(async () => session().saveAs())
  expect(session().error).toBe('')
  const reopened = await openLocalProject(copy.dir)
  expect(reopened.scriptPreview!.states[0]!.name).toBe('另存副本初态')
  expect(reopened.scenes).toEqual([previewAuthorScene()])
  for (const asset of Object.values(project.assetCatalog.assets))
    expect(copy.files.get(asset.path), asset.path).toEqual(sourceBefore.get(asset.path))
  for (const map of project.mapIndex.maps)
    expect(copy.files.get(map.path), map.path).toEqual(sourceBefore.get(map.path))
  expect(source.files).toEqual(sourceBefore)
  expect(main.isDirty()).toBe(true)
})
