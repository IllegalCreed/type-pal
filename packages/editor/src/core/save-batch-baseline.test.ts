/**
 * EDITOR-SAVE-RECOVERY-1 · GLM batch-r1 · G4 作者基线跨会话边界（B1/B3）。
 * 真实 openLocalProject/observeAuthorSource/verifyOpenedAuthorBaseline；仅替身 FSA/IDB。
 */
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

import { verifyOpenedAuthorBaseline } from './author-disk-baseline.js'
import { openLocalProject } from './open-local.js'
import { buildBlankProject } from './seed.js'

const MANIFEST = 'manifest.json'

test('B1 正控：未篡改的重复读取正常完成打开并给出基线', async () => {
  const files = await buildBlankProject('batch-baseline')
  const disk = memoryAuthorDirectory(files)
  const opened = await openLocalProject(disk.dir)
  expect(opened.authorBaseline).toBeTruthy()
  expect(opened.project.manifest.id).toBe('batch-baseline')
})

test('B1: 载入捕获期间同文件两次读到不同字节时打开拒绝', async () => {
  const files = await buildBlankProject('batch-baseline-drift')
  const disk = memoryAuthorDirectory(files)
  const reads = new Map<string, number>()
  disk.hooks.afterRead = (path) => {
    const count = (reads.get(path) ?? 0) + 1
    reads.set(path, count)
    if (count === 2 && path === MANIFEST) {
      // 第二次读取前外部改写同一文件 → 观察器两次签名不一致。
      disk.set(MANIFEST, { ...(files[MANIFEST] as object), id: 'drifted' })
    }
  }
  await expect(openLocalProject(disk.dir)).rejects.toThrow(/batch-baseline-drift|manifest/)
  disk.hooks.afterRead = undefined
})

test('B3: 基线校验时作者文件缺失（NotFound≠可吞）与读取 IO 错误分别拒绝', async () => {
  const files = await buildBlankProject('batch-baseline-missing')
  const disk = memoryAuthorDirectory(files)
  const opened = await openLocalProject(disk.dir)
  disk.files.delete('content/locale.json')
  await expect(verifyOpenedAuthorBaseline(opened.authorBaseline, disk.dir)).rejects.toThrow(
    /locale\.json/,
  )
  // IO 错误（非 NotFound）不静默：afterRead 抛出普通错误必须传播，不被当作“文件缺失”。
  disk.hooks.afterRead = (path) => {
    if (path === 'content/actors.json') throw new Error('injected read failure')
  }
  await expect(verifyOpenedAuthorBaseline(opened.authorBaseline, disk.dir)).rejects.toThrow(
    'injected read failure',
  )
  disk.hooks.afterRead = undefined
})
