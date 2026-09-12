/**
 * EDITOR-SAVE-RECOVERY-1 · open-identity-r1(rework) · 打开身份矩阵(OI-L/S/P/E)。
 *
 * 真实 finishOpen/resolveOpenedWorkspaceContext/身份构造器/真实 handle-store(锁品牌、同目录、
 * 既有 identity 守卫全部保留)全程驱动;mock 只限底层存储边界:save 凭据走 memoryAuthorSaveStore,
 * 句柄登记走 indexedDB 全局内存替身(request success/transaction complete 合同),PAL HTTP fetch
 * 桩提供独立可信源字节。冲突按身份轴构造(合法 mode 需配对合法 source),配同条件合法对照,核拒绝后
 * 文件快照/写 IO 轨迹/原登记记录三件套不变。
 */
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)

/** 真实 handle-store 跑在其上的内存 IndexedDB(唯一被替换的存储边界)。 */
const records = new Map<string, import('./handle-store.js').WorkspaceHandleRecord>()

function memoryIndexedDb(): IDBFactory {
  const copy = (value: import('./handle-store.js').WorkspaceHandleRecord | undefined) => {
    if (value === undefined) return undefined
    const { handle, ...rest } = value
    return { ...structuredClone(rest), handle }
  }
  const db = {
    transaction(store: string, mode: IDBTransactionMode) {
      expect(store).toBe('project-handles')
      let aborted = false
      const tx = {
        oncomplete: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onabort: null as (() => void) | null,
        abort() {
          aborted = true
          queueMicrotask(() => tx.onabort?.())
        },
        objectStore() {
          const request = (read: () => unknown, commit = () => {}) => {
            const req = {
              result: undefined as unknown,
              onsuccess: null as (() => void) | null,
              onerror: null as (() => void) | null,
            }
            queueMicrotask(() => {
              if (aborted) return
              req.result = read()
              req.onsuccess?.()
              queueMicrotask(() => {
                if (!aborted) {
                  commit()
                  tx.oncomplete?.()
                }
              })
            })
            return req
          }
          return {
            get: (key: string) => request(() => copy(records.get(key))),
            getAll: () => request(() => [...records.values()].map(copy)),
            put: (value: import('./handle-store.js').WorkspaceHandleRecord) => {
              expect(mode).toBe('readwrite')
              const saved = copy(value)
              return request(
                () => saved?.workspaceId,
                () => {
                  if (saved) records.set(saved.workspaceId, saved)
                },
              )
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
      queueMicrotask(() => req.onsuccess?.())
      return req
    },
  } as unknown as IDBFactory
}

beforeEach(() => {
  records.clear()
  authorSaveStorage.receipts.clear()
  vi.stubGlobal('indexedDB', memoryIndexedDb())
})
afterEach(() => {
  vi.restoreAllMocks()
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
type HandleRecord = import('./handle-store.js').WorkspaceHandleRecord

const untouched = (disk: Disk, before: Map<string, ArrayBuffer>) => {
  expect([...disk.files.entries()]).toEqual([...before.entries()])
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(authorSaveStorage.receipts.size).toBe(0)
}
const recordsSnapshot = () => new Map([...records.entries()].map(([key, rec]) => [key, { ...rec }]))

async function blankDir(id: string) {
  const files = await buildBlankProject(id)
  return memoryAuthorDirectory(files)
}

/** PAL 可信 HTTP 源:独立目录字节经 fetch 桩按相对路径提供(finishOpen 走 httpSource)。 */
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

// 读取见证用 fixture 自带的 hooks.afterRead 钩子计数:真实句柄原样直传,
// 不包代理(代理会破坏 isSameEntry 的对象同一性,改变被测行为)。

// ═══ OI-L:普通本地 ═══

test('OI-L 正控: 无 marker 目录首次打开 → local-project + 真实登记 local-directory', async () => {
  const disk = await blankDir('oi-l')
  const opened = await finishOpen(disk.dir)
  expect(opened.workspace).toMatchObject({ mode: 'local-project', source: 'local-directory' })
  const record = records.get(opened.workspace.workspaceId)
  expect(record?.handle).toBe(disk.dir)
  expect(record).toMatchObject({ mode: 'local-project', source: 'local-directory' })
})

test('OI-L: 最近记录 projectId 漂移时拒绝，不降级不覆盖原记录', async () => {
  const disk = await blankDir('oi-l-drift')
  const stale = createLocalWorkspaceContext('another-project', 'local-directory')
  records.set(stale.workspaceId, { ...stale, name: 'stale', handle: disk.dir, updatedAt: 1 })
  const before = new Map(disk.files)
  const recordsBefore = recordsSnapshot()
  await expect(finishOpen(disk.dir)).rejects.toThrow('最近项目记录与 manifest 项目 id 不一致')
  untouched(disk, before)
  expect([...records.entries()]).toEqual([...recordsBefore.entries()])
})

test('OI-L: 无 marker 却带受限 hint（sandbox/PAL）拒绝恢复，零写 IO 零登记', async () => {
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
  expect(records.size).toBe(0)
})

test('OI-L: hint projectId 与 manifest 冲突时拒绝（三件套不变）', async () => {
  const disk = await blankDir('oi-l-hint-pid')
  const before = new Map(disk.files)
  const recordsBefore = recordsSnapshot()
  await expect(
    finishOpen(disk.dir, {
      workspaceHint: createLocalWorkspaceContext('other-id', 'local-directory'),
    }),
  ).rejects.toThrow('新工作区 identity 与写入后的 manifest 项目 id 不一致')
  untouched(disk, before)
  expect([...records.entries()]).toEqual([...recordsBefore.entries()])
})

test('OI-L 正控: 合法 local hint（projectId 一致）→ 以 hint 身份打开并真实登记', async () => {
  const disk = await blankDir('oi-l-hint-pid')
  const hint = createLocalWorkspaceContext('oi-l-hint-pid', 'local-directory')
  const opened = await finishOpen(disk.dir, { workspaceHint: hint })
  expect(opened.workspace.workspaceId).toBe(hint.workspaceId)
  expect(records.get(hint.workspaceId)?.handle).toBe(disk.dir)
})

// ═══ OI-S:沙盒 ═══

test('OI-S 正控: 合法 marker（三种支持 source）打开 → sandbox 会话 + 真实登记', async () => {
  for (const source of ['ui-samples', 'sandbox-copy', 'review-copy'] as const) {
    records.clear()
    const disk = await blankDir('oi-s')
    const context = createSandboxWorkspaceContext('oi-s', source)
    disk.set(SANDBOX_WORKSPACE_MARKER_PATH, sandboxMarkerFor(context))
    const opened = await finishOpen(disk.dir)
    expect(opened.workspace).toMatchObject({ mode: 'sandbox', source, projectId: 'oi-s' })
    expect(records.get(opened.workspace.workspaceId)?.handle).toBe(disk.dir)
  }
})

test('OI-S: marker 与 manifest 项目 ID 冲突时拒绝，零写 IO 原记录不变', async () => {
  const disk = await blankDir('oi-s')
  const foreign = createSandboxWorkspaceContext('another-project', 'ui-samples')
  disk.set(SANDBOX_WORKSPACE_MARKER_PATH, sandboxMarkerFor(foreign))
  const before = new Map(disk.files)
  await expect(finishOpen(disk.dir)).rejects.toThrow(
    '工作区 identity 冲突：沙盒 marker 与 manifest 项目 id 不一致',
  )
  untouched(disk, before)
  expect(records.size).toBe(0)
})

test('OI-S: hint 的 mode/workspaceId 与 marker 不一致时拒绝（三件套不变）', async () => {
  const disk = await blankDir('oi-s-hint')
  const markerCtx = createSandboxWorkspaceContext('oi-s-hint', 'ui-samples')
  disk.set(SANDBOX_WORKSPACE_MARKER_PATH, sandboxMarkerFor(markerCtx))
  const before = new Map(disk.files)
  const recordsBefore = recordsSnapshot()
  // mode 不一致:local hint 无法借 sandbox marker。
  await expect(
    finishOpen(disk.dir, {
      workspaceHint: createLocalWorkspaceContext(
        'oi-s-hint',
        'local-directory',
        markerCtx.workspaceId,
      ),
    }),
  ).rejects.toThrow('工作区 identity 冲突：沙盒 marker 与当前操作不一致')
  // workspaceId 不一致:另一 sandbox 身份。
  await expect(
    finishOpen(disk.dir, {
      workspaceHint: createSandboxWorkspaceContext('oi-s-hint', 'ui-samples'),
    }),
  ).rejects.toThrow('工作区 identity 冲突：沙盒 marker 与当前操作不一致')
  untouched(disk, before)
  expect([...records.entries()]).toEqual([...recordsBefore.entries()])
})

test('OI-S 正控: hint 与 marker 全轴一致（含 source）→ 以 hint 身份打开登记，重开不依赖 hint', async () => {
  const disk = await blankDir('oi-s-hint-ok')
  const markerCtx = createSandboxWorkspaceContext('oi-s-hint-ok', 'ui-samples')
  disk.set(SANDBOX_WORKSPACE_MARKER_PATH, sandboxMarkerFor(markerCtx))
  const hint = createSandboxWorkspaceContext('oi-s-hint-ok', 'ui-samples', markerCtx.workspaceId)
  const opened = await finishOpen(disk.dir, { workspaceHint: hint })
  expect(opened.workspace).toMatchObject({
    mode: 'sandbox',
    source: 'ui-samples',
    workspaceId: markerCtx.workspaceId,
  })
  expect(records.get(markerCtx.workspaceId)?.source).toBe('ui-samples')
  const reopened = await finishOpen(disk.dir)
  expect(reopened.workspace.workspaceId).toBe(markerCtx.workspaceId)
  expect(reopened.workspace.source).toBe('ui-samples')
})

test('OI-S: hint 的 source 单轴与 marker 不一致必须拒绝、不得登记错误来源', async () => {
  // GLM 交付时先红，Codex 集成修复 source 漏检后转绿；旧只读取证探针保持原样。
  // 新鲜目录，不先正确登记，否则后层 handle-store 守卫会掩盖首次打开的缺口。
  const disk = await blankDir('oi-s-hint-source')
  const markerCtx = createSandboxWorkspaceContext('oi-s-hint-source', 'ui-samples')
  disk.set(SANDBOX_WORKSPACE_MARKER_PATH, sandboxMarkerFor(markerCtx))
  const hint = createSandboxWorkspaceContext(
    'oi-s-hint-source',
    'review-copy',
    markerCtx.workspaceId,
  )
  const before = new Map(disk.files)
  await expect(finishOpen(disk.dir, { workspaceHint: hint })).rejects.toThrow(
    '工作区 identity 冲突：沙盒 marker 与当前操作不一致',
  )
  untouched(disk, before)
  expect(records.size).toBe(0)
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
    records.clear()
    const disk = await blankDir('oi-s-record')
    const ctx = createSandboxWorkspaceContext('oi-s-record', 'ui-samples')
    disk.set(SANDBOX_WORKSPACE_MARKER_PATH, sandboxMarkerFor(ctx))
    records.set(ctx.workspaceId, {
      ...drift.record(ctx),
      name: 'record',
      handle: drift.label === 'handle' ? other.dir : disk.dir,
      updatedAt: 1,
    } as HandleRecord)
    const before = new Map(disk.files)
    const recordsBefore = recordsSnapshot()
    await expect(finishOpen(disk.dir)).rejects.toThrow(
      /另一个目录|沙盒 marker 与最近项目记录不一致/,
    )
    untouched(disk, before)
    expect([...records.entries()]).toEqual([...recordsBefore.entries()])
  }
})

// ═══ OI-P:PAL ═══

test('OI-P 正控: 独立可信源 proof 经真实构造器 → finishOpen 装配 pal-development', async () => {
  const { disk } = await palDisk('pal')
  const opened = await finishOpen(disk.dir)
  expect(opened.workspace).toMatchObject({
    mode: 'pal-development',
    projectId: 'pal',
    source: 'dev-http',
    persistencePolicy: 'pal-bound',
  })
  expect(records.get(opened.workspace.workspaceId)?.handle).toBe(disk.dir)
})

test('OI-P: 普通 local hint 不能借 sentinel 取得 PAL 权限（零登记三件套不变）', async () => {
  const { disk } = await palDisk('pal')
  const before = new Map(disk.files)
  await expect(
    finishOpen(disk.dir, {
      workspaceHint: createLocalWorkspaceContext('pal', 'local-directory'),
    }),
  ).rejects.toThrow('普通项目操作不能获得 PAL 开发基线写权限')
  untouched(disk, before)
  expect(records.size).toBe(0)
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
    records.clear()
    const { disk, context } = await palDisk('pal')
    records.set(context.workspaceId, {
      ...drift.record(context),
      name: 'record',
      handle: drift.label === 'handle' ? other.dir : disk.dir,
      updatedAt: 1,
    } as HandleRecord)
    const before = new Map(disk.files)
    const recordsBefore = recordsSnapshot()
    await expect(finishOpen(disk.dir)).rejects.toThrow(
      /另一个目录|PAL sentinel 与最近项目记录不一致/,
    )
    untouched(disk, before)
    expect([...records.entries()]).toEqual([...recordsBefore.entries()])
  }
})

test('OI-P: forceSandbox 检视 PAL 不得回传原目录句柄（dir 缺席、零登记、零写 IO）', async () => {
  const { disk } = await palDisk('pal')
  const before = new Map(disk.files)
  const opened = await finishOpen(disk.dir, { forceSandbox: true })
  // 检视降级为 ui-samples 沙盒会话:非 PAL、不绑定、不把原目录句柄交给检视方。
  expect(opened.workspace.mode).toBe('sandbox')
  expect(opened.workspace.source).toBe('ui-samples')
  expect(opened.dir).toBeUndefined()
  expect(records.size).toBe(0)
  untouched(disk, before)
})

test('OI-P 对照: forceSandbox 打开合法沙盒目录 → 返回 dir 并登记（mayBind 路径）', async () => {
  const disk = await blankDir('oi-p-forced')
  const markerCtx = createSandboxWorkspaceContext('oi-p-forced', 'ui-samples')
  disk.set(SANDBOX_WORKSPACE_MARKER_PATH, sandboxMarkerFor(markerCtx))
  const opened = await finishOpen(disk.dir, { forceSandbox: true })
  expect(opened.dir).toBe(disk.dir)
  expect(opened.workspace.workspaceId).toBe(markerCtx.workspaceId)
  expect(records.get(markerCtx.workspaceId)?.handle).toBe(disk.dir)
})

// ═══ OI-E:expectedIdentity 最近入口预期 ═══

test('OI-E: expectedIdentity 逐维不符拒绝；全匹配通过并登记', async () => {
  const disk = await blankDir('oi-e')
  // 正控:先合法打开建立真实记录。
  const opened = await finishOpen(disk.dir)
  const record = records.get(opened.workspace.workspaceId)!
  expect(record).toBeTruthy()
  // 全匹配 → 再次打开成功。
  const again = await finishOpen(disk.dir, { expectedIdentity: record })
  expect(again.workspace.workspaceId).toBe(opened.workspace.workspaceId)

  for (const drift of [
    { label: 'workspaceId', patch: { workspaceId: crypto.randomUUID() } },
    { label: 'projectId', patch: { projectId: 'drifted' } },
    { label: 'mode', patch: { mode: 'sandbox' as const } },
    { label: 'source', patch: { source: 'blank-project' as const } },
  ]) {
    records.clear()
    const fresh = await blankDir('oi-e')
    const first = await finishOpen(fresh.dir)
    const rec = records.get(first.workspace.workspaceId)!
    const mismatched = { ...rec, ...drift.patch, handle: fresh.dir } as HandleRecord
    const before = new Map(fresh.files)
    const recordsBefore = recordsSnapshot()
    await expect(finishOpen(fresh.dir, { expectedIdentity: mismatched })).rejects.toThrow(
      '最近项目记录与目录中的 workspace identity 不一致',
    )
    untouched(fresh, before)
    expect([...records.entries()]).toEqual([...recordsBefore.entries()])
  }
})

test('OI-E: expectedIdentity 句柄指向其他目录 → 任何读取发生前拒绝（0 次读取见证），原记录不变', async () => {
  const disk = await blankDir('oi-e-h')
  const opened = await finishOpen(disk.dir)
  const record = records.get(opened.workspace.workspaceId)!
  const other = await blankDir('oi-e-h-other')
  let reads = 0
  disk.hooks.afterRead = () => {
    reads++
  }
  // afterRead 只覆盖 arrayBuffer；再检查根目录访问，连元数据 text/缺文件查找也不能先发生。
  const directoryReads = vi.spyOn(disk.dir, 'getDirectoryHandle')
  const fileReads = vi.spyOn(disk.dir, 'getFileHandle')
  const enumerations = vi.spyOn(disk.dir, 'entries')
  const before = new Map(disk.files)
  const recordsBefore = recordsSnapshot()
  await expect(
    finishOpen(disk.dir, { expectedIdentity: { ...record, handle: other.dir } }),
  ).rejects.toThrow('最近项目记录指向的目录句柄与本次打开目标不一致')
  expect(reads).toBe(0)
  expect(directoryReads).not.toHaveBeenCalled()
  expect(fileReads).not.toHaveBeenCalled()
  expect(enumerations).not.toHaveBeenCalled()
  untouched(disk, before)
  expect([...records.entries()]).toEqual([...recordsBefore.entries()])
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
