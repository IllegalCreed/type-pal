// @vitest-environment jsdom
import type { AuthorItemData, AuthorScriptLibrary } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { deferred, memoryAuthorDirectory } from '../core/__tests__/author-save-fixture.js'
import {
  authorSaveStorage,
  memoryAuthorSaveStore,
} from '../core/__tests__/author-save-store-fixture.js'
import { RenameProjectCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { openLocalProject } from '../core/open-local.js'
import { toEditorState } from '../core/project-io.js'
import { ProjectLeaveGuard } from '../core/project-leave-guard.js'
import { ScriptEditSession } from '../core/script-editor.js'
import { buildBlankProject } from '../core/seed.js'
import { createLocalWorkspaceContext } from '../core/workspace-context.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import { ProjectSaveDialog } from './ProjectSaveDialog.js'
import { type EditorProjectSession, useEditorProjectSession } from './use-editor-project-session.js'

// Only the IndexedDB and File System Access ports are replaced; save/authorization stay real.
const bindings = vi.hoisted(
  () => new Map<string, import('../core/handle-store.js').WorkspaceHandleRecord>(),
)
vi.mock('../core/author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('../core/author-save-store.js')>()),
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
        if (await record.handle.isSameEntry(handle)) return record
      return null
    },
    saveWorkspaceHandle: save,
    saveWorkspaceHandleUnderLock: async (_lock: unknown, ...args: Parameters<typeof save>) =>
      save(...args),
  }
})

let host: HTMLDivElement
let root: Root
let disconnect: (() => void) | undefined
beforeEach(async () => {
  await stubNodeTestHost()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('isSecureContext', true)
  bindings.clear()
  authorSaveStorage.receipts.clear()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    },
  })
})
afterEach(async () => {
  await act(async () => root.unmount())
  disconnect?.()
  host.remove()
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  vi.unstubAllGlobals()
})

async function mountFirstSave(target: ReturnType<typeof memoryAuthorDirectory>) {
  const source = memoryAuthorDirectory(await buildBlankProject('ordinary-save'))
  const opened = await openLocalProject(source.dir)
  const main = new EditSession(toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps))
  const script = new ScriptEditSession({
    scenes: opened.scenes,
    items: await opened.project.source.readJson<AuthorItemData[]>('content/items.json'),
    sharedScripts: await opened.project.source.readJson<AuthorScriptLibrary>(
      'content/shared-scripts.json',
    ),
  })
  main.dispatch(new RenameProjectCommand('saved ordinary project'))
  const projectGuard = new ProjectLeaveGuard(main, script)
  const workspace = createLocalWorkspaceContext(opened.project.manifest.id, 'blank-project')
  let latest: EditorProjectSession
  function Harness() {
    latest = useEditorProjectSession({
      main,
      script,
      projectGuard,
      projectSource: opened.project.source,
      workspace,
      authorBaseline: opened.authorBaseline,
    })
    return latest.activity && latest.activity.phase !== 'choosing-directory' ? (
      <ProjectSaveDialog activity={latest.activity} />
    ) : null
  }
  disconnect = projectGuard.connect()
  vi.stubGlobal(
    'showDirectoryPicker',
    vi.fn(async () => target.dir),
  )
  await act(async () => root.render(<Harness />))
  return { session: () => latest, main, source }
}

test('ordinary first save displays real staging, validation and writing before binding the copy', async () => {
  const target = memoryAuthorDirectory()
  const { session, main, source } = await mountFirstSave(target)
  const sourceBefore = new Map(source.files)
  const pauses = ['staging', 'validating', 'writing'].map((phase) => ({
    phase,
    reached: deferred(),
    release: deferred(),
    entered: false,
  }))
  target.hooks.beforeClose = async (path) => {
    const phase = path.includes('/blobs/')
      ? 'staging'
      : path.endsWith('/plan.json')
        ? 'validating'
        : path === 'manifest.json'
          ? 'writing'
          : undefined
    const pause = pauses.find((item) => item.phase === phase && !item.entered)
    if (!pause) return
    pause.entered = true
    pause.reached.resolve()
    await pause.release.promise
  }
  let saving: ReturnType<EditorProjectSession['save']> | undefined
  try {
    await act(async () => {
      saving = session().save()
      await Promise.race([pauses[0]!.reached.promise, saving])
    })
    expect(session().error).toBe('')
    expect(session().activity?.phase).toBe('staging')
    expect(host.textContent).toContain('复制与暂存文件 0%')
    expect(target.files.has('manifest.json')).toBe(false)
    expect(session().hasDirectory).toBe(false)
    await act(async () => {
      pauses[0]!.release.resolve()
      await Promise.race([pauses[1]!.reached.promise, saving])
    })
    expect(session().activity?.phase).toBe('validating')
    expect(host.textContent).toContain('正在校验暂存内容与来源')
    expect(host.querySelector('[role="progressbar"]')?.hasAttribute('aria-valuenow')).toBe(false)
    await act(async () => {
      pauses[1]!.release.resolve()
      await Promise.race([pauses[2]!.reached.promise, saving])
    })
    expect(session().activity?.phase).toBe('writing')
    expect(host.textContent).toContain('写入并核验文件')
  } finally {
    await act(async () => {
      for (const pause of pauses) pause.release.resolve()
      await saving
    })
  }
  expect(await saving!).toBe('committed')
  expect(session().activity).toBeNull()
  expect(main.isDirty()).toBe(false)
  expect(session().getLocalDirectory()).toBe(target.dir)
  expect(target.json('manifest.json').name).toBe('saved ordinary project')
  const spritePath = 'assets/generated/sprites/starter.rle'
  expect(target.files.get(spritePath)).toEqual(sourceBefore.get(spritePath))
  expect(source.files).toEqual(sourceBefore)
})

test('a denied staging write still fails without marking or binding the first save', async () => {
  const target = memoryAuthorDirectory()
  const { session, main } = await mountFirstSave(target)
  target.hooks.beforeClose = (path) => {
    if (path.includes('/blobs/')) throw new Error('staging write denied')
  }
  await act(async () => expect(await session().save()).toBe('failed'))
  expect(session().error).toBe('staging write denied')
  expect(session().activity).toBeNull()
  expect(main.isDirty()).toBe(true)
  expect(session().getLocalDirectory()).toBeNull()
  expect(target.files.has('manifest.json')).toBe(false)
})
