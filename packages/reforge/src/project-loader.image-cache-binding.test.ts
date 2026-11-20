import { validateAssetCatalog } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import { dProjectFiles, memoryFileSource } from './__tests__/glm-runtime-contract-fixtures.js'
import portraitPng from './engine-chrome/assets/ui/status/slot.png?inline'
import { sha256Bytes } from './hash.js'
import { loadCurrentProjectFrom } from './project-loader.js'

afterEach(() => vi.unstubAllGlobals())

test('装配后的图像缓存从同一工程目录读取并传递登记路径的真实 PNG', async () => {
  const files = dProjectFiles()
  const catalog = validateAssetCatalog(files['assets/index.json'])
  const id = 'portrait.li.default'
  const record = catalog.assets[id]
  if (!record) throw new Error('缺少模拟工程头像记录')
  const bytes = Uint8Array.from(atob(portraitPng.slice(portraitPng.indexOf(',') + 1)), (byte) =>
    byte.charCodeAt(0),
  )
  // 使用非默认的作者路径，解码输入必须来自 catalog 的实际记录。
  const authoredPath = 'assets/authored/portraits/registered-portrait.png'
  catalog.assets[id] = {
    ...record,
    path: authoredPath,
    bytes: bytes.byteLength,
    sha256: await sha256Bytes(bytes),
  }
  files['assets/index.json'] = catalog
  files[authoredPath] = bytes.buffer
  const source = memoryFileSource(files)
  const bitmap: ImageBitmap = { width: 24, height: 24, close: vi.fn() }
  const decode = vi.fn(async (blob: Blob) => {
    expect(blob.type).toBe('image/png')
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes)
    return bitmap
  })
  vi.stubGlobal('createImageBitmap', decode)
  const project = await loadCurrentProjectFrom(source)
  try {
    expect(project.assetResolver.record(id, 'portrait').path).toBe(authoredPath)
    await expect(
      Promise.resolve().then(() => project.imageCache.load(id, 'portrait')),
    ).resolves.toBe(bitmap)
    await expect(project.imageCache.load(id, 'portrait')).resolves.toBe(bitmap)
    expect(source.reads.filter((entry) => entry.startsWith('bytes:'))).toEqual([
      `bytes:${authoredPath}`,
    ])
  } finally {
    project.imageCache.dispose()
  }
  expect(bitmap.close).toHaveBeenCalledOnce()
})
