import type { CurrentManifest } from '@type-pal/content'
import { fsaSource, loadAllAuthorScenes, loadCurrentProjectFrom } from '@type-pal/reforge'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

const bindings = vi.hoisted(
  () => new Map<string, import('./handle-store.js').WorkspaceHandleRecord>(),
)
vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)
vi.mock('./handle-store.js', async (original) => {
  const actual = await original<typeof import('./handle-store.js')>()
  const save = async (
    context: import('./workspace-context.js').WorkspaceContext,
    name: string,
    handle: FileSystemDirectoryHandle,
  ) => {
    bindings.set(context.workspaceId, { ...context, name, handle, updatedAt: 1 })
  }
  return {
    ...actual,
    loadWorkspaceRecord: async (id: string) => bindings.get(id) ?? null,
    findWorkspaceRecordByHandle: async (handle: FileSystemDirectoryHandle) => {
      for (const r of bindings.values()) if (await r.handle.isSameEntry(handle)) return r
      return null
    },
    saveWorkspaceHandle: save,
    saveWorkspaceHandleUnderLock: async (_lock: unknown, ...args: Parameters<typeof save>) =>
      save(...args),
  }
})

import { observeAuthorSource } from './author-disk-baseline.js'
import { sha256Hex } from './binary-signature.js'
import { finishOpen, saveProjectAs } from './open-actions.js'
import { assetCopyInputs, observeProjectCopySource } from './project-copy-source.js'
import { serializeProjectWithMapCopies, toEditorState, writeProject } from './project-io.js'
import { buildBlankProject } from './seed.js'
import { createLocalWorkspaceContext } from './workspace-context.js'
import {
  authorizeBoundWorkspaceTarget,
  authorizeFirstSaveTarget,
  registerAuthorizedWorkspaceMutation,
  withAuthorizedWorkspaceMutation,
} from './workspace-persistence.js'

beforeEach(() => {
  bindings.clear()
  authorSaveStorage.receipts.clear()
})
afterEach(() => vi.unstubAllGlobals())
const authors = (disk: ReturnType<typeof memoryAuthorDirectory>) =>
  [...disk.changes.creates, ...disk.changes.closes, ...disk.changes.removes].filter(
    (path) => path !== '.type-pal' && !path.startsWith('.type-pal/'),
  )
const state = (phase: 'pending' | 'committed') => ({
  kind: 'type-pal-author-save',
  version: 1,
  phase,
  operationId: crypto.randomUUID(),
  planHash: 'a'.repeat(64),
})
async function fixture() {
  const source = memoryAuthorDirectory(await buildBlankProject('copy-project'))
  source.set('notes/keep.txt', 'keep exact bytes')
  source.set('notes/delete.txt', 'remove from destination only')
  await source.dir.getDirectoryHandle('empty', { create: true })
  source.changes.creates.length = 0
  source.set('.type-pal/save-recovery/old/plan.json', 'do not copy')
  const opened = await finishOpen(source.dir)
  const target = memoryAuthorDirectory()
  vi.stubGlobal('window', {
    isSecureContext: true,
    location: { origin: 'http://localhost' },
    showDirectoryPicker: vi.fn(async () => target.dir),
  })
  const files = await serializeProjectWithMapCopies(
    toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps),
    opened.project.source,
  )
  ;(files['manifest.json'] as CurrentManifest).name = 'saved edits'
  const save = () =>
    saveProjectAs(opened.workspace, async () => files, source.dir, ['notes/delete.txt'], {
      source: opened.project.source,
      authorBaseline: opened.authorBaseline,
    })
  return { source, opened, target, files, save }
}

test('另存为整笔保存：当前编辑胜出、素材/附属文件/空目录保留，删除与私有身份不复制', async () => {
  const { source, opened, target, save } = await fixture()
  const before = new Map(source.files)
  const result = await save()
  expect(result?.project.manifest.name).toBe('saved edits')
  expect(result?.workspace.workspaceId).not.toBe(opened.workspace.workspaceId)
  expect(await fsaSource(target.dir).readText('notes/keep.txt')).toBe('keep exact bytes')
  expect(target.files.has('notes/delete.txt')).toBe(false)
  await expect(target.dir.getDirectoryHandle('empty')).resolves.toMatchObject({ kind: 'directory' })
  expect(target.files.has('.type-pal/save-recovery/old/plan.json')).toBe(false)
  expect(source.files).toEqual(before)
  expect(authors(source)).toEqual([])
  expect(
    [...authorSaveStorage.receipts.values()].filter((r) => r.handle === target.dir),
  ).toHaveLength(1)
})

test('只读沙盒检视仍保留源目录关系，禁止另存为到源的子目录', async () => {
  const { source, files } = await fixture()
  const preview = await finishOpen(source.dir, { forceSandbox: true })
  expect(preview.dir).toBeUndefined()
  const child = await source.dir.getDirectoryHandle('nested-copy', { create: true })
  vi.mocked(window.showDirectoryPicker).mockResolvedValue(child)
  const build = vi.fn(async () => files)
  await expect(
    saveProjectAs(preview.workspace, build, undefined, [], {
      source: preview.project.source,
      authorBaseline: preview.authorBaseline,
    }),
  ).rejects.toThrow('不能是源项目目录本身或其子目录')
  expect(build).not.toHaveBeenCalled()
})

test('只读沙盒另存为保留附属文件并产生新的受限身份，源目录不被写入', async () => {
  const { source, files, target } = await fixture()
  const preview = await finishOpen(source.dir, { forceSandbox: true })
  const before = new Map(source.files)
  const result = await saveProjectAs(preview.workspace, async () => files, undefined, [], {
    source: preview.project.source,
    authorBaseline: preview.authorBaseline,
  })
  expect(result?.workspace.mode).toBe('sandbox')
  expect(result?.workspace.workspaceId).not.toBe(preview.workspace.workspaceId)
  expect(await fsaSource(target.dir).readJson('.type-pal/workspace.json')).toMatchObject({
    mode: 'sandbox',
    workspaceId: result!.workspace.workspaceId,
  })
  expect(await fsaSource(target.dir).readText('notes/keep.txt')).toBe('keep exact bytes')
  expect(source.files).toEqual(before)
  expect(authors(source)).toEqual([])
})

test('无目录的FileSource另存为逐项复制旧素材，未落源盘的新上传由编辑覆盖提供', async () => {
  const { source, files, target, opened } = await fixture()
  const observed = observeAuthorSource(fsaSource(source.dir))
  const project = await loadCurrentProjectFrom(observed.source)
  await loadAllAuthorScenes(project)
  const baseline = await observed.finish(project)
  const path = 'assets/authored/portraits/new.png',
    bytes = new ArrayBuffer(51)
  const catalog = files['assets/index.json'] as import('@type-pal/content').AssetCatalogV1
  catalog.assets['portrait.upload.new'] = {
    kind: 'portrait',
    path,
    bytes: 51,
    sha256: await sha256Hex(bytes),
    mediaType: 'image/png',
    origin: { kind: 'authored' },
  }
  files[path] = bytes
  const result = await saveProjectAs(opened.workspace, async () => files, undefined, [], {
    source: observed.source,
    authorBaseline: baseline,
  })
  expect(result?.project.manifest.name).toBe('saved edits')
  expect(target.files.get(path)).toEqual(bytes)
  expect(source.files.has(path)).toBe(false)
  for (const record of Object.values(opened.project.assetCatalog.assets))
    expect(target.files.has(record.path)).toBe(true)
})

test.each([
  'pending',
  'malformed',
] as const)('另存为源状态%s在序列化前拒绝，目标无任何写入', async (phase) => {
  const { source, opened, target, files } = await fixture()
  source.set(
    '.type-pal/save-state.json',
    phase === 'pending' ? state(phase) : '<html>bad state</html>',
  )
  const build = vi.fn(async () => files)
  await expect(
    saveProjectAs(opened.workspace, build, source.dir, [], {
      source: opened.project.source,
      authorBaseline: opened.authorBaseline,
    }),
  ).rejects.toThrow('保存')
  expect(build).not.toHaveBeenCalled()
  expect(target.changes).toEqual({ creates: [], closes: [], removes: [] })
})

test('另存为后段源IO失败只留暂存，不产生作者文件或最近项目', async () => {
  const { source, target, save } = await fixture()
  source.hooks.afterRead = (path) => {
    if (path === 'notes/keep.txt') throw new Error('copy read failed')
  }
  await expect(save()).rejects.toThrow('copy read failed')
  expect(authors(target)).toEqual([])
  expect([...bindings.values()].some((r) => r.handle === target.dir)).toBe(false)
  expect([...authorSaveStorage.receipts.values()].find((r) => r.handle === target.dir)?.phase).toBe(
    'staging',
  )
})

test.each([
  'bytes',
  'inventory',
  'epoch',
] as const)('另存为封存前源%s变化拒绝，零作者覆盖', async (kind) => {
  const { source, target, save } = await fixture()
  target.hooks.afterClose = (path) => {
    if (!path.endsWith('/plan.json')) return
    if (kind === 'bytes') source.set('notes/keep.txt', 'changed externally')
    if (kind === 'inventory') source.set('notes/new.txt', 'new external file')
    if (kind === 'epoch') source.set('.type-pal/save-state.json', state('committed'))
  }
  await expect(save()).rejects.toThrow(/修改|清单|复制期间/)
  expect(authors(target)).toEqual([])
  expect([...authorSaveStorage.receipts.values()].find((r) => r.handle === target.dir)?.phase).toBe(
    'staging',
  )
})

test('另存为提交中断后源不可读取仍可重开恢复，删除意图不会重新从源复制', async () => {
  const { source, target, save } = await fixture()
  target.hooks.beforeClose = (path) => {
    if (path === 'content/actors.json') throw new Error('interrupt save-as')
  }
  await expect(save()).rejects.toThrow('interrupt save-as')
  target.hooks.beforeClose = undefined
  source.hooks.afterRead = () => {
    throw new Error('source offline')
  }
  const result = await finishOpen(target.dir)
  expect(result.project.manifest.name).toBe('saved edits')
  expect(target.files.has('notes/delete.txt')).toBe(false)
  expect(await result.project.source.readText('notes/keep.txt')).toBe('keep exact bytes')
})

test('HTTP首存流式资产不进入编辑差异清单，第二次普通保存不删除复制素材', async () => {
  const { opened, target, files } = await fixture()
  const workspace = createLocalWorkspaceContext(opened.project.manifest.id, 'blank-project')
  const observed = await observeProjectCopySource(opened.project.source)
  const saved = await withAuthorizedWorkspaceMutation(
    await authorizeFirstSaveTarget(workspace, target.dir),
    async (mutation) => {
      await registerAuthorizedWorkspaceMutation(mutation, workspace, 'first save')
      return writeProject(mutation, files, {
        copies: assetCopyInputs(files, observed.source),
        verifySource: observed.verify,
      })
    },
  )
  for (const record of Object.values(opened.project.assetCatalog.assets))
    expect(saved.snapshot.has(record.path)).toBe(false)
  const reopened = await finishOpen(target.dir)
  ;(files['manifest.json'] as CurrentManifest).name = 'second save'
  await writeProject(
    await authorizeBoundWorkspaceTarget(reopened.workspace, target.dir, reopened.authorBaseline),
    files,
    { prevSnapshot: saved.snapshot },
  )
  expect(await fsaSource(target.dir).readJson('manifest.json')).toMatchObject({
    name: 'second save',
  })
  for (const record of Object.values(opened.project.assetCatalog.assets))
    expect(target.files.has(record.path)).toBe(true)
})

test('复制源各读取接口共享字节证据，重复读取变化立即拒绝且不能绕成渲染URL', async () => {
  const disk = memoryAuthorDirectory({ 'value.json': { value: 1 } })
  const observed = await observeProjectCopySource(fsaSource(disk.dir))
  expect(await observed.source.readText('value.json')).toContain('"value": 1')
  expect(await observed.source.readJson('value.json')).toEqual({ value: 1 })
  await expect(observed.source.urlFor('value.json')).rejects.toThrow('不能用于渲染')
  await observed.verify()
  disk.set('value.json', { value: 2 })
  await expect(observed.source.readBytes('value.json')).rejects.toThrow('value.json')
})

test('复制清单重复路径在私有暂存前拒绝，不调用源读取', async () => {
  const { target, files, opened } = await fixture()
  const read = vi.fn(async () => new Blob(['copy']))
  const workspace = createLocalWorkspaceContext(opened.project.manifest.id, 'blank-project')
  await expect(
    writeProject(await authorizeFirstSaveTarget(workspace, target.dir), files, {
      copies: [
        { path: 'notes/a', read },
        { path: 'notes/a', read },
      ],
    }),
  ).rejects.toThrow('复制清单路径重复')
  expect(read).not.toHaveBeenCalled()
  expect(target.changes).toEqual({ creates: [], closes: [], removes: [] })
})

test('整笔复制不能借用已绑定目标授权，源读取与作者IO均不开始', async () => {
  const { source, files, opened } = await fixture()
  const read = vi.fn(async () => new Blob(['copy']))
  await expect(
    writeProject(
      await authorizeBoundWorkspaceTarget(opened.workspace, source.dir, opened.authorBaseline),
      files,
      {
        copies: [{ path: 'notes/a', read }],
      },
    ),
  ).rejects.toThrow('只允许写入已授权的新项目目标')
  expect(read).not.toHaveBeenCalled()
  expect(authors(source)).toEqual([])
})

test('新目标的复制输入不能省略来源复验，准备元数据与源读取均不开始', async () => {
  const { target, files, opened } = await fixture()
  const read = vi.fn(async () => new Blob(['copy']))
  const workspace = createLocalWorkspaceContext(opened.project.manifest.id, 'blank-project')
  await expect(
    writeProject(await authorizeFirstSaveTarget(workspace, target.dir), files, {
      copies: [{ path: 'notes/a', read }],
    }),
  ).rejects.toThrow('复制缺少来源复验')
  expect(read).not.toHaveBeenCalled()
  expect(target.changes).toEqual({ creates: [], closes: [], removes: [] })
})

test('另存为只申请目标W锁，不在目标锁内嵌套源W锁', async () => {
  const { opened, save } = await fixture()
  const names: string[] = []
  const original = Object.getOwnPropertyDescriptor(navigator, 'locks')
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: async (name: string, _options: unknown, callback: () => Promise<unknown>) => {
        names.push(name)
        return callback()
      },
    },
  })
  try {
    const result = await save()
    expect(names).toContain('type-pal-workspace:discovery')
    expect(names).toContain(`type-pal-workspace:${result!.workspace.workspaceId}`)
    expect(names).not.toContain(`type-pal-workspace:${opened.workspace.workspaceId}`)
  } finally {
    if (original) Object.defineProperty(navigator, 'locks', original)
    else Reflect.deleteProperty(navigator, 'locks')
  }
})
