// @vitest-environment jsdom
/**
 * TEST-GLM-NEW-F-1 F01：App 路由/选择 → ScriptEditor 命令编辑回显与取消。
 * 去重：App.leave-guard（保存/离开/历史顺序族）、App.reference-navigation（locator 族）、
 * app-session-ownership（AST 所有权）、ScriptEditor.test（组件级命令表单/取消族）已各证其面；
 * 本文件只补其间空隙：经真实 App 的 story/page=scripts 路由打开共享脚本库 →
 * 命令行双击打开编辑弹窗回显当前值 → 关闭取消后零历史零 dirty 且重开无草稿泄漏。
 * 不冒充完整保存/E2E；Canvas 呈现按 leave-guard 同一策略省略。
 */
import { act } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  type AppScriptContext,
  createAppScriptContext,
} from '../__tests__/glm-next-wave/F/app-script-kit.js'
import { memoryAuthorSaveStore } from '../core/__tests__/author-save-store-fixture.js'

vi.mock('./SceneCanvas.js', () => ({ SceneCanvas: () => <div /> }))
vi.mock('../core/author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('../core/author-save-store.js')>()),
)
const bindings = vi.hoisted(
  () => new Map<string, import('../core/handle-store.js').WorkspaceHandleRecord>(),
)
vi.mock('../core/handle-store.js', async (original) => {
  const actual = await original<typeof import('../core/handle-store.js')>()
  const save = async (
    context: import('../core/workspace-context.js').WorkspaceContext,
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

let context: AppScriptContext

beforeAll(async () => {
  const { installBrowserHardwarePorts } = await import('./__tests__/kimi-editor-workflows/kit.js')
  installBrowserHardwarePorts()
})

beforeEach(async () => {
  vi.stubGlobal('isSecureContext', true)
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
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  localStorage.clear()
  context = await createAppScriptContext()
})

afterEach(async () => {
  await context?.unmount()
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function scriptRow(): HTMLElement {
  const row = [
    ...context.host.querySelectorAll<HTMLElement>('[role="treeitem"], .canonical-script-row'),
  ].find((candidate) => candidate.textContent?.includes('等待'))
  expect(row, 'wait command row').not.toBeNull()
  return row!
}

describe('F01 App 路由→命令编辑回显与取消', () => {
  test('脚本库路由打开共享脚本，命令编辑弹窗回显 ms=17，取消零历史零 dirty', async () => {
    await context.mount('/?module=story&page=scripts')
    // 路由落到脚本库：共享脚本目录含刚登记的「离开测试」。
    await vi.waitFor(() => expect(context.host.textContent).toContain('离开测试'))
    const scriptEntry = [
      ...context.host.querySelectorAll<HTMLElement>('button, [role="treeitem"]'),
    ].find((candidate) => candidate.textContent?.includes('离开测试'))
    expect(scriptEntry, 'shared script catalog entry').toBeDefined()
    await act(async () => scriptEntry!.click())
    // 命令行双击 → 编辑弹窗回显当前毫秒值。
    await vi.waitFor(() => expect(scriptRow()).toBeTruthy())
    await act(async () =>
      scriptRow().dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })),
    )
    const dialog = context.host.querySelector<HTMLElement>('[role="dialog"]')
    expect(dialog?.getAttribute('aria-label')).toContain('编辑')
    expect(
      [...dialog!.querySelectorAll<HTMLInputElement>('input')].some(
        (candidate) => candidate.value === '17',
      ),
    ).toBe(true)
    // 关闭（取消）：无派发、无历史条目、两会话保持干净。
    await act(async () =>
      context.host.querySelector<HTMLButtonElement>('[aria-label="关闭"]')!.click(),
    )
    expect(context.host.querySelector('[role="dialog"]')).toBeNull()
    expect(context.host.querySelector('button[aria-label^="撤销："]')).toBeNull()
    expect(context.script.isDirty()).toBe(false)
    expect(context.main.isDirty()).toBe(false)
    // 重开弹窗仍是原值 17：取消不留草稿。
    await act(async () =>
      scriptRow().dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })),
    )
    const reopened = context.host.querySelector<HTMLElement>('[role="dialog"]')
    expect(
      [...reopened!.querySelectorAll<HTMLInputElement>('input')].some(
        (candidate) => candidate.value === '17',
      ),
    ).toBe(true)
    expect(context.script.getHistoryVersion()).toBe(0)
  })
})
