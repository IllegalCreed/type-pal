/**
 * SaveSlotMenu state machine 单测 — sdlpal uigame.c:169-242 真值。
 *
 * C8(2026-05-29)更新:加 slotMetas + fetchSlotMetas + Save IO integration 防回归。
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game-state.js'
import { Save } from '../save/api.js'
import {
  createSaveSlotMenu,
  fetchSlotMetas,
  saveSlotMenuCurrent,
  saveSlotMenuDown,
  saveSlotMenuUp,
} from './save-slot-menu.js'

describe('createSaveSlotMenu', () => {
  it('默认 5 slot,label "进度N",mode 透传', () => {
    const s = createSaveSlotMenu('save')
    expect(s.mode).toBe('save')
    expect(s.selection.items).toHaveLength(5)
    expect(s.selection.items.map((it) => it.id)).toEqual([1, 2, 3, 4, 5])
    expect(s.selection.items.map((it) => it.label)).toEqual([
      '进度一',
      '进度二',
      '进度三',
      '进度四',
      '进度五',
    ])
  })

  it('load mode', () => {
    expect(createSaveSlotMenu('load').mode).toBe('load')
  })

  it('slotMeta override label', () => {
    const s = createSaveSlotMenu('save', [
      { slot: 1, label: 'Slot 1 (Lv 5)' },
      { slot: 3, label: 'Slot 3 (Lv 12)' },
    ])
    expect(s.selection.items.map((it) => it.label)).toEqual(['Slot 1 (Lv 5)', 'Slot 3 (Lv 12)'])
  })

  it('初始 slotMetas 空 Map(fetchSlotMetas 异步填)', () => {
    const s = createSaveSlotMenu('save')
    expect(s.slotMetas).toBeInstanceOf(Map)
    expect(s.slotMetas.size).toBe(0)
  })
})

describe('saveSlotMenuUp/Down + Current', () => {
  it('Down 切下一 slot', () => {
    const s = createSaveSlotMenu('save')
    expect(s.selection.cursor).toBe(0)
    saveSlotMenuDown(s)
    expect(s.selection.cursor).toBe(1)
  })

  it('Up 切上一 slot;边界 wrap(SelectionMenu 默认行为)', () => {
    const s = createSaveSlotMenu('save')
    s.selection.cursor = 2
    saveSlotMenuUp(s)
    expect(s.selection.cursor).toBe(1)
  })

  it('Current 返回 slot id(1-based,sdlpal uigame.c:184 真值)', () => {
    const s = createSaveSlotMenu('save')
    expect(saveSlotMenuCurrent(s)).toBe(1)
    saveSlotMenuDown(s)
    expect(saveSlotMenuCurrent(s)).toBe(2)
    saveSlotMenuDown(s)
    saveSlotMenuDown(s)
    saveSlotMenuDown(s)
    expect(saveSlotMenuCurrent(s)).toBe(5)
  })
})

// ── C8 Save IO integration ───────────────────────────────────────────────────

describe('fetchSlotMetas + Save IO', () => {
  beforeEach(async () => {
    await Save._clearAllForTest()
  })

  afterEach(async () => {
    await Save._clearAllForTest()
  })

  it('fetchSlotMetas 空 slots → slotMetas 仍空', async () => {
    const s = createSaveSlotMenu('save')
    await fetchSlotMetas(s)
    expect(s.slotMetas.size).toBe(0)
  })

  it('save 后 fetchSlotMetas → slotMetas 含 SlotMeta', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 12345
    gs.wNumScene = 7
    gs.wSavedTimes = 3
    gs.PlayerRolesRuntime.rgwLevel[0] = 15
    await Save.saveSlot(2, gs)

    const s = createSaveSlotMenu('load')
    await fetchSlotMetas(s)
    expect(s.slotMetas.size).toBe(1)
    const meta = s.slotMetas.get(2)!
    expect(meta.cash).toBe(12345)
    expect(meta.sceneId).toBe(7)
    expect(meta.savedTimes).toBe(3)
    expect(meta.partyLevel).toBe(15)
  })

  it('多 slot save → fetchSlotMetas 全 fill', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    for (let slot = 1; slot <= 5; slot++) {
      gs.wSavedTimes = slot * 10
      await Save.saveSlot(slot, gs)
    }
    const s = createSaveSlotMenu('save')
    await fetchSlotMetas(s)
    expect(s.slotMetas.size).toBe(5)
    expect(s.slotMetas.get(3)?.savedTimes).toBe(30)
  })
})

// ── C8 SlotMeta.savedTimes 真值(sdlpal cross-slot counter)──────────────────

describe('SlotMeta.savedTimes — sdlpal uigame.c:589-597 真值', () => {
  beforeEach(async () => {
    await Save._clearAllForTest()
  })

  afterEach(async () => {
    await Save._clearAllForTest()
  })

  it('savedTimes 从 gs.wSavedTimes 取(extractMeta 真值)', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.wSavedTimes = 42
    await Save.saveSlot(1, gs)
    const slots = await Save.listSlots()
    expect(slots[0]?.meta.savedTimes).toBe(42)
  })

  it('sdlpal 真值 cross-slot max + 1 算法验证(dispatcher 模拟)', async () => {
    // 模拟用户依次存 3 个 slot,每次先算 max+1 再 save
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    async function simulateSave(slot: number) {
      const slots = await Save.listSlots()
      const maxSaved = slots.reduce((m, s) => Math.max(m, s.meta.savedTimes ?? 0), 0)
      gs.wSavedTimes = maxSaved + 1
      await Save.saveSlot(slot, gs)
      return gs.wSavedTimes
    }
    expect(await simulateSave(1)).toBe(1) // 0 + 1
    expect(await simulateSave(2)).toBe(2) // max(1) + 1
    expect(await simulateSave(3)).toBe(3) // max(1,2) + 1
    expect(await simulateSave(1)).toBe(4) // 覆盖 slot 1;max(2,3) + 1
  })
})

// ── Save / Load roundtrip ────────────────────────────────────────────────────

describe('Save → Load roundtrip', () => {
  beforeEach(async () => {
    await Save._clearAllForTest()
  })

  afterEach(async () => {
    await Save._clearAllForTest()
  })

  it('save GameState → loadSlot 取回同字段值', async () => {
    const gs = createInitialGameState({ x: 100, y: 200, facing: 'left' })
    gs.dwCash = 999
    gs.wNumScene = 12
    gs.wSavedTimes = 7
    gs.PlayerRolesRuntime.rgwHP[0] = 150
    gs.PlayerRolesRuntime.rgwLevel[1] = 8
    gs.inventory = [{ itemId: 105, count: 3 }]
    await Save.saveSlot(4, gs)

    const loaded = await Save.loadSlot(4)
    expect(loaded).toBeTruthy()
    expect(loaded!.dwCash).toBe(999)
    expect(loaded!.wNumScene).toBe(12)
    expect(loaded!.wSavedTimes).toBe(7)
    expect(loaded!.PlayerRolesRuntime.rgwHP[0]).toBe(150)
    expect(loaded!.PlayerRolesRuntime.rgwLevel[1]).toBe(8)
    expect(loaded!.inventory).toEqual([{ itemId: 105, count: 3 }])
  })

  it('save 是 deep clone — loaded 修改不影响 saved', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 100
    await Save.saveSlot(1, gs)
    const loaded1 = (await Save.loadSlot(1))!
    loaded1.dwCash = 9999
    const loaded2 = (await Save.loadSlot(1))!
    expect(loaded2.dwCash).toBe(100) // 不受 loaded1 修改影响
  })

  it('loadSlot 不存在 slot → null', async () => {
    const r = await Save.loadSlot(99)
    expect(r).toBeNull()
  })
})
