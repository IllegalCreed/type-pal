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

import { observeAuthorSource, verifyOpenedAuthorBaseline } from './author-disk-baseline.js'
import { openLocalProject } from './open-local.js'
import { buildBlankProject } from './seed.js'

test('B1 正控：未篡改的重复读取正常完成打开并给出基线', async () => {
  const files = await buildBlankProject('batch-baseline')
  const disk = memoryAuthorDirectory(files)
  const opened = await openLocalProject(disk.dir)
  expect(opened.authorBaseline).toBeTruthy()
  expect(opened.project.manifest.id).toBe('batch-baseline')
})

test('B1: 载入捕获期间同文件两次读到不同字节时观察器拒绝（正控同字节通过）', async () => {
  const encoder = new TextEncoder()
  const makeSource = (second: Uint8Array | undefined) => {
    let reads = 0
    return {
      readBytes: async () => {
        reads += 1
        return (reads === 2 && second ? second : encoder.encode('{"v":1}')).slice().buffer
      },
      readText: async () => 'unused',
      readJson: async () => ({}),
      urlFor: async () => 'blob:unused',
    } as unknown as import('@type-pal/reforge').FileSource
  }
  // 正控：两次同字节读取不抛。
  const stable = observeAuthorSource(makeSource(undefined))
  await stable.source.readBytes('content/actors.json')
  await stable.source.readBytes('content/actors.json')
  // 反控：第二次返回不同字节 → AuthorSaveConflictError。
  const drifting = observeAuthorSource(makeSource(encoder.encode('{"v":2}')))
  await drifting.source.readBytes('content/actors.json')
  await expect(drifting.source.readBytes('content/actors.json')).rejects.toThrow(/actors\.json/)
})

test('B3: 基线校验时作者文件缺失（NotFound≠可吞）与读取 IO 错误分别拒绝', async () => {
  const files = await buildBlankProject('batch-baseline-missing')
  const disk = memoryAuthorDirectory(files)
  const opened = await openLocalProject(disk.dir)
  const originalLocale = disk.files.get('content/locale.json')!.slice(0)
  disk.files.delete('content/locale.json')
  await expect(verifyOpenedAuthorBaseline(opened.authorBaseline, disk.dir)).rejects.toThrow(
    /locale\.json/,
  )
  // Codex接收修订：先撤销缺文件故障，避免并行载入的基线顺序决定下一条错误是谁。
  disk.set('content/locale.json', originalLocale)
  await expect(verifyOpenedAuthorBaseline(opened.authorBaseline, disk.dir)).resolves.toBeUndefined()
  // IO 错误（非 NotFound）不静默：afterRead 抛出普通错误必须传播，不被当作“文件缺失”。
  disk.hooks.afterRead = (path) => {
    if (path === 'content/actors.json') throw new Error('injected read failure')
  }
  await expect(verifyOpenedAuthorBaseline(opened.authorBaseline, disk.dir)).rejects.toThrow(
    'injected read failure',
  )
  disk.hooks.afterRead = undefined
})
