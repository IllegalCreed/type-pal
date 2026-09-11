/**
 * EDITOR-SAVE-RECOVERY-1 · GLM batch-r1 · G5 持久存储与锁（S4 锁序/持有 + S6 权限）。
 * 真实 finishOpen/withWorkspaceDiscoveryLock/withWorkspaceRegistrationLock/ensurePermission 代码；
 * navigator.locks 用最小内存独占锁边界（记录获取顺序），IDB 用既有记忆替身。
 */
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)
const bindings = vi.hoisted(
  () => new Map<string, import('./handle-store.js').WorkspaceHandleRecord>(),
)
vi.mock('./handle-store.js', async (original) => ({
  ...(await original<typeof import('./handle-store.js')>()),
  loadWorkspaceRecord: async (id: string) => bindings.get(id) ?? null,
  findWorkspaceRecordByHandle: async (handle: FileSystemDirectoryHandle) => {
    for (const record of bindings.values())
      if (await record.handle.isSameEntry(handle)) return record
    return null
  },
  saveWorkspaceHandle: async () => undefined,
  saveWorkspaceHandleUnderLock: async () => undefined,
}))
beforeEach(() => {
  bindings.clear()
  authorSaveStorage.receipts.clear()
})

import { ensurePermission } from './handle-store.js'
import { finishOpen } from './open-actions.js'
import { buildBlankProject } from './seed.js'
import { createLocalWorkspaceContext } from './workspace-context.js'

afterEach(() => vi.unstubAllGlobals())

/** 记录获取顺序的最小独占锁实现（浏览器边界替身；锁代码为生产实现）。 */
function installRecordingWebLocks() {
  const events: string[] = []
  const held = new Set<string>()
  const waiters: { name: string; grant: () => void }[] = []
  const grantNext = () => {
    const index = waiters.findIndex((w) => !held.has(w.name))
    if (index === -1) return
    const next = waiters[index]
    if (!next) return
    waiters.splice(index, 1)
    held.add(next.name)
    next.grant()
  }
  const locks = {
    async request(name: string, options: unknown, callback?: unknown): Promise<unknown> {
      const cb = (typeof options === 'function' ? options : callback) as (
        lock: unknown,
      ) => Promise<unknown>
      const ifAvailable =
        typeof options === 'object' && options !== null && 'ifAvailable' in options
      events.push(`acquire:${name}`)
      if (held.has(name)) {
        if (ifAvailable) {
          events.push('unavailable')
          return await cb(null)
        }
        await new Promise<void>((resolve) => waiters.push({ name, grant: resolve }))
      } else held.add(name)
      try {
        return await cb(undefined)
      } finally {
        held.delete(name)
        events.push(`release:${name}`)
        grantNext()
      }
    },
  }
  const previous = Object.getOwnPropertyDescriptor(globalThis.navigator, 'locks')
  Object.defineProperty(globalThis.navigator, 'locks', { value: locks, configurable: true })
  return {
    events,
    restore: () => {
      if (previous) Object.defineProperty(globalThis.navigator, 'locks', previous)
      else Reflect.deleteProperty(globalThis.navigator, 'locks')
    },
  }
}

let observedResult: 'unavailable' | 'acquired' | undefined
function deferredProbe() {
  let entered = false
  let release!: () => void
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  return {
    entered: () => {
      entered = true
      release()
    },
    release: () => released,
    wasEntered: () => entered,
  }
}

test('S4: 发现锁先于 workspace 锁获取、读取期间 workspace 锁被持有（真实锁代码）', async () => {
  const files = await buildBlankProject('batch-storage')
  const disk = memoryAuthorDirectory(files)
  const workspace = createLocalWorkspaceContext('batch-storage', 'local-directory')
  bindings.set(workspace.workspaceId, {
    ...workspace,
    name: 'batch-storage',
    handle: disk.dir,
    updatedAt: 1,
  })
  const recorder = installRecordingWebLocks()
  let probe: Promise<'unavailable' | 'acquired'> | undefined
  const gate = deferredProbe()
  disk.hooks.afterRead = (path) => {
    if (path.endsWith('manifest.json') && probe === undefined) {
      probe = navigator.locks.request(
        `type-pal-workspace:${workspace.workspaceId}`,
        { ifAvailable: true },
        async (lock: unknown) => {
          gate.entered()
          await gate.release()
          return lock === null ? ('unavailable' as const) : ('acquired' as const)
        },
      )
    }
  }
  try {
    const opened = await finishOpen(disk.dir)
    expect(opened.workspace.workspaceId).toBe(workspace.workspaceId)
    // 读取已经发生：探针必已发出；显式等待其结果（内部 gate，不用 timer）。
    expect(probe).toBeDefined()
    observedResult = await probe!
  } finally {
    disk.hooks.afterRead = undefined
    recorder.restore()
  }
  expect(observedResult).toBe('unavailable')
  const discovery = recorder.events.indexOf('acquire:type-pal-workspace:discovery')
  const workspaceLock = recorder.events.indexOf(
    `acquire:type-pal-workspace:${workspace.workspaceId}`,
  )
  expect(discovery).toBeGreaterThanOrEqual(0)
  expect(workspaceLock).toBeGreaterThan(discovery)
})

test('S6: ensurePermission 无请求路径返回 denied；query 抛错传播不被吞', async () => {
  const denied = {
    queryPermission: async () => 'denied' as const,
    requestPermission: vi.fn(async () => 'granted' as const),
  }
  // 无用户手势（withRequest:false）：只查询，不发起授权请求。
  await expect(
    ensurePermission(denied as unknown as FileSystemDirectoryHandle, { withRequest: false }),
  ).resolves.toBe('denied')
  expect(denied.requestPermission).not.toHaveBeenCalled()
  const failing = {
    queryPermission: async () => {
      throw new Error('query io failure')
    },
    requestPermission: vi.fn(async () => 'granted' as const),
  }
  await expect(
    ensurePermission(failing as unknown as FileSystemDirectoryHandle, { withRequest: false }),
  ).rejects.toThrow('query io failure')
  expect(failing.requestPermission).not.toHaveBeenCalled()
})
