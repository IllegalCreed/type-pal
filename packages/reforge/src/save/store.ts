import {
  assertSaveScopeProject,
  normalizeSaveScope,
  type SaveScope,
  saveScopeDatabaseName,
} from './scope.js'
import type { SaveMeta, SlotId, StoredSavePayload } from './types.js'

/** 存档存储抽象（注入式）。三块分离：meta(浏览) / payload(还原) / thumb(图)。 */
export interface SaveStore {
  putSlot(meta: SaveMeta, payload: StoredSavePayload, thumb: Blob): Promise<void> // 覆盖写
  listMeta(): Promise<SaveMeta[]> // 浏览界面（不碰 payload）
  getPayload(slotId: SlotId): Promise<StoredSavePayload | null>
  getThumb(slotId: SlotId): Promise<Blob | null>
}

function prepareSlot(scope: SaveScope, meta: SaveMeta, payload: StoredSavePayload) {
  const snapshot = structuredClone({ meta, payload })
  assertSaveScopeProject(scope, snapshot.payload.projectId)
  return snapshot
}

/** 内存实现（测试 / 无 IndexedDB 降级）。深拷贝防外部突变。 */
export class MemorySaveStore implements SaveStore {
  private readonly scope: SaveScope
  private readonly meta = new Map<SlotId, SaveMeta>()
  private readonly payload = new Map<SlotId, StoredSavePayload>()
  private readonly thumb = new Map<SlotId, Blob>()

  constructor(scope: SaveScope) {
    this.scope = normalizeSaveScope(scope)
  }

  async putSlot(meta: SaveMeta, payload: StoredSavePayload, thumb: Blob): Promise<void> {
    const prepared = prepareSlot(this.scope, meta, payload)
    this.meta.set(prepared.meta.slotId, prepared.meta)
    this.payload.set(prepared.meta.slotId, prepared.payload)
    this.thumb.set(prepared.meta.slotId, thumb)
  }
  async listMeta(): Promise<SaveMeta[]> {
    return [...this.meta.values()].map((m) => structuredClone(m))
  }
  async getPayload(slotId: SlotId): Promise<StoredSavePayload | null> {
    const p = this.payload.get(slotId)
    return p ? structuredClone(p) : null
  }
  async getThumb(slotId: SlotId): Promise<Blob | null> {
    return this.thumb.get(slotId) ?? null
  }
}

const DB_VERSION = 1
const STORES = ['meta', 'payload', 'thumb'] as const

/** IndexedDB 实现（浏览器；薄适配器。IDB 用结构化克隆存对象/Blob，无需 JSON）。 */
export class IndexedDbSaveStore implements SaveStore {
  private readonly scope: SaveScope
  private readonly databaseName: string
  private dbPromise: Promise<IDBDatabase> | null = null

  constructor(
    scope: SaveScope,
    private readonly factory: IDBFactory = globalThis.indexedDB,
  ) {
    this.scope = normalizeSaveScope(scope)
    this.databaseName = saveScopeDatabaseName(this.scope)
    if (!factory) throw new Error('当前环境不支持存档数据库')
  }

  private open(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = this.factory.open(this.databaseName, DB_VERSION)
        req.onupgradeneeded = () => {
          const db = req.result
          // Version 1 can only create a fresh scoped database; no legacy database is opened/upgraded.
          for (const s of STORES) db.createObjectStore(s)
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
    }
    return this.dbPromise
  }

  async putSlot(meta: SaveMeta, payload: StoredSavePayload, thumb: Blob): Promise<void> {
    const prepared = prepareSlot(this.scope, meta, payload)
    const db = await this.open()
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(STORES, 'readwrite') // 三 store 一事务，原子
      t.oncomplete = () => resolve()
      // Request errors bubble before transaction.error is necessarily populated.
      t.onerror = (event) =>
        reject(
          t.error ??
            (event.target as IDBRequest | IDBTransaction).error ??
            new Error('存档事务失败'),
        )
      t.onabort = () => reject(t.error ?? new Error('存档事务已中止'))
      try {
        t.objectStore('meta').put(prepared.meta, prepared.meta.slotId)
        t.objectStore('payload').put(prepared.payload, prepared.meta.slotId)
        t.objectStore('thumb').put(thumb, prepared.meta.slotId)
      } catch (error) {
        // A synchronous request error must not leave the preceding records eligible to commit.
        try {
          t.abort()
        } catch {
          /* The transaction may already be aborted; preserve the original error. */
        }
        reject(error)
      }
    })
  }

  private get<T>(store: string, key: SlotId): Promise<T | null> {
    return this.open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const req = db.transaction(store, 'readonly').objectStore(store).get(key)
          req.onsuccess = () => resolve((req.result as T) ?? null)
          req.onerror = () => reject(req.error)
        }),
    )
  }

  async listMeta(): Promise<SaveMeta[]> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const req = db.transaction('meta', 'readonly').objectStore('meta').getAll()
      req.onsuccess = () => resolve(req.result as SaveMeta[])
      req.onerror = () => reject(req.error)
    })
  }
  getPayload(slotId: SlotId): Promise<StoredSavePayload | null> {
    return this.get<StoredSavePayload>('payload', slotId)
  }
  getThumb(slotId: SlotId): Promise<Blob | null> {
    return this.get<Blob>('thumb', slotId)
  }
}
