/**
 * ARCH-REGRESSION-LAB-GLM-1 · G03 App 所有权生命周期（候选回归，隔离实验区）。
 * 真实 App 挂载/会话派发/卸载/重挂载接线；Canvas 表现层替身（SceneCanvas）。
 * derivedStore stop 语义（旧 worker 终止/迟到事件不污染）由既有 editor-derived-store.test.ts
 * 22 项钉住（existing-proof，见 results.json 引用）；本组证明真实 App 接线层。
 * 去重：App.leave-guard 8 条（保存/历史/试玩）、App.reference-navigation 20 条（导航）；
 * 本组差异在「挂载→派发→卸载→重挂载」的生命周期轴。
 */
// @vitest-environment jsdom

import { App } from '@lab/editor/app'
import { RenameProjectCommand } from '@lab/editor/commands'
import { EditorHistoryCoordinator } from '@lab/editor/history-coordinator'
import { finishOpen, type Opened } from '@lab/editor/open-actions'
import { toEditorState } from '@lab/editor/project-io'
import { ScriptEditSession } from '@lab/editor/script-editor'
import { projectEditorItemShells } from '@lab/editor/script-editor-projection'
import { buildBlankProject } from '@lab/editor/seed'
import { memoryAuthorDirectory } from '@lab/fixtures/author-save-fixture'
import { act, StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../../fixtures/editor/lab-session.js'

vi.mock('@lab/editor/scene-canvas', () => ({ SceneCanvas: () => <div /> }))
vi.mock('@lab/editor/author-save-store', async (original) => {
  const fixture = await import('@lab/fixtures/author-save-store-fixture')
  const actual = await original<typeof import('@lab/editor/author-save-store')>()
  return fixture.memoryAuthorSaveStore(actual)
})
type LabWorkspaceHandleRecord = {
  workspaceId: string
  handle: FileSystemDirectoryHandle
  [key: string]: unknown
}
const bindings = vi.hoisted(() => new Map<string, LabWorkspaceHandleRecord>())
vi.mock('@lab/editor/handle-store', async (original) => {
  const actual = await original<typeof import('@lab/editor/handle-store')>()
  const save = async (
    context: { workspaceId: string },
    name: string,
    handle: FileSystemDirectoryHandle,
  ) => {
    bindings.set(context.workspaceId, { ...context, name, handle, updatedAt: 1 })
  }
  return {
    ...actual,
    loadWorkspaceRecord: async (id: string) => bindings.get(id) ?? null,
    findWorkspaceRecordByHandle: async (handle: FileSystemDirectoryHandle) => {
      for (const record of bindings.values())
        if (await handle.isSameEntry(record.handle)) return record
      return null
    },
    saveWorkspaceHandle: save,
    saveWorkspaceHandleUnderLock: async (_lock: unknown, ...args: Parameters<typeof save>) =>
      save(...args),
  }
})

let seed: Record<string, unknown>
let root: Root
let host: HTMLDivElement
let disk: ReturnType<typeof memoryAuthorDirectory>
let opened: Opened
let main: EditSession
let script: ScriptEditSession
let history: EditorHistoryCoordinator
let nodeBlob: typeof Blob

beforeAll(async () => {
  nodeBlob = (await vi.importActual<{ Blob: typeof Blob }>('node:buffer')).Blob
  vi.stubGlobal('Blob', nodeBlob)
  seed = await buildBlankProject('lab-lifecycle')
})

beforeEach(async () => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const { authorSaveStorage } = await import('@lab/fixtures/author-save-store-fixture')
  authorSaveStorage.receipts.clear()
  bindings.clear()
  localStorage.clear()
  window.history.replaceState({}, '', '/?module=scene&page=workspace')
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('Blob', nodeBlob)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute('open')
    },
  })
  vi.stubGlobal(
    'showDirectoryPicker',
    vi.fn(async () => {
      throw new DOMException('cancelled', 'AbortError')
    }),
  )
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  disk = memoryAuthorDirectory(structuredClone(seed))
  opened = await finishOpen(disk.dir)
  main = new EditSession({
    ...toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps),
    items: projectEditorItemShells(opened.project),
  })
  script = new ScriptEditSession({
    scenes: opened.scenes,
    items: opened.project.authorContent.items,
    sharedScripts: opened.project.authorContent.sharedScripts,
  })
  history = new EditorHistoryCoordinator(main, script)
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function mountApp(options: { initialDir?: FileSystemDirectoryHandle } = {}): Promise<void> {
  await act(async () =>
    root.render(
      <StrictMode>
        <App
          session={main}
          history={history}
          script={{ session: script }}
          project={opened.project}
          workspace={opened.workspace}
          authorBaseline={opened.authorBaseline}
          initialDir={options.initialDir}
          onOpened={vi.fn()}
          onBackToPicker={vi.fn()}
        />
      </StrictMode>,
    ),
  )
}

describe('G03 App 所有权生命周期', () => {
  test('G03-01 真实 App 挂载：会话派发命令反映到页面（项目名可见），状态接线成立', async () => {
    await mountApp()
    // 真实接线见证：页面渲染出当前工程名与场景工作区
    expect(host.textContent).toContain('lab-lifecycle')
    // Canvas 为替身（vi.mock），接线见证改为场景工作区 region
    expect(host.querySelector('[aria-label="场景编排工作区"], [class*=workspace]')).not.toBeNull()
    // 会话派发：重命名工程命令 → 页面标题/名称更新（业务对象实变）
    const command = new RenameProjectCommand('实验室工程名')
    expect(main.dispatch(command)).toBe(true)
    await act(async () => {})
    expect(host.textContent).toContain('实验室工程名')
  })

  test('G03-02 卸载→重挂载新会话：旧会话后续派发不影响新页面', async () => {
    await mountApp()
    expect(host.textContent).toContain('lab-lifecycle')
    await act(async () => root.unmount())
    host.remove()
    // 卸载后旧会话迟到派发：App 卸载已 dispose 历史绑定 → fail-loud（不静默污染）
    expect(() => main.dispatch(new RenameProjectCommand('卸载后改名'))).toThrowError(
      /项目历史已断开/,
    )
    // 重挂载全新会话（同一磁盘快照，无「卸载后改名」）
    disk = memoryAuthorDirectory(structuredClone(seed))
    opened = await finishOpen(disk.dir)
    main = new EditSession({
      ...toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps),
      items: projectEditorItemShells(opened.project),
    })
    script = new ScriptEditSession({
      scenes: opened.scenes,
      items: opened.project.authorContent.items,
      sharedScripts: opened.project.authorContent.sharedScripts,
    })
    history = new EditorHistoryCoordinator(main, script)
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await mountApp()
    expect(host.textContent).toContain('lab-lifecycle')
    expect(host.textContent).not.toContain('卸载后改名') // 新页面不被旧会话迟到派发污染
  })

  test('G03-03 Cmd+S 真实保存事务：save-state 终态 committed + 工程树写闭；卸载后零写盘且派发 fail-loud', async () => {
    // 以生产「带目录重开」入口（App initialDir）挂载：Cmd+S 原地保存到已绑定目录。
    // 正控钉**保存事务终态**：完整工程树写闭（manifest + content/*）且
    // `.type-pal/save-state.json` 落盘 phase=committed（非静默窗口近似）；
    // 再证卸载收口：静默后同样的键入零新增写盘 —— keydown 清理有真实 IO 级后果
    //（若监听残留，增量保存管线在内存目录上仍能完整写盘 → 即红）。
    await mountApp({ initialDir: disk.dir })
    await act(async () => {
      main.dispatch(new RenameProjectCommand('实验室保存名'))
    })
    const closesBefore = disk.changes.closes.length
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 's', metaKey: true, cancelable: true, bubbles: true }),
      )
    })
    // 保存为异步管线（工程写 + 去抖的 save-state 终写）：以「磁盘静默窗口」判定完成 ——
    // 连续 6×50ms 无新写闭即视为收尾（真实 IO 见证，非通知计数）
    let quiet = 0
    let seen = disk.changes.closes.length
    let waited = 0
    while (quiet < 6 && waited < 200) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })
      waited++
      if (disk.changes.closes.length === seen) quiet++
      else {
        quiet = 0
        seen = disk.changes.closes.length
      }
    }
    expect(disk.changes.closes.length).toBeGreaterThan(closesBefore) // 真实写盘发生
    const closed = new Set(disk.changes.closes)
    expect(closed.has('manifest.json')).toBe(true) // 完整工程树，不是任意 IO
    expect(disk.changes.closes.some((p) => p.startsWith('content/'))).toBe(true)
    // 保存**事务终态**：`.type-pal/save-state.json` 真实写闭，且落盘内容 phase=committed
    //（ProjectSaveState 相位机 staging/ready/applying/data-complete → committed，author-save-journal.ts:497/336）
    expect(closed.has('.type-pal/save-state.json')).toBe(true)
    const saveState = disk.json('.type-pal/save-state.json') as { phase?: string; kind?: string }
    expect(saveState.kind).toBe('type-pal-author-save')
    expect(saveState.phase).toBe('committed') // 非中间态：保存事务真实完成，而非仅静默
    await act(async () => root.unmount())
    host.remove()
    disk.resetChanges()
    // 卸载后同样的 Cmd+S：零新增写盘（若监听残留，保存管线仍会写盘 → 即红）
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 's', metaKey: true, cancelable: true, bubbles: true }),
      )
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300))
    })
    expect(disk.changes.closes.length).toBe(0) // 卸载后零写盘
    expect(() => main.dispatch(new RenameProjectCommand('卸载后不应生效'))).toThrowError(
      /项目历史已断开/,
    )
  })
})
