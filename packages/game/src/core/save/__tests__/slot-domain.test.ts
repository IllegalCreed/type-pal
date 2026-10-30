import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState } from '../../game-state.js'
import { Save } from '../api.js'
import { _resetDbConnectionForTest } from '../indexed-db.js'

const invalidSlots = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1.5, 0, 6]

describe.each(['memory', 'indexedDB'] as const)('Save slot domain: %s', (backend) => {
  const connections = new Set<IDBDatabase>()

  beforeEach(async () => {
    _resetDbConnectionForTest()
    await Save._clearAllForTest()
    if (backend === 'memory') {
      vi.stubGlobal('indexedDB', undefined)
    } else {
      const factory = new IDBFactory()
      const open = factory.open.bind(factory)
      vi.spyOn(factory, 'open').mockImplementation((name, version) => {
        const request = open(name, version)
        request.addEventListener('success', () => connections.add(request.result))
        return request
      })
      vi.stubGlobal('indexedDB', factory)
    }
  })

  afterEach(async () => {
    _resetDbConnectionForTest()
    for (const db of connections) db.close()
    connections.clear()
    await Save._clearAllForTest()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it.each([
    'saveSlot',
    'loadSlot',
    'deleteSlot',
  ] as const)('%s rejects each invalid number without changing a saved slot', async (operation) => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 321
    await Save.saveSlot(1, gs)
    for (const slot of invalidSlots) {
      const pending = operation === 'saveSlot' ? Save.saveSlot(slot, gs) : Save[operation](slot)
      const outcome = await pending.then(
        () => ({ status: 'resolved' }),
        (error: unknown) => ({ status: 'rejected', error }),
      )
      expect(outcome).toEqual({
        status: 'rejected',
        error: new Error(`Save: slot ${slot} 必须是 1-5 的整数`),
      })
    }
    expect((await Save.listSlots()).map(({ id, meta }) => [id, meta.cash])).toEqual([[1, 321]])
    expect((await Save.loadSlot(1))?.dwCash).toBe(321)
  })

  it('both boundary slots preserve committed values through save, load and delete', async () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    for (const slot of [1, 5]) {
      gs.dwCash = 100 + slot
      await Save.saveSlot(slot, gs)
      expect((await Save.loadSlot(slot))?.dwCash).toBe(100 + slot)
    }
    expect((await Save.listSlots()).map(({ id }) => id)).toEqual([1, 5])
    for (const slot of [1, 5]) {
      await Save.deleteSlot(slot)
      expect(await Save.loadSlot(slot)).toBeNull()
    }
    expect(await Save.listSlots()).toEqual([])
  })
})
