/**
 * EDITOR-SAVE-RECOVERY-1 · GLM batch-r1 · G3 工作区保护矩阵（P2/P6）+ G5 锁序（S4 前半）。
 * 真实 authorizeFirstSaveTarget/withAuthorizedWorkspaceMutation/锁代码；仅替身 FSA/IDB。
 */
import type { CurrentManifest } from '@type-pal/content'
import { beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)
vi.mock('./handle-store.js', async (original) => ({
  ...(await original<typeof import('./handle-store.js')>()),
  loadWorkspaceRecord: async () => null,
  findWorkspaceRecordByHandle: async () => null,
  saveWorkspaceHandle: async () => undefined,
  saveWorkspaceHandleUnderLock: async () => undefined,
}))
beforeEach(() => authorSaveStorage.receipts.clear())

import { buildBlankProject } from './seed.js'
import { createLocalWorkspaceContext } from './workspace-context.js'
import {
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

test('P2: 授权后到实际首写之间出现外部文件时，空目录门复验拒绝且原文件不动', async () => {
  const disk = memoryAuthorDirectory()
  const files = await buildBlankProject('batch-policy')
  const context = createLocalWorkspaceContext(
    (files['manifest.json'] as CurrentManifest).id,
    'blank-project',
  )
  const target = await authorizeFirstSaveTarget(context, disk.dir)
  // 授权完成后、写入开始前：外部在目标目录放入无关文件。
  disk.set('foreign-file.txt', 'external content')
  disk.resetChanges()
  await expect(
    withAuthorizedWorkspaceMutation(target, async () => {
      throw new Error('不应进入写入')
    }),
  ).rejects.toThrow()
  expect(authorChanges(disk)).toEqual({ creates: [], closes: [], removes: [] })
  const bytes = new TextDecoder().decode(disk.files.get('foreign-file.txt'))
  expect(bytes).toBe('external content')
})

test('P6: 一次性授权消费后不可复用；对另一目标目录的授权同样拒绝', async () => {
  const diskA = memoryAuthorDirectory()
  const diskB = memoryAuthorDirectory()
  const files = await buildBlankProject('batch-policy-once')
  const manifest = files['manifest.json'] as CurrentManifest
  const context = createLocalWorkspaceContext(manifest.id, 'blank-project')
  const target = await authorizeFirstSaveTarget(context, diskA.dir)
  const result = await withAuthorizedWorkspaceMutation(target, async () => 'done')
  expect(result).toBe('done')
  // 授权已被消费：同一 target 再次进入 mutation 拒绝。
  await expect(
    withAuthorizedWorkspaceMutation(target, async () => 'again'),
  ).rejects.toThrow('授权已消费')
  // A 目录授权不能写入 B 目录（目录身份不符）。
  const targetB = await authorizeFirstSaveTarget(
    createLocalWorkspaceContext(manifest.id, 'blank-project'),
    diskB.dir,
  ).then((authorized) => authorized)
  await expect(
    withAuthorizedWorkspaceMutation(targetB, async () => {
      throw new Error('不应执行')
    }),
  ).rejects.toThrow()
  expect(diskB.files.size).toBe(0)
})
