/**
 * SaveSlotMenu state machine 单测 — sdlpal uigame.c:169-242 真值。
 *
 * C8(2026-05-29)更新:加 slotMetas + fetchSlotMetas + Save.listSlots caller integration 防回归。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('Up 从中间项切上一 slot(SelectionMenu 委托)', () => {
    const s = createSaveSlotMenu('save')
    s.selection.cursor = 2
    saveSlotMenuUp(s)
    expect(s.selection.cursor).toBe(1)
  })

  it('Up 从首项环绕到末项(SelectionMenu 委托)', () => {
    const s = createSaveSlotMenu('save')
    saveSlotMenuUp(s)
    expect(saveSlotMenuCurrent(s)).toBe(5)
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
    vi.restoreAllMocks()
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

  it('fetchSlotMetas 在 listSlots resolve 前不写入状态，resolve 后按真实 id 填充', async () => {
    type ListedSlot = Awaited<ReturnType<typeof Save.listSlots>>
    let resolveSlots!: (slots: ListedSlot) => void
    const pending = new Promise<ListedSlot>((resolve) => {
      resolveSlots = resolve
    })
    vi.spyOn(Save, 'listSlots').mockReturnValue(pending)
    const s = createSaveSlotMenu('load')

    const fetching = fetchSlotMetas(s)
    expect(s.slotMetas.size).toBe(0)
    resolveSlots([
      {
        id: 4,
        meta: { partyLevel: 8, cash: 400, sceneId: 6, savedAt: 2, savedTimes: 9 },
      },
    ])
    await expect(fetching).resolves.toBeUndefined()
    expect(s.slotMetas.get(4)?.savedTimes).toBe(9)
    expect(s.slotMetas.get(0)).toBeUndefined()
  })

  it('刷新同 slot 会替换元数据并按 id 增加新 slot', async () => {
    const s = createSaveSlotMenu('load')
    s.slotMetas.set(2, { partyLevel: 1, cash: 10, sceneId: 1, savedAt: 1, savedTimes: 1 })
    vi.spyOn(Save, 'listSlots').mockResolvedValue([
      {
        id: 2,
        meta: { partyLevel: 3, cash: 30, sceneId: 3, savedAt: 3, savedTimes: 3 },
      },
      {
        id: 5,
        meta: { partyLevel: 5, cash: 50, sceneId: 5, savedAt: 5, savedTimes: 5 },
      },
    ])

    await fetchSlotMetas(s)
    expect(s.slotMetas.size).toBe(2)
    expect(s.slotMetas.get(2)?.cash).toBe(30)
    expect(s.slotMetas.get(5)?.cash).toBe(50)
  })

  it('Save.listSlots 失败 → 记录 warning 且不污染已有元数据', async () => {
    const s = createSaveSlotMenu('load')
    const existing = {
      partyLevel: 9,
      cash: 100,
      sceneId: 2,
      savedAt: 1,
      savedTimes: 4,
    }
    s.slotMetas.set(1, existing)
    const failure = new Error('storage unavailable')
    const listSlots = vi.spyOn(Save, 'listSlots').mockRejectedValue(failure)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(fetchSlotMetas(s)).resolves.toBeUndefined()
    expect(listSlots).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith('[save-slot-menu] fetchSlotMetas failed:', failure)
    expect(s.slotMetas.get(1)).toEqual(existing)
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

  // C5 排重(2026-10-15)：原"cross-slot max+1 算法验证(dispatcher 模拟)"自写聚合模型
  // 重复实现 dispatcher 逻辑，不算真实 caller 证据 —— 真正触发 driver 聚合的合同由
  // menu-save-chain.glm-msio.test.ts 承担（跨槽 7→8、原槽不变），删除本模拟。
})
