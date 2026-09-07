/**
 * EDITOR-SAVE-RECOVERY-1 · GLM 并行读出口测试分工（先红测试准备）。
 *
 * 调用真实 exportProjectZip / loadPlayProject / finishOpen / current loader / 读取状态门 /
 * Web Locks 代码；只 mock FSA（memoryAuthorDirectory fixture）、IndexedDB（handle-store /
 * author-save-store 记忆替身）、下载 DOM（document anchor + URL.createObjectURL 桩）与
 * navigator.locks（内存实现，走真实锁代码路径）。环境用 node（与相邻 fixture 一致，
 * 需要 undici Response#stream 供资产 gzip 路径）。
 *
 * 三态标注：【绿】现行已满足；【预期红】现行已知入口缺口（分工登记，Codex 实现对应保护后转绿）；
 * 任何红都必须落在下述明确期望上，不得是 fixture/DOM 未定义错误。
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
    findWorkspaceRecordByHandle: async (handle: FileSystemDirectoryHandle) => {
      for (const r of storage.bindings.values()) if (await r.handle.isSameEntry(handle)) return r
      return null
    },
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
    findAuthorSaveReceipt: async () => null,
    storeAuthorSaveReceipt: async () => {},
    loadAuthorSaveReceipt: async () => null,
    deleteStagingAuthorSaveReceipt: async () => {},
  }
})

import type { ProjectSaveState } from '@type-pal/reforge'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { exportProjectZip } from './export-zip.js'
import { loadPlayProject } from './load-play-project.js'
import { finishOpen } from './open-actions.js'
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
      const cb = (typeof options === 'function' ? options : callback) as () => Promise<unknown>
      const ifAvailable =
        typeof options === 'object' && options !== null && 'ifAvailable' in options
      if (held.has(name)) {
        if (ifAvailable) return null
        await new Promise<void>((resolve) => waiters.push({ name, grant: resolve }))
      } else held.add(name)
      try {
        return await cb()
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
  disk.hooks.afterRead = (path) => {
    if (path.endsWith('manifest.json') && value === undefined) {
      void navigator.locks
        .request(`type-pal-workspace:${workspaceId}`, { ifAvailable: true }, async () => {
          await Promise.resolve()
          return 'acquired' as const
        })
        .then((result) => {
          value = result ?? 'unavailable'
        })
    }
  }
  return { observed: () => value, stop: () => (disk.hooks.afterRead = undefined) }
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

test('【绿】合法 committed 项目可经本地试玩入口装载', async () => {
  const disk = await project()
  const opened = await loadPlayProject('read-admission', disk.dir)
  expect(opened.manifest.id).toBe('read-admission')
})

test('【绿·SR-10】pending 状态经试玩读取被拒（loader 级状态门），不写删源文件、不自动恢复', async () => {
  const disk = await project((files) => {
    files[STATE_PATH] = saveState('pending', OP_A)
  })
  const r = await probe(disk, () => loadPlayProject('read-admission', disk.dir))
  expect(r.outcome).toBe('rejected')
  expect(String(r.rejection)).toMatch(/未完成的保存|请先在编辑器/)
  expect(disk.files).toEqual(r.before)
})

test('【绿·SR-10】损坏/非 JSON 状态（200 HTML 形态）经试玩读取被拒', async () => {
  const disk = await project((files) => {
    files[STATE_PATH] = '<html><body>editor index</body></html>'
  })
  const r = await probe(disk, () => loadPlayProject('read-admission', disk.dir))
  expect(r.outcome).toBe('rejected')
  expect(String(r.rejection)).toMatch(/保存状态/)
})

test('【绿·SR-10】试玩读取期间保存状态换代拒绝返回结果（loader 级 withStableProjectRead 夹验）', async () => {
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

test('【预期红·SR-11】试玩读取期间应持有该 workspace 的独占锁', async () => {
  const disk = await project()
  const workspace = bindWorkspace(disk)
  const restore = installMemoryWebLocks()
  const probeLock = probeLockDuringManifestRead(disk, workspace.workspaceId)
  try {
    await loadPlayProject('read-admission', disk.dir)
    await new Promise((resolve) => setTimeout(resolve, 0))
  } finally {
    probeLock.stop()
    restore()
  }
  expect(probeLock.observed()).toBe('unavailable')
})

// ═══ ZIP 导出出口（exportProjectZip）═══

test('【绿】合法 committed 项目可导出下载，文件名正确', async () => {
  const disk = await project()
  const count = await exportProjectZip(disk.dir, 'read-admission')
  expect(count).toBeGreaterThan(0)
  expect(clicks).toBe(1)
  expect(downloads[0]?.name).toBe('read-admission.zip')
  expect(downloads[0]?.blob.size).toBeGreaterThan(0)
})

test('【绿】校验失败（缺 manifest）不得产生下载', async () => {
  const disk = await project((files) => {
    delete files['manifest.json']
  })
  await expect(exportProjectZip(disk.dir, 'read-admission')).rejects.toThrow('manifest')
  expect(clicks).toBe(0)
  expect(downloads).toHaveLength(0)
})

test('【预期红·SR-10】pending 状态必须拒绝导出且不下载', async () => {
  const disk = await project((files) => {
    files[STATE_PATH] = saveState('pending', OP_A)
  })
  const r = await probe(disk, () => exportProjectZip(disk.dir, 'read-admission'))
  expect(r.outcome).toBe('rejected')
  expect(String(r.rejection)).toMatch(/未完成的保存|请先在编辑器/)
  expect(clicks).toBe(0)
  expect(downloads).toHaveLength(0)
})

test('【预期红·SR-10】损坏状态必须拒绝导出且不下载', async () => {
  const disk = await project((files) => {
    files[STATE_PATH] = ''
  })
  const r = await probe(disk, () => exportProjectZip(disk.dir, 'read-admission'))
  expect(r.outcome).toBe('rejected')
  expect(String(r.rejection)).toMatch(/保存状态/)
  expect(clicks).toBe(0)
})

test('【预期红·SR-10】导出收集期间状态换代必须拒绝且不下载', async () => {
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

test('【预期红·SR-12】ZIP 仅排除 save-recovery 子树，保留 committed 门、identity 与用户文件', async () => {
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

test('【预期红·SR-11】导出收集期间应持有该 workspace 的独占锁', async () => {
  const disk = await project()
  const workspace = bindWorkspace(disk)
  const restore = installMemoryWebLocks()
  const probeLock = probeLockDuringManifestRead(disk, workspace.workspaceId)
  try {
    await exportProjectZip(disk.dir, 'read-admission')
    await new Promise((resolve) => setTimeout(resolve, 0))
  } finally {
    probeLock.stop()
    restore()
  }
  expect(probeLock.observed()).toBe('unavailable')
})

// ═══ 已门控入口（finishOpen）的绿对照与锁证据 ═══

test('【绿】无凭据的 pending 目录经普通打开入口拒绝且不装会话', async () => {
  const disk = await project((files) => {
    files[STATE_PATH] = saveState('pending', OP_A)
  })
  await expect(finishOpen(disk.dir)).rejects.toThrow(/缺少原浏览器|请保留目录/)
})

test('【绿】打开读取期间状态换代拒绝（withStableProjectRead 夹验）', async () => {
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

test('【绿】打开读取期间持有该 workspace 的独占锁（真实锁代码 + 内存 locks 边界）', async () => {
  const disk = await project()
  const workspace = bindWorkspace(disk)
  const restore = installMemoryWebLocks()
  const probeLock = probeLockDuringManifestRead(disk, workspace.workspaceId)
  try {
    const opened = await finishOpen(disk.dir)
    expect(opened.workspace.workspaceId).toBe(workspace.workspaceId)
    await new Promise((resolve) => setTimeout(resolve, 0))
  } finally {
    probeLock.stop()
    restore()
  }
  expect(probeLock.observed()).toBe('unavailable')
})
