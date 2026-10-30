import { IDBObjectStore as FakeObjectStore, forceCloseDatabase, IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState } from '../../game-state.js'
import { Save } from '../api.js'
import { _resetDbConnectionForTest } from '../indexed-db.js'

const connections = new Set<IDBDatabase>()
const openRequests: IDBOpenDBRequest[] = []

beforeEach(() => {
  // Each case owns its database and closes every connection opened by the real driver.
  const factory = new IDBFactory()
  const open = factory.open.bind(factory)
  vi.spyOn(factory, 'open').mockImplementation((name, version) => {
    const request = open(name, version)
    openRequests.push(request)
    request.addEventListener('success', () => connections.add(request.result))
    return request
  })
  vi.stubGlobal('indexedDB', factory)
  _resetDbConnectionForTest()
})

afterEach(() => {
  for (const db of connections) db.close()
  connections.clear()
  openRequests.length = 0
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

describe('Save IndexedDB connection ownership', () => {
  it('a failed initial open does not poison the next save attempt', async () => {
    const first = Save.listSlots()
    const request = openRequests[0]!
    request.addEventListener('upgradeneeded', () => request.transaction!.abort())
    await expect(first).rejects.toMatchObject({ name: 'AbortError' })

    const retried = await Save.saveSlot(1, state(321)).then(
      () => 'committed',
      () => 'rejected',
    )
    expect(retried).toBe('committed')
    expect((await Save.loadSlot(1))?.dwCash).toBe(321)
    expect(openRequests).toHaveLength(2)
  })

  it('reset releases the owned connection before a fresh connection is used', async () => {
    await Save.saveSlot(1, state(321))
    const previous = [...connections][0]!
    _resetDbConnectionForTest()
    // The already-resolved open Promise schedules its close callback in this microtask.
    await Promise.resolve()
    expect(() => previous.transaction('save-slots')).toThrow(
      expect.objectContaining({ name: 'InvalidStateError' }),
    )
    expect((await Save.loadSlot(1))?.dwCash).toBe(321)
    expect(openRequests).toHaveLength(2)
  })

  it('a close signal invalidates the cached handle without losing committed data', async () => {
    await Save.saveSlot(1, state(321))
    const previous = [...connections][0]!
    const closed = new Promise<void>((resolve) => {
      previous.addEventListener('close', () => resolve(), { once: true })
    })
    // fake-indexeddb 6.2.5 declares a constructor parameter for this instance-taking API.
    // Invoke its documented fault injector without a cast or changing its declaration.
    Reflect.apply(forceCloseDatabase, undefined, [previous])
    await closed

    const result = await Save.loadSlot(1).then(
      (loaded) => ({ cash: loaded?.dwCash }),
      (error: unknown) => ({ error }),
    )
    expect(result).toEqual({ cash: 321 })
    expect(openRequests).toHaveLength(2)
  })

  it('versionchange releases the old connection instead of blocking another client', async () => {
    await Save.saveSlot(1, state(321))
    // A private fake IndexedDB factory and a second client exercise versionchange/blocked.
    // Production DB_VERSION and the save store schema remain unchanged.
    const request = indexedDB.open('type-pal', 3)
    const outcome = new Promise<'upgraded' | 'blocked'>((resolve, reject) => {
      request.addEventListener('success', () => resolve('upgraded'))
      request.addEventListener('blocked', () => resolve('blocked'))
      request.addEventListener('error', () => reject(request.error))
    })
    const completed = new Promise<IDBDatabase>((resolve, reject) => {
      request.addEventListener('success', () => resolve(request.result))
      request.addEventListener('error', () => reject(request.error))
    })
    try {
      expect(await outcome).toBe('upgraded')
    } finally {
      // The old implementation produces blocked; release it so the failing test cannot leak.
      for (const db of connections) db.close()
      ;(await completed).close()
    }
  })
})
