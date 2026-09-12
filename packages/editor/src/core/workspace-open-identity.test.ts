/**
 * EDITOR-SAVE-RECOVERY-1 · open-identity-r1 · 打开身份矩阵（OI-L/S/P/E）。
 *
 * 真实 finishOpen/openLocalProject/resolveOpenedWorkspaceContext/身份构造器全程驱动；
 * mock 只限 handle-store（IDB 边界，记忆 Map）与 PAL HTTP fetch（可信源字节来自独立目录）。
 * 每个冲突用例只改变它声称核验的一个身份轴，配同条件合法对照，核拒绝后
 * 文件快照/IO 轨迹/原绑定记录不变、无新登记。
 */
import { beforeEach, expect, test, vi } from 'vitest'
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
}))
beforeEach(() => {
  bindings.clear()
  authorSaveStorage.receipts.clear()
  vi.unstubAllGlobals()
})

import { fsaSource } from '@type-pal/reforge'
import { finishOpen } from './open-actions.js'
import { buildBlankProject } from './seed.js'
import {
  createLocalWorkspaceContext,
  createPalDevelopmentWorkspaceContext,
  createSandboxWorkspaceContext,
  PAL_DEVELOPMENT_SENTINEL_PATH,
  SANDBOX_WORKSPACE_MARKER_PATH,
  sandboxMarkerFor,
  type WorkspaceContext,
} from './workspace-context.js'
import { resolveOpenedWorkspaceContext } from './workspace-persistence.js'

type Disk = ReturnType<typeof memoryAuthorDirectory>

const untouched = (disk: Disk, before: Map<string, ArrayBuffer>) => {
  expect([...disk.files.entries()]).toEqual([...before.entries()])
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(authorSaveStorage.receipts.size).toBe(0)
}
const bindingsSnapshot = () =>
  new Map([...bindings.entries()].map(([key, record]) => [key, { ...record }]))

async function blankDir(id: string) {
  const files = await buildBlankProject(id)
  return memoryAuthorDirectory(files)
}

/** PAL 可信 HTTP 源：独立目录字节经 fetch 桩按相对路径提供（finishOpen 走 httpSource）。 */
async function palDisk(id = 'pal') {
  const files = await buildBlankProject(id)
  files[PAL_DEVELOPMENT_SENTINEL_PATH] = {
    kind: 'type-pal-editor-pal-development',
    version: 1,
    projectId: id,
    workspaceId: crypto.randomUUID(),
  }
  const trusted = memoryAuthorDirectory(files)
  const disk = memoryAuthorDirectory(files)
  // 桩全局 fetch：'projects/pal/<rel>' → 可信目录字节（独立源，不自授权）。
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const raw = String(input)
      const marker = 'projects/pal/'
      const rel = raw.includes(marker)
        ? decodeURIComponent(raw.slice(raw.lastIndexOf(marker) + marker.length).split('?')[0]!)
        : raw
      const bytes = trusted.files.get(rel)
      if (bytes === undefined) return new Response(null, { status: 404 })
      return new Response(bytes.slice(0))
    }),
  )
  const context = await createPalDevelopmentWorkspaceContext(fsaSource(trusted.dir))
  return { trusted, disk, context }
}

// ═══ OI-L：普通本地 ═══

test('OI-L 正控: 无 marker 目录首次打开 → local-project + 登记 local-directory', async () => {
  const disk = await blankDir('oi-l')
  const opened = await finishOpen(disk.dir)
  expect(opened.workspace).toMatchObject({ mode: 'local-project', source: 'local-directory' })
  expect(bindings.get(opened.workspace.workspaceId)?.handle).toBe(disk.dir)
})

test('OI-L: 最近记录 projectId 漂移时拒绝，不降级不覆盖原记录', async () => {
  const disk = await blankDir('oi-l-drift')
  const stale = createLocalWorkspaceContext('another-project', 'local-directory')
  bindings.set(stale.workspaceId, {
    ...stale,
    name: 'stale',
    handle: disk.dir,
    updatedAt: 1,
  })
  const before = new Map(disk.files)
  const bindingsBefore = bindingsSnapshot()
  await expect(finishOpen(disk.dir)).rejects.toThrow('最近项目记录与 manifest 项目 id 不一致')
  untouched(disk, before)
  expect([...bindings.entries()]).toEqual([...bindingsBefore.entries()])
})

test('OI-L: 无 marker 却带受限 hint（sandbox/PAL）拒绝恢复，零 IO 零登记', async () => {
  const disk = await blankDir('oi-l-hint')
  const before = new Map(disk.files)
  await expect(
    finishOpen(disk.dir, {
      workspaceHint: createSandboxWorkspaceContext('oi-l-hint', 'ui-samples'),
    }),
  ).rejects.toThrow('工作区 identity marker 缺失，拒绝恢复受限工作区')
  await expect(
    finishOpen(disk.dir, {
      workspaceHint: await palDisk('oi-l-hint').then((f) => f.context),
    }),
  ).rejects.toThrow('工作区 identity marker 缺失，拒绝恢复受限工作区')
  untouched(disk, before)
  expect(bindings.size).toBe(0)
})

test('OI-L: hint projectId 与 manifest 冲突时拒绝', async () => {
  const disk = await blankDir('oi-l-hint-pid')
  await expect(
    finishOpen(disk.dir, {
      workspaceHint: createLocalWorkspaceContext('other-id', 'local-directory'),
    }),
  ).rejects.toThrow('新工作区 identity 与写入后的 manifest 项目 id 不一致')
})

// ═══ OI-S：沙盒 ═══

test('OI-S 正控: 合法 marker（三种支持 source）打开 → sandbox 会话', async () => {
  for (const source of ['ui-samples', 'sandbox-copy', 'review-copy'] as const) {
    bindings.clear()
    const disk = await blankDir('oi-s')
    const context = createSandboxWorkspaceContext('oi-s', source)
    disk.set(SANDBOX_WORKSPACE_MARKER_PATH, sandboxMarkerFor(context))
    const opened = await finishOpen(disk.dir)
    expect(opened.workspace).toMatchObject({ mode: 'sandbox', source, projectId: 'oi-s' })
    expect(bindings.get(opened.workspace.workspaceId)?.handle).toBe(disk.dir)
  }
})

test('OI-S: marker 与 manifest 项目 ID 冲突时拒绝，零 IO 原绑定不变', async () => {
  const disk = await blankDir('oi-s')
  const foreign = createSandboxWorkspaceContext('another-project', 'ui-samples')
  disk.set(SANDBOX_WORKSPACE_MARKER_PATH, sandboxMarkerFor(foreign))
  const before = new Map(disk.files)
  await expect(finishOpen(disk.dir)).rejects.toThrow(
    '工作区 identity 冲突：沙盒 marker 与 manifest 项目 id 不一致',
  )
  untouched(disk, before)
  expect(bindings.size).toBe(0)
})

test('OI-S: hint 的 mode/workspaceId 与 marker 不一致时拒绝', async () => {
  const disk = await blankDir('oi-s-hint')
  const markerCtx = createSandboxWorkspaceContext('oi-s-hint', 'ui-samples')
  disk.set(SANDBOX_WORKSPACE_MARKER_PATH, sandboxMarkerFor(markerCtx))
  // mode 不一致：local hint 无法借 sandbox marker。
  await expect(
    finishOpen(disk.dir, {
      workspaceHint: createLocalWorkspaceContext('oi-s-hint', 'local-directory'),
    }),
  ).rejects.toThrow('工作区 identity 冲突：沙盒 marker 与当前操作不一致')
  // workspaceId 不一致：另一 sandbox 身份。
  await expect(
    finishOpen(disk.dir, {
      workspaceHint: createSandboxWorkspaceContext('oi-s-hint', 'ui-samples'),
    }),
  ).rejects.toThrow('工作区 identity 冲突：沙盒 marker 与当前操作不一致')
})

test('OI-S: 既有记录句柄指向另一目录 → 拒绝；mode/projectId/source 漂移 → 拒绝', async () => {
  const other = await blankDir('oi-s-other')
  for (const drift of [
    { label: 'handle', record: (ctx: WorkspaceContext) => ({ ...ctx, handle: other.dir }) },
    {
      label: 'mode',
      record: (ctx: WorkspaceContext) => ({
        ...ctx,
        mode: 'local-project' as const,
        persistencePolicy: 'local-bound' as const,
      }),
    },
    { label: 'projectId', record: (ctx: WorkspaceContext) => ({ ...ctx, projectId: 'drifted' }) },
    {
      label: 'source',
      record: (ctx: WorkspaceContext) => ({ ...ctx, source: 'review-copy' as const }),
    },
  ]) {
    bindings.clear()
    const disk = await blankDir('oi-s-record')
    const ctx = createSandboxWorkspaceContext('oi-s-record', 'ui-samples')
    disk.set(SANDBOX_WORKSPACE_MARKER_PATH, sandboxMarkerFor(ctx))
    bindings.set(ctx.workspaceId, {
      ...drift.record(ctx),
      name: 'record',
      handle: drift.label === 'handle' ? other.dir : disk.dir,
      updatedAt: 1,
    })
    const before = new Map(disk.files)
    const bindingsBefore = bindingsSnapshot()
    await expect(finishOpen(disk.dir)).rejects.toThrow(
      /另一个目录|沙盒 marker 与最近项目记录不一致/,
    )
    untouched(disk, before)
    expect([...bindings.entries()]).toEqual([...bindingsBefore.entries()])
  }
})

// ═══ OI-P：PAL ═══

test('OI-P 正控: 独立可信源 proof 经真实构造器 → finishOpen 装配 pal-development', async () => {
  const { disk } = await palDisk('pal')
  const opened = await finishOpen(disk.dir)
  expect(opened.workspace).toMatchObject({
    mode: 'pal-development',
    projectId: 'pal',
    source: 'dev-http',
    persistencePolicy: 'pal-bound',
  })
  expect(bindings.get(opened.workspace.workspaceId)?.handle).toBe(disk.dir)
})

test('OI-P: 普通 local hint 不能借 sentinel 取得 PAL 权限', async () => {
  const { disk } = await palDisk('pal')
  const before = new Map(disk.files)
  await expect(
    finishOpen(disk.dir, {
      workspaceHint: createLocalWorkspaceContext('pal', 'local-directory'),
    }),
  ).rejects.toThrow('普通项目操作不能获得 PAL 开发基线写权限')
  untouched(disk, before)
  expect(bindings.size).toBe(0)
})

test('OI-P: 既有 PAL 绑定换目录或 mode/projectId/source 漂移 → 拒绝且原记录不变', async () => {
  const other = await blankDir('oi-p-other')
  for (const drift of [
    { label: 'handle', record: (ctx: WorkspaceContext) => ({ ...ctx, handle: other.dir }) },
    {
      label: 'mode',
      record: (ctx: WorkspaceContext) => ({
        ...ctx,
        mode: 'local-project' as const,
        persistencePolicy: 'local-bound' as const,
      }),
    },
    { label: 'projectId', record: (ctx: WorkspaceContext) => ({ ...ctx, projectId: 'drifted' }) },
    {
      label: 'source',
      record: (ctx: WorkspaceContext) => ({ ...ctx, source: 'local-directory' as const }),
    },
  ]) {
    bindings.clear()
    const { disk, context } = await palDisk('pal')
    bindings.set(context.workspaceId, {
      ...drift.record(context),
      name: 'record',
      handle: drift.label === 'handle' ? other.dir : disk.dir,
      updatedAt: 1,
    })
    const before = new Map(disk.files)
    const bindingsBefore = bindingsSnapshot()
    await expect(finishOpen(disk.dir)).rejects.toThrow(
      /另一个目录|PAL sentinel 与最近项目记录不一致/,
    )
    untouched(disk, before)
    expect([...bindings.entries()]).toEqual([...bindingsBefore.entries()])
  }
})

test('OI-P: forceSandbox 检视 PAL 目录不得返回原目录写权限（只读检视会话）', async () => {
  const { disk } = await palDisk('pal')
  const opened = await finishOpen(disk.dir, { forceSandbox: true })
  // 检视降级为 ui-sandbox 会话：非 PAL、非绑定（不登记原目录句柄）。
  expect(opened.workspace.mode).toBe('sandbox')
  expect(opened.workspace.source).toBe('ui-samples')
  expect(bindings.size).toBe(0)
})

// ═══ OI-E：expectedIdentity 最近入口预期 ═══

test('OI-E: expectedIdentity 逐维不符拒绝；全匹配通过并登记', async () => {
  const disk = await blankDir('oi-e')
  // 正控：先合法打开建立记录。
  const opened = await finishOpen(disk.dir)
  const record = bindings.get(opened.workspace.workspaceId)!
  expect(record).toBeTruthy()
  // 全匹配 → 再次打开成功。
  const again = await finishOpen(disk.dir, { expectedIdentity: record })
  expect(again.workspace.workspaceId).toBe(opened.workspace.workspaceId)

  for (const drift of [
    { label: 'workspaceId', patch: { workspaceId: crypto.randomUUID() } },
    { label: 'projectId', patch: { projectId: 'drifted' } },
    {
      label: 'mode',
      patch: { mode: 'sandbox' as const, persistencePolicy: 'sandbox-bound' as const },
    },
    { label: 'source', patch: { source: 'blank-project' as const } },
  ]) {
    bindings.clear()
    const fresh = await blankDir('oi-e')
    const first = await finishOpen(fresh.dir)
    const rec = bindings.get(first.workspace.workspaceId)!
    const mismatched = {
      ...rec,
      ...drift.patch,
    } as import('./handle-store.js').WorkspaceHandleRecord
    mismatched.handle = fresh.dir
    const before = new Map(fresh.files)
    const bindingsBefore = bindingsSnapshot()
    await expect(finishOpen(fresh.dir, { expectedIdentity: mismatched })).rejects.toThrow(
      '最近项目记录与目录中的 workspace identity 不一致',
    )
    untouched(fresh, before)
    expect([...bindings.entries()]).toEqual([...bindingsBefore.entries()])
  }
})

test('OI-E: expectedIdentity 句柄指向其他目录 → finishOpen 载入前拒绝（O3 层），原记录不变', async () => {
  const disk = await blankDir('oi-e-h')
  const opened = await finishOpen(disk.dir)
  const record = bindings.get(opened.workspace.workspaceId)!
  const other = await blankDir('oi-e-h-other')
  const before = new Map(disk.files)
  const bindingsBefore = bindingsSnapshot()
  await expect(
    finishOpen(disk.dir, { expectedIdentity: { ...record, handle: other.dir } }),
  ).rejects.toThrow('最近项目记录指向的目录句柄与本次打开目标不一致')
  untouched(disk, before)
  expect([...bindings.entries()]).toEqual([...bindingsBefore.entries()])
})

// ═══ 直接 resolver 补充（公开入口，合同与 finishOpen 一致） ═══

test('resolver 直测: 无 marker 无记录 → 新 local 身份；forceSandbox 包装为 ui-samples', async () => {
  const disk = await blankDir('oi-r')
  const projectId = 'oi-r'
  const ctx = await resolveOpenedWorkspaceContext(disk.dir, projectId, {
    loadTrustedPalContext: async () => {
      throw new Error('PAL context not expected')
    },
  })
  expect(ctx).toMatchObject({ mode: 'local-project', projectId, source: 'local-directory' })
  const forced = await resolveOpenedWorkspaceContext(disk.dir, projectId, {
    forceSandbox: true,
    loadTrustedPalContext: async () => {
      throw new Error('PAL context not expected')
    },
  })
  expect(forced).toMatchObject({ mode: 'sandbox', source: 'ui-samples' })
})
