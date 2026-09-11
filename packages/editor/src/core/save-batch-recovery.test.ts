/**
 * EDITOR-SAVE-RECOVERY-1 · batch-r1 剩余项：S1/S2/S3（真实 handle-store + 可控 IDB 边界）、
 * B2（基线身份别名/异目录）。
 * C3 返工：内存 IDB 同一数据库跨调用保留、每次 open/request 独立对象、事务写集暂存——
 * complete 才提交、abort 丢弃（符合 IndexedDB 回滚合同）；失败无残留均在同一数据库上验证。
 * 本文件不 mock handle-store/author-save-store 之外的任何被测逻辑。
 */
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
import { finishOpen } from './open-actions.js'
import { buildBlankProject } from './seed.js'
import { createLocalWorkspaceContext } from './workspace-context.js'

const underLock = (
  workspace: { workspaceId: string } & Parameters<typeof saveWorkspaceHandleUnderLock>[1],
  name: string,
  handle: FileSystemDirectoryHandle,
) =>
  withWorkspaceRegistrationLock(workspace.workspaceId, (lock) =>
    saveWorkspaceHandleUnderLock(lock, workspace, name, handle),
  )

let originalIndexedDbDescriptor: PropertyDescriptor | undefined

afterEach(() => {
  if (originalIndexedDbDescriptor)
    Object.defineProperty(globalThis, 'indexedDB', originalIndexedDbDescriptor)
  else Reflect.deleteProperty(globalThis, 'indexedDB')
  vi.restoreAllMocks()
})

// ── 可控内存 IDB 边界（R2/C3：同一数据库跨调用；独立请求对象；事务回滚合同；
//    request error 未被 preventDefault 时中止事务——事务只允许一次终结） ──
type Faults = {
  openError?: boolean
  abortAfterRequestSuccess?: boolean
  requestErrorAll?: boolean
  putError?: boolean
}
const db = {
  records: new Map<string, WorkspaceHandleRecord>(),
  faults: {} as Faults,
  openRequests: 0,
  putCalls: 0,
}
function installControllableIndexedDb(faults: Faults = {}) {
  if (!originalIndexedDbDescriptor)
    originalIndexedDbDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
  db.faults = faults
  const makeRequest = <T>(run: () => T, opts: { isPut?: boolean } = {}): IDBRequest<T> => {
    const value = {
      result: undefined as T,
      error: null as DOMException | null,
      onsuccess: null as ((event: Event) => void) | null,
      onerror: null as ((event: Event) => void) | null,
    }
    queueMicrotask(() => {
      const shouldFail = db.faults.requestErrorAll || (opts.isPut && db.faults.putError === true)
      if (shouldFail) {
        value.error = new DOMException('request io failure', 'UnknownError')
        value.onerror?.(new Event('error'))
        return
      }
      try {
        value.result = run()
        value.onsuccess?.(new Event('success'))
      } catch (error) {
        value.error =
          error instanceof DOMException ? error : new DOMException(String(error), 'UnknownError')
        value.onerror?.(new Event('error'))
      }
    })
    return value as unknown as IDBRequest<T>
  }
  const finishTx = (
    tx: { oncomplete: ((event: Event) => void) | null; onabort: ((event: Event) => void) | null },
    pending: Map<string, WorkspaceHandleRecord>,
    requestFailed: boolean,
  ) => {
    if (db.faults.abortAfterRequestSuccess || requestFailed) {
      tx.onabort?.(new Event('abort')) // 写集丢弃；事务只有这一次终结
    } else {
      for (const [key, record] of pending) db.records.set(key, record)
      tx.oncomplete?.(new Event('complete'))
    }
  }
  const store = {
    put: (value: WorkspaceHandleRecord) => {
      db.putCalls += 1
      return makeRequest(() => value.workspaceId, { isPut: true })
    },
    get: (key: string) => makeRequest(() => db.records.get(key) ?? undefined),
    getAll: () => makeRequest(() => [...db.records.values()]),
  }
  const database = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => store,
    transaction: () => {
      const pending = new Map<string, WorkspaceHandleRecord>()
      let requestFailed = false
      let settled = false
      const tx = {
        error: null as DOMException | null,
        oncomplete: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        onabort: null as ((event: Event) => void) | null,
        objectStore: () => ({
          getAll: () => {
            const req = store.getAll()
            queueMicrotask(() => queueMicrotask(() => tx.oncomplete?.(new Event('complete'))))
            return req
          },
          get: (key: string) => {
            const req = store.get(key)
            queueMicrotask(() => queueMicrotask(() => tx.oncomplete?.(new Event('complete'))))
            return req
          },
          put: (value: WorkspaceHandleRecord) => {
            pending.set(value.workspaceId, value) // 暂存写集
            const req = store.put(value)
            queueMicrotask(() =>
              queueMicrotask(() => {
                if (settled) return
                settled = true
                // request error 未被消费（error 为 DOMException）→ 事务以 abort 终结，不提交写集。
                requestFailed =
                  db.faults.abortAfterRequestSuccess !== true &&
                  ((req as unknown as { error: DOMException | null }).error !== null ||
                    db.faults.putError === true)
                finishTx(tx, pending, requestFailed)
              }),
            )
            return req
          },
        }),
      }
      return tx
    },
  }
  ;(globalThis as { indexedDB?: unknown }).indexedDB = {
    open: () => {
      db.openRequests += 1
      const openRequest = {
        result: database,
        error: db.faults.openError ? new DOMException('idb open failed', 'UnknownError') : null,
        onupgradeneeded: null,
        onsuccess: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
      }
      queueMicrotask(() => {
        if (db.faults.openError) openRequest.onerror?.(new Event('error'))
        else openRequest.onsuccess?.(new Event('success'))
      })
      return openRequest
    },
  }
  return db
}

async function openedProject(id: string) {
  db.records.clear()
  installControllableIndexedDb()
  const files = await buildBlankProject(id)
  const disk = memoryAuthorDirectory(files)
  const opened = await finishOpen(disk.dir)
  await saveWorkspaceHandle(opened.workspace, disk.dir.name, disk.dir)
  return { files, disk, opened }
}

// ═══ S1/S2/S3：真实 store 的 IDB 错误、事务时点与登记防护 ═══

test('S1: 同一数据库上 open 失败不误报成功、请求对象独立、失败后无残留', async () => {
  const handle = {
    name: 'dir',
    isSameEntry: async () => true,
  } as unknown as FileSystemDirectoryHandle
  installControllableIndexedDb({ openError: true })
  const workspace = createLocalWorkspaceContext('s1', 'local-directory')
  await expect(saveWorkspaceHandle(workspace, 'S1', handle)).rejects.toThrow('idb open failed')
  const before = db.openRequests
  // 同一数据库切换故障开关（不重建空库）：正常读取确认无残留。
  installControllableIndexedDb()
  await expect(loadWorkspaceRecord(workspace.workspaceId)).resolves.toBeNull()
  expect(db.records.has(workspace.workspaceId)).toBe(false)
  // 每次 indexedDB.open 都返回独立请求对象。
  const idb = (globalThis as unknown as { indexedDB: { open: () => unknown } }).indexedDB
  const first = idb.open()
  const second = idb.open()
  expect(first).not.toBe(second)
  expect(db.openRequests).toBeGreaterThanOrEqual(before + 2)
})

test('S2: request success 之后 transaction abort 仍失败且同一数据库无该绑定（complete 才提交）', async () => {
  db.records.clear()
  installControllableIndexedDb()
  const controlHandle = {
    name: 'dir-control',
    isSameEntry: async (other: unknown) => other === controlHandle,
  } as FileSystemDirectoryHandle
  const control = createLocalWorkspaceContext('s2-control', 'local-directory')
  await expect(saveWorkspaceHandle(control, 'S2-control', controlHandle)).resolves.toBeUndefined()
  expect(db.records.has(control.workspaceId)).toBe(true) // complete 已提交

  // 同一数据库切换 abort 故障：request success 后事务 abort → Promise 失败且写集被丢弃。
  installControllableIndexedDb({ abortAfterRequestSuccess: true })
  const victimHandle = {
    name: 'dir-victim',
    isSameEntry: async (other: unknown) => other === victimHandle,
  } as FileSystemDirectoryHandle
  const victim = createLocalWorkspaceContext('s2-abort', 'local-directory')
  await expect(saveWorkspaceHandle(victim, 'S2-abort', victimHandle)).rejects.toThrow('中止')
  expect(db.records.has(victim.workspaceId)).toBe(false)
  // 恢复正常后原记录仍在、victim 仍可成功写入（同库三态）。
  installControllableIndexedDb()
  expect(await loadWorkspaceRecord(control.workspaceId)).toMatchObject({ name: 'S2-control' })
  await expect(saveWorkspaceHandle(victim, 'S2-abort-retry', victimHandle)).resolves.toBeUndefined()
  expect(db.records.has(victim.workspaceId)).toBe(true)
})

test('S3: request error 传播；字段漂移/换绑登记被拒，原记录不被覆盖', async () => {
  db.records.clear()
  installControllableIndexedDb()
  const workspace = createLocalWorkspaceContext('s3', 'local-directory')
  // 原记录的句柄随后会开始抛错（模拟句柄失效）：登记时正常，复验时 isSameEntry 抛出。
  let handleThrows = false
  const flakyHandle = {
    name: 'a',
    isSameEntry: async (other: unknown) => {
      if (handleThrows) throw new Error('isSameEntry io failure')
      return other === flakyHandle
    },
  } as FileSystemDirectoryHandle
  await underLock(workspace, 'original', flakyHandle)
  // 同 workspaceId 但 projectId 漂移：拒绝。
  const drifted = { ...workspace, projectId: 'drifted' }
  await expect(underLock(drifted, 'drift', flakyHandle)).rejects.toThrow(
    '最近项目记录与当前 workspace identity 不一致',
  )
  // 同 workspaceId 换绑其他目录：拒绝。
  const handleB = {
    name: 'b',
    isSameEntry: async (other: unknown) => other === handleB,
  } as FileSystemDirectoryHandle
  await expect(underLock(workspace, 'rebind', handleB)).rejects.toThrow('已绑定到另一个目录')
  // 现有记录句柄 isSameEntry 抛错（句柄失效）：拒绝且原记录不被覆盖。
  handleThrows = true
  await expect(underLock(workspace, 'probe-throwing', handleB)).rejects.toThrow('无法验证')
  handleThrows = false
  // 定点注入：读取请求正常，仅 put 报错 → Promise 拒绝、事务以 abort 终结不提交写集。
  const putCallsBefore = db.putCalls
  installControllableIndexedDb({ putError: true })
  const newWorkspace = createLocalWorkspaceContext('s3-put-fail', 'local-directory')
  const putFailHandle = {
    name: 'c',
    isSameEntry: async (other: unknown) => other === putFailHandle,
  } as FileSystemDirectoryHandle
  await expect(underLock(newWorkspace, 'io-fail', putFailHandle)).rejects.toThrow(
    'request io failure',
  )
  expect(db.putCalls).toBe(putCallsBefore + 1) // 确实走到了真实 store.put
  expect(db.records.has(newWorkspace.workspaceId)).toBe(false) // 新记录未残留
  // 读取型 request error（getAll/get 层）同样传播。
  installControllableIndexedDb({ requestErrorAll: true })
  await expect(loadWorkspaceRecord(workspace.workspaceId)).rejects.toThrow('request io failure')
  installControllableIndexedDb()
  // 原记录保持不变（put 失败未覆盖旧值）。
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
