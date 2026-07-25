import type { SaveMeta, SlotId, StoredSavePayload } from './types.js'

/** 存档存储抽象（注入式）。三块分离：meta(浏览) / payload(还原) / thumb(图)。 */
export interface SaveStore {
  putSlot(meta: SaveMeta, payload: StoredSavePayload, thumb: Blob): Promise<void> // 覆盖写
  listMeta(): Promise<SaveMeta[]> // 浏览界面（不碰 payload）
  getPayload(slotId: SlotId): Promise<StoredSavePayload | null>
  getThumb(slotId: SlotId): Promise<Blob | null>
}

/** 内存实现（测试 / 无 IndexedDB 降级）。深拷贝防外部突变。 */
export class MemorySaveStore implements SaveStore {
  private readonly meta = new Map<SlotId, SaveMeta>()
  private readonly payload = new Map<SlotId, StoredSavePayload>()
  private readonly thumb = new Map<SlotId, Blob>()

  async putSlot(meta: SaveMeta, payload: StoredSavePayload, thumb: Blob): Promise<void> {
    this.meta.set(meta.slotId, structuredClone(meta))
    this.payload.set(meta.slotId, structuredClone(payload))
    this.thumb.set(meta.slotId, thumb)
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

const DB_NAME = 'type-pal-saves'
const DB_VERSION = 1
const STORES = ['meta', 'payload', 'thumb'] as const

/** IndexedDB 实现（浏览器；薄适配器。IDB 用结构化克隆存对象/Blob，无需 JSON）。 */
export class IndexedDbSaveStore implements SaveStore {
  private dbPromise: Promise<IDBDatabase> | null = null

  private open(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = () => {
          const db = req.result
          for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s)
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
    }
    return this.dbPromise
  }

  async putSlot(meta: SaveMeta, payload: StoredSavePayload, thumb: Blob): Promise<void> {
    const db = await this.open()
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(STORES, 'readwrite') // 三 store 一事务，原子
      t.objectStore('meta').put(meta, meta.slotId)
      t.objectStore('payload').put(payload, meta.slotId)
      t.objectStore('thumb').put(thumb, meta.slotId)
      t.oncomplete = () => resolve()
      t.onerror = () => reject(t.error)
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
