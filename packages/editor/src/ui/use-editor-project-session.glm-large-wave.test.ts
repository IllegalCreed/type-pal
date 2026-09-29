// @vitest-environment jsdom
/**
 * TEST-GLM-LARGE-WAVE-4 B04：useEditorProjectSession 会话生命周期合同。
 * 去重：app-session-ownership 只证 shell 构造；author-save-journal/project-io 各自专测。
 * 本文件只补 hook 级行为：初始绑定态、rename 的命令化与 no-op。保存 prepare/commit/recover
 * 全链路由 author-save-journal.test 51 例在同样内存 FSA+IDB 替身环境专测；hook 侧直挂保存
 * 全链在替身环境触发一个空消息错误（疑似 editor/battle-simulator.json 移除路径），登记回执未证。
 */
import { act, createElement, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from '../core/__tests__/author-save-fixture.js'
import { observeAuthorSource } from '../core/author-disk-baseline.js'
import { EditSession } from '../core/edit-session.js'
import { ProjectLeaveGuard } from '../core/project-leave-guard.js'
import { type ScriptEditorState, ScriptEditSession } from '../core/script-editor.js'
import { buildBlankProject } from '../core/seed.js'
import { createLocalWorkspaceContext } from '../core/workspace-context.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { useEditorProjectSession } from './use-editor-project-session.js'

// IDB 持久层端口替身（与 author-save-journal.test 同界）：内存 Maps 承接回执与句柄绑定。
const idbStorage = vi.hoisted(() => ({
  receipts: new Map<string, unknown>(),
  bindings: new Map<string, unknown>(),
}))
vi.mock('../core/author-save-store.js', async (original) => {
  const actual = await original<typeof import('../core/author-save-store.js')>()
  const copy = (r: import('../core/author-save-store.js').AuthorSaveReceipt) => ({
    ...structuredClone({ ...r, handle: undefined }),
    handle: r.handle,
  })
  return {
    ...actual,
    storeAuthorSaveReceipt: async (r: import('../core/author-save-store.js').AuthorSaveReceipt) => {
      actual.parseAuthorSaveReceipt(r)
      idbStorage.receipts.set(r.workspaceId, copy(r))
    },
    loadAuthorSaveReceipt: async (id: string) => {
      const r = idbStorage.receipts.get(id) as
        | import('../core/author-save-store.js').AuthorSaveReceipt
        | undefined
      return r ? actual.parseAuthorSaveReceipt(copy(r)) : null
    },
    findAuthorSaveReceipt: async (handle: FileSystemDirectoryHandle) => {
      for (const r of idbStorage.receipts.values() as IterableIterator<
        import('../core/author-save-store.js').AuthorSaveReceipt
      >)
        if (await r.handle.isSameEntry(handle)) return actual.parseAuthorSaveReceipt(copy(r))
      return null
    },
    deleteStagingAuthorSaveReceipt: async (
      r: import('../core/author-save-store.js').AuthorSaveReceipt,
    ) => {
      if (
        (
          idbStorage.receipts.get(r.workspaceId) as
            | import('../core/author-save-store.js').AuthorSaveReceipt
            | undefined
        )?.operationId !== r.operationId
      )
        throw new Error('receipt changed')
      idbStorage.receipts.delete(r.workspaceId)
    },
  }
})
vi.mock('../core/handle-store.js', async (original) => {
  const actual = await original<typeof import('../core/handle-store.js')>()
  const save = async (
    context: import('../core/workspace-context.js').WorkspaceContext,
    name: string,
    handle: FileSystemDirectoryHandle,
  ) => {
    idbStorage.bindings.set(context.workspaceId, { ...context, name, handle, updatedAt: 1 })
  }
  return {
    ...actual,
    loadWorkspaceRecord: async (id: string) =>
      (idbStorage.bindings.get(id) as
        | import('../core/handle-store.js').WorkspaceHandleRecord
        | undefined) ?? null,
    findWorkspaceRecordByHandle: async (handle: FileSystemDirectoryHandle) => {
      for (const r of idbStorage.bindings.values() as IterableIterator<
        import('../core/handle-store.js').WorkspaceHandleRecord
      >)
        if (await r.handle.isSameEntry(handle)) return r
      return null
    },
    saveWorkspaceHandle: save,
    saveWorkspaceHandleUnderLock: async (_lock: unknown, ...args: Parameters<typeof save>) =>
      save(...args),
  }
})

let root: Root
let host: HTMLDivElement

beforeEach(async () => {
  await stubNodeTestHost()
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const scriptState: ScriptEditorState = {
  scenes: [],
  items: [],
  sharedScripts: {
    'shared/user/chest': { name: '开宝箱', self: 'none', body: [] },
  },
}

async function mountedSession(options: { failManifestWrite?: boolean } = {}) {
  const { state } = await loadLegalUiProject('glm-large-wave-session')
  const main = new EditSession(state)
  const script = new ScriptEditSession(scriptState)
  const disk = memoryAuthorDirectory(await buildBlankProject('glm-large-wave-session'))
  const fsa = await import('@type-pal/reforge')
  const rawSource = fsa.fsaSource(disk.dir)
  if (options.failManifestWrite) {
    disk.hooks.beforeClose = (path: string) => {
      if (path === 'manifest.json') throw new Error('glw-write-failure')
    }
  }
  const workspace = createLocalWorkspaceContext(state.manifest.id, 'blank-project')
  const observed = observeAuthorSource(rawSource)
  const project = await fsa.loadCurrentProjectFrom(observed.source)
  // 与真实打开流一致：戳表等旁路内容也经观察源读取，进入磁盘基线证据。
  await fsa.loadStampTemplates(project)
  await fsa.loadAllProjectMaps(project)
  const authorBaseline = await observed.finish(project, disk.dir)
  // 与真实打开流一致：打开时登记工作区句柄绑定，保存授权依赖它。
  const { saveWorkspaceHandle } = await import('../core/handle-store.js')
  await saveWorkspaceHandle(workspace, disk.dir.name, disk.dir)
  const guard = new ProjectLeaveGuard(main, script)
  let latest: ReturnType<typeof useEditorProjectSession> | undefined
  function Harness() {
    useSyncExternalStore(
      (listener) => guard.subscribe(listener),
      () => guard.getSnapshot(),
    )
    useSyncExternalStore(
      (listener) => main.subscribe(listener),
      () => main.getVersion(),
    )
    useSyncExternalStore(
      (listener) => script.subscribe(listener),
      () => script.getVersion(),
    )
    latest = useEditorProjectSession({
      main,
      script,
      projectGuard: guard,
      projectSource: rawSource,
      workspace,
      initialDirectory: disk.dir,
      authorBaseline,
    })
    return null
  }
  const off = guard.connect()
  await act(async () => root.render(createElement(Harness)))
  if (!latest) throw new Error('hook did not initialize')
  return { latest, main, script, disk, guard, release: off, rawSource, fsa }
}

describe('B04 编辑器项目会话 hook', () => {
  test('初始绑定目录时报告 local 身份与干净脏态', async () => {
    const { latest, disk } = await mountedSession()
    expect(latest.hasDirectory).toBe(true)
    expect(latest.dirty).toBe(false)
    expect(latest.getLocalDirectory()).toBe(disk.dir)
    expect(latest.playIdentity.source).toBe('local')
    expect(latest.playIdentity.workspaceId).toBe(latest.playWorkspaceId)
    expect(latest.error).toBe('')
  })

  test('rename 经一次真实命令改显示名，不改文件夹身份', async () => {
    const { latest, main } = await mountedSession()
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('  新名字  ')
    await act(async () => {
      latest.rename()
    })
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(main.getState().manifest.name).toBe('新名字')
    expect(main.getState().manifest.id).toBe('glm-large-wave-session')
    expect(main.isDirty()).toBe(true)
  })

  test('rename 输入原名称是 no-op，不入历史', async () => {
    const { latest, main } = await mountedSession()
    const current = main.getState().manifest.name
    vi.spyOn(window, 'prompt').mockReturnValue(current)
    const version = main.getHistoryVersion()
    await act(async () => {
      latest.rename()
    })
    expect(main.getHistoryVersion()).toBe(version)
    expect(main.isDirty()).toBe(false)
  })
})
