/** Real creation/open/save flows; only browser storage, picker, fetch and FSA are test boundaries. */
import type { CurrentManifest } from '@type-pal/content'
import { PROJECT_SAVE_STATE_PATH } from '@type-pal/reforge'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

const bindings = vi.hoisted(
  () => new Map<string, import('./handle-store.js').WorkspaceHandleRecord>(),
)
vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)
vi.mock('./handle-store.js', async (original) => {
  const actual = await original<typeof import('./handle-store.js')>()
  const save = async (
    context: import('./workspace-context.js').WorkspaceContext,
    name: string,
    handle: FileSystemDirectoryHandle,
  ) => {
    bindings.set(context.workspaceId, { ...context, name, handle, updatedAt: 1 })
  }
  return {
    ...actual,
    loadWorkspaceRecord: async (id: string) => bindings.get(id) ?? null,
    findWorkspaceRecordByHandle: async (handle: FileSystemDirectoryHandle) => {
      for (const record of bindings.values())
        if (await record.handle.isSameEntry(handle)) return record
      return null
    },
    saveWorkspaceHandle: save,
    saveWorkspaceHandleUnderLock: async (
      lock: import('./handle-store.js').WorkspaceRegistrationLock,
      ...args: Parameters<typeof save>
    ) => {
      actual.assertWorkspaceRegistrationLock(lock, args[0].workspaceId)
      await save(...args)
    },
  }
})

import type { CloneProgress } from './clone.js'
import {
  finishOpen,
  newBlankProject,
  newFromPal,
  type Opened,
  openExistingProject,
} from './open-actions.js'
import { serializeProjectWithMapCopies, toEditorState, writeProject } from './project-io.js'
import { buildBlankProject } from './seed.js'
import { PAL_DEVELOPMENT_SENTINEL_PATH } from './workspace-context.js'
import { authorizeBoundWorkspaceTarget } from './workspace-persistence.js'

beforeEach(() => {
  bindings.clear()
  authorSaveStorage.receipts.clear()
})
afterEach(() => vi.unstubAllGlobals())

const authors = (disk: ReturnType<typeof memoryAuthorDirectory>) =>
  new Map([...disk.files].filter(([path]) => !path.startsWith('.type-pal/')))
const authorChanges = (disk: ReturnType<typeof memoryAuthorDirectory>) =>
  Object.fromEntries(
    Object.entries(disk.changes).map(([kind, paths]) => [
      kind,
      paths.filter((path) => path !== '.type-pal' && !path.startsWith('.type-pal/')),
    ]),
  )

async function fixture(mode: 'blank' | 'clone') {
  const target = memoryAuthorDirectory()
  const expected = memoryAuthorDirectory(
    await buildBlankProject(mode === 'blank' ? target.dir.name : 'pal'),
  )
  const source = memoryAuthorDirectory(Object.fromEntries(expected.files))
  source.set(PAL_DEVELOPMENT_SENTINEL_PATH, {
    kind: 'type-pal-editor-pal-development',
    version: 1,
    projectId: 'pal',
    workspaceId: crypto.randomUUID(),
  })
  const sourceBefore = new Map(source.files)
  const fetch = vi.fn(async (url: string | URL | Request) => {
    const path = String(url)
    const prefix = 'https://seed.invalid/project/'
    if (!path.startsWith(prefix)) throw new Error(`unexpected network request: ${path}`)
    const bytes = source.files.get(path.slice(prefix.length))
    return bytes === undefined ? new Response(null, { status: 404 }) : new Response(bytes.slice(0))
  })
  vi.stubGlobal('fetch', fetch)
  const picker = vi.fn(async () => target.dir)
  vi.stubGlobal('window', {
    isSecureContext: true,
    location: { origin: 'http://localhost' },
    showDirectoryPicker: picker,
  })
  const progress: Parameters<CloneProgress>[] = []
  const run = () =>
    mode === 'blank'
      ? newBlankProject()
      : newFromPal('https://seed.invalid/project', (...entry) => progress.push(entry))
  return { target, expected, source, sourceBefore, fetch, picker, progress, run }
}

async function saveNextEdit(opened: Opened, target: ReturnType<typeof memoryAuthorDirectory>) {
  const state = toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps)
  state.manifest.name = 'edited after reopen'
  state.actors[0]!.battler!.baseStats.maxHP = 237
  const files = await serializeProjectWithMapCopies(state, opened.project.source)
  await writeProject(
    await authorizeBoundWorkspaceTarget(opened.workspace, target.dir, opened.authorBaseline),
    files,
  )
  const next = await finishOpen(target.dir)
  expect(next.project.manifest.name).toBe('edited after reopen')
  expect(next.project.actorsById.hero!.battler!.baseStats.maxHP).toBe(237)
  expect(next.workspace.workspaceId).toBe(opened.workspace.workspaceId)
}

test.each([
  ['blank', false],
  ['blank', true],
  ['clone', false],
  ['clone', true],
] as const)('%s creation completes before open and propagates cleanup warning (%s)', async (mode, failCleanup) => {
  const f = await fixture(mode)
  let cleanupCalls = 0
  f.target.hooks.beforeRemove = (path) => {
    if (path.includes('/save-recovery/')) {
      cleanupCalls++
      if (failCleanup) throw new DOMException('temporary cleanup denied', 'NotAllowedError')
    }
  }
  f.target.hooks.beforeClose = (path) => {
    if (path === 'manifest.json') expect(bindings.size).toBe(0)
  }
  const opened = await f.run()
  expect(opened).not.toBeNull()
  expect(authors(f.target)).toEqual(authors(f.expected))
  expect(f.target.json(PROJECT_SAVE_STATE_PATH).phase).toBe('committed')
  expect(opened!.workspace).toMatchObject({
    mode: 'local-project',
    persistencePolicy: 'local-bound',
    source: mode === 'blank' ? 'blank-project' : 'pal-development-snapshot-clone',
  })
  expect(opened!.dir).toBe(f.target.dir)
  expect(bindings.get(opened!.workspace.workspaceId)?.handle).toBe(f.target.dir)
  expect(f.target.files.has(PAL_DEVELOPMENT_SENTINEL_PATH)).toBe(false)
  expect(cleanupCalls).toBeGreaterThan(0)
  expect(opened!.recoveryWarning).toEqual(
    failCleanup ? expect.stringContaining('内容已保存') : undefined,
  )
  if (failCleanup) expect(opened!.recoveryWarning).toContain('temporary cleanup denied')
  const receipt = authorSaveStorage.receipts.get(opened!.workspace.workspaceId)!
  expect(receipt.phase).toBe('committed')
  expect(Object.keys(receipt.staged).length > 0).toBe(failCleanup)
  expect(f.source.files).toEqual(f.sourceBefore)
  expect(f.source.changes).toEqual({ creates: [], closes: [], removes: [] })
  if (mode === 'clone') {
    expect(f.fetch).toHaveBeenCalled()
    expect(f.progress[0]?.[2]).toBe('preparing')
    expect(f.progress.at(-1)).toEqual([expect.any(Number), expect.any(Number), 'writing'])
    expect(f.progress.at(-1)![0]).toBe(f.progress.at(-1)![1])
  } else expect(f.fetch).not.toHaveBeenCalled()

  f.target.hooks.beforeClose = undefined
  f.target.resetChanges()
  const reopened = await openExistingProject()
  expect(reopened!.recoveryWarning).toEqual(
    failCleanup ? expect.stringContaining('temporary cleanup denied') : undefined,
  )
  expect(reopened!.workspace.workspaceId).toBe(opened!.workspace.workspaceId)
  expect(authorChanges(f.target)).toEqual({ creates: [], closes: [], removes: [] })
  f.target.hooks.beforeRemove = undefined
  const cleaned = await openExistingProject()
  expect(cleaned!.recoveryWarning).toBeUndefined()
  expect([...f.target.files.keys()].some((path) => path.includes('/save-recovery/'))).toBe(false)
  await saveNextEdit(cleaned!, f.target)
})

test.each([
  'blank',
  'clone',
] as const)('%s interrupted first creation is not recent and recovers through openExistingProject', async (mode) => {
  const f = await fixture(mode)
  f.target.hooks.beforeClose = (path) => {
    if (path === 'content/actors.json') throw new Error('injected creation interruption')
  }
  await expect(f.run()).rejects.toThrow('injected creation interruption')
  expect(bindings.size).toBe(0)
  expect(f.target.files.has('manifest.json')).toBe(false)
  expect(f.target.json(PROJECT_SAVE_STATE_PATH).phase).toBe('pending')
  expect(authorSaveStorage.receipts.size).toBe(1)
  const receipt = [...authorSaveStorage.receipts.values()][0]!
  expect(receipt.phase).toBe('applying')
  expect(receipt.planHash).toMatch(/^[a-f0-9]{64}$/)
  f.target.hooks.beforeClose = undefined
  f.fetch.mockImplementation(async () => {
    throw new Error('source is offline after interruption')
  })
  const networkCalls = f.fetch.mock.calls.length
  const recovering = vi.fn()
  const opened = await openExistingProject({ onRecovering: recovering })
  expect(recovering).toHaveBeenCalledOnce()
  expect(f.fetch.mock.calls.length).toBe(networkCalls)
  expect(authors(f.target)).toEqual(authors(f.expected))
  expect(f.target.json(PROJECT_SAVE_STATE_PATH).phase).toBe('committed')
  expect(bindings.get(opened!.workspace.workspaceId)?.handle).toBe(f.target.dir)
  expect(opened!.recoveryWarning).toBeUndefined()
  expect(f.source.files).toEqual(f.sourceBefore)
  await saveNextEdit(opened!, f.target)
})

test.each([
  'blank',
  'clone',
  'open',
] as const)('%s picker cancellation is silent and never touches project storage', async (mode) => {
  const f = await fixture(mode === 'clone' ? 'clone' : 'blank')
  f.picker.mockRejectedValue(new DOMException('cancelled by user', 'AbortError'))
  await expect(mode === 'open' ? openExistingProject() : f.run()).resolves.toBeNull()
  expect(f.fetch).not.toHaveBeenCalled()
  expect(f.target.files.size).toBe(0)
  expect(f.target.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(authorSaveStorage.receipts.size).toBe(0)
  expect(bindings.size).toBe(0)
})

test.each([
  null,
  {},
  { contentVersion: '20' },
])('open rejects an unknown or non-numeric version (%j) without a writable binding', async (manifest) => {
  const f = await fixture('blank')
  f.target.set('manifest.json', manifest)
  const before = new Map(f.target.files)
  await expect(openExistingProject()).rejects.toThrow('contentVersion 未知')
  expect(f.target.files).toEqual(before)
  expect(f.target.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(bindings.size).toBe(0)
  expect(authorSaveStorage.receipts.size).toBe(0)
})

test('serialization copies unloaded map text and uploaded bytes without eagerly reading catalog assets', async () => {
  const f = await fixture('blank')
  const opened = (await f.run())!
  const state = toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps)
  expect(state.mapIndex.maps.length).toBeGreaterThan(0)
  expect(Object.keys(state.maps)).toHaveLength(0)
  const records = Object.values(state.assetCatalog.assets)
  expect(records.length).toBeGreaterThan(0)
  const path = records.find((record) => record.kind === 'tileset')!.path
  state.assetBlobs[path] = f.target.files.get(path)!.slice(0)
  const readBytes = vi.fn(async () => {
    throw new Error('unexpected eager asset read')
  })
  const readText = vi.fn(opened.project.source.readText)
  const serialized = await serializeProjectWithMapCopies(state, {
    ...opened.project.source,
    readBytes,
    readText,
  })
  expect(readBytes).not.toHaveBeenCalled()
  expect(serialized[path]).toEqual(state.assetBlobs[path])
  for (const map of state.mapIndex.maps) {
    expect(readText).toHaveBeenCalledWith(map.path)
    expect(serialized[map.path]).toBe(new TextDecoder().decode(f.target.files.get(map.path)))
  }
  for (const record of records.filter((record) => record.path !== path))
    expect(serialized[record.path]).toBeUndefined()
  expect((serialized['manifest.json'] as CurrentManifest).id).toBe(opened.project.manifest.id)
})
