/** Current read-only inventory + staged writer; substitutes implement FSA/IDB storage only. */
import type { CurrentManifest } from '@type-pal/content'
import { fsaSource } from '@type-pal/reforge'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { deferred, memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)

import { readDirectoryCopy } from './fsa-copy.js'
import type { WorkspaceHandleRecord } from './handle-store.js'
import { openLocalProject } from './open-local.js'
import { observeProjectCopySource } from './project-copy-source.js'
import { writeProject } from './project-io.js'
import { buildBlankProject } from './seed.js'
import {
  createLocalWorkspaceContext,
  createSandboxWorkspaceContext,
  isWorkspaceIdentityPath,
  PAL_DEVELOPMENT_SENTINEL_PATH,
  SANDBOX_WORKSPACE_MARKER_PATH,
  sandboxMarkerFor,
} from './workspace-context.js'
import {
  authorizeFirstSaveTarget,
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
  // Keep registration/identity/locks real; publish puts only after request success, at completion.
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
const fileSnapshot = (disk: Disk) =>
  [...disk.files].map(([path, bytes]) => [path, [...new Uint8Array(bytes)]])
const authorIo = (disk: Disk) =>
  Object.values(disk.changes)
    .flat()
    .filter((path) => !isWorkspaceIdentityPath(path))
const authorFiles = (files: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(files).filter(([, value]) => !(value instanceof ArrayBuffer)))

async function fixture() {
  const files = await buildBlankProject('directory-copy')
  const binary = new Uint8Array([0, 1, 2, 250, 255]).buffer
  const source = memoryAuthorDirectory({
    ...files,
    'notes/nested/text.txt': 'nested text\n原始字节',
    'notes/nested/data.bin': binary,
    'notes/keep.txt': 'unrelated source note',
  })
  await source.dir.getDirectoryHandle('empty', { create: true })
  source.resetChanges()
  return { files, source, binary }
}

test('readDirectoryCopy inventories nested and empty directories without reading bytes, excludes private identity aliases, and reads lazily', async () => {
  const { source } = await fixture()
  for (const path of [
    SANDBOX_WORKSPACE_MARKER_PATH,
    PAL_DEVELOPMENT_SENTINEL_PATH,
    '.type-pal/save-recovery/old/plan.json',
    '.TYPE-PAL/alias.json',
    '.type-pal./windows-alias.json',
  ])
    source.set(path, { private: path })
  const reads: string[] = []
  source.hooks.afterRead = (path) => {
    reads.push(path)
  }
  const before = fileSnapshot(source)
  const copied = await readDirectoryCopy(source.dir, fsaSource(source.dir))
  expect(copied.copies.map((input) => input.path)).toEqual(
    [...source.files.keys()].filter((path) => !isWorkspaceIdentityPath(path)).sort(),
  )
  expect(copied.directories).toEqual([...copied.directories].sort())
  expect(copied.directories).toEqual(expect.arrayContaining(['empty', 'notes', 'notes/nested']))
  expect(copied.directories.some(isWorkspaceIdentityPath)).toBe(false)
  await copied.verify()
  expect(reads).toEqual([])
  expect(fileSnapshot(source)).toEqual(before)
  expect(source.changes).toEqual({ creates: [], closes: [], removes: [] })

  source.set('notes/nested/text.txt', 'bytes changed after inventory')
  const text = copied.copies.find((input) => input.path === 'notes/nested/text.txt')!
  expect(await (await text.read()).text()).toBe('bytes changed after inventory')
  expect(reads).toEqual(['notes/nested/text.txt'])
  expect(records.size).toBe(0)
  expect(authorSaveStorage.receipts.size).toBe(0)
})

test.each([
  'add-file',
  'remove-file',
  'add-directory',
  'remove-empty-directory',
] as const)('readDirectoryCopy verify rejects %s inventory drift without reading or modifying file contents', async (change) => {
  const { source } = await fixture()
  const reads: string[] = []
  source.hooks.afterRead = (path) => {
    reads.push(path)
  }
  const copied = await readDirectoryCopy(source.dir, fsaSource(source.dir))
  if (change === 'add-file') source.set('external.txt', 'external')
  else if (change === 'remove-file') source.files.delete('notes/keep.txt')
  else if (change === 'add-directory')
    await source.dir.getDirectoryHandle('external-empty', { create: true })
  else await source.dir.removeEntry('empty')
  const before = { files: fileSnapshot(source), io: structuredClone(source.changes) }
  await expect(copied.verify()).rejects.toThrow('源项目文件清单在复制期间变化')
  expect({ files: fileSnapshot(source), io: source.changes }).toEqual(before)
  expect(reads).toEqual([])
  expect(records.size).toBe(0)
  expect(authorSaveStorage.receipts.size).toBe(0)
})

test('inventory verification and observed byte verification retain distinct responsibilities', async () => {
  const { source } = await fixture()
  const observed = await observeProjectCopySource(fsaSource(source.dir))
  const copied = await readDirectoryCopy(source.dir, observed.source)
  const note = copied.copies.find((input) => input.path === 'notes/keep.txt')!
  expect(await (await note.read()).text()).toBe('unrelated source note')
  source.set('notes/keep.txt', 'external content change without inventory change')
  const before = fileSnapshot(source)
  await expect(copied.verify()).resolves.toBeUndefined()
  await expect(observed.verify()).rejects.toThrow('notes/keep.txt')
  expect(fileSnapshot(source)).toEqual(before)
  expect(source.changes).toEqual({ creates: [], closes: [], removes: [] })
})

test('current copy writer preserves nested bytes, real canonical assets and empty directories while author overrides win and source identity stays private', async () => {
  const { source, files, binary } = await fixture()
  const sourceContext = createSandboxWorkspaceContext('directory-copy', 'review-copy')
  source.set(SANDBOX_WORKSPACE_MARKER_PATH, sandboxMarkerFor(sourceContext))
  source.set('.type-pal/save-recovery/old/plan.json', 'old private plan')
  source.set('.TYPE-PAL/alias.json', 'case alias')
  source.set('.type-pal./windows-alias.json', 'trailing-dot alias')
  const sourceBefore = fileSnapshot(source)
  const observed = await observeProjectCopySource(fsaSource(source.dir))
  const copied = await readDirectoryCopy(source.dir, observed.source)
  const target = memoryAuthorDirectory()
  const context = createSandboxWorkspaceContext('directory-copy', 'sandbox-copy')
  const overrides = authorFiles(files)
  overrides['manifest.json'] = {
    ...(files['manifest.json'] as CurrentManifest),
    name: 'current author name',
  }
  const result = await withAuthorizedWorkspaceMutation(
    await authorizeFirstSaveTarget(context, target.dir),
    async (mutation) => {
      await registerAuthorizedWorkspaceMutation(mutation, context, target.dir.name)
      return writeProject(mutation, overrides, {
        copies: copied.copies,
        directories: copied.directories,
        verifySource: async () => {
          await copied.verify()
          await observed.verify()
        },
      })
    },
  )
  expect(result.cleanupWarning).toBeUndefined()
  expect((await openLocalProject(target.dir)).project.manifest.name).toBe('current author name')
  expect(target.files.get('notes/nested/data.bin')).toEqual(binary)
  expect(target.files.get('notes/nested/text.txt')).toEqual(
    source.files.get('notes/nested/text.txt'),
  )
  expect(await fsaSource(target.dir).readText('notes/keep.txt')).toBe('unrelated source note')
  expect(Object.values(files).some((value) => value instanceof ArrayBuffer)).toBe(true)
  for (const [path, bytes] of Object.entries(files))
    if (bytes instanceof ArrayBuffer) expect(target.files.get(path)).toEqual(bytes)
  await expect(target.dir.getDirectoryHandle('empty')).resolves.toMatchObject({ kind: 'directory' })
  expect(target.json(SANDBOX_WORKSPACE_MARKER_PATH)).toEqual(sandboxMarkerFor(context))
  expect(context.workspaceId).not.toBe(sourceContext.workspaceId)
  for (const path of [
    PAL_DEVELOPMENT_SENTINEL_PATH,
    '.type-pal/save-recovery/old/plan.json',
    '.TYPE-PAL/alias.json',
    '.type-pal./windows-alias.json',
  ])
    expect(target.files.has(path)).toBe(false)
  expect(target.json('.type-pal/save-state.json').phase).toBe('committed')
  expect(authorSaveStorage.receipts.get(context.workspaceId)?.phase).toBe('committed')
  expect(records.get(context.workspaceId)?.mode).toBe('sandbox')
  expect(commits).toEqual([context.workspaceId])
  expect(fileSnapshot(source)).toEqual(sourceBefore)
  expect(source.changes).toEqual({ creates: [], closes: [], removes: [] })
})

test.each([
  'flat',
  'nested-first',
  'empty-first',
] as const)('slow %s copy read cannot publish author files or directories before target drift is rechecked', async (kind) => {
  const { source, files } = await fixture()
  const slowPath = kind === 'nested-first' ? '000-nested/late.txt' : '000-late.txt'
  source.set(slowPath, 'slow source bytes')
  if (kind === 'empty-first') await source.dir.getDirectoryHandle('000-empty', { create: true })
  source.resetChanges()
  const sourceBefore = fileSnapshot(source)
  const observed = await observeProjectCopySource(fsaSource(source.dir))
  const copied = await readDirectoryCopy(source.dir, observed.source)
  if (kind !== 'flat')
    expect(copied.directories[0]).toBe(kind === 'nested-first' ? '000-nested' : '000-empty')
  const target = memoryAuthorDirectory()
  const context = createLocalWorkspaceContext('directory-copy', 'save-as')
  const authorization = await authorizeFirstSaveTarget(context, target.dir)
  const started = deferred()
  const release = deferred()
  let slowReads = 0
  source.hooks.afterRead = async (path) => {
    if (path !== slowPath || slowReads) return
    slowReads++
    started.resolve()
    await release.promise
  }
  const saving = withAuthorizedWorkspaceMutation(authorization, async (mutation) => {
    await registerAuthorizedWorkspaceMutation(mutation, context, target.dir.name)
    return writeProject(mutation, authorFiles(files), {
      copies: copied.copies,
      directories: copied.directories,
      verifySource: async () => {
        await copied.verify()
        await observed.verify()
      },
    })
  })
  // Attach rejection handling before releasing the deferred host IO.
  const rejected = expect(saving).rejects.toThrow('目标文件夹必须为空')
  await started.promise
  try {
    expect(authorIo(target)).toEqual([])
    expect(records.size).toBe(0)
    target.set('intruder.txt', 'external target bytes')
  } finally {
    release.resolve()
  }
  await rejected
  expect(slowReads).toBe(1)
  expect(authorIo(target)).toEqual([])
  expect([...target.files.keys()].filter((path) => !isWorkspaceIdentityPath(path))).toEqual([
    'intruder.txt',
  ])
  expect(await fsaSource(target.dir).readText('intruder.txt')).toBe('external target bytes')
  for (const directory of copied.directories)
    await expect(target.dir.getDirectoryHandle(directory.split('/')[0]!)).rejects.toMatchObject({
      name: 'NotFoundError',
    })
  expect(target.json('.type-pal/save-state.json').phase).toBe('pending')
  expect(authorSaveStorage.receipts.get(context.workspaceId)?.phase).toBe('ready')
  expect(records.size).toBe(0)
  expect(commits).toEqual([])
  expect(fileSnapshot(source)).toEqual(sourceBefore)
  expect(source.changes).toEqual({ creates: [], closes: [], removes: [] })
})
