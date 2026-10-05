/**
 * TEST-GLM-REFORGE-ASSET-RESOLVER-1：project-loader 对 imageCache 的绑定（project-loader.ts:444-456）。
 * 旧 loader 测试（project-loader.test.ts / current-boundaries D1-D3）与 opening-menu 消费测
 * 均未证：LoadedCurrentProject.imageCache 与 assetResolver 同 catalog/roles/source —— 即
 * cache 的字节读取走 manifest assets catalog 登记路径，而非另开 IO 通道。
 */
import { afterEach, expect, test, vi } from 'vitest'
import { dProjectFiles, memoryFileSource } from './__tests__/glm-runtime-contract-fixtures.js'
import { loadCurrentProjectFrom } from './project-loader.js'

interface Bitmap {
  id: number
  close(): void
}

afterEach(() => vi.unstubAllGlobals())

test('loadCurrentProjectFrom 绑定：imageCache 经 manifest catalog 登记路径读字节，与 assetResolver 同源', async () => {
  const files = dProjectFiles()
  files['assets/authored/portrait-default.png'] = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4,
  ]).buffer
  const source = memoryFileSource(files)
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => {
      const bitmap: Bitmap = {
        id: 1,
        close() {},
      }
      return bitmap
    }),
  )
  const project = await loadCurrentProjectFrom(source)
  // 同一登记：resolver 的 record 与 cache 的读取使用同一 catalog 路径
  expect(project.assetResolver.record('portrait.li.default', 'portrait').path).toBe(
    'assets/authored/portrait-default.png',
  )
  // 绑定合同的判别点：cache 经同一 resolver/catalog 读出登记路径的字节并成功解码。
  // load() 的 kind/catalog 门同步抛错，包成结果值断言（变异下落成 AssertionError）
  const outcome = await (() => {
    try {
      return project.imageCache.load('portrait.li.default', 'portrait').then(
        () => 'loaded',
        (error: unknown) => `rejected:${(error as Error).message}`,
      )
    } catch (error) {
      return Promise.resolve(`thrown:${(error as Error).message}`)
    }
  })()
  expect(outcome).toBe('loaded')
  // cache 的字节读取落在 loader 同一 source 的 catalog 路径上
  expect(source.reads).toContain('bytes:assets/authored/portrait-default.png')
  // 第二次 load 命中 decoded：不再产生新的字节读取
  await project.imageCache.load('portrait.li.default', 'portrait')
  expect(
    source.reads.filter((entry) => entry === 'bytes:assets/authored/portrait-default.png'),
  ).toHaveLength(1)
  project.imageCache.dispose()
})
