/**
 * handle-store —— FSA 目录句柄持久化(IndexedDB)+ 权限手势约束(design §4.5)。
 * 句柄可结构化克隆存 IndexedDB;刷新取回后 queryPermission='prompt' 时**不能自动** requestPermission
 * (须用户手势内,同 audio warmup)→ 载入只 query,用户点「重新连接」再 request。
 * IndexedDB 存取走浏览器(节点无 indexedDB);ensurePermission 是纯状态机(可单测)。
 *
 * current-only v2:主键是 workspaceId，不再拿 manifest.id 充当本地目录身份。同一个 pal 的
 * 开发基线、评审沙盒和普通克隆可以并存；开发期 v1 recent 直接清理，不保留双读债。
 */
import type { WorkspaceContext, WorkspaceMode, WorkspaceSource } from './workspace-context.js'

type PermState = 'granted' | 'prompt' | 'denied'

export interface WorkspaceHandleRecord {
  workspaceId: string
  projectId: string
  name: string
  mode: WorkspaceMode
  source: WorkspaceSource
  handle: FileSystemDirectoryHandle
  updatedAt: number
}

const DB = 'type-pal-editor'
const STORE = 'project-handles'

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2)
    req.onupgradeneeded = () => {
      if (req.result.objectStoreNames.contains(STORE)) req.result.deleteObjectStore(STORE)
      req.result.createObjectStore(STORE, { keyPath: 'workspaceId' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return idb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode)
        let result!: T
        const req = fn(transaction.objectStore(STORE))
        req.onsuccess = () => {
          result = req.result
        }
        req.onerror = () => reject(req.error)
        transaction.oncomplete = () => resolve(result)
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB 事务已中止'))
      }),
  )
}

let fallbackRegistrationTail: Promise<void> = Promise.resolve()
let fallbackDiscoveryTail: Promise<void> = Promise.resolve()
declare const workspaceRegistrationLockBrand: unique symbol
export type WorkspaceRegistrationLock = Readonly<{ [workspaceRegistrationLockBrand]: never }>
const workspaceRegistrationLocks = new WeakMap<object, string>()

/**
 * Serialize first-save/discovery decisions that do not yet have a trustworthy workspaceId.
 * This prevents two tabs opening the same unmarked directory from minting independent identities.
 */
export async function withWorkspaceDiscoveryLock<T>(operation: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks
  if (locks) return locks.request('type-pal-workspace:discovery', { mode: 'exclusive' }, operation)

  const previous = fallbackDiscoveryTail
  let release!: () => void
  fallbackDiscoveryTail = new Promise<void>((resolve) => {
    release = resolve
  })
  await previous
  try {
    return await operation()
  } finally {
    release()
  }
}

export async function withWorkspaceRegistrationLock<T>(
  workspaceId: string,
  operation: (lock: WorkspaceRegistrationLock) => Promise<T>,
): Promise<T> {
  const run = async (): Promise<T> => {
    const lock = Object.freeze({}) as WorkspaceRegistrationLock
    workspaceRegistrationLocks.set(lock, workspaceId)
    try {
      return await operation(lock)
    } finally {
      workspaceRegistrationLocks.delete(lock)
    }
  }
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks
  if (locks) return locks.request(`type-pal-workspace:${workspaceId}`, { mode: 'exclusive' }, run)

  // Vitest/non-window fallback. Browsers use Web Locks above, which also serializes tabs.
  const previous = fallbackRegistrationTail
  let release!: () => void
  fallbackRegistrationTail = new Promise<void>((resolve) => {
    release = resolve
  })
  await previous
  try {
    return await run()
  } finally {
    release()
  }
}

/** Commit a recent binding while the caller demonstrably owns the shared workspace identity lock. */
export async function saveWorkspaceHandleUnderLock(
  lock: WorkspaceRegistrationLock,
  context: WorkspaceContext,
  name: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  if (workspaceRegistrationLocks.get(lock) !== context.workspaceId)
    throw new Error('拒绝未经 workspace identity lock 授权的句柄登记')
  const entryBinding = await findWorkspaceRecordByHandle(handle)
  if (entryBinding && entryBinding.workspaceId !== context.workspaceId)
    throw new Error('该目录已经绑定到另一个 workspace identity，拒绝重复登记')
  const existing = await loadWorkspaceRecord(context.workspaceId)
  if (existing) {
    let sameEntry = false
    try {
      sameEntry = await existing.handle.isSameEntry(handle)
    } catch {
      throw new Error('现有工作区句柄无法验证，拒绝覆盖最近项目 identity')
    }
    if (!sameEntry) throw new Error('workspace identity 已绑定到另一个目录，拒绝覆盖')
    if (
      existing.projectId !== context.projectId ||
      existing.mode !== context.mode ||
      existing.source !== context.source
    )
      throw new Error('最近项目记录与当前 workspace identity 不一致')
  }
  await tx('readwrite', (store) =>
    store.put({
      workspaceId: context.workspaceId,
      projectId: context.projectId,
      name,
      mode: context.mode,
      source: context.source,
      handle,
      updatedAt: Date.now(),
    } satisfies WorkspaceHandleRecord),
  )
}

/**
 * 成功打开/完整保存后登记；任何半成品目录都不得提前进入 recent。同一 workspaceId
 * 只能继续登记同一 FSA entry，不能 blind put 覆盖复制目录留下的冲突证据。
 */
export async function saveWorkspaceHandle(
  context: WorkspaceContext,
  name: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  await withWorkspaceRegistrationLock(context.workspaceId, (lock) =>
    saveWorkspaceHandleUnderLock(lock, context, name, handle),
  )
}

export async function loadWorkspaceRecord(
  workspaceId: string,
): Promise<WorkspaceHandleRecord | null> {
  const record = (await tx<WorkspaceHandleRecord | undefined>('readonly', (store) =>
    store.get(workspaceId),
  )) as WorkspaceHandleRecord | undefined
  return record ?? null
}

export async function loadWorkspaceHandle(
  workspaceId: string,
): Promise<FileSystemDirectoryHandle | null> {
  return (await loadWorkspaceRecord(workspaceId))?.handle ?? null
}

/** 目录句柄是浏览器唯一可靠的同目录证据；用于无 marker 的普通本地项目恢复 identity。 */
export async function findWorkspaceRecordByHandle(
  handle: FileSystemDirectoryHandle,
): Promise<WorkspaceHandleRecord | null> {
  const all = (await tx<WorkspaceHandleRecord[]>('readonly', (store) =>
    store.getAll(),
  )) as WorkspaceHandleRecord[]
  for (const record of all) {
    try {
      if (await record.handle.isSameEntry(handle)) return record
    } catch {
      // 失效句柄不应阻断其他 recent 的恢复。
    }
  }
  return null
}

/** 最近项目按最近成功打开/保存排序。 */
export async function listRecentWorkspaces(): Promise<
  Array<Pick<WorkspaceHandleRecord, 'workspaceId' | 'projectId' | 'name' | 'mode' | 'source'>>
> {
  const all = (await tx<WorkspaceHandleRecord[]>('readonly', (store) =>
    store.getAll(),
  )) as WorkspaceHandleRecord[]
  return all
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .map(({ workspaceId, projectId, name, mode, source }) => ({
      workspaceId,
      projectId,
      name,
      mode,
      source,
    }))
}

/**
 * 权限确保:withRequest=false 只 query(载入,无手势,'prompt' 原样返回);
 * true 才 request(用户点=手势内)。已 granted 一律不 request。
 */
export async function ensurePermission(
  handle: FileSystemDirectoryHandle,
  opts: { withRequest: boolean },
): Promise<PermState> {
  const h = handle as unknown as {
    queryPermission(o: { mode: 'readwrite' }): Promise<PermState>
    requestPermission(o: { mode: 'readwrite' }): Promise<PermState>
  }
  const q = await h.queryPermission({ mode: 'readwrite' })
  if (q === 'granted' || !opts.withRequest) return q
  return h.requestPermission({ mode: 'readwrite' })
}
