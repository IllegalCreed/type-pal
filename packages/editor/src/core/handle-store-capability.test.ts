/**
 * EDITOR-SAVE-RECOVERY-1 · identity-foundation-r1 · F5–F6:锁生命周期与存储/宿主接线。
 *
 * 真实 handle-store 业务全程运行(锁品牌 WeakMap、同目录/既有 identity 守卫、
 * saveWorkspaceHandleUnderLock 全链);替身只限两类宿主边界:
 * 1) indexedDB 内存实现——区分 request success 与 transaction complete,
 *    升级事件、暂存写集 abort 丢弃、事务终结恰一次;
 * 2) 规范相符的 Web Locks 宿主——记录锁名/模式、等待回调完成、异常向外传播。
 * 过期锁由真实 withWorkspaceRegistrationLock 取得,不用 `{} as Lock` 冒充。
 * 只声称代码合同,不声称原生浏览器通过。
 */
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'

import type { WorkspaceRegistrationLock } from './handle-store.js'

/** 真实 handle-store 跑在其上的内存 IndexedDB(唯一被替换的存储边界)。 */
const records = new Map<string, import('./handle-store.js').WorkspaceHandleRecord>()

interface IdbStubOptions {
  /** 首次升级前 objectStoreNames 是否已含旧 store(模拟旧库升级,验证先删后建)。 */
  oldStore?: boolean
  /** 下一个 readwrite 事务在暂存写集后宿主中止(验证 abort 丢弃与单次终结)。 */
  abortNextWrite?: boolean
}

const upgradeLog = { upgrades: 0, deleted: 0, created: 0, keyPath: '' as unknown }
const txLog = { completed: 0, aborted: 0, stagedAtAbort: 0, requestSuccesses: 0 }

function memoryIndexedDb(options: IdbStubOptions): IDBFactory {
  const copy = (value: import('./handle-store.js').WorkspaceHandleRecord | undefined) => {
    if (value === undefined) return undefined
    const { handle, ...rest } = value
    return { ...structuredClone(rest), handle }
  }
  let upgraded = false
  let storeMade = false
  let oldStoreSeen = false
  const db = {
    objectStoreNames: {
      contains: (name: string) =>
        name === 'project-handles' && (storeMade || (options.oldStore === true && !oldStoreSeen)),
    },
    deleteObjectStore(name: string) {
      expect(name).toBe('project-handles')
      upgradeLog.deleted++
      oldStoreSeen = true
      storeMade = false
      records.clear() // 删除 store 即清除其全部行(真实数据效果)
    },
    createObjectStore(name: string, opts: { keyPath: string }) {
      expect(name).toBe('project-handles')
      upgradeLog.created++
      upgradeLog.keyPath = opts.keyPath
      storeMade = true
    },
    transaction(store: string, mode: IDBTransactionMode) {
      expect(store).toBe('project-handles')
      let finished = false
      const staged = new Map<string, import('./handle-store.js').WorkspaceHandleRecord>()
      const tx = {
        oncomplete: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onabort: null as (() => void) | null,
        abort() {
          if (finished) return
          finished = true
          queueMicrotask(() => {
            // 见证:abort 时事务写集已非空(put 已暂存),随后整集丢弃、不发布。
            txLog.stagedAtAbort = staged.size
            staged.clear() // 暂存写集随 abort 丢弃
            txLog.aborted++
            tx.onabort?.()
          })
        },
        objectStore() {
          const request = (read: () => unknown) => {
            const req = {
              result: undefined as unknown,
              onsuccess: null as (() => void) | null,
              onerror: null as (() => void) | null,
            }
            queueMicrotask(() => {
              if (finished) return
              req.result = read()
              txLog.requestSuccesses++
              req.onsuccess?.()
              queueMicrotask(() => {
                if (finished) return
                if (options.abortNextWrite && mode === 'readwrite') {
                  tx.abort() // 宿主在 request success 之后、提交之前中止
                  return
                }
                staged.forEach((value, key) => records.set(key, value)) // complete 发布写集
                finished = true
                if (mode === 'readwrite') txLog.completed++ // 只计写事务提交
                tx.oncomplete?.()
              })
            })
            return req
          }
          return {
            get: (key: string) => request(() => copy(records.get(key))),
            getAll: () => request(() => [...records.values()].map(copy)),
            put: (value: import('./handle-store.js').WorkspaceHandleRecord) => {
              expect(mode).toBe('readwrite')
              const saved = copy(value)!
              staged.set(saved.workspaceId, saved) // put 发出即进入事务写集(非空前提)
              return request(() => saved.workspaceId)
            },
          }
        },
      }
      return tx
    },
  }
  return {
    open(name: string, version: number) {
      expect(name).toBe('type-pal-editor')
      expect(version).toBe(2)
      const req = {
        result: db,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onupgradeneeded: null as (() => void) | null,
      }
      if (upgraded) {
        queueMicrotask(() => req.onsuccess?.())
      } else {
        upgraded = true
        queueMicrotask(() => {
          upgradeLog.upgrades++
          req.onupgradeneeded?.()
          req.onsuccess?.()
        })
      }
      return req
    },
  } as unknown as IDBFactory
}

const idbOptions: IdbStubOptions = {}

beforeEach(() => {
  records.clear()
  Object.assign(upgradeLog, { upgrades: 0, deleted: 0, created: 0, keyPath: '' })
  Object.assign(txLog, { completed: 0, aborted: 0, stagedAtAbort: 0, requestSuccesses: 0 })
  delete idbOptions.oldStore
  delete idbOptions.abortNextWrite
  vi.stubGlobal('indexedDB', memoryIndexedDb(idbOptions))
})
afterEach(() => vi.unstubAllGlobals())

import {
  assertWorkspaceRegistrationLock,
  loadWorkspaceHandle,
  saveWorkspaceHandle,
  saveWorkspaceHandleUnderLock,
  withWorkspaceDiscoveryLock,
  withWorkspaceRegistrationLock,
} from './handle-store.js'
import { createLocalWorkspaceContext, type WorkspaceContext } from './workspace-context.js'

const UUID_A = '0f0e0d0c-1b2a-4c3d-8e9f-a0b1c2d3e4f5'
const UUID_B = '1a1b1c1d-2b3c-4d5e-9f0a-b1c2d3e4f5a6'

const recordsSnapshot = () => new Map([...records.entries()].map(([k, r]) => [k, { ...r }]))

function context(projectId: string, workspaceId = UUID_A): WorkspaceContext {
  return createLocalWorkspaceContext(projectId, 'local-directory', workspaceId)
}

// ═══ F5:真实锁生命周期 ═══

test('F5: 活跃锁内登记成功;错位 workspace 与外来 token 拒绝且零登记', async () => {
  const disk = memoryAuthorDirectory()
  const ctxA = context('proj-a', UUID_A)
  const ctxB = context('proj-b', UUID_B)

  await withWorkspaceRegistrationLock(UUID_A, async (lock) => {
    // 活跃期:正确 workspace 的公开校验器通过,登记成功。
    expect(() => assertWorkspaceRegistrationLock(lock, UUID_A)).not.toThrow()
    await saveWorkspaceHandleUnderLock(lock, ctxA, 'a', disk.dir)
    expect(records.get(UUID_A)?.handle).toBe(disk.dir)
    // 同锁用于另一 workspace → 拒绝,记录不变。
    const before = recordsSnapshot()
    await expect(saveWorkspaceHandleUnderLock(lock, ctxB, 'b', disk.dir)).rejects.toThrow(
      '拒绝未经 workspace identity lock 授权的句柄登记',
    )
    expect([...records.entries()]).toEqual([...before.entries()])
    // 校验器对错位/外来对象同样拒绝(锁品牌不能凭形状冒充)。
    expect(() => assertWorkspaceRegistrationLock(lock, UUID_B)).toThrow(
      '拒绝未经 workspace identity lock 授权的操作',
    )
    expect(() => assertWorkspaceRegistrationLock({} as WorkspaceRegistrationLock, UUID_A)).toThrow(
      '拒绝未经 workspace identity lock 授权的操作',
    )
  })
})

test('F5: 过期 token(真实 API 取得,非伪造)拒绝登记且零副作用', async () => {
  const disk = memoryAuthorDirectory()
  const ctxA = context('proj-a', UUID_A)
  let expired: WorkspaceRegistrationLock | undefined
  await withWorkspaceRegistrationLock(UUID_A, async (lock) => {
    expired = lock
    await saveWorkspaceHandleUnderLock(lock, ctxA, 'a', disk.dir)
  })
  expect(records.get(UUID_A)?.handle).toBe(disk.dir)

  // 回调返回后 token 过期:拒绝、校验器拒绝、记录零变化。
  const before = recordsSnapshot()
  await expect(saveWorkspaceHandleUnderLock(expired!, ctxA, 'again', disk.dir)).rejects.toThrow(
    '拒绝未经 workspace identity lock 授权的句柄登记',
  )
  expect(() => assertWorkspaceRegistrationLock(expired!, UUID_A)).toThrow(
    '拒绝未经 workspace identity lock 授权的操作',
  )
  expect([...records.entries()]).toEqual([...before.entries()])
})

test('F5: 另一 workspace 的有效锁不得把已绑定目录重复登记到自己名下', async () => {
  const disk = memoryAuthorDirectory()
  await saveWorkspaceHandle(context('proj-a', UUID_A), 'a', disk.dir)
  const ctxB = context('proj-b', UUID_B)
  const before = recordsSnapshot()
  // lock 对 UUID_B 完全有效,但目录已绑定 A:同目录跨 workspace 守卫拒绝。
  await expect(
    withWorkspaceRegistrationLock(UUID_B, (lock) =>
      saveWorkspaceHandleUnderLock(lock, ctxB, 'b', disk.dir),
    ),
  ).rejects.toThrow('该目录已经绑定到另一个 workspace identity，拒绝重复登记')
  expect([...records.entries()]).toEqual([...before.entries()])
})

test('F5: saveWorkspaceHandle 完整公开链在锁内登记;既有 identity 守卫保持真实', async () => {
  const disk = memoryAuthorDirectory()
  const ctx = context('proj-a', UUID_A)
  await saveWorkspaceHandle(ctx, 'a', disk.dir) // 公开入口自带锁
  expect(records.get(UUID_A)?.source).toBe('local-directory')
  // 同目录同身份幂等重登记成功(findWorkspaceRecordByHandle 同目录命中路径)。
  await saveWorkspaceHandle(ctx, 'a2', disk.dir)
  expect(records.get(UUID_A)?.name).toBe('a2')
  expect(records.get(UUID_A)?.handle).toBe(disk.dir)
  // 真实守卫示例:同 workspaceId 换目录登记被既有 identity 检查拒绝。
  const other = memoryAuthorDirectory()
  await expect(saveWorkspaceHandle(ctx, 'a', other.dir)).rejects.toThrow(
    'workspace identity 已绑定到另一个目录，拒绝覆盖',
  )
})

// ═══ F6:存储与宿主分支 ═══

test('F6: 新数据库首次创建(无旧 store)→ 升级事件先删旧判断、以 keyPath 建表、登记成功', async () => {
  const disk = memoryAuthorDirectory()
  await saveWorkspaceHandle(context('fresh', UUID_A), 'fresh', disk.dir)
  expect(upgradeLog.upgrades).toBe(1)
  expect(upgradeLog.deleted).toBe(0) // 无旧 store,不触发删除
  expect(upgradeLog.created).toBe(1)
  expect(upgradeLog.keyPath).toBe('workspaceId')
  expect(records.get(UUID_A)?.handle).toBe(disk.dir)
})

test('F6: 旧 store 升级先删后建,删除真清旧行,新登记可用', async () => {
  idbOptions.oldStore = true
  const previous = memoryAuthorDirectory()
  const fresh = memoryAuthorDirectory()
  // 预置旧 store 遗留行:升级删除必须让旧数据真实消失,不只是计数。
  records.set(UUID_B, {
    ...context('previous', UUID_B),
    name: 'old',
    handle: previous.dir,
    updatedAt: 1,
  })
  await saveWorkspaceHandle(context('fresh', UUID_A), 'new', fresh.dir)
  expect(upgradeLog.upgrades).toBe(1)
  expect(upgradeLog.deleted).toBe(1)
  expect(upgradeLog.created).toBe(1)
  expect([...records.keys()]).toEqual([UUID_A]) // 旧行已随删除清空
  expect(records.get(UUID_B)).toBeUndefined()
  expect(records.get(UUID_A)?.handle).toBe(fresh.dir)
})

test('F6: loadWorkspaceHandle 有记录返回原句柄;无记录返回 null', async () => {
  const disk = memoryAuthorDirectory()
  expect(await loadWorkspaceHandle(UUID_A)).toBeNull()
  await saveWorkspaceHandle(context('load', UUID_A), 'load', disk.dir)
  expect(await loadWorkspaceHandle(UUID_A)).toBe(disk.dir)
})

test('F6: 宿主在非空写集暂存后 abort → 拒绝、写集丢弃不发布、事务单次终结', async () => {
  idbOptions.abortNextWrite = true
  const disk = memoryAuthorDirectory()
  const ctx = context('abort', UUID_A)
  await expect(saveWorkspaceHandle(ctx, 'abort', disk.dir)).rejects.toThrow('IndexedDB 事务已中止')
  // 见证链:put 的 request success 已发生,abort 时事务写集非空,且整集未发布。
  expect(txLog.requestSuccesses).toBeGreaterThan(0)
  expect(txLog.stagedAtAbort).toBe(1)
  expect(records.size).toBe(0)
  expect(txLog.aborted).toBe(1)
  expect(txLog.completed).toBe(0) // 终结恰一次且只有 abort
  // 同条件正控:同一目录/上下文在正常宿主下登记成功(写集经 complete 发布)。
  delete idbOptions.abortNextWrite
  await saveWorkspaceHandle(ctx, 'abort', disk.dir)
  expect(records.get(UUID_A)?.handle).toBe(disk.dir)
  expect(txLog.completed).toBe(1)
})

test('F6: Web Locks 宿主下真实登记链可用(锁内 put 经 complete 发布)', async () => {
  vi.stubGlobal('navigator', { locks: queuedLocksHost([]) })
  const disk = memoryAuthorDirectory()
  await withWorkspaceRegistrationLock(UUID_A, (lock) =>
    saveWorkspaceHandleUnderLock(lock, context('weblock', UUID_A), 'weblock', disk.dir),
  )
  expect(records.get(UUID_A)?.handle).toBe(disk.dir)
})

// ═══ F6:代码级 Web Locks 接线(按锁名排队/await 回调/finally 释放的最小宿主模型) ═══
// 只声称代码合同,不声称原生浏览器通过;跨标签页互斥属浏览器 Web Locks 契约,此处验证代码接线。

/** 最小规范宿主:同名锁排队等待、真实 await 回调完成、finally 释放下一位。 */
function queuedLocksHost(requests: Array<{ name: string; mode: string }>) {
  const tails = new Map<string, Promise<unknown>>()
  return {
    request: async (name: string, options: { mode: string }, callback: () => Promise<unknown>) => {
      requests.push({ name, mode: options.mode })
      const previous = tails.get(name) ?? Promise.resolve()
      let releaseHeld!: () => void
      const held = new Promise<void>((resolve) => {
        releaseHeld = resolve
      })
      tails.set(
        name,
        previous.then(() => held),
      )
      await previous // 排队等待同名锁释放(获锁等待)
      try {
        return await callback() // 回调进行中:真实等待其完成
      } finally {
        releaseHeld() // 异常/成功都释放
      }
    },
  }
}

test('F6: discovery 锁名/模式接线(queued 宿主,回调结果原样返回)', async () => {
  const requests: Array<{ name: string; mode: string }> = []
  vi.stubGlobal('navigator', { locks: queuedLocksHost(requests) })
  await expect(withWorkspaceDiscoveryLock(async () => 'd')).resolves.toBe('d')
  expect(requests).toEqual([{ name: 'type-pal-workspace:discovery', mode: 'exclusive' }])
})

test('F6: 同名注册锁排队:持锁回调悬挂期间等待者不进入且悬挂期品牌有效;释放后按序执行', async () => {
  const requests: Array<{ name: string; mode: string }> = []
  vi.stubGlobal('navigator', { locks: queuedLocksHost(requests) })
  const order: string[] = []
  let holderEnteredDone!: () => void
  const holderEntered = new Promise<void>((resolve) => {
    holderEnteredDone = resolve
  })
  let releaseHolder!: () => void
  const holderGate = new Promise<void>((resolve) => {
    releaseHolder = resolve
  })
  let saved!: WorkspaceRegistrationLock
  let waiterEntered = false
  const holder = withWorkspaceRegistrationLock(UUID_A, async (lock) => {
    saved = lock
    holderEnteredDone()
    await holderGate // 回调进行中悬挂(非获锁前等待)
    order.push('holder')
  })
  const waiter = withWorkspaceRegistrationLock(UUID_A, async () => {
    waiterEntered = true
    order.push('waiter')
  })
  await holderEntered
  expect(waiterEntered).toBe(false) // 同名独占:持锁回调悬挂期间等待者未进入
  expect(() => assertWorkspaceRegistrationLock(saved, UUID_A)).not.toThrow() // 悬挂期品牌有效
  releaseHolder()
  await Promise.all([holder, waiter])
  expect(order).toEqual(['holder', 'waiter'])
  expect(
    requests.every((r) => r.mode === 'exclusive' && r.name === `type-pal-workspace:${UUID_A}`),
  ).toBe(true)
})

test('F6: 持锁回调异常原样传播且锁释放,排队等待者继续执行', async () => {
  vi.stubGlobal('navigator', { locks: queuedLocksHost([]) })
  const sentinel = new Error('boom')
  let holderEnteredDone!: () => void
  const holderEntered = new Promise<void>((resolve) => {
    holderEnteredDone = resolve
  })
  let releaseHolder!: () => void
  const holderGate = new Promise<void>((resolve) => {
    releaseHolder = resolve
  })
  const holder = withWorkspaceRegistrationLock(UUID_A, async () => {
    holderEnteredDone()
    await holderGate
    throw sentinel
  })
  const waiter = withWorkspaceRegistrationLock(UUID_A, async () => 'waiter-done')
  await holderEntered
  releaseHolder()
  await expect(holder).rejects.toBe(sentinel) // 异常原样传播,不是吞错后的成功
  await expect(waiter).resolves.toBe('waiter-done') // 锁已释放,等待者继续
})

test('F5: 真实品牌跨 caller await 保持有效;成功退出后失效', async () => {
  let enteredDone!: () => void
  let release!: () => void
  let saved!: WorkspaceRegistrationLock
  const entered = new Promise<void>((resolve) => {
    enteredDone = resolve
  })
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const run = withWorkspaceRegistrationLock(UUID_A, async (lock) => {
    saved = lock
    enteredDone()
    await gate // caller 悬挂在回调内的 await 上
    return 'done'
  })
  const settled = run.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  )
  await entered
  try {
    expect(() => assertWorkspaceRegistrationLock(saved, UUID_A)).not.toThrow() // 悬挂期品牌有效
  } finally {
    release()
    await settled
  }
  expect(() => assertWorkspaceRegistrationLock(saved, UUID_A)).toThrow(
    '拒绝未经 workspace identity lock 授权的操作',
  )
})

test('F5: 异常退出后品牌同样失效(错误原样传播)', async () => {
  const sentinel = new Error('lease-error')
  let enteredDone!: () => void
  let release!: () => void
  let saved!: WorkspaceRegistrationLock
  const entered = new Promise<void>((resolve) => {
    enteredDone = resolve
  })
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const run = withWorkspaceRegistrationLock(UUID_A, async (lock) => {
    saved = lock
    enteredDone()
    await gate
    throw sentinel
  })
  await entered
  release()
  await expect(run).rejects.toBe(sentinel)
  expect(() => assertWorkspaceRegistrationLock(saved, UUID_A)).toThrow(
    '拒绝未经 workspace identity lock 授权的操作',
  )
})

test('F6: 无 Web Locks 宿主走回退,同 realm 注册锁串行不插队(entered/deferred 见证)', async () => {
  // 声明范围:回退是同 realm 串行(模块内 promise 链);跨标签页互斥由浏览器 Web Locks 承担,
  // 本用例只验证回退的代码合同,不代表两个标签页互斥。
  const order: string[] = []
  vi.stubGlobal('navigator', undefined)
  let holderEnteredDone!: () => void
  const holderEntered = new Promise<void>((resolve) => {
    holderEnteredDone = resolve
  })
  let releaseHolder!: () => void
  const holderGate = new Promise<void>((resolve) => {
    releaseHolder = resolve
  })
  let waiterEntered = false
  const holder = withWorkspaceRegistrationLock(UUID_A, async () => {
    holderEnteredDone()
    await holderGate
    order.push('holder')
  })
  const waiter = withWorkspaceRegistrationLock(UUID_B, async () => {
    waiterEntered = true
    order.push('waiter')
  })
  await holderEntered
  expect(waiterEntered).toBe(false) // holder 悬挂中,waiter 不得进入(不用 tick 猜测)
  releaseHolder()
  await Promise.all([holder, waiter])
  expect(order).toEqual(['holder', 'waiter'])
  // 情形一(navigator 未定义)的 discovery 回退同样正确执行并返回结果。
  await expect(withWorkspaceDiscoveryLock(async () => 'node-host')).resolves.toBe('node-host')
  // 情形二:navigator 存在但没有 locks(旧宿主)——discovery 回退仍正确执行并返回结果。
  vi.stubGlobal('navigator', {})
  await expect(withWorkspaceDiscoveryLock(async () => 'fallback-result')).resolves.toBe(
    'fallback-result',
  )
})
