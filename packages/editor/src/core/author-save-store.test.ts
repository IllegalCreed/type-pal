import { afterEach, expect, test, vi } from 'vitest'
import {
  AUTHOR_SAVE_RECEIPT_DB,
  type AuthorSaveReceipt,
  findAuthorSaveReceipt,
  loadAuthorSaveReceipt,
  parseAuthorSaveReceipt,
  storeAuthorSaveReceipt,
} from './author-save-store.js'

afterEach(() => vi.unstubAllGlobals())
function receipt(): AuthorSaveReceipt {
  const handle = {
    kind: 'directory',
    isSameEntry: async (other: unknown) => other === handle,
  } as FileSystemDirectoryHandle
  const workspaceId = 'cf448da8-601d-4c9c-bbdc-235b7d61d483'
  return {
    version: 1,
    workspaceId,
    identity: { workspaceId, projectId: 'p', mode: 'local-project', source: 'blank-project' },
    operationId: 'b174d84c-6e57-4479-a5b6-84b1c25e6c71',
    ownerNonce: '7bbeab6e-02ef-4d34-b825-8a4a3e2c0d80',
    handle,
    phase: 'staging',
    planHash: null,
    previousState: 'null',
    completed: 0,
    issued: false,
    metadata: { '.type-pal/workspace.json': null, '.type-pal/pal-development.json': null },
    staged: {},
    registrationName: null,
  }
}

/** Minimal IDB event-boundary model, not a structured-clone or native persistence substitute. */
function database() {
  const records = new Map<string, unknown>()
  const events: string[] = []
  const fault: {
    abort?: boolean
    requestError?: boolean
    syncError?: boolean
    openError?: boolean
    blocked?: boolean
    transactionError?: boolean
  } = {}
  let upgraded = false
  const close = vi.fn(() => events.push('close'))
  const db = {
    createObjectStore: vi.fn(),
    close,
    transaction: vi.fn(
      (_store: string, _mode: IDBTransactionMode, options: IDBTransactionOptions) => {
        expect(options.durability).toBe('strict')
        if (fault.transactionError) throw new Error('transaction creation failed')
        const tx = {
          oncomplete: null as (() => void) | null,
          onabort: null as (() => void) | null,
          onerror: null as (() => void) | null,
          error: null as Error | null,
          abort: () => {
            queueMicrotask(() => tx.onabort?.())
          },
          objectStore: (_name: string) => store,
        }
        const request = (read: () => unknown, commit?: () => void) => {
          if (fault.syncError) throw new Error('synchronous put failure')
          const req = { result: undefined as unknown, onsuccess: null as (() => void) | null }
          queueMicrotask(() => {
            if (fault.requestError) {
              tx.error = new Error('request failed')
              tx.onerror?.()
              tx.onabort?.()
              return
            }
            req.result = read()
            events.push('request-success')
            req.onsuccess?.()
            queueMicrotask(() => {
              if (fault.abort) {
                events.push('abort')
                tx.onabort?.()
              } else {
                commit?.()
                events.push('complete')
                tx.oncomplete?.()
              }
            })
          })
          return req
        }
        const store = {
          get: (key: string) => request(() => records.get(key)),
          getAll: () => request(() => [...records.values()]),
          put: (value: AuthorSaveReceipt) =>
            request(
              () => value.workspaceId,
              () => records.set(value.workspaceId, value),
            ),
        }
        return tx
      },
    ),
  }
  vi.stubGlobal('indexedDB', {
    open: vi.fn((name: string, version: number) => {
      expect(name).toBe(AUTHOR_SAVE_RECEIPT_DB)
      expect(version).toBe(1)
      const req = {
        result: db,
        error: new Error('open failed'),
        onupgradeneeded: null as (() => void) | null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onblocked: null as (() => void) | null,
      }
      queueMicrotask(() => {
        if (fault.openError) {
          req.onerror?.()
          return
        }
        if (fault.blocked) {
          req.onblocked?.()
          queueMicrotask(() => req.onsuccess?.())
          return
        }
        if (!upgraded) {
          upgraded = true
          req.onupgradeneeded?.()
        }
        req.onsuccess?.()
      })
      return req
    }),
  })
  return { records, events, fault, db }
}

test('isolates receipts from recent/player DBs and resolves only at transaction complete', async () => {
  const d = database(),
    r = receipt()
  await storeAuthorSaveReceipt(r)
  expect(d.events).toEqual(['request-success', 'complete', 'close'])
  expect(await loadAuthorSaveReceipt(r.workspaceId)).toEqual(r)
  expect(await loadAuthorSaveReceipt('missing')).toBeNull()
  expect(await findAuthorSaveReceipt(r.handle)).toEqual(r)
  expect(await findAuthorSaveReceipt(receipt().handle)).toBeNull()
  expect(d.db.createObjectStore).toHaveBeenCalledTimes(1)
  expect(d.db.createObjectStore).toHaveBeenCalledWith('operations', { keyPath: 'workspaceId' })
})
test('request success followed by abort does not publish a receipt', async () => {
  const d = database()
  d.fault.abort = true
  await expect(storeAuthorSaveReceipt(receipt())).rejects.toThrow('已中止')
  expect(d.events).toEqual(['request-success', 'abort', 'close'])
  expect(d.records.size).toBe(0)
})
test.each([
  'requestError',
  'syncError',
  'openError',
  'blocked',
  'transactionError',
] as const)('rejects %s without reporting success', async (error) => {
  const d = database()
  d.fault[error] = true
  await expect(storeAuthorSaveReceipt(receipt())).rejects.toThrow()
  expect(d.records.size).toBe(0)
})
test('rejects conflicting receipt identities for the same native directory', async () => {
  const d = database(),
    r = receipt()
  const workspaceId = 'b174d84c-6e57-4479-a5b6-84b1c25e6c71'
  d.records.set(r.workspaceId, r)
  d.records.set(workspaceId, { ...r, workspaceId, identity: { ...r.identity, workspaceId } })
  await expect(findAuthorSaveReceipt(r.handle)).rejects.toThrow('多个')
})
test.each([
  ['version', 0],
  ['extra', true],
  ['workspaceId', 'mismatch'],
  ['handle', null],
  ['phase', 'future'],
  ['planHash', 'bad'],
  ['completed', -1],
  ['issued', 'yes'],
  ['registrationName', 1],
  ['metadata', null],
  ['metadata', {}],
  ['metadata', { wrong: null }],
  ['staged', []],
  ['staged', { '../escape': null }],
])('rejects malformed receipt %s', (key, value) => {
  expect(() => parseAuthorSaveReceipt({ ...receipt(), [String(key)]: value })).toThrow()
})
test('checks phase/cursor and payload metadata consistency', () => {
  const r = receipt()
  expect(() => parseAuthorSaveReceipt(null)).toThrow()
  expect(() => parseAuthorSaveReceipt([])).toThrow()
  expect(() => parseAuthorSaveReceipt({ ...r, phase: 'ready' })).toThrow()
  expect(() => parseAuthorSaveReceipt({ ...r, completed: 1 })).toThrow()
  expect(() =>
    parseAuthorSaveReceipt({ ...r, phase: 'committed', planHash: 'a'.repeat(64), issued: true }),
  ).toThrow()
  const ready = {
    ...r,
    phase: 'ready',
    planHash: 'a'.repeat(64),
    staged: {
      [`blobs/${'a'.repeat(64)}`]: `bin:1:${'a'.repeat(64)}`,
      'plan.json': `bin:5:${'a'.repeat(64)}`,
    },
  }
  expect(parseAuthorSaveReceipt(ready)).toEqual(ready)
  expect(() => parseAuthorSaveReceipt({ ...ready, staged: {} })).toThrow('封存计划')
  expect(() => parseAuthorSaveReceipt({ ...ready, staged: { 'plan.json': null } })).toThrow(
    '完整封存',
  )
  expect(() =>
    parseAuthorSaveReceipt({ ...ready, staged: { 'plan.json': `bin:5:${'b'.repeat(64)}` } }),
  ).toThrow('封存计划')
  expect(() =>
    parseAuthorSaveReceipt({
      ...r,
      staged: { [`blobs/${'b'.repeat(64)}`]: `bin:1:${'a'.repeat(64)}` },
    }),
  ).toThrow('payload')
})

test('previous generation must be committed and different; cleaned committed receipts need no payload list', () => {
  const r = receipt()
  const previous = {
    kind: 'type-pal-author-save',
    version: 1,
    operationId: r.ownerNonce,
    phase: 'committed',
    planHash: 'a'.repeat(64),
  }
  expect(
    parseAuthorSaveReceipt({ ...r, previousState: JSON.stringify(previous) }).previousState,
  ).toBe(JSON.stringify(previous))
  expect(() =>
    parseAuthorSaveReceipt({
      ...r,
      previousState: JSON.stringify({ ...previous, phase: 'pending' }),
    }),
  ).toThrow('前一提交')
  expect(() =>
    parseAuthorSaveReceipt({
      ...r,
      previousState: JSON.stringify({ ...previous, operationId: r.operationId }),
    }),
  ).toThrow('前一提交')
  expect(() => parseAuthorSaveReceipt({ ...r, previousState: 'bad JSON' })).toThrow()
  expect(
    parseAuthorSaveReceipt({ ...r, phase: 'committed', planHash: 'a'.repeat(64) }).staged,
  ).toEqual({})
})

test.each([
  'sandbox',
  'pal-development',
] as const)('identity evidence cannot be omitted or mixed for %s', (mode) => {
  const r = receipt()
  const marker = mode === 'sandbox' ? '.type-pal/workspace.json' : '.type-pal/pal-development.json'
  const restricted = {
    ...r,
    identity: { ...r.identity, mode, source: mode === 'sandbox' ? 'ui-samples' : 'dev-http' },
  }
  expect(() => parseAuthorSaveReceipt(restricted)).toThrow('模式')
  expect(
    parseAuthorSaveReceipt({
      ...restricted,
      metadata: { ...r.metadata, [marker]: `bin:1:${'a'.repeat(64)}` },
    }).identity.mode,
  ).toBe(mode)
  expect(() =>
    parseAuthorSaveReceipt({
      ...r,
      metadata: { ...r.metadata, [marker]: `bin:1:${'a'.repeat(64)}` },
    }),
  ).toThrow('模式')
})
