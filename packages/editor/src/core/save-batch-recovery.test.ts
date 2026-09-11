/**
 * EDITOR-SAVE-RECOVERY-1 · batch-r1 剩余项：S1/S2/S3（真实 handle-store + 可控 IDB 边界）、
 * B2（基线身份别名/异目录）、B5（resumeOwnProjectSave 回调/snapshot）。
 * 本文件不 mock handle-store/author-save-store 之外的任何被测逻辑；IDB 为带故障注入的内存边界。
 */
import type { CurrentManifest } from '@type-pal/content'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)
beforeEach(() => authorSaveStorage.receipts.clear())

import { verifyOpenedAuthorBaseline } from './author-disk-baseline.js'
import {
  loadWorkspaceRecord,
  saveWorkspaceHandle,
  saveWorkspaceHandleUnderLock,
  type WorkspaceHandleRecord,
  withWorkspaceRegistrationLock,
} from './handle-store.js'

const underLock = (
  workspace: { workspaceId: string } & Parameters<typeof saveWorkspaceHandleUnderLock>[1],
  name: string,
  handle: FileSystemDirectoryHandle,
) =>
  withWorkspaceRegistrationLock(workspace.workspaceId, (lock) =>
    saveWorkspaceHandleUnderLock(lock, workspace, name, handle),
  )

import { finishOpen } from './open-actions.js'
import { resumeOwnProjectSave, writeProject } from './project-io.js'
import { buildBlankProject } from './seed.js'
import { createLocalWorkspaceContext } from './workspace-context.js'
import { authorizeBoundWorkspaceTarget, authorizeFirstSaveTarget } from './workspace-persistence.js'

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'indexedDB')
  vi.restoreAllMocks()
})

// ── 可控内存 IDB 边界（真实 handle-store 代码全程驱动） ──
interface Faults {
  openError?: boolean
  abortAfterRequestSuccess?: boolean
}
function installControllableIndexedDb(faults: Faults = {}) {
  const records = new Map<string, unknown>()
  const request = <T>(run: () => T): IDBRequest<T> => {
    const value = {
      result: undefined as T,
      error: null,
      onsuccess: null as ((event: Event) => void) | null,
      onerror: null as ((event: Event) => void) | null,
    }
    queueMicrotask(() => {
      value.result = run()
      value.onsuccess?.(new Event('success'))
    })
    return value as unknown as IDBRequest<T>
  }
  const store = {
    put: (value: WorkspaceHandleRecord) =>
      request(() => (records.set(value.workspaceId, value), value.workspaceId)),
    get: (key: string) => request(() => records.get(key) ?? undefined),
    getAll: () => request(() => [...records.values()]),
  }
  const database = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => store,
    transaction: () => {
      const tx = {
        error: null,
        oncomplete: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        onabort: null as ((event: Event) => void) | null,
        objectStore: () => ({
          ...store,
          getAll: () => {
            const req = store.getAll()
            queueMicrotask(() => queueMicrotask(() => tx.oncomplete?.(new Event('complete'))))
            return req
          },
          put: (value: WorkspaceHandleRecord) => {
            const req = store.put(value)
            // S2：request 已 success 之后事务才 abort（完整区分两个时点）。
            queueMicrotask(() =>
              queueMicrotask(() => {
                if (faults.abortAfterRequestSuccess) tx.onabort?.(new Event('abort'))
                else tx.oncomplete?.(new Event('complete'))
              }),
            )
            return req
          },
          get: (key: string) => {
            const req = store.get(key)
            queueMicrotask(() => queueMicrotask(() => tx.oncomplete?.(new Event('complete'))))
            return req
          },
        }),
      }
      return tx
    },
  }
  const openRequest = {
    result: database,
    error: faults.openError ? new DOMException('idb open failed', 'UnknownError') : null,
    onupgradeneeded: null,
    onsuccess: null as ((event: Event) => void) | null,
    onerror: null as ((event: Event) => void) | null,
  }
  ;(globalThis as { indexedDB?: unknown }).indexedDB = {
    open: () => {
      queueMicrotask(() => {
        if (faults.openError) openRequest.onerror?.(new Event('error'))
        else openRequest.onsuccess?.(new Event('success'))
      })
      return openRequest
    },
  }
  return { records }
}

async function openedProject(id: string) {
  installControllableIndexedDb()
  const files = await buildBlankProject(id)
  const disk = memoryAuthorDirectory(files)
  const opened = await finishOpen(disk.dir)
  // 真实登记（与绑定目录 finishOpen 的登记路径一致）。
  await saveWorkspaceHandle(opened.workspace, disk.dir.name, disk.dir)
  return { files, disk, opened }
}

// ═══ S1/S2/S3：真实 store 的 IDB 错误、事务时点与登记防护 ═══

test('S1: IDB open 失败不误报成功，不留下有效最近项目绑定', async () => {
  installControllableIndexedDb({ openError: true })
  const workspace = createLocalWorkspaceContext('s1', 'local-directory')
  const handle = { name: 'dir' } as FileSystemDirectoryHandle
  await expect(saveWorkspaceHandle(workspace, 'S1', handle)).rejects.toThrow()
  // 换成正常边界后：同一 workspace 无残留绑定。
  installControllableIndexedDb()
  await expect(loadWorkspaceRecord(workspace.workspaceId)).resolves.toBeNull()
})

test('S2: request success 之后 transaction abort 仍使 Promise 失败（正控 complete 成功）', async () => {
  const workspace = createLocalWorkspaceContext('s2', 'local-directory')
  const handle = { name: 'dir' } as FileSystemDirectoryHandle
  const good = installControllableIndexedDb()
  await expect(saveWorkspaceHandle(workspace, 'S2-control', handle)).resolves.toBeUndefined()
  expect(good.records.has(workspace.workspaceId)).toBe(true)

  const second = createLocalWorkspaceContext('s2b', 'local-directory')
  installControllableIndexedDb({ abortAfterRequestSuccess: true })
  await expect(saveWorkspaceHandle(second, 'S2-abort', handle)).rejects.toThrow('中止')
})

test('S3: 字段漂移/句柄无法验证的登记被拒，原记录不被 blind put 覆盖', async () => {
  installControllableIndexedDb()
  const workspace = createLocalWorkspaceContext('s3', 'local-directory')
  const verifiableA = {
    name: 'a',
    isSameEntry: async (other: unknown) => other === verifiableA,
  } as FileSystemDirectoryHandle
  await underLock(workspace, 'original', verifiableA)

  // 同 workspaceId 但 projectId 漂移：拒绝。
  const drifted = { ...workspace, projectId: 'drifted' }
  await expect(underLock(drifted, 'drift', verifiableA)).rejects.toThrow(
    '最近项目记录与当前 workspace identity 不一致',
  )
  // 同 workspaceId 换绑其他目录：拒绝。
  const handleB = {
    name: 'b',
    isSameEntry: async (other: unknown) => other === handleB,
  } as FileSystemDirectoryHandle
  await expect(underLock(workspace, 'rebind', handleB)).rejects.toThrow('已绑定到另一个目录')
  // 原记录保持不变。
  const record = await loadWorkspaceRecord(workspace.workspaceId)
  expect(record).toMatchObject({ projectId: 's3', name: 'original' })
})

// ═══ B2：基线身份别名与异目录 ═══

test('B2: verifyOpenedAuthorBaseline 同目录可重复通过、异目录拒绝', async () => {
  const { disk, opened } = await openedProject('b2')
  await expect(verifyOpenedAuthorBaseline(opened.authorBaseline, disk.dir)).resolves.toBeUndefined()
  const other = memoryAuthorDirectory(await buildBlankProject('b2-other'))
  await expect(verifyOpenedAuthorBaseline(opened.authorBaseline, other.dir)).rejects.toThrow(
    '目录不一致',
  )
  expect(other.changes).toEqual({ creates: [], closes: [], removes: [] })
})
