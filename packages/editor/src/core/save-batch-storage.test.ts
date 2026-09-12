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
        typeof options === 'object' &&
        options !== null &&
        'ifAvailable' in options &&
        options.ifAvailable === true
      events.push(`acquire:${name}`)
      if (held.has(name)) {
        if (ifAvailable) {
          events.push('unavailable')
          return await cb(null)
        }
        await new Promise<void>((resolve) => waiters.push({ name, grant: resolve }))
      } else held.add(name)
      try {
        return await cb({ name, mode: 'exclusive' })
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
  let observedResult: 'unavailable' | 'acquired' | undefined
  let probeStarted = false
  disk.hooks.afterRead = async (path) => {
    if (path.endsWith('manifest.json') && !probeStarted) {
      probeStarted = true
      observedResult = await navigator.locks.request(
        `type-pal-workspace:${workspace.workspaceId}`,
        { ifAvailable: true },
        async (lock) => (lock === null ? ('unavailable' as const) : ('acquired' as const)),
      )
    }
  }
  try {
    const opened = await finishOpen(disk.dir)
    expect(opened.workspace.workspaceId).toBe(workspace.workspaceId)
    expect(probeStarted).toBe(true)
    expect(observedResult).toBe('unavailable')
    // Codex接收补证：读取结束后必须释放，随后正控拿到真实形状的Lock，而不是undefined/null。
    const afterRead = await navigator.locks.request(
      `type-pal-workspace:${workspace.workspaceId}`,
      { ifAvailable: true },
      async (lock) => {
        expect(lock).toMatchObject({
          name: `type-pal-workspace:${workspace.workspaceId}`,
          mode: 'exclusive',
        })
        return 'acquired'
      },
    )
    expect(afterRead).toBe('acquired')
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

// ═══ C4（R3）：fallback 尾链——持有期间互斥 + 异常后释放（entered/deferred，无 timer） ═══

test('C4a: 注册锁持有期间第二位不得进入；正常释放与异常释放后排队者均成功', async () => {
  const { withWorkspaceRegistrationLock } = await import('./handle-store.js')
  expect(typeof globalThis.navigator === 'undefined' || !globalThis.navigator.locks).toBe(true)
  const events: string[] = []
  const held = (() => {
    let release!: () => void
    const promise = new Promise<void>((resolve) => {
      release = resolve
    })
    return { promise, release }
  })()
  const first = withWorkspaceRegistrationLock('w', async () => {
    events.push('first-enter')
    await held.promise
    return 'first-done'
  })
  const second = withWorkspaceRegistrationLock('w', async () => {
    events.push('second-enter')
    return 'second-done'
  })
  // 第一位仍持有（held 未释放）：排空微任务后第二位仍未进入——互斥观察。
  try {
    await Promise.resolve()
    await Promise.resolve()
    expect(events).toEqual(['first-enter'])
  } finally {
    held.release()
    await Promise.allSettled([first, second])
  }
  await expect(first).resolves.toBe('first-done')
  await expect(second).resolves.toBe('second-done')
  expect(events).toEqual(['first-enter', 'second-enter'])
  // 异常路径：持有者抛错 → finally 释放 → 排队者随后成功。
  const failing = withWorkspaceRegistrationLock('w', async () => {
    events.push('failing-enter')
    throw new Error('holder fails')
  })
  const queued = withWorkspaceRegistrationLock('w', async () => {
    events.push('after-failure-enter')
    return 'ok-after-failure'
  })
  await expect(failing).rejects.toThrow('holder fails')
  await expect(queued).resolves.toBe('ok-after-failure')
  expect(events.slice(-2)).toEqual(['failing-enter', 'after-failure-enter'])
})

test('C4b: 发现锁持有期间互斥、异常后释放，后续发现不被卡死', async () => {
  const { withWorkspaceDiscoveryLock } = await import('./handle-store.js')
  const events: string[] = []
  const held = (() => {
    let release!: () => void
    const promise = new Promise<void>((resolve) => {
      release = resolve
    })
    return { promise, release }
  })()
  const first = withWorkspaceDiscoveryLock(async () => {
    events.push('d1')
    await held.promise
    throw new Error('discovery fails')
  })
  const second = withWorkspaceDiscoveryLock(async () => {
    events.push('d2')
    return 'ok'
  })
  try {
    await Promise.resolve()
    await Promise.resolve()
    expect(events).toEqual(['d1']) // 持有期间互斥
  } finally {
    held.release()
    await Promise.allSettled([first, second])
  }
  await expect(first).rejects.toThrow('discovery fails')
  await expect(second).resolves.toBe('ok')
  expect(events).toEqual(['d1', 'd2'])
})
