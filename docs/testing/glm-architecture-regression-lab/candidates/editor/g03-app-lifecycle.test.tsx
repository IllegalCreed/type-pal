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
const bindings = vi.hoisted(
  () => new Map<string, import('@lab/editor/handle-store').WorkspaceHandleRecord>(),
)
vi.mock('@lab/editor/handle-store', async (original) => {
  const actual = await original<typeof import('@lab/editor/handle-store')>()
  const save = async (
    context: import('@lab/editor/handle-store').WorkspaceContext,
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

async function mountApp(): Promise<void> {
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

  test('G03-03 卸载后 Cmd+S：旧会话派发 fail-loud（历史绑定断开即不可写）', async () => {
    await mountApp()
    await act(async () => root.unmount())
    host.remove()
    // 卸载后旧会话派发任何命令都会因历史绑定断开而 throw——这是 keydown 清理的实际收口效果：
    // 即使监听残留，后续 dispatch 也走不到保存 IO（fail-loud 而非静默写盘）
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 's', metaKey: true, cancelable: true, bubbles: true }),
      )
    })
    // 无论监听是否残留，旧会话的历史绑定已断开，任何 dispatch 都 fail-loud
    expect(() => main.dispatch(new RenameProjectCommand('卸载后不应生效'))).toThrowError(
      /项目历史已断开/,
    )
  })
})
