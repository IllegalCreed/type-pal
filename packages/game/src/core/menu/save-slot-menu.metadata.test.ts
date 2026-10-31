/** Metadata IO through Save memory backend or explicit deferred/failure seam; not browser IDB acceptance. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState } from '../game-state.js'
import { Save } from '../save/api.js'
import { createSaveSlotMenu, fetchSlotMetas } from './save-slot-menu.js'

describe('Save slot metadata', () => {
  beforeEach(async () => {
    vi.stubGlobal('indexedDB', undefined)
    await Save._clearAllForTest()
  })

  afterEach(async () => {
    try {
      await Save._clearAllForTest()
    } finally {
      try {
        vi.restoreAllMocks()
      } finally {
        vi.unstubAllGlobals()
      }
    }
  })

  it('fetchSlotMetas 空 slots → slotMetas 仍空', async () => {
    const menu = createSaveSlotMenu('save')
    await fetchSlotMetas(menu)
    expect(menu.slotMetas.size).toBe(0)
  })

  it('save 后 fetchSlotMetas → slotMetas 含 SlotMeta', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 12345
    gs.wNumScene = 7
    gs.wSavedTimes = 3
    gs.PlayerRolesRuntime.rgwLevel[0] = 15
    await Save.saveSlot(2, gs)

    const menu = createSaveSlotMenu('load')
    await fetchSlotMetas(menu)
    expect(menu.slotMetas.size).toBe(1)
    const meta = menu.slotMetas.get(2)!
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
    const menu = createSaveSlotMenu('save')
    await fetchSlotMetas(menu)
    expect(
      [...menu.slotMetas.entries()]
        .map(([id, meta]) => ({ id, savedTimes: meta.savedTimes }))
        .sort((a, b) => a.id - b.id),
    ).toEqual([
      { id: 1, savedTimes: 10 },
      { id: 2, savedTimes: 20 },
      { id: 3, savedTimes: 30 },
      { id: 4, savedTimes: 40 },
      { id: 5, savedTimes: 50 },
    ])
  })

  it('fetchSlotMetas 在 listSlots resolve 前不写入状态，resolve 后按真实 id 填充', async () => {
    type ListedSlot = Awaited<ReturnType<typeof Save.listSlots>>
    let resolveSlots!: (slots: ListedSlot) => void
    const pending = new Promise<ListedSlot>((resolve) => {
      resolveSlots = resolve
    })
    vi.spyOn(Save, 'listSlots').mockReturnValue(pending)
    const menu = createSaveSlotMenu('load')

    const fetching = fetchSlotMetas(menu)
    try {
      expect(menu.slotMetas.size).toBe(0)
      resolveSlots([
        {
          id: 4,
          meta: { partyLevel: 8, cash: 400, sceneId: 6, savedAt: 2, savedTimes: 9 },
        },
      ])
      await expect(fetching).resolves.toBeUndefined()
      expect(menu.slotMetas.get(4)?.savedTimes).toBe(9)
      expect(menu.slotMetas.get(0)).toBeUndefined()
    } finally {
      resolveSlots([])
      await fetching
    }
  })

  it('刷新同 slot 会替换元数据并按 id 增加新 slot', async () => {
    const menu = createSaveSlotMenu('load')
    menu.slotMetas.set(2, { partyLevel: 1, cash: 10, sceneId: 1, savedAt: 1, savedTimes: 1 })
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

    await fetchSlotMetas(menu)
    expect(menu.slotMetas.size).toBe(2)
    expect(menu.slotMetas.get(2)?.cash).toBe(30)
    expect(menu.slotMetas.get(5)?.cash).toBe(50)
  })

  it('Save.listSlots 失败 → 记录 warning 且不污染已有元数据', async () => {
    const menu = createSaveSlotMenu('load')
    const existing = {
      partyLevel: 9,
      cash: 100,
      sceneId: 2,
      savedAt: 1,
      savedTimes: 4,
    }
    menu.slotMetas.set(1, existing)
    const failure = new Error('storage unavailable')
    const listSlots = vi.spyOn(Save, 'listSlots').mockRejectedValue(failure)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(fetchSlotMetas(menu)).resolves.toBeUndefined()
    expect(listSlots).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledExactlyOnceWith('[save-slot-menu] fetchSlotMetas failed:', failure)
    expect(menu.slotMetas.get(1)).toEqual(existing)
  })
})
