import type { AssetCatalogV1 } from '@type-pal/content'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { AssetResolver } from './asset-resolver.js'
import type { FileSource } from './file-source.js'
import { ProjectImageCache } from './project-image-cache.js'

const catalog: AssetCatalogV1 = {
  version: 1,
  assets: {
    avatar: {
      kind: 'face',
      path: 'assets/face.png',
      mediaType: 'image/png',
      bytes: 1,
      sha256: 'a'.repeat(64),
      origin: { kind: 'authored' },
    },
  },
}

function resolver(readBytes = vi.fn(async () => Uint8Array.from([1]).buffer)): AssetResolver {
  const source: FileSource = {
    readText: async () => '',
    readJson: async <T>() => ({}) as T,
    readBytes,
    urlFor: async (path) => path,
  }
  return new AssetResolver('cache-test', catalog, {}, source)
}

describe('ProjectImageCache', () => {
  afterEach(() => vi.unstubAllGlobals())

  test('pending 与 decoded 命中前都重新校验 expected kind', async () => {
    let finish!: (value: ImageBitmap) => void
    const decoded = new Promise<ImageBitmap>((resolve) => {
      finish = resolve
    })
    const bitmap = { close: vi.fn() } as unknown as ImageBitmap
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(() => decoded),
    )
    const cache = new ProjectImageCache(resolver())

    const pending = cache.load('avatar', 'face')
    expect(() => cache.load('avatar', 'portrait')).toThrow(/avatar.*portrait.*face/)
    finish(bitmap)
    await expect(pending).resolves.toBe(bitmap)
    expect(() => cache.load('avatar', 'portrait')).toThrow(/avatar.*portrait.*face/)
    await expect(cache.load('avatar', 'face')).resolves.toBe(bitmap)
    cache.dispose()
    expect(bitmap.close).toHaveBeenCalledOnce()
  })
})
