import { IDBFactory, IDBObjectStore as FakeObjectStore } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState } from '../../game-state.js'
import { Save } from '../api.js'
import { _resetDbConnectionForTest } from '../indexed-db.js'

const connections = new Set<IDBDatabase>()

beforeEach(() => {
  // Each case owns its database and closes every connection opened by the real driver.
  const factory = new IDBFactory()
  const open = factory.open.bind(factory)
  vi.spyOn(factory, 'open').mockImplementation((name, version) => {
    const request = open(name, version)
    request.addEventListener('success', () => connections.add(request.result))
    return request
  })
  vi.stubGlobal('indexedDB', factory)
  _resetDbConnectionForTest()
})

afterEach(() => {
  for (const db of connections) db.close()
  connections.clear()
  _resetDbConnectionForTest()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function state(cash: number) {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.dwCash = cash
  return gs
}

describe('Save real IndexedDB transaction contract', () => {
  it('save resolves after complete; committed data and metadata can be read and deleted', async () => {
    const put = FakeObjectStore.prototype.put
    let completed = false
    vi.spyOn(FakeObjectStore.prototype, 'put').mockImplementationOnce(function (
      this: IDBObjectStore,
      ...args
    ) {
      const request = put.apply(this, args)
      request.transaction!.addEventListener('complete', () => {
        completed = true
      })
      return request
    })
    await Save.saveSlot(1, state(321))
    expect(completed).toBe(true)
    expect((await Save.loadSlot(1))?.dwCash).toBe(321)
    const slots = await Save.listSlots()
    expect(slots.map(({ id, meta }) => [id, meta.cash])).toEqual([[1, 321]])
    await Save.deleteSlot(1)
    expect(await Save.loadSlot(1)).toBeNull()
    expect(await Save.listSlots()).toEqual([])
  })

  it('put success followed by transaction abort rejects and preserves the previous slot', async () => {
    await Save.saveSlot(1, state(100))
    const put = FakeObjectStore.prototype.put
    let requestSucceeded = false
    vi.spyOn(FakeObjectStore.prototype, 'put').mockImplementationOnce(function (
      this: IDBObjectStore,
      ...args
    ) {
      const request = put.apply(this, args)
      request.addEventListener('success', () => {
        requestSucceeded = true
        request.transaction!.abort()
      })
      return request
    })
    await expect(Save.saveSlot(1, state(999))).rejects.toMatchObject({ name: 'AbortError' })
    expect(requestSucceeded).toBe(true) // Fault occurs after success, not before the write request.
    expect((await Save.loadSlot(1))?.dwCash).toBe(100)
  })

  it('delete success followed by transaction abort rejects and keeps the saved slot', async () => {
    await Save.saveSlot(1, state(100))
    const remove = FakeObjectStore.prototype.delete
    let requestSucceeded = false
    vi.spyOn(FakeObjectStore.prototype, 'delete').mockImplementationOnce(function (
      this: IDBObjectStore,
      ...args
    ) {
      const request = remove.apply(this, args)
      request.addEventListener('success', () => {
        requestSucceeded = true
        request.transaction!.abort()
      })
      return request
    })
    await expect(Save.deleteSlot(1)).rejects.toMatchObject({ name: 'AbortError' })
    expect(requestSucceeded).toBe(true)
    expect((await Save.loadSlot(1))?.dwCash).toBe(100)
  })
})
