/**
 * M5.S-w0.1:Save API stub(in-memory)。
 *
 * 5 个槽位(sdlpal 真值 1-5),save / load / list / delete 4 个原语。
 * 当前 in-memory map,S-w1.a 后切 IndexedDB(真持久化)。
 *
 * Slot meta:Sync.1 后 GameState 全字段冻结,可直接 JSON.stringify 存。
 * Meta(预览用)简版 stub:partyLevel / cash / sceneId。
 */

import type { GameState } from '../game-state.js'
import { IndexedDbSave } from './indexed-db.js'

/** sdlpal `MAX_SAVE_SLOTS` 真值 = 5;槽位 id 范围 1..5。 */
export const MAX_SAVE_SLOTS = 5

export interface SlotMeta {
  /** 队长 level(从 PlayerRolesRuntime 取,占位用 0)。 */
  partyLevel: number
  /** 当前钱。 */
  cash: number
  /** 当前 scene wNumScene。 */
  sceneId: number
  /** 保存时间(ms epoch)。 */
  savedAt: number
  /** sdlpal `SAVEDGAME_WIN.wSavedTimes` — 跨 slot max counter,sdlpal SystemMenu Save case
   *  真值算法(uigame.c:589-597):`wSavedTimes = max(GetSavedTimes(1..5)) + 1`,
   *  写到本 slot。用于 SaveSlotMenu 显示"已存 N 次"。 */
  savedTimes: number
}

const _slots = new Map<number, { gs: GameState; meta: SlotMeta }>()

/** 序列化 GameState 用,structuredClone fallback(老浏览器走 JSON 圈)。 */
function deepClone<T>(obj: T): T {
  if (typeof structuredClone === 'function') return structuredClone(obj)
  return JSON.parse(JSON.stringify(obj)) as T
}

function extractMeta(gs: GameState): SlotMeta {
  return {
    partyLevel: gs.PlayerRolesRuntime?.rgwLevel[0] ?? 0,
    cash: gs.dwCash,
    sceneId: gs.wNumScene,
    savedAt: Date.now(),
    // sdlpal SAVEDGAME_WIN.wSavedTimes 真值,Save 时 dispatcher 先算 max + 1 写 gs.wSavedTimes。
    savedTimes: gs.wSavedTimes ?? 0,
  }
}

function idbAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

export const Save = {
  async saveSlot(slot: number, gs: GameState): Promise<void> {
    if (slot < 1 || slot > MAX_SAVE_SLOTS) throw new Error(`Save.saveSlot: slot ${slot} 超 1-${MAX_SAVE_SLOTS}`)
    const meta = extractMeta(gs)
    if (idbAvailable()) {
      await IndexedDbSave.saveSlot(slot, deepClone(gs), meta)
    } else {
      _slots.set(slot, { gs: deepClone(gs), meta })
    }
  },

  async loadSlot(slot: number): Promise<GameState | null> {
    if (idbAvailable()) {
      const r = await IndexedDbSave.loadSlot(slot)
      return r ? deepClone(r.gs) : null
    }
    const entry = _slots.get(slot)
    return entry ? deepClone(entry.gs) : null
  },

  async listSlots(): Promise<Array<{ id: number; meta: SlotMeta }>> {
    if (idbAvailable()) {
      return IndexedDbSave.listSlots()
    }
    return Array.from(_slots.entries())
      .map(([id, entry]) => ({ id, meta: entry.meta }))
      .sort((a, b) => a.id - b.id)
  },

  async deleteSlot(slot: number): Promise<void> {
    if (idbAvailable()) {
      await IndexedDbSave.deleteSlot(slot)
      return
    }
    _slots.delete(slot)
  },

  /** 测试用 — 清所有 slot(test 之间 reset)。in-memory 路径才有用。 */
  async _clearAllForTest(): Promise<void> {
    _slots.clear()
  },
}
