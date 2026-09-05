import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  ensurePermission,
  listRecentWorkspaces,
  loadWorkspaceHandle,
  saveWorkspaceHandle,
  saveWorkspaceHandleUnderLock,
  withWorkspaceRegistrationLock,
} from './handle-store.js'
import { createLocalWorkspaceContext } from './workspace-context.js'

const handle = (q: PermissionState, r?: PermissionState) =>
  ({
    queryPermission: vi.fn(async () => q),
    requestPermission: vi.fn(async () => r ?? q),
  }) as unknown as FileSystemDirectoryHandle

const reqSpy = (h: FileSystemDirectoryHandle) =>
  (h as unknown as { requestPermission: ReturnType<typeof vi.fn> }).requestPermission

describe('ensurePermission', () => {
  test('已 granted → 直接 granted,不 request', async () => {
    const h = handle('granted')
    expect(await ensurePermission(h, { withRequest: false })).toBe('granted')
    expect(reqSpy(h)).not.toHaveBeenCalled()
  })

  test('prompt + withRequest=false(载入)→ 返回 prompt,不 request(须手势)', async () => {
    const h = handle('prompt')
    expect(await ensurePermission(h, { withRequest: false })).toBe('prompt')
    expect(reqSpy(h)).not.toHaveBeenCalled()
  })

  test('prompt + withRequest=true(点重连=手势)→ request,得 granted', async () => {
    const h = handle('prompt', 'granted')
    expect(await ensurePermission(h, { withRequest: true })).toBe('granted')
    expect(reqSpy(h)).toHaveBeenCalled()
  })
})

function installMemoryIndexedDb(): void {
  const records = new Map<string, unknown>([['legacy-pal', { id: 'pal', name: 'old-v1-record' }]])
  let upgradePending = true

  const request = <T>(run: () => T): IDBRequest<T> => {
    const value = {
      result: undefined as T,
      error: null as DOMException | null,
      onsuccess: null as ((event: Event) => void) | null,
      onerror: null as ((event: Event) => void) | null,
    }
    queueMicrotask(() => {
      try {
        value.result = run()
        value.onsuccess?.(new Event('success'))
      } catch (error) {
        value.error = error instanceof DOMException ? error : new DOMException(String(error))
        value.onerror?.(new Event('error'))
      }
    })
    return value as unknown as IDBRequest<T>
  }

  const store = {
    put: (value: { workspaceId: string }) =>
      request(() => {
        records.set(value.workspaceId, value)
        return value.workspaceId
      }),
    get: (key: string) => request(() => records.get(key)),
    getAll: () => request(() => [...records.values()]),
  }
  const transactionStore = (transaction: { oncomplete: ((event: Event) => void) | null }) => ({
    put: (value: { workspaceId: string }) => {
      const result = store.put(value)
      queueMicrotask(() => queueMicrotask(() => transaction.oncomplete?.(new Event('complete'))))
      return result
    },
    get: (key: string) => {
      const result = store.get(key)
      queueMicrotask(() => queueMicrotask(() => transaction.oncomplete?.(new Event('complete'))))
      return result
    },
    getAll: () => {
      const result = store.getAll()
      queueMicrotask(() => queueMicrotask(() => transaction.oncomplete?.(new Event('complete'))))
      return result
    },
  })
  const database = {
    objectStoreNames: { contains: () => true },
    deleteObjectStore: () => records.clear(),
    createObjectStore: () => store,
    transaction: () => {
      const transaction = {
        error: null,
        oncomplete: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        onabort: null as ((event: Event) => void) | null,
        objectStore: () => transactionStore(transaction),
      }
      return transaction
    },
  }
  const indexedDb = {
    open: () => {
      const openRequest = {
        result: database,
        error: null,
        onupgradeneeded: null as ((event: Event) => void) | null,
        onsuccess: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
      }
      queueMicrotask(() => {
        if (upgradePending) {
          upgradePending = false
          openRequest.onupgradeneeded?.(new Event('upgradeneeded'))
        }
        openRequest.onsuccess?.(new Event('success'))
      })
      return openRequest
    },
  }
  vi.stubGlobal('indexedDB', indexedDb)
}

describe('workspace handle identity', () => {
  afterEach(() => vi.unstubAllGlobals())

  test('current-only v2 drops the old store and keeps same-project workspaces separately', async () => {
    installMemoryIndexedDb()
    const firstHandle = { name: 'first' } as FileSystemDirectoryHandle
    const secondHandle = { name: 'second' } as FileSystemDirectoryHandle
    const first = createLocalWorkspaceContext(
      'pal',
      'local-directory',
      '11111111-1111-4111-8111-111111111111',
    )
    const second = createLocalWorkspaceContext(
      'pal',
      'local-directory',
      '22222222-2222-4222-8222-222222222222',
    )

    await saveWorkspaceHandle(first, 'PAL copy one', firstHandle)
    await saveWorkspaceHandle(second, 'PAL copy two', secondHandle)

    expect(await loadWorkspaceHandle(first.workspaceId)).toBe(firstHandle)
    expect(await loadWorkspaceHandle(second.workspaceId)).toBe(secondHandle)
    expect(await listRecentWorkspaces()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ workspaceId: first.workspaceId, projectId: 'pal' }),
        expect.objectContaining({ workspaceId: second.workspaceId, projectId: 'pal' }),
      ]),
    )
    expect(await listRecentWorkspaces()).toHaveLength(2)
  })

  test('registration refuses to blind-put one workspace identity onto another directory', async () => {
    installMemoryIndexedDb()
    const nodeA = {}
    const nodeB = {}
    const makeHandle = (node: object) =>
      ({
        name: 'workspace',
        isSameEntry: vi.fn(async (other: FileSystemHandle) =>
          Boolean((other as unknown as { node?: object }).node === node),
        ),
        node,
      }) as unknown as FileSystemDirectoryHandle
    const workspace = createLocalWorkspaceContext(
      'pal',
      'local-directory',
      '33333333-3333-4333-8333-333333333333',
    )
    await saveWorkspaceHandle(workspace, 'one', makeHandle(nodeA))
    await expect(saveWorkspaceHandle(workspace, 'copy', makeHandle(nodeB))).rejects.toThrow(
      '已绑定到另一个目录',
    )
  })

  test('one physical directory cannot be registered under two workspace identities', async () => {
    installMemoryIndexedDb()
    const directory = {
      name: 'shared-directory',
      isSameEntry: vi.fn(async (other: FileSystemHandle) => other === directory),
    } as unknown as FileSystemDirectoryHandle
    const first = createLocalWorkspaceContext(
      'pal',
      'local-directory',
      '55555555-5555-4555-8555-555555555555',
    )
    const second = createLocalWorkspaceContext(
      'pal',
      'local-directory',
      '66666666-6666-4666-8666-666666666666',
    )

    await saveWorkspaceHandle(first, 'first', directory)
    await expect(saveWorkspaceHandle(second, 'second', directory)).rejects.toThrow(
      '目录已经绑定到另一个 workspace identity',
    )
  })

  test('regular registration waits for the same identity lock held by a compound mutation', async () => {
    installMemoryIndexedDb()
    const workspace = createLocalWorkspaceContext(
      'pal',
      'local-directory',
      '44444444-4444-4444-8444-444444444444',
    )
    const directory = {
      name: 'workspace',
      isSameEntry: vi.fn(async (other: FileSystemHandle) => other === directory),
    } as unknown as FileSystemDirectoryHandle
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let signalStarted!: () => void
    const started = new Promise<void>((resolve) => {
      signalStarted = resolve
    })
    const held = withWorkspaceRegistrationLock(workspace.workspaceId, async (lock) => {
      signalStarted()
      await gate
      await saveWorkspaceHandleUnderLock(lock, workspace, 'compound', directory)
    })
    await started

    let competingSettled = false
    const competing = saveWorkspaceHandle(workspace, 'regular', directory).finally(() => {
      competingSettled = true
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(competingSettled).toBe(false)

    release()
    await Promise.all([held, competing])
    expect(competingSettled).toBe(true)
  })
})
