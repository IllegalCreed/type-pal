/** Save As uses the real picker coordinator, writer, loader and recent-registration guards. */
import {
  fsaSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  loadStampTemplates,
} from '@type-pal/reforge'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)

import { authorBaselineDirectory, observeAuthorSource } from './author-disk-baseline.js'
import { loadWorkspaceRecord, type WorkspaceHandleRecord } from './handle-store.js'
import { finishOpen, saveProjectAs } from './open-actions.js'
import { serializeProjectWithMapCopies, toEditorState } from './project-io.js'
import { buildBlankProject } from './seed.js'
import { createSandboxWorkspaceContext } from './workspace-context.js'

// Only the IDB storage boundary is replaced, not handle-store's identity/lock business functions.
// Each production transaction issues one request. Writes become visible at completion, not at
// request success; an aborted transaction cannot commit. FSA handles retain native-style identity.
const records = new Map<string, WorkspaceHandleRecord>()
const commits: string[] = []
const copyRecord = (value: WorkspaceHandleRecord | undefined) =>
  value && {
    ...structuredClone({ ...value, handle: undefined }),
    handle: value.handle,
  }
beforeEach(() => {
  records.clear()
  commits.length = 0
  authorSaveStorage.receipts.clear()
  vi.stubGlobal('indexedDB', {
    open(name: string, version: number) {
      expect([name, version]).toEqual(['type-pal-editor', 2])
      const request = {
        onsuccess: null as (() => void) | null,
        result: {
          transaction(store: string, mode: string) {
            expect(store).toBe('project-handles')
            let ended = false
            const tx = {
              oncomplete: null as (() => void) | null,
              onabort: null as (() => void) | null,
              abort() {
                if (ended) return
                ended = true
                queueMicrotask(() => tx.onabort?.())
              },
              objectStore() {
                function request<T>(read: () => T, commit = () => {}) {
                  const r = {
                    result: undefined as T | undefined,
                    onsuccess: null as (() => void) | null,
                  }
                  queueMicrotask(() => {
                    if (ended) return
                    r.result = read()
                    r.onsuccess?.()
                    queueMicrotask(() => {
                      if (ended) return
                      ended = true
                      commit()
                      tx.oncomplete?.()
                    })
                  })
                  return r
                }
                return {
                  get: (key: string) => request(() => copyRecord(records.get(key))),
                  getAll: () => request(() => [...records.values()].map(copyRecord)),
                  put(value: WorkspaceHandleRecord) {
                    expect(mode).toBe('readwrite')
                    const saved = copyRecord(value)!
                    return request(
                      () => saved.workspaceId,
                      () => {
                        records.set(saved.workspaceId, saved)
                        commits.push(saved.workspaceId)
                      },
                    )
                  },
                }
              },
            }
            return tx
          },
        },
      }
      queueMicrotask(() => request.onsuccess?.())
      return request
    },
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

type Disk = ReturnType<typeof memoryAuthorDirectory>
type Mode = 'local' | 'source-only'
const diskEvidence = (disk: Disk) => ({
  files: [...disk.files].map(([path, bytes]) => [path, [...new Uint8Array(bytes)]]),
  io: structuredClone(disk.changes),
})
const registryEvidence = () => ({
  records: [...records.values()].map(copyRecord),
  commits: [...commits],
  receipts: [...authorSaveStorage.receipts.values()].map((r) =>
    structuredClone({ ...r, handle: undefined }),
  ),
})

async function fixture(mode: Mode = 'local') {
  const source = memoryAuthorDirectory(await buildBlankProject('save-as-boundary'))
  const target = memoryAuthorDirectory()
  const picker = vi.fn(async () => target.dir)
  vi.stubGlobal('window', {
    isSecureContext: true,
    location: { origin: 'http://localhost' },
    showDirectoryPicker: picker,
  })
  const loaded =
    mode === 'local'
      ? await finishOpen(source.dir)
      : await (async () => {
          // FileSource-only provenance: no source directory is bound into this author baseline.
          // This exercises the source-only API, not a real HTTP server or browser picker.
          const observed = observeAuthorSource(fsaSource(source.dir))
          const project = await loadCurrentProjectFrom(observed.source)
          const scenes = await loadAllAuthorScenes(project)
          const stamps = await loadStampTemplates(project)
          const authorBaseline = await observed.finish(project)
          expect(authorBaselineDirectory(authorBaseline)).toBeUndefined()
          return {
            project,
            scenes,
            stamps,
            authorBaseline,
            workspace: createSandboxWorkspaceContext(project.manifest.id, 'ui-samples'),
          }
        })()
  const state = toEditorState(loaded.project, loaded.scenes, {}, {}, loaded.stamps)
  state.manifest = { ...state.manifest, name: 'Saved copy with current edits' }
  state.actors = structuredClone(state.actors)
  state.actors[0]!.battler!.baseStats.maxHP = 237
  const files = await serializeProjectWithMapCopies(state, loaded.project.source)
  const build = vi.fn(async () => files)
  const sourceDir = mode === 'local' ? source.dir : undefined
  const evidence = { source: loaded.project.source, authorBaseline: loaded.authorBaseline }
  const save = () => saveProjectAs(loaded.workspace, build, sourceDir, [], evidence)
  return { mode, source, target, picker, loaded, files, build, sourceDir, evidence, save }
}

async function assertSaved(
  f: Awaited<ReturnType<typeof fixture>>,
  result: Awaited<ReturnType<typeof saveProjectAs>>,
) {
  expect(result).not.toBeNull()
  expect(result!.dir).toBe(f.target.dir)
  expect(result!.workspace.workspaceId).not.toBe(f.loaded.workspace.workspaceId)
  expect(result!.workspace.mode).toBe(f.mode === 'local' ? 'local-project' : 'sandbox')
  expect(result!.project.manifest.name).toBe('Saved copy with current edits')
  expect(result!.project.actorsById.hero!.battler!.baseStats.maxHP).toBe(237)
  expect(f.target.json('.type-pal/save-state.json').phase).toBe('committed')
  expect(authorSaveStorage.receipts.get(result!.workspace.workspaceId)?.phase).toBe('committed')
  expect(await loadWorkspaceRecord(result!.workspace.workspaceId)).toMatchObject({
    projectId: f.loaded.workspace.projectId,
    handle: f.target.dir,
    mode: result!.workspace.mode,
    source: f.mode === 'local' ? 'save-as' : 'sandbox-copy',
  })
  for (const asset of Object.values(f.loaded.project.assetCatalog.assets))
    expect(f.target.files.get(asset.path)).toEqual(f.source.files.get(asset.path))
}

test('cancel Save As before file construction; the same valid input can still be saved afterward', async () => {
  const f = await fixture()
  const sourceBefore = diskEvidence(f.source),
    targetBefore = diskEvidence(f.target),
    registryBefore = registryEvidence()
  f.picker.mockRejectedValueOnce(new DOMException('cancel picker', 'AbortError'))
  await expect(f.save()).resolves.toBeNull()
  expect(f.picker).toHaveBeenCalledOnce()
  expect(f.build).not.toHaveBeenCalled()
  expect(diskEvidence(f.source)).toEqual(sourceBefore)
  expect(diskEvidence(f.target)).toEqual(targetBefore)
  expect(registryEvidence()).toEqual(registryBefore)
  const result = await f.save()
  await assertSaved(f, result)
  expect(f.build).toHaveBeenCalledOnce()
  expect(diskEvidence(f.source)).toEqual(sourceBefore)
})

test('build failure propagates its original error without target staging or recent registration', async () => {
  const f = await fixture()
  const failure = new Error('current editor serialization failed')
  const sourceBefore = diskEvidence(f.source),
    targetBefore = diskEvidence(f.target),
    registryBefore = registryEvidence()
  f.build.mockRejectedValueOnce(failure)
  await expect(f.save()).rejects.toBe(failure)
  expect(f.build).toHaveBeenCalledOnce()
  expect(diskEvidence(f.source)).toEqual(sourceBefore)
  expect(diskEvidence(f.target)).toEqual(targetBefore)
  expect(registryEvidence()).toEqual(registryBefore)
  await assertSaved(f, await f.save())
  expect(diskEvidence(f.source)).toEqual(sourceBefore)
})

test.each([
  'local',
  'source-only',
] as const)('missing source evidence rejects %s Save As before target mutation; genuine evidence is the positive control', async (mode) => {
  const f = await fixture(mode)
  const sourceBefore = diskEvidence(f.source),
    targetBefore = diskEvidence(f.target),
    registryBefore = registryEvidence()
  // Optional at the TS boundary does not mean optional authorization. Current code may build
  // first when no evidence was supplied; do not falsely claim the callback is never invoked.
  await expect(saveProjectAs(f.loaded.workspace, f.build, f.sourceDir)).rejects.toThrow(
    '另存为缺少源项目基线，请重新打开项目',
  )
  expect(diskEvidence(f.source)).toEqual(sourceBefore)
  expect(diskEvidence(f.target)).toEqual(targetBefore)
  expect(registryEvidence()).toEqual(registryBefore)
  await assertSaved(f, await f.save())
  expect(diskEvidence(f.source)).toEqual(sourceBefore)
})

test.each([
  'local',
  'source-only',
] as const)('stale %s author baseline rejects before invoking the file builder', async (mode) => {
  const f = await fixture(mode)
  const path = f.loaded.project.manifest.content.actors!
  const original = f.source.files.get(path)!.slice(0)
  const externallyChanged = f.source.json(path)
  externallyChanged[0].battler.baseStats.maxHP = 777
  f.source.set(path, externallyChanged)
  const sourceBefore = diskEvidence(f.source),
    targetBefore = diskEvidence(f.target),
    registryBefore = registryEvidence()
  await expect(f.save()).rejects.toThrow('项目文件已在其他位置修改')
  expect(f.build).not.toHaveBeenCalled()
  expect(diskEvidence(f.source)).toEqual(sourceBefore)
  expect(diskEvidence(f.target)).toEqual(targetBefore)
  expect(registryEvidence()).toEqual(registryBefore)
  f.source.set(path, original)
  await assertSaved(f, await f.save())
  expect(f.build).toHaveBeenCalledOnce()
})

test.each([
  ['local', false],
  ['local', true],
  ['source-only', false],
  ['source-only', true],
] as const)('Save As %s keeps committed data and propagates cleanup warning=%s through open/reopen', async (mode, denyCleanup) => {
  const f = await fixture(mode)
  const sourceBefore = diskEvidence(f.source)
  const sourceRecord = await loadWorkspaceRecord(f.loaded.workspace.workspaceId)
  let attempts = 0
  f.target.hooks.beforeRemove = (path) => {
    if (path.includes('/blobs/')) {
      attempts++
      if (denyCleanup) throw new DOMException('save-as cleanup denied', 'NotAllowedError')
    }
  }
  const result = await f.save()
  await assertSaved(f, result)
  expect(attempts).toBeGreaterThan(0)
  expect(result!.recoveryWarning).toEqual(
    denyCleanup ? expect.stringContaining('save-as cleanup denied') : undefined,
  )
  expect(diskEvidence(f.source)).toEqual(sourceBefore)
  expect(await loadWorkspaceRecord(f.loaded.workspace.workspaceId)).toEqual(sourceRecord)
  const authorWrites = f.target.changes.closes.filter((p) => !p.startsWith('.type-pal/'))
  expect(authorWrites.length).toBeGreaterThan(0)
  const reopened = await finishOpen(f.target.dir)
  expect(reopened.recoveryWarning).toEqual(
    denyCleanup ? expect.stringContaining('save-as cleanup denied') : undefined,
  )
  expect(reopened.project.actorsById.hero!.battler!.baseStats.maxHP).toBe(237)
  expect(reopened.workspace.workspaceId).toBe(result!.workspace.workspaceId)
  expect(f.target.changes.closes.filter((p) => !p.startsWith('.type-pal/'))).toEqual(authorWrites)
  f.target.hooks.beforeRemove = undefined
  const cleaned = await finishOpen(f.target.dir)
  expect(cleaned.recoveryWarning).toBeUndefined()
  expect(cleaned.project.actorsById.hero!.battler!.baseStats.maxHP).toBe(237)
  expect(authorSaveStorage.receipts.get(cleaned.workspace.workspaceId)?.staged).toEqual({})
  expect(f.target.changes.closes.filter((p) => !p.startsWith('.type-pal/'))).toEqual(authorWrites)
  expect(diskEvidence(f.source)).toEqual(sourceBefore)
})
