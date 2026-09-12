/** Public record-open contract before/after private local-only helper cleanup. */
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)

import type { WorkspaceHandleRecord } from './handle-store.js'
import { finishOpen } from './open-actions.js'
import { buildBlankProject } from './seed.js'
import {
  createLocalWorkspaceContext,
  createSandboxWorkspaceContext,
  PAL_DEVELOPMENT_SENTINEL_PATH,
  SANDBOX_WORKSPACE_MARKER_PATH,
  sandboxMarkerFor,
} from './workspace-context.js'
import { resolveOpenedWorkspaceContext } from './workspace-persistence.js'

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
function evidence(disk: Disk) {
  return {
    files: [...disk.files].map(([path, bytes]) => [path, [...new Uint8Array(bytes)]]),
    io: structuredClone(disk.changes),
    records: [...records.values()].map(copyRecord),
    commits: [...commits],
    receipts: [...authorSaveStorage.receipts.values()].map((r) =>
      structuredClone({ ...r, handle: undefined }),
    ),
  }
}
const resolve = (disk: Disk, projectId: string) =>
  resolveOpenedWorkspaceContext(disk.dir, projectId, {
    loadTrustedPalContext: async () => {
      throw new Error('missing-marker path must not request PAL proof')
    },
  })

test.each([
  'blank-project',
  'pal-development-snapshot-clone',
  'save-as',
  'local-directory',
] as const)('local recent source %s survives real registration and reopen without a hint', async (source) => {
  const disk = memoryAuthorDirectory(await buildBlankProject('local-record'))
  const context = createLocalWorkspaceContext('local-record', source)
  const first = await finishOpen(disk.dir, { workspaceHint: context })
  const again = await finishOpen(disk.dir)
  expect(again.workspace).toEqual(first.workspace)
  expect(again.workspace).toMatchObject({
    mode: 'local-project',
    source,
    workspaceId: context.workspaceId,
  })
  const before = evidence(disk)
  expect(await resolve(disk, 'local-record')).toEqual(first.workspace)
  expect(evidence(disk)).toEqual(before)
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
})

async function restricted(
  kind: 'sandbox' | 'pal',
  source: 'ui-samples' | 'sandbox-copy' | 'review-copy' = 'ui-samples',
) {
  const id = kind === 'pal' ? 'pal' : 'restricted-record',
    files = await buildBlankProject(id)
  const marker = kind === 'pal' ? PAL_DEVELOPMENT_SENTINEL_PATH : SANDBOX_WORKSPACE_MARKER_PATH
  if (kind === 'pal')
    files[marker] = {
      kind: 'type-pal-editor-pal-development',
      version: 1,
      projectId: id,
      workspaceId: crypto.randomUUID(),
    }
  else files[marker] = sandboxMarkerFor(createSandboxWorkspaceContext(id, source))
  const trusted = memoryAuthorDirectory(files),
    disk = memoryAuthorDirectory(files)
  if (kind === 'pal')
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const raw = String(input),
          prefix = 'projects/pal/'
        if (!raw.includes(prefix)) throw new Error(`unexpected trusted source URL: ${raw}`)
        const path = decodeURIComponent(
          raw.slice(raw.lastIndexOf(prefix) + prefix.length).split('?')[0]!,
        )
        const bytes = trusted.files.get(path)
        return bytes === undefined
          ? new Response(null, { status: 404 })
          : new Response(bytes.slice(0))
      }),
    )
  const opened = await finishOpen(disk.dir)
  expect(opened.workspace.mode).toBe(kind === 'pal' ? 'pal-development' : 'sandbox')
  expect(records.get(opened.workspace.workspaceId)?.handle).toBe(disk.dir)
  const originalMarker = disk.files.get(marker)!.slice(0)
  disk.files.delete(marker) // externally removed metadata, not a product mutation
  return { disk, opened, marker, originalMarker, id }
}

test.each([
  'ui-samples',
  'sandbox-copy',
  'review-copy',
] as const)('sandbox source %s with lost marker is refused before record conversion; restoring marker reopens safely', async (source) => {
  const f = await restricted('sandbox', source),
    before = evidence(f.disk)
  await expect(finishOpen(f.disk.dir)).rejects.toThrow(
    '工作区 marker 缺失，拒绝把受限工作区降级为普通本地项目',
  )
  await expect(resolve(f.disk, f.id)).rejects.toThrow(
    '工作区 marker 缺失，拒绝把受限工作区降级为普通本地项目',
  )
  expect(evidence(f.disk)).toEqual(before)
  f.disk.set(f.marker, f.originalMarker)
  const again = await finishOpen(f.disk.dir)
  expect(again.workspace).toEqual(f.opened.workspace)
  expect(f.disk.changes).toEqual({ creates: [], closes: [], removes: [] })
})

test('PAL recent with lost sentinel cannot become local; independent trusted source permits reopen after restoration', async () => {
  const f = await restricted('pal'),
    before = evidence(f.disk)
  await expect(finishOpen(f.disk.dir)).rejects.toThrow(
    '工作区 marker 缺失，拒绝把受限工作区降级为普通本地项目',
  )
  await expect(resolve(f.disk, f.id)).rejects.toThrow(
    '工作区 marker 缺失，拒绝把受限工作区降级为普通本地项目',
  )
  expect(evidence(f.disk)).toEqual(before)
  f.disk.set(f.marker, f.originalMarker)
  const again = await finishOpen(f.disk.dir)
  expect(again.workspace).toEqual(f.opened.workspace)
  expect(f.disk.changes).toEqual({ creates: [], closes: [], removes: [] })
})

test.each([
  'sandbox',
  'pal',
] as const)('public resolver rejects %s record even when corrupted source looks local', async (kind) => {
  const f = await restricted(kind)
  const record = records.get(f.opened.workspace.workspaceId)!
  // Deliberate external record corruption, not a valid constructor output or forged private brand.
  records.set(record.workspaceId, { ...record, source: 'local-directory' })
  const before = evidence(f.disk)
  // Direct public resolver pins the caller guard; a later registration guard is not a substitute.
  await expect(resolve(f.disk, f.id)).rejects.toThrow(
    '工作区 marker 缺失，拒绝把受限工作区降级为普通本地项目',
  )
  expect(evidence(f.disk)).toEqual(before)
  records.set(record.workspaceId, record)
  f.disk.set(f.marker, f.originalMarker)
  expect((await finishOpen(f.disk.dir)).workspace).toEqual(f.opened.workspace)
})

test('local-only record conversion still rejects a corrupted nonlocal source and preserves the record', async () => {
  const disk = memoryAuthorDirectory(await buildBlankProject('bad-local-source'))
  const opened = await finishOpen(disk.dir),
    record = records.get(opened.workspace.workspaceId)!
  records.set(record.workspaceId, { ...record, source: 'ui-samples' })
  const before = evidence(disk)
  await expect(resolve(disk, opened.workspace.projectId)).rejects.toThrow(
    '最近项目记录的 local-project 来源无效',
  )
  expect(evidence(disk)).toEqual(before)
  records.set(record.workspaceId, record)
  expect((await finishOpen(disk.dir)).workspace).toEqual(opened.workspace)
})
