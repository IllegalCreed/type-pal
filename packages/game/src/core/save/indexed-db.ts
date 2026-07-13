/**
 * M5.S-w1.a:IndexedDB 真存(production driver,Save API 的真实现)。
 *
 * 同名 API(saveSlot/loadSlot/listSlots/deleteSlot)用 IndexedDB 替换 in-memory map。
 * 测试环境 fallback in-memory(in-process,vitest 无 IndexedDB)。
 *
 * Object store schema:
 *   db name: 'type-pal'
 *   store: 'save-slots',keyPath = slot id(number)
 *   value: { gs: GameState, meta: SlotMeta }
 */

import type { GameState } from '../game-state.js'
import type { SlotMeta } from './api.js'

const DB_NAME = 'type-pal'
// P2#5(2026-05-29):脚本游标 ip 从 per-scene 切片本地下标改成单一全局数组下标。旧档持久化的
// sceneOnEnterIp / triggerResume.ip / autoCursor.ip 是**本地** ip,新全局解释器会当全局下标 →
// 静默跳错命令。bump version → onupgradeneeded 清空旧存档(开发期存档可作废,user 已授权)。
const DB_VERSION = 2
const STORE = 'save-slots'

interface StoredSlot {
  id: number
  gs: GameState
  meta: SlotMeta
}

let _dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB 不可用(测试环境 / SSR);走 in-memory api.ts'))
  }
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      // P2#5:旧 store 里的存档是 local-ip 格式,与全局 ip 解释器不兼容 → 删旧 store 重建(清空)。
      if (db.objectStoreNames.contains(STORE)) {
        db.deleteObjectStore(STORE)
      }
      db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return _dbPromise
}

function txStore(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE)
}

function asPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const IndexedDbSave = {
  async saveSlot(slot: number, gs: GameState, meta: SlotMeta): Promise<void> {
    const db = await openDb()
    const value: StoredSlot = { id: slot, gs, meta }
    await asPromise(txStore(db, 'readwrite').put(value))
  },

  async loadSlot(slot: number): Promise<{ gs: GameState; meta: SlotMeta } | null> {
    const db = await openDb()
    const r = await asPromise<StoredSlot | undefined>(txStore(db, 'readonly').get(slot))
    return r ? { gs: r.gs, meta: r.meta } : null
  },

  async listSlots(): Promise<Array<{ id: number; meta: SlotMeta }>> {
    const db = await openDb()
    const all = await asPromise<StoredSlot[]>(
      txStore(db, 'readonly').getAll() as IDBRequest<StoredSlot[]>,
    )
    return all.map((s) => ({ id: s.id, meta: s.meta })).sort((a, b) => a.id - b.id)
  },

  async deleteSlot(slot: number): Promise<void> {
    const db = await openDb()
    await asPromise(txStore(db, 'readwrite').delete(slot))
  },
}

/** 测试 / hot-reload 时重置 db 连接句柄(单例缓存清理)。 */
export function _resetDbConnectionForTest(): void {
  _dbPromise = null
}
