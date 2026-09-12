/** Public policy/writer/recovery calls; substitutes implement only FSA and origin storage. */
import type { CurrentManifest } from '@type-pal/content'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)

import { createEmptyAuthorDiskBaseline } from './author-disk-baseline.js'
import { loadWorkspaceRecord, type WorkspaceHandleRecord } from './handle-store.js'
import { openLocalProject } from './open-local.js'
import { resumeOwnProjectSave, writeProject } from './project-io.js'
import { buildBlankProject } from './seed.js'
import {
  createLocalWorkspaceContext,
  createSandboxWorkspaceContext,
  PAL_DEVELOPMENT_SENTINEL_PATH,
  SANDBOX_WORKSPACE_MARKER_PATH,
  sandboxMarkerFor,
} from './workspace-context.js'
import {
  type AuthorizedWorkspaceMutation,
  authorizeFirstSaveTarget,
  beginAuthorizedWorkspaceMutation,
  inspectWorkspaceMetadata,
  registerAuthorizedWorkspaceMutation,
  withAuthorizedWorkspaceMutation,
} from './workspace-persistence.js'

const records = new Map<string, WorkspaceHandleRecord>()
const commits: string[] = []
const copyRecord = (value: WorkspaceHandleRecord | undefined) =>
  value && { ...structuredClone({ ...value, handle: undefined }), handle: value.handle }

beforeEach(() => {
  records.clear()
  commits.length = 0
  authorSaveStorage.receipts.clear()
  // Keep handle-store's registration, identity checks and locks real. Publish writes only at
  // transaction completion, independently of the earlier request-success notification.
  vi.stubGlobal('indexedDB', {
    open(name: string, version: number) {
      expect([name, version]).toEqual(['type-pal-editor', 2])
      const opened = {
        onsuccess: null as (() => void) | null,
        result: {
          transaction(store: string, mode: IDBTransactionMode) {
            expect(store).toBe('project-handles')
            const transaction = {
              oncomplete: null as (() => void) | null,
              objectStore() {
                function request<T>(read: () => T, commit = () => {}) {
                  const result = {
                    result: undefined as T | undefined,
                    onsuccess: null as (() => void) | null,
                  }
                  queueMicrotask(() => {
                    result.result = read()
                    result.onsuccess?.()
                    queueMicrotask(() => {
                      commit()
                      transaction.oncomplete?.()
                    })
                  })
                  return result
                }
                return {
                  get: (id: string) => request(() => copyRecord(records.get(id))),
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
            return transaction
          },
        },
      }
      queueMicrotask(() => opened.onsuccess?.())
      return opened
    },
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

type Disk = ReturnType<typeof memoryAuthorDirectory>
function evidence(disk: Disk) {
  return {
    files: [...disk.files].map(([path, bytes]) => [path, [...new Uint8Array(bytes)]]),
    io: structuredClone(disk.changes),
    records: [...records.values()].map(copyRecord),
    commits: [...commits],
    receipts: [...authorSaveStorage.receipts.values()].map((receipt) =>
      structuredClone({ ...receipt, handle: undefined }),
    ),
  }
}

/** A second root handle retains the same filesystem node and forwards all IO to that node. */
function repickDirectory(disk: Disk): FileSystemDirectoryHandle {
  const root = disk.dir
  const sameEntry = root.isSameEntry.bind(root)
  const repicked = {
    kind: 'directory',
    name: root.name,
    isSameEntry: (other: FileSystemHandle) => sameEntry(other === repicked ? root : other),
    entries: () => root.entries(),
    getDirectoryHandle: (name: string, options?: FileSystemGetDirectoryOptions) =>
      root.getDirectoryHandle(name, options),
    getFileHandle: (name: string, options?: FileSystemGetFileOptions) =>
      root.getFileHandle(name, options),
    removeEntry: (name: string, options?: FileSystemRemoveOptions) =>
      root.removeEntry(name, options),
    resolve: (other: FileSystemHandle) => root.resolve(other === repicked ? root : other),
  } as FileSystemDirectoryHandle
  vi.spyOn(root, 'isSameEntry').mockImplementation((other) =>
    sameEntry(other === repicked ? root : other),
  )
  return repicked
}

async function interruptedFirstSave() {
  const files = await buildBlankProject('repicked-first-save')
  const disk = memoryAuthorDirectory()
  const context = createLocalWorkspaceContext('repicked-first-save', 'blank-project')
  const baseline = createEmptyAuthorDiskBaseline(context.projectId)
  const target = await authorizeFirstSaveTarget(context, disk.dir, { authorBaseline: baseline })
  const failure = new DOMException('first-save manifest close interrupted', 'AbortError')
  let failedCloses = 0
  disk.hooks.beforeClose = (path) => {
    if (path !== 'manifest.json') return
    failedCloses++
    throw failure
  }
  await expect(
    withAuthorizedWorkspaceMutation(target, async (mutation) => {
      await registerAuthorizedWorkspaceMutation(mutation, context, disk.dir.name)
      return writeProject(mutation, files, { prevSnapshot: new Map() })
    }),
  ).rejects.toBe(failure)
  disk.hooks.beforeClose = undefined
  expect(failedCloses).toBe(1)
  expect(disk.changes.closes.some((path) => !path.startsWith('.type-pal/'))).toBe(true)
  expect(disk.json('.type-pal/save-state.json').phase).toBe('pending')
  expect(authorSaveStorage.receipts.get(context.workspaceId)?.phase).toBe('applying')
  expect(records.size).toBe(0)
  expect(commits).toEqual([])
  return { disk, context, baseline, files }
}

test('first-save owner recovers through a repicked handle and retains its author baseline on public retry', async () => {
  const { disk, context, baseline, files } = await interruptedFirstSave()
  const repicked = repickDirectory(disk)
  expect(repicked).not.toBe(disk.dir)
  expect(await disk.dir.isSameEntry(repicked)).toBe(true)
  expect(await repicked.isSameEntry(disk.dir)).toBe(true)
  const pendingOperation = disk.json('.type-pal/save-state.json').operationId

  const recovered = await resumeOwnProjectSave(context, repicked, baseline)
  expect(recovered?.snapshot.size).toBe(Object.keys(files).length)
  expect(disk.json('.type-pal/save-state.json')).toMatchObject({
    phase: 'committed',
    operationId: pendingOperation,
  })
  expect(authorSaveStorage.receipts.get(context.workspaceId)?.phase).toBe('committed')
  expect((await loadWorkspaceRecord(context.workspaceId))?.workspaceId).toBe(context.workspaceId)
  expect(commits).toEqual([context.workspaceId])

  // Omit authorBaseline intentionally: this exported retry API must reuse its own original
  // baseline across handle identities, never replace the now nonempty directory with an empty one.
  disk.resetChanges()
  const recoveredBefore = evidence(disk)
  const retry = await authorizeFirstSaveTarget(context, repicked, {
    resumesInterruptedAttempt: true,
  })
  expect(evidence(disk)).toEqual(recoveredBefore)
  const nextFiles = {
    ...files,
    'manifest.json': { ...(files['manifest.json'] as CurrentManifest), name: 'after repick' },
  }
  const result = await writeProject(retry, nextFiles, { prevSnapshot: recovered!.snapshot })
  expect(result.cleanupWarning).toBeUndefined()
  expect(result.snapshot.size).toBe(Object.keys(files).length)
  expect(disk.changes.closes.filter((path) => !path.startsWith('.type-pal/'))).toEqual([
    'manifest.json',
  ])
  expect(disk.json('manifest.json').name).toBe('after repick')
  expect(disk.json('.type-pal/save-state.json').phase).toBe('committed')
  expect(authorSaveStorage.receipts.get(context.workspaceId)?.phase).toBe('committed')
  expect(records.size).toBe(1)
  expect(commits).toEqual([context.workspaceId])
  expect((await openLocalProject(repicked)).project.manifest.name).toBe('after repick')
})

test('a copied partial first-save directory is not the owner handle and changes neither target nor receipt', async () => {
  const { disk, context, baseline } = await interruptedFirstSave()
  const copy = memoryAuthorDirectory(Object.fromEntries(disk.files))
  expect(await disk.dir.isSameEntry(copy.dir)).toBe(false)
  expect(await copy.dir.isSameEntry(disk.dir)).toBe(false)
  const originalBefore = evidence(disk)
  const copyBefore = evidence(copy)
  await expect(resumeOwnProjectSave(context, copy.dir, baseline)).rejects.toThrow(
    '保存重试与原页面的目录或作者基线不符',
  )
  await expect(
    authorizeFirstSaveTarget(context, copy.dir, { resumesInterruptedAttempt: true }),
  ).rejects.toThrow('目标文件夹必须为空')
  expect(evidence(disk)).toEqual(originalBefore)
  expect(evidence(copy)).toEqual(copyBefore)
  expect(records.size).toBe(0)
  expect(commits).toEqual([])
})

test.each([
  'invalid-sandbox',
  'pal-sentinel',
] as const)('sandbox authorization rejects %s appearing before scope entry, preserving all disk and storage evidence', async (fault) => {
  const disk = memoryAuthorDirectory()
  const context = createSandboxWorkspaceContext('sandbox-final-boundary', 'review-copy')
  const files = await buildBlankProject(context.projectId)
  const target = await authorizeFirstSaveTarget(context, disk.dir)
  if (fault === 'invalid-sandbox') disk.set(SANDBOX_WORKSPACE_MARKER_PATH, '{')
  else
    disk.set(PAL_DEVELOPMENT_SENTINEL_PATH, {
      kind: 'type-pal-editor-pal-development',
      version: 1,
      workspaceId: crypto.randomUUID(),
      projectId: context.projectId,
    })
  const metadata = await inspectWorkspaceMetadata(disk.dir)
  expect(fault === 'invalid-sandbox' ? metadata.sandbox.kind : metadata.palDevelopment.kind).toBe(
    fault === 'invalid-sandbox' ? 'invalid' : 'valid',
  )
  const before = evidence(disk)
  await expect(writeProject(target, files)).rejects.toThrow(
    '新沙盒目标的 workspace identity 已发生变化',
  )
  expect(evidence(disk)).toEqual(before)
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(authorSaveStorage.receipts.size).toBe(0)
  expect(records.size).toBe(0)
  expect(commits).toEqual([])
})

test('unchanged sandbox target completes the same writer and registers only its original restricted identity', async () => {
  const disk = memoryAuthorDirectory()
  const context = createSandboxWorkspaceContext('sandbox-final-boundary', 'review-copy')
  const files = await buildBlankProject(context.projectId)
  const target = await authorizeFirstSaveTarget(context, disk.dir)
  const result = await withAuthorizedWorkspaceMutation(target, async (mutation) => {
    await registerAuthorizedWorkspaceMutation(mutation, context, disk.dir.name)
    return writeProject(mutation, files)
  })
  expect(result.snapshot.size).toBe(Object.keys(files).length)
  expect(result.cleanupWarning).toBeUndefined()
  expect(disk.json(SANDBOX_WORKSPACE_MARKER_PATH)).toEqual(sandboxMarkerFor(context))
  expect(disk.files.has(PAL_DEVELOPMENT_SENTINEL_PATH)).toBe(false)
  expect(disk.json('.type-pal/save-state.json').phase).toBe('committed')
  expect(authorSaveStorage.receipts.get(context.workspaceId)?.phase).toBe('committed')
  expect(records.size).toBe(1)
  expect(commits).toEqual([context.workspaceId])
  expect(await loadWorkspaceRecord(context.workspaceId)).toMatchObject({
    workspaceId: context.workspaceId,
    projectId: context.projectId,
    mode: 'sandbox',
    source: 'review-copy',
  })
  expect((await openLocalProject(disk.dir)).project.manifest.id).toBe(context.projectId)
})

test('a genuine finalized or expired writer scope cannot begin another author mutation', async () => {
  const disk = memoryAuthorDirectory()
  const context = createLocalWorkspaceContext('finalized-write-scope', 'blank-project')
  const files = await buildBlankProject(context.projectId)
  let captured!: AuthorizedWorkspaceMutation
  await withAuthorizedWorkspaceMutation(
    await authorizeFirstSaveTarget(context, disk.dir),
    async (scope) => {
      captured = scope
      await registerAuthorizedWorkspaceMutation(scope, context, disk.dir.name)
      await writeProject(scope, files)
      expect(disk.json('.type-pal/save-state.json').phase).toBe('committed')
      const before = evidence(disk)
      await expect(beginAuthorizedWorkspaceMutation(scope)).rejects.toThrow(
        '拒绝未经 workspace persistence policy 授权的目录写入',
      )
      expect(evidence(disk)).toEqual(before)
    },
  )
  const before = evidence(disk)
  await expect(beginAuthorizedWorkspaceMutation(captured)).rejects.toThrow(
    '拒绝未经 workspace persistence policy 授权的目录写入',
  )
  expect(evidence(disk)).toEqual(before)
  expect((await openLocalProject(disk.dir)).project.manifest.id).toBe(context.projectId)
})
