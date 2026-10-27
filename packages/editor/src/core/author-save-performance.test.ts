import { afterEach, expect, test, vi } from 'vitest'
import { deferred } from './__tests__/author-save-fixture.js'
import {
  acquireAuthorSaveConnection,
  withAuthorSaveStoreSession,
} from './author-save-connection.js'
import { type AuthorSavePlan, savePrefix } from './author-save-plan.js'
import {
  advanceSavePrefix,
  assertSaveTargetBeforeIO,
  reconcileSaveCursor,
} from './author-save-prefix.js'
import { loadAuthorSaveReceipt } from './author-save-store.js'
import { readSaveFiles } from './save-read-pool.js'

afterEach(() => vi.unstubAllGlobals())

/** Native connection boundary only; no journal/policy/receipt decisions are mocked. */
function connection() {
  const close = vi.fn()
  const db = { close, onclose: null, onversionchange: null } as unknown as IDBDatabase
  const open = vi.fn(async () => db)
  return { db, close, open }
}

test('scoped leases share the in-flight open, drain before close, and never cache beyond scope', async () => {
  vi.stubGlobal('indexedDB', {})
  const c = connection(),
    ready = deferred()
  const open = vi.fn(async () => {
    await ready.promise
    return c.db
  })
  const leases = await withAuthorSaveStoreSession(async () => {
    const first = acquireAuthorSaveConnection(open),
      second = acquireAuthorSaveConnection(open)
    expect(open).toHaveBeenCalledTimes(1)
    ready.resolve()
    return Promise.all([first, second])
  })
  expect(c.close).not.toHaveBeenCalled()
  leases[0]!.release()
  expect(c.close).not.toHaveBeenCalled()
  leases[1]!.release()
  expect(c.close).toHaveBeenCalledTimes(1)
  const next = await acquireAuthorSaveConnection(open)
  expect(open).toHaveBeenCalledTimes(2)
  next.release()
  expect(c.close).toHaveBeenCalledTimes(2)
})

test('versionchange evicts the connection; a failed reopen is surfaced without an implicit retry', async () => {
  vi.stubGlobal('indexedDB', {})
  const c = connection()
  await withAuthorSaveStoreSession(async () => {
    const lease = await acquireAuthorSaveConnection(c.open)
    c.db.onversionchange?.call(c.db, new Event('versionchange') as IDBVersionChangeEvent)
    expect(c.close).toHaveBeenCalledTimes(1)
    lease.release()
    const failure = new Error('blocked upgrade')
    const failed = vi.fn(async () => {
      throw failure
    })
    await expect(acquireAuthorSaveConnection(failed)).rejects.toBe(failure)
    expect(failed).toHaveBeenCalledTimes(1)
    const retry = await acquireAuthorSaveConnection(c.open)
    expect(c.open).toHaveBeenCalledTimes(2)
    retry.release()
  })
  expect(c.close).toHaveBeenCalledTimes(2)
})

test('pooled receipt reads still wait for transaction complete and reject abort after request success', async () => {
  const transactions: Array<{ tx: IDBTransaction; request: IDBRequest }> = []
  const close = vi.fn()
  const db = {
    close,
    transaction: (_store: string, _mode: string, options: IDBTransactionOptions) => {
      expect(options.durability).toBe('strict')
      const request = { result: undefined } as IDBRequest
      const tx = {
        error: new Error('durable abort'),
        objectStore: () => ({ get: () => request }),
      } as unknown as IDBTransaction
      transactions.push({ tx, request })
      return tx
    },
  } as unknown as IDBDatabase
  const open = vi.fn(() => {
    const request = { result: db } as IDBOpenDBRequest
    queueMicrotask(() => request.onsuccess?.call(request, new Event('success')))
    return request
  })
  vi.stubGlobal('indexedDB', { open })
  await withAuthorSaveStoreSession(async () => {
    let settled = false
    const first = loadAuthorSaveReceipt('missing').finally(() => {
      settled = true
    })
    await vi.waitFor(() => expect(transactions).toHaveLength(1))
    const failed = transactions[0]!
    failed.request.onsuccess?.call(failed.request, new Event('success'))
    await Promise.resolve()
    expect(settled).toBe(false)
    const rejected = expect(first).rejects.toThrow('durable abort')
    failed.tx.onabort?.call(failed.tx, new Event('abort'))
    await rejected
    expect(close).not.toHaveBeenCalled()
    const second = loadAuthorSaveReceipt('missing')
    await vi.waitFor(() => expect(transactions).toHaveLength(2))
    const success = transactions[1]!
    success.request.onsuccess?.call(success.request, new Event('success'))
    success.tx.oncomplete?.call(success.tx, new Event('complete'))
    await expect(second).resolves.toBeNull()
    expect(open).toHaveBeenCalledTimes(1)
  })
  expect(close).toHaveBeenCalledTimes(1)
})

test('fresh read pool is bounded and settles already-issued reads before rejecting under its lock', async () => {
  const held = deferred(),
    entered: number[] = [],
    finished: number[] = []
  const failure = new Error('foreign source')
  let settled = false
  const result = readSaveFiles(
    Array.from({ length: 20 }, (_, i) => i),
    async (i) => {
      entered.push(i)
      if (i === 0) throw failure
      await held.promise
      finished.push(i)
    },
  ).finally(() => {
    settled = true
  })
  await Promise.resolve()
  expect(entered).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  expect(settled).toBe(false)
  const rejection = expect(result).rejects.toBe(failure)
  held.resolve()
  await rejection
  expect(finished.sort()).toEqual([1, 2, 3, 4, 5, 6, 7])
  expect(entered).toHaveLength(8)
})

test('read pool re-reads each requested file and surfaces even an undefined rejection', async () => {
  const read = vi.fn(async (_path: string) => {})
  const paths = Array.from({ length: 25 }, (_, i) => `file-${i}`)
  await readSaveFiles(paths, read)
  await readSaveFiles(paths, read)
  expect(read.mock.calls.map(([path]) => path)).toEqual([...paths, ...paths])
  await expect(
    readSaveFiles(paths, async () => {
      throw undefined
    }),
  ).rejects.toBeUndefined()
})

const old = `bin:1:${'a'.repeat(64)}` as const
const next = `bin:2:${'b'.repeat(64)}` as const
const empty = 'bin:0:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' as const
const plan: AuthorSavePlan = {
  kind: 'type-pal-author-save-plan',
  version: 1,
  contentVersion: 22,
  operationId: 'cf448da8-601d-4c9c-bbdc-235b7d61d483',
  identity: {
    workspaceId: 'cf448da8-601d-4c9c-bbdc-235b7d61d483',
    projectId: 'p',
    mode: 'local-project',
    source: 'blank-project',
  },
  before: { 'new.json': null, 'catalog.json': old, 'remove.json': old },
  directories: { empty: false },
  steps: [
    { kind: 'write', path: 'new.json', signature: next },
    { kind: 'write', path: 'catalog.json', signature: next },
    { kind: 'mkdir', path: 'empty' },
    { kind: 'remove', path: 'remove.json' },
    { kind: 'write', path: 'catalog.json', signature: old },
    { kind: 'write', path: 'catalog.json', signature: old },
  ],
}

test('incremental per-target guard is equivalent to the former full-copy loop for all cursor/target states', () => {
  const prefix = savePrefix(plan, 0)
  for (let completed = 0; completed < plan.steps.length; completed++) {
    expect(prefix).toEqual(savePrefix(plan, completed))
    const step = plan.steps[completed]!
    for (const issued of [false, true])
      for (const actual of [undefined, null, false, true, old, next, empty]) {
        const cursor = { completed, issued }
        const observed = savePrefix(plan, completed)
        if (step.kind === 'mkdir') {
          if (typeof actual === 'boolean') observed.directories.set(step.path, actual)
          else observed.directories.delete(step.path)
        } else {
          if (typeof actual === 'string' || actual === null) observed.files.set(step.path, actual)
          else observed.files.delete(step.path)
        }
        const normalized =
          step.kind === 'mkdir'
            ? observed.directories.get(step.path)
            : observed.files.get(step.path)
        const accepts = (guard: () => void) => {
          try {
            guard()
            return true
          } catch {
            return false
          }
        }
        const former = accepts(() => {
          if (reconcileSaveCursor(plan, cursor, observed).completed !== completed)
            throw new Error('cursor changed')
        })
        expect(
          accepts(() => assertSaveTargetBeforeIO(plan, cursor, prefix, normalized)),
          `${completed}/${issued}/${actual}`,
        ).toBe(former)
      }
    advanceSavePrefix(prefix, step)
  }
  expect(prefix).toEqual(savePrefix(plan, plan.steps.length))
})
