/**
 * EDITOR-SAVE-RECOVERY-1 · GLM batch-r1 · G1 打开/权限/身份（O1/O2/O3）。
 * 真实 openExistingProject/pickDir/finishOpen 调用链；仅替身 window/picker（浏览器边界）。
 */
import type { CurrentManifest } from '@type-pal/content'
import { beforeEach, afterEach, expect, test, vi } from 'vitest'
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
      for (const record of bindings.values()) if (await record.handle.isSameEntry(handle)) return record
      return null
    },
    saveWorkspaceHandle: async () => {},
    saveWorkspaceHandleUnderLock: async () => {},
  }
})
beforeEach(() => {
  bindings.clear()
  authorSaveStorage.receipts.clear()
})
afterEach(() => vi.unstubAllGlobals())

import { finishOpen, openExistingProject } from './open-actions.js'
import { buildBlankProject } from './seed.js'

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
      expectedIdentity: bindings.get('other-workspace') as import('./handle-store.js').WorkspaceHandleRecord,
    }),
  ).rejects.toThrow('目录句柄与本次打开目标不一致')
  expect(a.disk.files).toEqual(beforeA)
  expect(b.disk.files).toEqual(beforeB)
  expect(a.disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  expect(b.disk.changes).toEqual({ creates: [], closes: [], removes: [] })
})
