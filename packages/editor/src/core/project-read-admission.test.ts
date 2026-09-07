/**
 * EDITOR-SAVE-RECOVERY-1 · GLM 读出口测试贡献，Codex 校准探针并集成保护。
 *
 * 调用真实 exportProjectZip / loadPlayProject / finishOpen / current loader / 读取状态门 /
 * Web Locks 代码；只 mock FSA（memoryAuthorDirectory fixture）、IndexedDB（handle-store /
 * author-save-store 记忆替身）、下载 DOM（document anchor + URL.createObjectURL 桩）与
 * navigator.locks（内存实现，走真实锁代码路径）。环境用 node（与相邻 fixture 一致，
 * 需要 undici Response#stream 供资产 gzip 路径）。
 *
 * 历史先红结果及探针校准见任务卡；集成后全部为常驻回归，不保留预期失败标注。
 */
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

// ── IndexedDB 边界替身（与 journal 测试同型；不替身 loader/门/锁逻辑） ──
const storage = vi.hoisted(() => ({
  bindings: new Map<string, import('./handle-store.js').WorkspaceHandleRecord>(),
}))
vi.mock('./handle-store.js', async (original) => {
  const actual = await original<typeof import('./handle-store.js')>()
  const save = async (
    context: import('./workspace-context.js').WorkspaceContext,
    name: string,
    handle: FileSystemDirectoryHandle,
  ) => {
    storage.bindings.set(context.workspaceId, { ...context, name, handle, updatedAt: 1 })
  }
  return {
    ...actual,
    loadWorkspaceRecord: async (id: string) => storage.bindings.get(id) ?? null,
    findWorkspaceRecordByHandle: vi.fn(async (handle: FileSystemDirectoryHandle) => {
      for (const r of storage.bindings.values()) if (await r.handle.isSameEntry(handle)) return r
      return null
    }),
    saveWorkspaceHandle: save,
    saveWorkspaceHandleUnderLock: async (_lock: unknown, ...args: Parameters<typeof save>) =>
      save(...args),
  }
})
vi.mock('./author-save-store.js', async (original) => {
  const actual = await original<typeof import('./author-save-store.js')>()
  return {
    ...actual,
    // 读出口用例不携带恢复凭据；find 恒空使 finishOpen 走纯绑定/无记录路径。
    findAuthorSaveReceipt: vi.fn(async () => null),
    storeAuthorSaveReceipt: vi.fn(async () => {}),
    loadAuthorSaveReceipt: vi.fn(async () => null),
    deleteStagingAuthorSaveReceipt: vi.fn(async () => {}),
  }
})

import type { ProjectSaveState } from '@type-pal/reforge'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import * as receipts from './author-save-store.js'
import { exportProjectZip } from './export-zip.js'
import { findWorkspaceRecordByHandle } from './handle-store.js'
import { loadPlayProject } from './load-play-project.js'
import { finishOpen } from './open-actions.js'
import { withProjectDirectoryReadLock } from './project-read-lock.js'
import { buildBlankProject } from './seed.js'
import { createLocalWorkspaceContext } from './workspace-context.js'

const STATE_PATH = '.type-pal/save-state.json'
const saveState = (phase: ProjectSaveState['phase'], operationId: string): string =>
  `${JSON.stringify({
    kind: 'type-pal-author-save',
    version: 1,
    operationId,
    phase,
    planHash: 'a'.repeat(64),
  })}\n`
const OP_A = '11111111-1111-4111-8111-111111111111'
const OP_B = '22222222-2222-4222-8222-222222222222'

type Disk = ReturnType<typeof memoryAuthorDirectory>

// ── 下载 DOM 边界：捕获 blob 与点击，避免真实导航（node 环境下的最小 document 桩） ──
const downloads: { blob: Blob; name: string }[] = []
let clicks = 0
const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL
beforeEach(() => {
  vi.clearAllMocks()
  downloads.length = 0
  clicks = 0
  storage.bindings.clear()
  URL.createObjectURL = (blob: Blob) => {
    downloads.push({ blob, name: '' })
    return 'blob:read-admission'
  }
  URL.revokeObjectURL = () => {}
  vi.stubGlobal('document', {
    createElement: () => {
      const anchor = {
        href: '',
        download: '',
        click: () => {
          clicks += 1
          const last = downloads[downloads.length - 1]
          if (last) last.name = anchor.download
        },
      }
      return anchor
    },
  })
})
afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL
  URL.revokeObjectURL = originalRevokeObjectURL
  vi.unstubAllGlobals()
})

// ── navigator.locks 边界：最小独占锁实现，让真实锁代码可被观测 ──
function installMemoryWebLocks(): () => void {
  const held = new Set<string>()
  const waiters: { name: string; grant: () => void }[] = []
  const grantNext = (): void => {
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
        lock: { name: string; mode: string } | null,
      ) => Promise<unknown>
      const ifAvailable =
        typeof options === 'object' &&
        options !== null &&
        'ifAvailable' in options &&
        options.ifAvailable === true
      if (held.has(name)) {
        if (ifAvailable) return cb(null)
        await new Promise<void>((resolve) => waiters.push({ name, grant: resolve }))
      } else held.add(name)
      try {
        return await cb({ name, mode: 'exclusive' })
      } finally {
        held.delete(name)
        grantNext()
      }
    },
  }
  Object.defineProperty(globalThis.navigator, 'locks', { value: locks, configurable: true })
  return () => {
    Reflect.deleteProperty(globalThis.navigator, 'locks')
  }
}

async function project(extra?: (files: Record<string, unknown>) => void): Promise<Disk> {
  const files = await buildBlankProject('read-admission')
  files[STATE_PATH] = saveState('committed', OP_A)
  extra?.(files)
  return memoryAuthorDirectory(files)
}

/** 结果探针：红测试的失败落在精确期望上，同时保留“文件未被写删”证据。 */
async function probe<T>(disk: Disk, run: () => Promise<T>) {
  const before = new Map(disk.files)
  let outcome: 'resolved' | 'rejected' = 'resolved'
  let rejection: unknown
  try {
    await run()
  } catch (error) {
    outcome = 'rejected'
    rejection = error
  }
  return { outcome, rejection, before }
}

/** 在读取 manifest 期间对指定 workspace 锁发起 ifAvailable 探测。 */
function probeLockDuringManifestRead(
  disk: Disk,
  workspaceId: string,
): { observed: () => 'unavailable' | 'acquired' | undefined; stop: () => void } {
  let value: 'unavailable' | 'acquired' | undefined
  let started = false
  const observe = async () => {
    if (started) return
    started = true
    value = await navigator.locks.request(
      `type-pal-workspace:${workspaceId}`,
      { ifAvailable: true },
      async (lock) => (lock ? ('acquired' as const) : ('unavailable' as const)),
    )
  }
  disk.hooks.afterRead = async (path) => {
    if (path === 'manifest.json') await observe()
  }
  // fsaSource JSON reads Blob.text; observed author sources and ZIP use arrayBuffer.
  // Both probes complete inside the actual manifest read, not after a guessed timer delay.
  const manifestText = new TextDecoder().decode(disk.files.get('manifest.json'))
  const originalText = Blob.prototype.text
  Blob.prototype.text = async function () {
    const text = await originalText.call(this)
    if (text === manifestText) await observe()
    return text
  }
  return {
    observed: () => value,
    stop: () => {
      disk.hooks.afterRead = undefined
      Blob.prototype.text = originalText
    },
  }
}

function bindWorkspace(disk: Disk) {
  const workspace = createLocalWorkspaceContext('read-admission', 'local-directory')
  storage.bindings.set(workspace.workspaceId, {
    ...workspace,
    name: 'read-admission',
    handle: disk.dir,
    updatedAt: 1,
  })
  return workspace
}

// ═══ 试玩读出口（loadPlayProject）═══

test('合法 committed 项目可经本地试玩入口装载', async () => {
  const disk = await project()
  const opened = await loadPlayProject('read-admission', disk.dir)
  expect(opened.manifest.id).toBe('read-admission')
})

test('SR-10：pending 状态经试玩读取被拒（loader 级状态门），不写删源文件、不自动恢复', async () => {
  const disk = await project((files) => {
    files[STATE_PATH] = saveState('pending', OP_A)
  })
  const r = await probe(disk, () => loadPlayProject('read-admission', disk.dir))
  expect(r.outcome).toBe('rejected')
  expect(String(r.rejection)).toMatch(/未完成的保存|请先在编辑器/)
  expect(disk.files).toEqual(r.before)
})

test('SR-10：损坏/非 JSON 状态（200 HTML 形态）经试玩读取被拒', async () => {
  const disk = await project((files) => {
    files[STATE_PATH] = '<html><body>editor index</body></html>'
  })
  const r = await probe(disk, () => loadPlayProject('read-admission', disk.dir))
  expect(r.outcome).toBe('rejected')
  expect(String(r.rejection)).toMatch(/保存状态/)
})

test('SR-10：试玩读取期间保存状态换代拒绝返回结果（loader 级 withStableProjectRead 夹验）', async () => {
  const disk = await project()
  // loadPlayProject 用原始 fsaSource（readText 走 Blob.text，不经 fixture 的 arrayBuffer 钩子），
  // 故用测试内 Blob.text 边界插桩在 manifest 读取点翻转状态；门与 loader 全程真实。
  const originalText = Blob.prototype.text
  let flipped = false
  Blob.prototype.text = async function (this: Blob) {
    const text = await originalText.call(this)
    if (!flipped && text.includes('"contentVersion"') && text.includes('"id"')) {
      flipped = true
      disk.set(STATE_PATH, saveState('committed', OP_B))
    }
    return text
  }
  try {
    const r = await probe(disk, () => loadPlayProject('read-admission', disk.dir))
    expect(r.outcome).toBe('rejected')
    expect(String(r.rejection)).toMatch(/读取期间|新的保存/)
  } finally {
    Blob.prototype.text = originalText
  }
})

test('SR-11：试玩读取期间应持有该 workspace 的独占锁', async () => {
  const disk = await project()
  const workspace = bindWorkspace(disk)
  const restore = installMemoryWebLocks()
  const probeLock = probeLockDuringManifestRead(disk, workspace.workspaceId)
  try {
    await loadPlayProject('read-admission', disk.dir)
  } finally {
    probeLock.stop()
    restore()
  }
  expect(probeLock.observed()).toBe('unavailable')
})

// ═══ ZIP 导出出口（exportProjectZip）═══

test('合法 committed 项目可导出下载，文件名正确', async () => {
  const disk = await project()
  const count = await exportProjectZip(disk.dir, 'read-admission')
  expect(count).toBeGreaterThan(0)
  expect(clicks).toBe(1)
  expect(downloads[0]?.name).toBe('read-admission.zip')
  expect(downloads[0]?.blob.size).toBeGreaterThan(0)
})

test('校验失败（缺 manifest）不得产生下载', async () => {
  const disk = await project((files) => {
    delete files['manifest.json']
  })
  await expect(exportProjectZip(disk.dir, 'read-admission')).rejects.toThrow('manifest')
  expect(clicks).toBe(0)
  expect(downloads).toHaveLength(0)
})

test('SR-10：pending 状态必须拒绝导出且不下载', async () => {
  const disk = await project((files) => {
    files[STATE_PATH] = saveState('pending', OP_A)
  })
  const r = await probe(disk, () => exportProjectZip(disk.dir, 'read-admission'))
  expect(r.outcome).toBe('rejected')
  expect(String(r.rejection)).toMatch(/未完成的保存|请先在编辑器/)
  expect(clicks).toBe(0)
  expect(downloads).toHaveLength(0)
})

test('SR-10：损坏状态必须拒绝导出且不下载', async () => {
  const disk = await project((files) => {
    files[STATE_PATH] = ''
  })
  const r = await probe(disk, () => exportProjectZip(disk.dir, 'read-admission'))
  expect(r.outcome).toBe('rejected')
  expect(String(r.rejection)).toMatch(/保存状态/)
  expect(clicks).toBe(0)
})

test('SR-10：导出收集期间状态换代必须拒绝且不下载', async () => {
  const disk = await project()
  let flipped = false
  disk.hooks.afterRead = (path) => {
    if (path.endsWith('manifest.json') && !flipped) {
      flipped = true
      disk.set(STATE_PATH, saveState('committed', OP_B))
    }
  }
  const r = await probe(disk, () => exportProjectZip(disk.dir, 'read-admission'))
  disk.hooks.afterRead = undefined
  expect(r.outcome).toBe('rejected')
  expect(String(r.rejection)).toMatch(/读取期间|新的保存/)
  expect(clicks).toBe(0)
})

test('SR-12：ZIP 仅排除 save-recovery 子树，保留 committed 门、identity 与用户文件', async () => {
  const disk = await project((files) => {
    files[`.type-pal/save-recovery/${OP_A}/plan.json`] = '{"kind":"staged"}\n'
    files[`.type-pal/save-recovery/${OP_A}/blobs/${'b'.repeat(64)}`] = 'payload-bytes'
    files['.type-pal/workspace.json'] = '{"workspaceId":"keep-me"}\n'
    files['notes/user-notes.txt'] = 'user content stays'
  })
  const count = await exportProjectZip(disk.dir, 'read-admission')
  expect(count).toBeGreaterThan(0)
  expect(clicks).toBe(1)
  const zipText = new TextDecoder().decode(await downloads[0]!.blob.arrayBuffer())
  expect(zipText).not.toContain('.type-pal/save-recovery')
  expect(zipText).toContain('save-state.json')
  expect(zipText).toContain('workspace.json')
  expect(zipText).toContain('user-notes.txt')
})

test('SR-11：导出收集期间应持有该 workspace 的独占锁', async () => {
  const disk = await project()
  const workspace = bindWorkspace(disk)
  const restore = installMemoryWebLocks()
  const probeLock = probeLockDuringManifestRead(disk, workspace.workspaceId)
  try {
    await exportProjectZip(disk.dir, 'read-admission')
  } finally {
    probeLock.stop()
    restore()
  }
  expect(probeLock.observed()).toBe('unavailable')
})

// ═══ 已门控入口（finishOpen）的绿对照与锁证据 ═══

test('无凭据的 pending 目录经普通打开入口拒绝且不装会话', async () => {
  const disk = await project((files) => {
    files[STATE_PATH] = saveState('pending', OP_A)
  })
  await expect(finishOpen(disk.dir)).rejects.toThrow(/缺少原浏览器|请保留目录/)
})

test('打开读取期间状态换代拒绝（withStableProjectRead 夹验）', async () => {
  const disk = await project()
  let flipped = false
  disk.hooks.afterRead = (path) => {
    if (path.endsWith('manifest.json') && !flipped) {
      flipped = true
      disk.set(STATE_PATH, saveState('committed', OP_B))
    }
  }
  try {
    await expect(finishOpen(disk.dir)).rejects.toThrow(/读取期间|新的保存/)
  } finally {
    disk.hooks.afterRead = undefined
  }
})

test('打开读取期间持有该 workspace 的独占锁（真实锁代码 + 内存 locks 边界）', async () => {
  const disk = await project()
  const workspace = bindWorkspace(disk)
  const restore = installMemoryWebLocks()
  const probeLock = probeLockDuringManifestRead(disk, workspace.workspaceId)
  try {
    const opened = await finishOpen(disk.dir)
    expect(opened.workspace.workspaceId).toBe(workspace.workspaceId)
  } finally {
    probeLock.stop()
    restore()
  }
  expect(probeLock.observed()).toBe('unavailable')
})

// Codex 接收时补齐的边界：缺席不等于读取失败、pending 中途出现、只读与锁释放。
const readExits = [
  ['试玩', (dir: FileSystemDirectoryHandle) => loadPlayProject('read-admission', dir)],
  ['ZIP', (dir: FileSystemDirectoryHandle) => exportProjectZip(dir, 'read-admission')],
] as const

test.each(readExits)('%s：状态真正缺席可读，但绝不生成身份或恢复文件', async (_name, read) => {
  const disk = await project((files) => {
    delete files[STATE_PATH]
  })
  const before = new Map(disk.files)
  await read(disk.dir)
  expect(disk.files).toEqual(before)
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(storage.bindings.size).toBe(0)
  for (const fn of [
    receipts.findAuthorSaveReceipt,
    receipts.loadAuthorSaveReceipt,
    receipts.storeAuthorSaveReceipt,
    receipts.deleteStagingAuthorSaveReceipt,
  ])
    expect(fn).not.toHaveBeenCalled()
})

test.each(
  readExits,
)('%s：状态 IO/权限/中止错误不能当作 NotFound，也不自动恢复', async (_name, read) => {
  for (const code of ['NotReadableError', 'NotAllowedError', 'AbortError']) {
    const disk = await project()
    bindWorkspace(disk)
    const metadata = await disk.dir.getDirectoryHandle('.type-pal')
    const original = metadata.getFileHandle.bind(metadata)
    const error = new DOMException('read failure', code)
    metadata.getFileHandle = async (name, options) => {
      if (name === 'save-state.json') throw error
      return original(name, options)
    }
    const before = new Map(disk.files)
    await expect(read(disk.dir)).rejects.toBe(error)
    expect(disk.files).toEqual(before)
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
    // No receipt lookup/replay is allowed at a read-only exit, even on rejection.
    for (const fn of [
      receipts.findAuthorSaveReceipt,
      receipts.loadAuthorSaveReceipt,
      receipts.storeAuthorSaveReceipt,
      receipts.deleteStagingAuthorSaveReceipt,
    ])
      expect(fn).not.toHaveBeenCalled()
    expect(clicks).toBe(0)
    expect(downloads).toHaveLength(0)
  }
})

test.each(readExits)('%s：读取中变为 pending 拒绝；结束后两个锁都释放', async (_name, read) => {
  const disk = await project()
  const workspace = bindWorkspace(disk)
  const restore = installMemoryWebLocks()
  const originalText = Blob.prototype.text
  const manifest = new TextDecoder().decode(disk.files.get('manifest.json'))
  const flip = () => disk.set(STATE_PATH, saveState('pending', OP_B))
  disk.hooks.afterRead = (path) => {
    if (path === 'manifest.json') flip()
  }
  Blob.prototype.text = async function () {
    const text = await originalText.call(this)
    if (text === manifest) flip()
    return text
  }
  try {
    await expect(read(disk.dir)).rejects.toThrow('未完成的保存')
    expect(clicks).toBe(0)
    expect(downloads).toHaveLength(0)
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
    for (const name of ['discovery', workspace.workspaceId]) {
      await navigator.locks.request(`type-pal-workspace:${name}`, { ifAvailable: true }, (lock) => {
        expect(lock?.name).toBe(`type-pal-workspace:${name}`)
      })
    }
  } finally {
    Blob.prototype.text = originalText
    disk.hooks.afterRead = undefined
    restore()
  }
})

test.each(
  readExits,
)('%s：未登记目录读取持有 discovery 锁，阻止并发首次保存', async (_name, read) => {
  const disk = await project()
  const restore = installMemoryWebLocks()
  const lock = probeLockDuringManifestRead(disk, 'discovery')
  try {
    await read(disk.dir)
    expect(lock.observed()).toBe('unavailable')
    expect(storage.bindings.size).toBe(0)
  } finally {
    lock.stop()
    restore()
  }
})

test('读锁：获锁后重查绑定，消失时在任何内容读取前拒绝', async () => {
  const disk = await project()
  const workspace = bindWorkspace(disk)
  vi.mocked(findWorkspaceRecordByHandle)
    .mockResolvedValueOnce(storage.bindings.get(workspace.workspaceId)!)
    .mockResolvedValueOnce(null)
  const read = vi.fn(async () => 'must not read')
  await expect(withProjectDirectoryReadLock(disk.dir, read)).rejects.toThrow('绑定在读取期间')
  expect(read).not.toHaveBeenCalled()
})

test.each([
  'workspaceId',
  'projectId',
  'mode',
  'source',
] as const)('读锁：读取中 %s 绑定漂移不得返回结果', async (field) => {
  const disk = await project()
  const workspace = bindWorkspace(disk)
  const read = vi.fn(async () => {
    const binding = storage.bindings.get(workspace.workspaceId)!
    storage.bindings.set(workspace.workspaceId, { ...binding, [field]: 'external-rebind' })
    return 'must not escape'
  })
  await expect(withProjectDirectoryReadLock(disk.dir, read)).rejects.toThrow('绑定在读取期间')
  expect(read).toHaveBeenCalledOnce()
})
