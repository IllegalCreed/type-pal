// @vitest-environment jsdom
/** Real App/menu/save/open/serialization with isolated FSA and origin-storage boundaries.
 * Canvas presentation is omitted; this suite does not claim native picker/IDB or visual proof. */
import { fsaSource } from '@type-pal/reforge'
import { act, StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import { deferred, memoryAuthorDirectory } from '../core/__tests__/author-save-fixture.js'
import {
  authorSaveStorage,
  memoryAuthorSaveStore,
} from '../core/__tests__/author-save-store-fixture.js'
import { RenameProjectCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { finishOpen, type Opened } from '../core/open-actions.js'
import { toEditorState } from '../core/project-io.js'
import { AddSharedScriptCommand, ScriptEditSession } from '../core/script-editor.js'
import { buildBlankProject } from '../core/seed.js'
import {
  createPalDevelopmentWorkspaceContext,
  PAL_DEVELOPMENT_SENTINEL_PATH,
} from '../core/workspace-context.js'
import { App } from './App.js'

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

let seed: Record<string, unknown>
let root: Root
let host: HTMLDivElement
let disk: ReturnType<typeof memoryAuthorDirectory>
let opened: Opened
let main: EditSession
let script: ScriptEditSession
let picker: ReturnType<typeof vi.fn<() => Promise<FileSystemDirectoryHandle>>>
let onOpened: ReturnType<typeof vi.fn<(opened: Opened) => void>>
let onBack: ReturnType<typeof vi.fn<() => void>>
let nodeBlob: typeof Blob

beforeAll(async () => {
  nodeBlob = (await vi.importActual<{ Blob: typeof Blob }>('node:buffer')).Blob
  vi.stubGlobal('Blob', nodeBlob)
  vi.stubGlobal('isSecureContext', true)
  seed = await buildBlankProject('leave-ui')
})
beforeEach(async () => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
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
  picker = vi.fn(async () => {
    throw new DOMException('cancelled', 'AbortError')
  })
  vi.stubGlobal('showDirectoryPicker', picker)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  disk = memoryAuthorDirectory(structuredClone(seed))
  opened = await finishOpen(disk.dir)
  main = new EditSession(toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps))
  script = new ScriptEditSession({
    scenes: opened.scenes,
    items: opened.project.authorContent.items,
    sharedScripts: opened.project.authorContent.sharedScripts,
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  onOpened = vi.fn()
  onBack = vi.fn()
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
async function mount(initialDir: FileSystemDirectoryHandle | null = disk.dir) {
  await act(async () =>
    root.render(
      <StrictMode>
        <App
          session={main}
          script={{ session: script }}
          project={opened.project}
          workspace={opened.workspace}
          initialDir={initialDir ?? undefined}
          authorBaseline={opened.authorBaseline}
          onOpened={onOpened}
          onBackToPicker={onBack}
        />
      </StrictMode>,
    ),
  )
}
function button(text: string, within: ParentNode = document) {
  const found = [...within.querySelectorAll<HTMLElement>('button,[role="menuitem"]')].find(
    (e) => e.textContent?.trim() === text || e.getAttribute('aria-label') === text,
  )
  if (!found) throw new Error(`Missing button ${text}: ${within.textContent}`)
  return found as HTMLButtonElement
}
async function click(text: string, within: ParentNode = document) {
  await act(async () => button(text, within).click())
}
async function menu(text: string) {
  await click('文件')
  await click(text)
}
async function until(assertion: () => void) {
  await act(async () => {
    await vi.waitFor(assertion, { timeout: 3000, interval: 10 })
  })
}
async function edit(axis = 'main') {
  await act(async () => {
    if (axis !== 'script') main.dispatch(new RenameProjectCommand('未保存项目'))
    if (axis !== 'main')
      script.dispatch(
        new AddSharedScriptCommand('leave-script', {
          name: '离开测试',
          self: 'none',
          body: [{ kind: 'wait', ms: 17 }],
        }),
      )
  })
}
const decision = () => document.querySelector<HTMLDialogElement>('[role="alertdialog"]')!
const unload = () => {
  const e = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(e)
  return e.defaultPrevented
}

for (const axis of ['main', 'script', 'both']) {
  test.each([
    '新建项目',
    '打开项目',
  ])(`${axis} dirty: real %s menu waits and cancel preserves both histories`, async (intent) => {
    await mount()
    await edit(axis)
    const a = main.getState(),
      b = script.getStateSnapshot()
    await menu(intent)
    expect(picker).not.toHaveBeenCalled()
    expect(onBack).not.toHaveBeenCalled()
    expect(onOpened).not.toHaveBeenCalled()
    expect(decision().open).toBe(true)
    await click('取消', decision())
    expect(decision()).toBeNull()
    expect(main.getState()).toBe(a)
    expect(script.getStateSnapshot()).toBe(b)
    expect(main.canUndo() || script.canUndo()).toBe(true)
    expect(main.isDirty() || script.isDirty()).toBe(true)
  })
}

test('clean new returns immediately; explicit discard returns exactly once without clearing dirty', async () => {
  await mount()
  await menu('新建项目')
  expect(onBack).toHaveBeenCalledTimes(1)
  await edit()
  await menu('新建项目')
  await click('不保存并继续')
  expect(onBack).toHaveBeenCalledTimes(2)
  expect(main.isDirty()).toBe(true)
  expect(main.canUndo()).toBe(true)
})

test.each([
  'cancel',
  'error',
  'success',
])('discard-open %s retains the old session until actual successful open', async (mode) => {
  const target = memoryAuthorDirectory(structuredClone(seed))
  if (mode === 'success') picker.mockResolvedValue(target.dir)
  if (mode === 'error')
    picker.mockRejectedValue(new DOMException('permission lost', 'NotAllowedError'))
  await mount()
  await edit('both')
  const a = main.getState(),
    b = script.getStateSnapshot()
  await menu('打开项目')
  await click('不保存并继续')
  await until(() => expect(button('保存').disabled).toBe(false))
  expect(picker).toHaveBeenCalledTimes(1)
  expect(onOpened).toHaveBeenCalledTimes(mode === 'success' ? 1 : 0)
  if (mode !== 'success') {
    expect(main.getState()).toBe(a)
    expect(script.getStateSnapshot()).toBe(b)
    await menu('打开项目')
    expect(decision()).not.toBeNull()
  }
})

test.each([
  'main',
  'script',
])('late %s edit during native picker wait refuses replacing the current project', async (axis) => {
  const held = deferred(),
    entered = deferred()
  const target = memoryAuthorDirectory(structuredClone(seed))
  picker.mockImplementation(async () => {
    entered.resolve()
    await held.promise
    return target.dir
  })
  await mount()
  await menu('打开项目')
  await entered.promise
  await edit(axis)
  await act(async () => held.resolve())
  await until(() => expect(button('保存').disabled).toBe(false))
  expect(onOpened).not.toHaveBeenCalled()
  expect(host.textContent).toContain('已保留当前编辑内容')
  expect(main.isDirty() || script.isDirty()).toBe(true)
  expect(picker).toHaveBeenCalledTimes(1)
})

test('real save commits both sessions and reopens; opening needs a fresh continuation click', async () => {
  await mount()
  await edit('both')
  await menu('打开项目')
  await click('先保存')
  await until(() => expect(decision()?.getAttribute('aria-label')).toBe('已保存'))
  expect(picker).not.toHaveBeenCalled()
  expect(onOpened).not.toHaveBeenCalled()
  const reopened = await finishOpen(disk.dir)
  expect(reopened.project.manifest.name).toBe('未保存项目')
  expect(reopened.project.authorContent.sharedScripts['leave-script']?.body).toEqual([
    { kind: 'wait', ms: 17 },
  ])
  expect(main.isDirty()).toBe(false)
  expect(script.isDirty()).toBe(false)
  await click('继续打开')
  await until(() => expect(picker).toHaveBeenCalledTimes(1))
  expect(onOpened).not.toHaveBeenCalled()
})

test('committed cleanup warning remains visible and does not masquerade as a failed save', async () => {
  disk.hooks.beforeRemove = async (path) => {
    if (path.includes('/blobs/')) throw new Error('cleanup denied')
  }
  await mount()
  await edit()
  await menu('新建项目')
  await click('先保存')
  await until(() => expect(decision()?.getAttribute('aria-label')).toBe('已保存'))
  expect(decision().querySelector('[role="alert"]')?.textContent).toContain('已保存')
  expect(disk.json('manifest.json').name).toBe('未保存项目')
  await click('继续新建')
  expect(onBack).toHaveBeenCalledTimes(1)
})

test('a command arriving during the saved-continue click cannot turn it into discard', async () => {
  await mount()
  await edit()
  await menu('打开项目')
  await click('先保存')
  await until(() => expect(decision()?.getAttribute('aria-label')).toBe('已保存'))
  const continueButton = button('继续打开')
  // Real capture-before-bubble ordering, after the user selected the old ready button.
  continueButton.addEventListener(
    'click',
    () => main.dispatch(new RenameProjectCommand('arrived during click')),
    { capture: true, once: true },
  )
  await act(async () => continueButton.click())
  expect(picker).not.toHaveBeenCalled()
  expect(onOpened).not.toHaveBeenCalled()
  expect(decision()?.getAttribute('aria-label')).toBe('有未保存的修改')
  expect(main.getState().manifest.name).toBe('arrived during click')
  expect(main.isDirty()).toBe(true)
})

test('export wait blocks new/open/save-as and releases on its actual read failure', async () => {
  await mount()
  const held = deferred(),
    entered = deferred()
  let once = false
  disk.hooks.afterRead = async (path) => {
    if (!once && path === 'manifest.json') {
      once = true
      entered.resolve()
      await held.promise
      throw new Error('export read denied')
    }
  }
  await menu('导出 ZIP')
  await entered.promise
  await menu('新建项目')
  expect(onBack).not.toHaveBeenCalled()
  // Disabled menu selection need not dismiss the menu.
  expect(button('打开项目').getAttribute('aria-disabled')).toBe('true')
  expect(picker).not.toHaveBeenCalled()
  await act(async () => held.resolve())
  await until(() => expect(host.textContent).toContain('export read denied'))
  await click('新建项目')
  expect(onBack).toHaveBeenCalledTimes(1)
})

test.each([
  'picker',
  'writer',
  'conflict',
])('save %s failure/cancellation keeps the decision and never leaves', async (mode) => {
  await mount(mode === 'picker' ? null : disk.dir)
  await edit()
  await menu('新建项目')
  if (mode === 'writer')
    disk.hooks.beforeClose = async () => {
      throw new DOMException('IO aborted', 'AbortError')
    }
  if (mode === 'conflict')
    disk.set('manifest.json', { ...opened.project.manifest, name: 'external' })
  await click('先保存')
  await until(() => expect(decision()?.getAttribute('aria-label')).toBe('有未保存的修改'))
  expect(onBack).not.toHaveBeenCalled()
  expect(onOpened).not.toHaveBeenCalled()
  expect(main.isDirty()).toBe(true)
  expect(main.canUndo()).toBe(true)
  if (mode === 'writer') expect(decision().textContent).toContain('IO aborted')
})

test('save held at real IO cannot be replaced by other commands and a new command prevents ready', async () => {
  const held = deferred(),
    entered = deferred()
  let once = false
  disk.hooks.beforeClose = async () => {
    if (!once) {
      once = true
      entered.resolve()
      await held.promise
    }
  }
  await mount()
  await edit()
  await menu('打开项目')
  await click('先保存')
  await entered.promise
  expect(unload()).toBe(true)
  await act(async () => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true }),
    )
    main.dispatch(new RenameProjectCommand('newer'))
  })
  expect(picker).not.toHaveBeenCalled()
  expect(onOpened).not.toHaveBeenCalled()
  await act(async () => held.resolve())
  await until(() => expect(decision()?.getAttribute('aria-label')).toBe('有未保存的修改'))
  expect(main.getState().manifest.name).toBe('newer')
  expect(main.isDirty()).toBe(true)
  await click('取消')
})

test('PAL first-save confirmation cancellation neither picks a directory nor discards edits', async () => {
  disk.set(PAL_DEVELOPMENT_SENTINEL_PATH, {
    kind: 'type-pal-editor-pal-development',
    version: 1,
    projectId: opened.project.manifest.id,
    workspaceId: '12345678-1234-4234-8234-123456789abc',
  })
  opened = { ...opened, workspace: await createPalDevelopmentWorkspaceContext(fsaSource(disk.dir)) }
  await mount(null)
  await edit('both')
  await menu('打开项目')
  vi.mocked(window.confirm).mockReturnValue(false)
  disk.resetChanges()
  await click('先保存')
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('PAL 开发基线模式'))
  expect(picker).not.toHaveBeenCalled()
  expect(onOpened).not.toHaveBeenCalled()
  expect(main.isDirty()).toBe(true)
  expect(script.isDirty()).toBe(true)
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(decision()?.getAttribute('aria-label')).toBe('有未保存的修改')
})

test.each([
  'unchanged',
  'main',
  'script',
])('save-as %s uses the real writer and only replaces an unchanged session', async (axis) => {
  const target = memoryAuthorDirectory()
  const held = deferred(),
    entered = deferred()
  let once = false
  target.hooks.beforeClose = async () => {
    if (!once) {
      once = true
      entered.resolve()
      await held.promise
    }
  }
  picker.mockResolvedValue(target.dir)
  await mount()
  await menu('另存为')
  await entered.promise
  if (axis !== 'unchanged') await edit(axis)
  await act(async () => held.resolve())
  if (axis === 'unchanged') await until(() => expect(onOpened).toHaveBeenCalledTimes(1))
  else {
    await until(() => expect(button('保存').disabled).toBe(false))
    expect(onOpened).not.toHaveBeenCalled()
    expect(host.textContent).toContain('副本已保存')
  }
  const copy = await finishOpen(target.dir)
  expect(copy.project.manifest.name).toBe(opened.project.manifest.name)
  if (axis !== 'unchanged') {
    expect(onOpened).not.toHaveBeenCalled()
    expect(main.isDirty() || script.isDirty()).toBe(true)
  }
})

test.each([
  'escape',
  'close',
])('%s cancels and shortcuts cannot mutate the background while deciding', async (way) => {
  await mount()
  await edit('both')
  await menu('新建项目')
  const a = main.getState(),
    b = script.getStateSnapshot()
  await act(async () => {
    for (const key of ['z', 'Delete', 's'])
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key,
          ctrlKey: key !== 'Delete',
          bubbles: true,
          cancelable: true,
        }),
      )
  })
  expect(main.getState()).toBe(a)
  expect(script.getStateSnapshot()).toBe(b)
  expect(picker).not.toHaveBeenCalled()
  if (way === 'escape')
    await act(async () => {
      decision().dispatchEvent(new Event('cancel', { cancelable: true }))
    })
  else await click('关闭', decision())
  expect(decision()).toBeNull()
  expect(onBack).not.toHaveBeenCalled()
  await until(() => expect(document.activeElement).toBe(host.querySelector('section.body')))
})

test('beforeunload reads dirty synchronously, also on invalid entry and across StrictMode cleanup', async () => {
  await mount()
  expect(unload()).toBe(false)
  await act(async () => {
    script.dispatch(new AddSharedScriptCommand('test', { name: 'test', self: 'none', body: [] }))
    expect(unload()).toBe(true)
  })
  await act(async () => {
    script.markSaved()
    expect(unload()).toBe(false)
  })
  await edit()
  await act(async () => root.unmount())
  expect(unload()).toBe(false)
  root = createRoot(host)
  const invalid = structuredClone(main.getState())
  invalid.scenes = []
  main = new EditSession(invalid)
  await mount()
  await edit()
  expect(host.textContent).toContain('直接启动入口')
  expect(unload()).toBe(true)
})
