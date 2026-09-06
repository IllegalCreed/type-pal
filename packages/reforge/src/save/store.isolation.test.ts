import {
  IDBFactory,
  IDBDatabase as TestDatabase,
  IDBObjectStore as TestObjectStore,
} from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { makeTestWorld } from '../test-fixtures.js'
import { buildCurrentSavePayload } from './ops.js'
import { type SaveScope, saveScopeDatabaseName } from './scope.js'
import { IndexedDbSaveStore, MemorySaveStore, type SaveStore } from './store.js'
import type { SaveMeta } from './types.js'

const project = (projectId: string): SaveScope => ({ kind: 'project', projectId })
const workspace = (workspaceId: string, projectId = 'pal'): SaveScope => ({
  kind: 'workspace',
  projectId,
  workspaceId,
})
function snapshot(projectId: string, slotId = 'quick', money = 10, savedTimes = 1) {
  const meta: SaveMeta = {
    slotId,
    kind: 'quick',
    party: [],
    mapName: `${projectId}:${money}`,
    savedAt: 1,
    savedTimes,
  }
  const payload = buildCurrentSavePayload(
    { ...makeTestWorld(), money },
    { sceneId: 'scene', pos: { col: money, row: 2, height: 0 }, facing: 'down' },
    projectId,
  )
  return { meta, payload, thumb: new Blob([`${projectId}:${money}`]) }
}
async function write(
  store: SaveStore,
  projectId: string,
  slotId = 'quick',
  money = 10,
  savedTimes = 1,
) {
  const s = snapshot(projectId, slotId, money, savedTimes)
  await store.putSlot(s.meta, s.payload, s.thumb)
}
async function read(store: SaveStore, slotId = 'quick') {
  return {
    meta: (await store.listMeta()).find((m) => m.slotId === slotId),
    payload: await store.getPayload(slotId),
    thumb: await (await store.getThumb(slotId))?.text(),
  }
}
let factory: IDBFactory
beforeEach(() => {
  factory = new IDBFactory()
  // Test-local ambient factory also exercises the production default; never install an auto polyfill.
  vi.stubGlobal('indexedDB', factory)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('scoped save store', () => {
  test('the default browser factory is scoped and an unavailable factory cannot pretend to persist', async () => {
    const store = new IndexedDbSaveStore(project('pal'))
    await write(store, 'pal')
    expect((await new IndexedDbSaveStore(project('pal')).getPayload('quick'))?.projectId).toBe(
      'pal',
    )
    vi.stubGlobal('indexedDB', undefined)
    expect(() => new IndexedDbSaveStore(project('pal'))).toThrow('不支持')
    const memory = new MemorySaveStore(project('pal'))
    await write(memory, 'pal')
    expect((await memory.getPayload('quick'))?.projectId).toBe('pal')
  })
  test.each([
    'quick',
    'auto',
    'm01',
  ])('different projects keep all three records and counts for %s', async (slotId) => {
    const a = new IndexedDbSaveStore(project('A'), factory)
    const b = new IndexedDbSaveStore(project('B'), factory)
    await write(a, 'A', slotId, 11, 2)
    const before = await read(a, slotId)
    await write(b, 'B', slotId, 22, 1)
    expect(await read(a, slotId)).toEqual(before)
    expect(await read(b, slotId)).toMatchObject({
      meta: { savedTimes: 1, mapName: 'B:22' },
      payload: { projectId: 'B', world: { money: 22 } },
      thumb: 'B:22',
    })
  })

  test('workspace, project and same workspace id in a different project are separate', async () => {
    const scopes = [workspace('W1'), workspace('W2'), project('pal'), workspace('W1', 'other')]
    const stores = scopes.map((scope) => new IndexedDbSaveStore(scope, factory))
    for (let i = 0; i < stores.length; i++)
      await write(stores[i]!, scopes[i]!.projectId, 'quick', 10 + i)
    for (let i = 0; i < stores.length; i++)
      expect((await stores[i]!.getPayload('quick'))?.world.money).toBe(10 + i)
  })

  test('reopening the same workspace reads its records; returned snapshots cannot mutate storage', async () => {
    const a = new IndexedDbSaveStore(workspace('W'), factory)
    await write(a, 'pal')
    const reopened = new IndexedDbSaveStore(workspace('W'), factory)
    const meta = (await reopened.listMeta())[0]!
    const payload = (await reopened.getPayload('quick'))!
    meta.mapName = 'changed'
    payload.world.money = -1
    expect(await read(a)).toMatchObject({
      meta: { mapName: 'pal:10' },
      payload: { world: { money: 10 } },
      thumb: 'pal:10',
    })
    expect(await reopened.getPayload('missing')).toBeNull()
    expect(await reopened.getThumb('missing')).toBeNull()
  })

  test('scope is captured before the caller changes it', async () => {
    const scope = { kind: 'workspace' as const, projectId: 'pal', workspaceId: 'W1' }
    const store = new IndexedDbSaveStore(scope, factory)
    scope.workspaceId = 'W2'
    scope.projectId = 'other'
    await write(store, 'pal')
    expect(
      await new IndexedDbSaveStore(workspace('W1'), factory).getPayload('quick'),
    ).not.toBeNull()
    expect(await new IndexedDbSaveStore(scope, factory).listMeta()).toEqual([])
  })

  test('put snapshots both records before asynchronous open', async () => {
    const store = new IndexedDbSaveStore(project('pal'), factory)
    const input = snapshot('pal')
    const saving = store.putSlot(input.meta, input.payload, input.thumb)
    input.meta.slotId = 'm01'
    input.meta.mapName = 'changed'
    input.payload.projectId = 'other'
    input.payload.world.money = -1
    await saving
    expect(await read(store)).toMatchObject({
      meta: { slotId: 'quick', mapName: 'pal:10' },
      payload: { projectId: 'pal', world: { money: 10 } },
      thumb: 'pal:10',
    })
    expect(await store.getPayload('m01')).toBeNull()
  })

  test('wrong project and invalid scope fail before any database opens', async () => {
    const opening = vi.spyOn(factory, 'open')
    expect(
      () => new IndexedDbSaveStore({ kind: 'unknown' } as unknown as SaveScope, factory),
    ).toThrow('存档')
    const store = new IndexedDbSaveStore(project('pal'), factory)
    await expect(write(store, 'other')).rejects.toThrow('项目')
    expect(opening).not.toHaveBeenCalled()
    const memory = new MemorySaveStore(project('pal'))
    await expect(write(memory, 'other')).rejects.toThrow('项目')
    expect(await memory.listMeta()).toEqual([])
  })

  test('a clone failure never partly replaces a good memory slot', async () => {
    const store = new MemorySaveStore(project('pal'))
    await write(store, 'pal')
    const before = await read(store),
      bad = snapshot('pal', 'quick', 99)
    Object.assign(bad.payload, { invalidFunction: () => undefined })
    await expect(store.putSlot(bad.meta, bad.payload, bad.thumb)).rejects.toThrow()
    expect(await read(store)).toEqual(before)
    expect(await new MemorySaveStore(project('pal')).listMeta()).toEqual([])
  })

  test('an uncloneable third record aborts the real transaction and preserves the good slot', async () => {
    const store = new IndexedDbSaveStore(project('pal'), factory)
    await write(store, 'pal')
    const before = await read(store),
      bad = snapshot('pal', 'quick', 99)
    await expect(
      store.putSlot(bad.meta, bad.payload, (() => undefined) as unknown as Blob),
    ).rejects.toThrow()
    expect(await read(store)).toEqual(before)
  })

  test('abort without a request error settles as rejection and does not create a slot', async () => {
    const store = new IndexedDbSaveStore(project('pal'), factory)
    await store.listMeta()
    let observeAbort!: () => void
    const aborted = new Promise<void>((resolve) => {
      observeAbort = resolve
    })
    const requestErrors = vi.fn()
    const original = TestObjectStore.prototype.put
    vi.spyOn(TestObjectStore.prototype, 'put').mockImplementation(function (
      this: IDBObjectStore,
      value,
      key,
    ) {
      const request = original.call(this, value, key)
      if (this.name === 'thumb') {
        const tx = this.transaction
        tx.addEventListener('abort', observeAbort, { once: true })
        tx.addEventListener('error', requestErrors)
        // Abort after the last request succeeds: no pending request can emit an error to mask onabort.
        request.addEventListener('success', () => tx.abort(), { once: true })
      }
      return request
    })
    const outcome = write(store, 'pal').then(
      () => 'saved',
      () => 'rejected',
    )
    await aborted
    expect(requestErrors).not.toHaveBeenCalled()
    // A completed abort must settle the API before the next event-loop turn; no timeout guessing.
    expect(
      await Promise.race([
        outcome,
        new Promise((resolve) => setTimeout(() => resolve('pending'), 0)),
      ]),
    ).toBe('rejected')
    expect(await store.listMeta()).toEqual([])
    expect(await store.getPayload('quick')).toBeNull()
    expect(await store.getThumb('quick')).toBeNull()
  })

  test('factory errors reject instead of inventing successful memory persistence', async () => {
    vi.spyOn(factory, 'open').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    const store = new IndexedDbSaveStore(project('pal'), factory)
    await expect(write(store, 'pal')).rejects.toThrow('denied')
    await expect(store.listMeta()).rejects.toThrow('denied')
  })

  test('a native open request failure rejects without a version fallback', async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(saveScopeDatabaseName(project('pal')), 2)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    db.close()
    await expect(new IndexedDbSaveStore(project('pal'), factory).listMeta()).rejects.toMatchObject({
      name: 'VersionError',
    })
  })

  test('readonly request failures reject payload, thumbnail and metadata reads', async () => {
    const store = new IndexedDbSaveStore(project('pal'), factory)
    await write(store, 'pal')
    const original = TestDatabase.prototype.transaction
    const spy = vi.spyOn(TestDatabase.prototype, 'transaction').mockImplementation(function (
      this: IDBDatabase,
      names,
      mode,
      options,
    ) {
      const tx = original.call(this, names, mode, options)
      if (mode === 'readonly') queueMicrotask(() => tx.abort())
      return tx
    })
    await expect(store.getPayload('quick')).rejects.toMatchObject({ name: 'AbortError' })
    await expect(store.getThumb('quick')).rejects.toMatchObject({ name: 'AbortError' })
    await expect(store.listMeta()).rejects.toMatchObject({ name: 'AbortError' })
    spy.mockRestore()
    expect((await store.getPayload('quick'))?.world.money).toBe(10)
  })

  test('an asynchronous provider request error rolls back every record', async () => {
    const store = new IndexedDbSaveStore(project('pal'), factory)
    await write(store, 'pal')
    const before = await read(store),
      original = TestObjectStore.prototype.put
    const spy = vi.spyOn(TestObjectStore.prototype, 'put').mockImplementation(function (
      this: IDBObjectStore,
      value,
      key,
    ) {
      // Force a genuine IDB request error (duplicate add); the real factory owns abort/rollback semantics.
      return this.name === 'thumb' ? this.add(value, key) : original.call(this, value, key)
    })
    await expect(write(store, 'pal', 'quick', 99)).rejects.toMatchObject({
      name: 'ConstraintError',
    })
    spy.mockRestore()
    expect(await read(store)).toEqual(before)
  })

  test('an already-aborted transaction preserves the original enqueue error', async () => {
    const store = new IndexedDbSaveStore(project('pal'), factory)
    await write(store, 'pal')
    const before = await read(store),
      original = TestObjectStore.prototype.put
    const spy = vi.spyOn(TestObjectStore.prototype, 'put').mockImplementation(function (
      this: IDBObjectStore,
      value,
      key,
    ) {
      if (this.name === 'thumb') {
        this.transaction.abort()
        throw new Error('enqueue failed after abort')
      }
      return original.call(this, value, key)
    })
    await expect(write(store, 'pal', 'quick', 99)).rejects.toThrow('enqueue failed after abort')
    spy.mockRestore()
    expect(await read(store)).toEqual(before)
  })

  test('old unpartitioned records remain untouched and are never read as scoped slots', async () => {
    const legacy = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open('type-pal-saves', 1)
      request.onupgradeneeded = () => {
        for (const key of ['meta', 'payload', 'thumb']) request.result.createObjectStore(key)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const old = snapshot('pal')
    await new Promise<void>((resolve, reject) => {
      const tx = legacy.transaction(['meta', 'payload', 'thumb'], 'readwrite')
      tx.objectStore('meta').put(old.meta, 'quick')
      tx.objectStore('payload').put(old.payload, 'quick')
      tx.objectStore('thumb').put(old.thumb, 'quick')
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error)
    })
    const store = new IndexedDbSaveStore(project('pal'), factory)
    expect(await store.listMeta()).toEqual([])
    expect(await store.getPayload('quick')).toBeNull()
    expect(await store.getThumb('quick')).toBeNull()
    await write(store, 'pal', 'quick', 77)
    for (const [key, expected] of [
      ['meta', old.meta],
      ['payload', old.payload],
      ['thumb', old.thumb],
    ] as const) {
      const actual = await new Promise<unknown>((resolve, reject) => {
        const req = legacy.transaction(key).objectStore(key).get('quick')
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      expect(actual).toEqual(expected)
    }
    legacy.close()
  })
})
