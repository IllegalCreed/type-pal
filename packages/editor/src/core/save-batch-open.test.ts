/**
 * EDITOR-SAVE-RECOVERY-1 · GLM batch-r1 · G1 打开/权限/身份（O1/O2/O3）。
 * 真实 openExistingProject/pickDir/finishOpen 调用链；仅替身 window/picker（浏览器边界）。
 */
import type { CurrentManifest } from '@type-pal/content'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)
const bindings = vi.hoisted(
  () => new Map<string, import('./handle-store.js').WorkspaceHandleRecord>(),
)
vi.mock('./handle-store.js', async (original) => {
  const actual = await original<typeof import('./handle-store.js')>()
  return {
    ...actual,
    loadWorkspaceRecord: async (id: string) => bindings.get(id) ?? null,
    findWorkspaceRecordByHandle: async (handle: FileSystemDirectoryHandle) => {
      for (const record of bindings.values())
        if (await record.handle.isSameEntry(handle)) return record
      return null
    },
    saveWorkspaceHandle: async (
      context: import('./workspace-context.js').WorkspaceContext,
      name: string,
      handle: FileSystemDirectoryHandle,
    ) => {
      bindings.set(context.workspaceId, { ...context, name, handle, updatedAt: 1 })
    },
    saveWorkspaceHandleUnderLock: async (
      _lock: unknown,
      context: import('./workspace-context.js').WorkspaceContext,
      name: string,
      handle: FileSystemDirectoryHandle,
    ) => {
      bindings.set(context.workspaceId, { ...context, name, handle, updatedAt: 1 })
    },
  }
})
beforeEach(() => {
  bindings.clear()
  authorSaveStorage.receipts.clear()
})
afterEach(() => vi.unstubAllGlobals())

import { recoverInterruptedAuthorSave } from './author-save-journal.js'
import { finishOpen, openExistingProject } from './open-actions.js'
import { writeProject } from './project-io.js'
import { buildBlankProject } from './seed.js'
import { createLocalWorkspaceContext, PAL_DEVELOPMENT_SENTINEL_PATH } from './workspace-context.js'
import {
  authorizeFirstSaveTarget,
  withAuthorizedWorkspaceMutation,
} from './workspace-persistence.js'

/** PAL 开发基线 fixture：blank 工程 + sentinel；HTTP proof 由 fetch 桩按路径提供。 */
async function palProject(overrides?: {
  sentinel?: unknown
  httpOverrides?: Record<string, unknown>
}) {
  const files = await buildBlankProject('pal')
  const sentinel =
    overrides?.sentinel ??
    ({
      kind: 'type-pal-editor-pal-development',
      version: 1,
      projectId: 'pal',
      workspaceId: crypto.randomUUID(),
    } as const)
  files[PAL_DEVELOPMENT_SENTINEL_PATH] = sentinel
  const disk = memoryAuthorDirectory(files)
  const fetchCounts = new Map<string, number>()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const raw = String(input)
      const marker = 'projects/pal/'
      const path = raw.includes(marker)
        ? raw.slice(raw.lastIndexOf(marker) + marker.length).split('?')[0]!
        : raw
      const count = (fetchCounts.get(path) ?? 0) + 1
      fetchCounts.set(path, count)
      const override = overrides?.httpOverrides?.[`${path}#${count}`]
      if (override !== undefined) return new Response(JSON.stringify(override))
      const bytes = disk.files.get(path)
      if (bytes === undefined) return new Response(null, { status: 404 })
      return new Response(bytes.slice(0))
    }),
  )
  return { files, disk, fetchCounts }
}

async function project() {
  const files = await buildBlankProject('batch-open')
  return { files, disk: memoryAuthorDirectory(files) }
}

test('O1: 非安全上下文的真实打开入口拒绝，不调用 picker、无凭据/recent 副作用', async () => {
  const picker = vi.fn()
  vi.stubGlobal('window', {
    isSecureContext: false,
    location: { origin: 'http://192.168.1.5:6010' },
    showDirectoryPicker: picker,
  })
  await expect(openExistingProject()).rejects.toThrow('不是安全上下文')
  expect(picker).not.toHaveBeenCalled()
  expect(bindings.size).toBe(0)
  expect(authorSaveStorage.receipts.size).toBe(0)
})

test('O2: NotAllowedError 可见上抛；只有 AbortError 静默返回 null', async () => {
  const { disk } = await project()
  vi.stubGlobal('window', {
    isSecureContext: true,
    location: { origin: 'http://localhost' },
    showDirectoryPicker: vi.fn(async () => {
      throw new DOMException('denied', 'NotAllowedError')
    }),
  })
  await expect(openExistingProject()).rejects.toThrow('denied')
  vi.stubGlobal('window', {
    isSecureContext: true,
    location: { origin: 'http://localhost' },
    showDirectoryPicker: vi.fn(async () => {
      throw new DOMException('cancel', 'AbortError')
    }),
  })
  await expect(openExistingProject()).resolves.toBeNull()
  void disk
})

test('O3: expectedIdentity 指向其他目录时在加载/登记前拒绝，两个目录都保持原样', async () => {
  const a = await project()
  const b = await project()
  const manifest = a.files['manifest.json'] as CurrentManifest
  bindings.set('other-workspace', {
    workspaceId: 'other-workspace',
    projectId: manifest.id,
    mode: 'local-project',
    source: 'local-directory',
    name: 'other',
    handle: b.disk.dir,
    updatedAt: 1,
  })
  const beforeA = new Map(a.disk.files)
  const beforeB = new Map(b.disk.files)
  a.disk.resetChanges()
  b.disk.resetChanges()
  await expect(
    finishOpen(a.disk.dir, {
      expectedIdentity: bindings.get(
        'other-workspace',
      ) as import('./handle-store.js').WorkspaceHandleRecord,
    }),
  ).rejects.toThrow('目录句柄与本次打开目标不一致')
  expect(a.disk.files).toEqual(beforeA)
  expect(b.disk.files).toEqual(beforeB)
  expect(a.disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(b.disk.changes).toEqual({ creates: [], closes: [], removes: [] })
})

// ═══ O4/O5/O6、P7(读侧)、B6：PAL/登记链 ═══

test('O6: 合法 PAL sentinel+proof 的完整打开链装配 pal-development 会话', async () => {
  const { disk } = await palProject()
  const opened = await finishOpen(disk.dir)
  expect(opened.workspace).toMatchObject({ mode: 'pal-development', projectId: 'pal' })
  expect(bindings.get(opened.workspace.workspaceId)?.handle).toBe(disk.dir)
})

test('P7(读侧): sentinel 坏 JSON 不降级为普通 local，打开拒绝且零写删', async () => {
  const { disk } = await palProject({ sentinel: '{not-json' })
  const before = new Map(disk.files)
  disk.resetChanges()
  await expect(finishOpen(disk.dir)).rejects.toThrow()
  expect(disk.files).toEqual(before)
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
})

test('P7(读侧): sentinel 缺席时不走 PAL 链，按普通 local 打开', async () => {
  const { disk } = await palProject()
  disk.files.delete(PAL_DEVELOPMENT_SENTINEL_PATH)
  const opened = await finishOpen(disk.dir)
  expect(opened.workspace.mode).toBe('local-project')
})

test('O5: 打开到最终登记之间可信 HTTP proof 变化时拒绝装配新会话', async () => {
  const { disk, fetchCounts } = await palProject({
    httpOverrides: { 'content/scenes/index.json#2': { version: 1, scenes: [] } },
  })
  const before = new Map(disk.files)
  disk.resetChanges()
  await expect(finishOpen(disk.dir)).rejects.toThrow()
  expect((fetchCounts.get('content/scenes/index.json') ?? 0) >= 2).toBe(true)
  expect(disk.files).toEqual(before)
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
})

test('O4: B 目录的 registrationMutation 用于打开 A 时在载入前拒绝，两目录零写删', async () => {
  const diskA = memoryAuthorDirectory(await buildBlankProject('o4-a'))
  const diskB = memoryAuthorDirectory()
  const filesB = await buildBlankProject('o4-b')
  const context = createLocalWorkspaceContext('o4-b', 'blank-project')
  const targetB = await authorizeFirstSaveTarget(context, diskB.dir)
  const entered = (() => {
    let release!: () => void
    const promise = new Promise<void>((resolve) => {
      release = resolve
    })
    return { promise, release }
  })()
  const write = withAuthorizedWorkspaceMutation(targetB, async (mutation) => {
    const beforeA = new Map(diskA.files)
    const beforeB = new Map(diskB.files)
    diskA.resetChanges()
    diskB.resetChanges()
    try {
      await expect(finishOpen(diskA.dir, { registrationMutation: mutation })).rejects.toThrow(
        '打开目标与原保存操作目录不一致',
      )
      expect(diskA.files).toEqual(beforeA)
      expect(diskB.files).toEqual(beforeB)
      expect(diskA.changes).toEqual({ creates: [], closes: [], removes: [] })
    } finally {
      entered.release()
    }
    // 同一 mutation 内声明登记并写 B（与 newBlankProject 同序）：B 正控必须实际完成。
    const wp = await import('./workspace-persistence.js')
    await wp.registerAuthorizedWorkspaceMutation(mutation, context, diskB.dir.name)
    await writeProject(mutation, filesB)
  })
  // 内部 entered/deferred：断言失败会随 write 拒绝传播，不再依赖轮询。
  const guard = Promise.race([write.then(() => 'done'), entered.promise.then(() => 'held')])
  expect(await guard).toBe('held')
  await write
  expect(diskB.json('manifest.json').id).toBe('o4-b')
})

test('B6: PAL 恢复完成后以 pal-bound 重新登记（清空持久 recent 记录模拟新页持久层）', async () => {
  const { files, disk } = await palProject()
  const opened = await finishOpen(disk.dir)
  const context = opened.workspace
  const wp = await import('./workspace-persistence.js')
  const bound = await wp.authorizeBoundWorkspaceTarget(context, disk.dir, opened.authorBaseline)
  let interrupted = false
  disk.hooks.beforeClose = (path) => {
    if (!interrupted && path === 'manifest.json') {
      interrupted = true
      throw new Error('b6 interrupt')
    }
  }
  const changed = { ...files } as Record<string, unknown>
  delete changed[PAL_DEVELOPMENT_SENTINEL_PATH]
  const locale = { ...(changed['content/locale.json'] as Record<string, string>) }
  locale['name.hero'] = 'PAL 新页恢复'
  changed['content/locale.json'] = locale
  await expect(
    withAuthorizedWorkspaceMutation(bound, async (mutation) => {
      await wp.registerAuthorizedWorkspaceMutation(mutation, context, disk.dir.name)
      await writeProject(mutation, changed)
    }),
  ).rejects.toThrow('b6 interrupt')
  disk.hooks.beforeClose = undefined
  disk.resetChanges()
  bindings.clear() // 清空持久 recent 记录；模块内 ownedSaves 状态归恢复器自身清理，非原生新进程
  const result = await recoverInterruptedAuthorSave(disk.dir)
  expect(result?.kind).toBe('committed')
  const record = bindings.get(context.workspaceId)
  expect(record).toMatchObject({ mode: 'pal-development', persistencePolicy: 'pal-bound' })
  const reopened = await finishOpen(disk.dir)
  expect(reopened.workspace.mode).toBe('pal-development')
  expect(disk.json('content/locale.json')['name.hero']).toBe('PAL 新页恢复')
})
