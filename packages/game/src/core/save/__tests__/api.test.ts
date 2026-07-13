import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialGameState } from '../../game-state.js'
import { MAX_SAVE_SLOTS, Save } from '../api.js'

describe('S-w0.1 Save API stub', () => {
  beforeEach(async () => {
    await Save._clearAllForTest()
  })

  it('saveSlot / loadSlot:基本 round-trip', async () => {
    const gs = createInitialGameState({ x: 100, y: 50, facing: 'right' })
    gs.dwCash = 999
    await Save.saveSlot(1, gs)
    const loaded = await Save.loadSlot(1)
    expect(loaded?.party.x).toBe(100)
    expect(loaded?.dwCash).toBe(999)
  })

  it('saveSlot 是深拷贝(后续 mutate gs 不影响存档)', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 100
    await Save.saveSlot(1, gs)
    gs.dwCash = 999 // mutate after save
    const loaded = await Save.loadSlot(1)
    expect(loaded?.dwCash).toBe(100)
  })

  it('loadSlot 不存在的 slot → null', async () => {
    expect(await Save.loadSlot(3)).toBeNull()
  })

  it('listSlots:返回已存槽位 + meta', async () => {
    const gs1 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs1.dwCash = 100
    gs1.wNumScene = 5
    const gs2 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs2.dwCash = 200
    gs2.wNumScene = 10

    await Save.saveSlot(1, gs1)
    await Save.saveSlot(3, gs2)

    const list = await Save.listSlots()
    expect(list).toHaveLength(2)
    expect(list[0]?.id).toBe(1)
    expect(list[0]?.meta.cash).toBe(100)
    expect(list[0]?.meta.sceneId).toBe(5)
    expect(list[1]?.id).toBe(3)
    expect(list[1]?.meta.cash).toBe(200)
  })

  it('deleteSlot:删后 load null + listSlots 少一条', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    await Save.saveSlot(2, gs)
    expect(await Save.loadSlot(2)).not.toBeNull()
    await Save.deleteSlot(2)
    expect(await Save.loadSlot(2)).toBeNull()
    const list = await Save.listSlots()
    expect(list.find((s) => s.id === 2)).toBeUndefined()
  })

  it('slot < 1 或 > MAX_SAVE_SLOTS(5)→ 抛错', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    await expect(Save.saveSlot(0, gs)).rejects.toThrow(/超 1-5/)
    await expect(Save.saveSlot(6, gs)).rejects.toThrow(/超 1-5/)
  })

  it('overwrite:同 slot saveSlot 二次覆盖', async () => {
    const gs1 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs1.dwCash = 100
    await Save.saveSlot(1, gs1)
    const gs2 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs2.dwCash = 999
    await Save.saveSlot(1, gs2)
    const loaded = await Save.loadSlot(1)
    expect(loaded?.dwCash).toBe(999)
  })

  it('MAX_SAVE_SLOTS 暴露为 5', () => {
    expect(MAX_SAVE_SLOTS).toBe(5)
  })
})
