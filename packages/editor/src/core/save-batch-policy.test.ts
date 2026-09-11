/**
 * EDITOR-SAVE-RECOVERY-1 · GLM batch-r1 返工（R1）：P2/P6 用可成功的真实写入证明门禁；
 * 另补 P1（坏旁车标记不降级 + 读取 IO 传播）。仅替身 FSA/IDB 边界，产品代码全真实。
 */
import type { CurrentManifest } from '@type-pal/content'
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
  saveWorkspaceHandle: async () => undefined,
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
})

import { finishOpen } from './open-actions.js'
import { writeProject } from './project-io.js'
import { buildBlankProject } from './seed.js'
import { createLocalWorkspaceContext } from './workspace-context.js'
import {
  authorizeBoundWorkspaceTarget,
  authorizeFirstSaveTarget,
  withAuthorizedWorkspaceMutation,
} from './workspace-persistence.js'

const authorChanges = (disk: ReturnType<typeof memoryAuthorDirectory>) =>
  Object.fromEntries(
    Object.entries(disk.changes).map(([kind, paths]) => [
      kind,
      paths.filter((path) => path !== '.type-pal' && !path.startsWith('.type-pal/')),
    ]),
  )

test('P2 正控：无外部文件时同一首存授权完整写入成功', async () => {
  const disk = memoryAuthorDirectory()
  const files = await buildBlankProject('batch-policy')
  const context = createLocalWorkspaceContext(
    (files['manifest.json'] as CurrentManifest).id,
    'blank-project',
  )
  const target = await authorizeFirstSaveTarget(context, disk.dir)
  await writeProject(target, files)
  expect(disk.json('manifest.json').id).toBe('batch-policy')
})

test('P2: 授权后到实际首写之间出现外部文件时，复验拒绝、真实 writer 不执行、原文件原样', async () => {
  const disk = memoryAuthorDirectory()
  const files = await buildBlankProject('batch-policy')
  const context = createLocalWorkspaceContext(
    (files['manifest.json'] as CurrentManifest).id,
    'blank-project',
  )
  const target = await authorizeFirstSaveTarget(context, disk.dir)
  disk.set('foreign-file.txt', 'external content')
  disk.resetChanges()
  // 回调是可成功写入的真实 writer（不是自造 throw）：拒绝只能来自产品门禁。
  await expect(writeProject(target, files)).rejects.toThrow()
  expect(authorChanges(disk)).toEqual({ creates: [], closes: [], removes: [] })
  expect(new TextDecoder().decode(disk.files.get('foreign-file.txt'))).toBe('external content')
  expect(disk.files.has('manifest.json')).toBe(false)
})

test('P6a: 一次性授权消费后复用被拒（回调可成功）', async () => {
  const disk = memoryAuthorDirectory()
  const files = await buildBlankProject('batch-policy-once')
  const context = createLocalWorkspaceContext(
    (files['manifest.json'] as CurrentManifest).id,
    'blank-project',
  )
  const target = await authorizeFirstSaveTarget(context, disk.dir)
  await expect(writeProject(target, files)).resolves.toBeTruthy()
  await expect(
    withAuthorizedWorkspaceMutation(target, () => writeProject(target, files)),
  ).rejects.toThrow('授权已消费')
})

test('P6b: 已绑定保存的目标目录不属于本工作区时拒绝、零作者 IO', async () => {
  const files = await buildBlankProject('batch-policy-cross')
  const diskA = memoryAuthorDirectory(files)
  const opened = await finishOpen(diskA.dir)
  bindings.set(opened.workspace.workspaceId, {
    ...opened.workspace,
    name: diskA.dir.name,
    handle: diskA.dir,
    updatedAt: 1,
  })
  const diskB = memoryAuthorDirectory(await buildBlankProject('batch-policy-cross'))
  // 正控：本工作区自己的绑定目录可授权。
  await expect(
    authorizeBoundWorkspaceTarget(opened.workspace, diskA.dir, opened.authorBaseline),
  ).resolves.toBeTruthy()
  diskA.resetChanges()
  diskB.resetChanges()
  await expect(
    authorizeBoundWorkspaceTarget(opened.workspace, diskB.dir, opened.authorBaseline),
  ).rejects.toThrow('不是当前工作区已绑定的目录')
  expect(authorChanges(diskA)).toEqual({ creates: [], closes: [], removes: [] })
  expect(authorChanges(diskB)).toEqual({ creates: [], closes: [], removes: [] })
})

test('P6c: 首存预检不授予续写资格——首存完成后目录非空，再走首存门拒绝', async () => {
  const files = await buildBlankProject('batch-policy-continue')
  const manifest = files['manifest.json'] as CurrentManifest
  const disk = memoryAuthorDirectory()
  const context = createLocalWorkspaceContext(manifest.id, 'blank-project')
  const first = await authorizeFirstSaveTarget(context, disk.dir)
  await writeProject(first, files)
  // 首存已完成：同一目录再申请“首存”授权必须被空目录门拒绝（首存资格不延续）。
  await expect(authorizeFirstSaveTarget(context, disk.dir)).rejects.toThrow()
  expect(disk.json('manifest.json').id).toBe(manifest.id)
})

test('P1: 损坏的沙盒旁车标记不降级为普通 local，打开拒绝且零写删', async () => {
  const files = await buildBlankProject('batch-policy-marker')
  const disk = memoryAuthorDirectory(files)
  disk.set('.type-pal/workspace.json', '{not valid marker')
  const before = new Map(disk.files)
  disk.resetChanges()
  await expect(finishOpen(disk.dir)).rejects.toThrow()
  expect(disk.files).toEqual(before)
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
})

test('P1: 旁车标记读取 IO 错误传播（afterRead 注入），不被当作缺失/降级', async () => {
  const files = await buildBlankProject('batch-policy-marker-io')
  const disk = memoryAuthorDirectory(files)
  disk.set('.type-pal/workspace.json', 'marker io target')
  const originalText = Blob.prototype.text
  Blob.prototype.text = async function (this: Blob) {
    const text = await originalText.call(this)
    if (text === 'marker io target') throw new Error('marker read failure')
    return text
  }
  try {
    await expect(finishOpen(disk.dir)).rejects.toThrow('marker read failure')
  } finally {
    Blob.prototype.text = originalText
  }
})

test('P6d: 绑定授权消费后复用被拒（消费检查为独立可观测门）', async () => {
  const files = await buildBlankProject('batch-policy-d')
  const disk = memoryAuthorDirectory(files)
  const opened = await finishOpen(disk.dir)
  bindings.set(opened.workspace.workspaceId, {
    ...opened.workspace,
    name: disk.dir.name,
    handle: disk.dir,
    updatedAt: 1,
  })
  const target = await (await import('./workspace-persistence.js')).authorizeBoundWorkspaceTarget(
    opened.workspace,
    disk.dir,
    opened.authorBaseline,
  )
  await expect(writeProject(target, files)).resolves.toBeTruthy()
  await expect(writeProject(target, files)).rejects.toThrow('授权已消费')
})

test('P5: 沙盒受限 marker 写入失败后不留可被普通 local 利用的副本，恢复后完成受限登记', async () => {
  const wp = await import('./workspace-persistence.js')
  const files = await buildBlankProject('batch-p5')
  const disk = memoryAuthorDirectory()
  const workspace = (await import('./workspace-context.js')).createSandboxWorkspaceContext(
    'batch-p5',
    'sandbox-copy',
  )
  const target = await wp.authorizeFirstSaveTarget(workspace, disk.dir)
  disk.hooks.beforeClose = (path) => {
    if (path.includes('workspace.json')) throw new Error('marker write denied')
  }
  await expect(
    wp.withAuthorizedWorkspaceMutation(target, async (mutation) => {
      await wp.registerAuthorizedWorkspaceMutation(mutation, workspace, disk.dir.name)
      await writeProject(mutation, files)
    }),
  ).rejects.toThrow('marker write denied')
  disk.hooks.beforeClose = undefined
  // 失败副本不可被普通 local 首存利用（.type-pal 残留使空目录门拒绝）。
  const localCtx = (await import('./workspace-context.js')).createLocalWorkspaceContext(
    'batch-p5',
    'blank-project',
  )
  await expect(wp.authorizeFirstSaveTarget(localCtx, disk.dir)).rejects.toThrow()
  // 失败现场：marker 只有空占位（未完成受限登记），无待恢复凭据——失败副本不可被任何一方利用。
  const { recoverInterruptedAuthorSave } = await import('./author-save-journal.js')
  await expect(recoverInterruptedAuthorSave(disk.dir)).resolves.toBeNull()
  expect(authorSaveStorage.receipts.size).toBe(0)
  const markerBytes = disk.files.get('.type-pal/workspace.json')
  expect(markerBytes?.byteLength ?? 0).toBe(0)
})
