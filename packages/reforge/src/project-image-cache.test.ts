import { type AssetKind, type AssetRecordV1, validateAssetCatalog } from '@type-pal/content'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { deferred } from './__tests__/glm-runtime-contract-fixtures.js'
import { AssetResolver } from './asset-resolver.js'
import type { FileSource } from './file-source.js'
import { ProjectImageCache } from './project-image-cache.js'

// Real one-pixel files; the browser decoder itself is outside this suite.
const png = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
  ),
  (char) => char.charCodeAt(0),
)
const gif = Uint8Array.from(
  atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
  (char) => char.charCodeAt(0),
)

const imageCases = [
  ['portrait.guide', 'portrait'],
  ['face.guide', 'face'],
  ['icon.herb', 'item-icon'],
  ['background.cave', 'battle-background'],
] as const

const pathFor = (id: string) => `assets/authored/${id}.png`
const gifPath = 'assets/authored/portrait.animated.gif'
const pngMetadata = {
  mediaType: 'image/png',
  bytes: png.length,
  sha256: '4ff6ab670a58c14270e034e2090d9a432caa263a14e0a25785386b0c12f880b5',
}
const gifMetadata = {
  mediaType: 'image/gif',
  bytes: gif.length,
  sha256: 'ef1955ae757c8b966c83248350331bd3a30f658ced11f387f8ebf05ab3368629',
}
function record(kind: AssetKind, path: string, metadata: typeof pngMetadata): AssetRecordV1 {
  return { kind, path, ...metadata, origin: { kind: 'authored' } }
}

function projectCache() {
  const files = new Map(imageCases.map(([id]) => [pathFor(id), png]))
  files.set(gifPath, gif)
  const catalog = validateAssetCatalog({
    version: 1,
    assets: {
      ...Object.fromEntries(
        imageCases.map(([id, kind]) => [id, record(kind, pathFor(id), pngMetadata)]),
      ),
      'portrait.animated': record('portrait', gifPath, gifMetadata),
    },
  })
  const source: FileSource = {
    async readText() {
      throw new Error('unexpected text read by an image cache')
    },
    async readJson<T>(): Promise<T> {
      throw new Error('unexpected JSON read by an image cache')
    },
    readBytes: vi.fn(async (path: string) => {
      const bytes = files.get(path)
      if (!bytes) throw new Error(`unregistered fixture path ${path}`)
      return new Uint8Array(bytes).buffer
    }),
    async urlFor() {
      throw new Error('unexpected URL creation by an image cache')
    },
  }
  const cache = new ProjectImageCache(new AssetResolver('image-project', catalog, {}, source))
  caches.push(cache)
  return { cache, readBytes: vi.mocked(source.readBytes) }
}

const bitmap = () => ({ width: 1, height: 1, close: vi.fn() }) satisfies ImageBitmap
const decoder = vi.fn(async (_blob: Blob): Promise<ImageBitmap> => bitmap())
const caches: ProjectImageCache[] = []

beforeEach(() => {
  decoder.mockClear()
  vi.stubGlobal('createImageBitmap', decoder)
})

afterEach(() => {
  for (const cache of caches.splice(0)) cache.dispose()
  decoder.mockReset()
  vi.unstubAllGlobals()
})

describe('image lookup and reuse', () => {
  test('checks the requested kind before returning pending or decoded images', async () => {
    const { cache, readBytes } = projectCache()
    const decoding = deferred<ImageBitmap>()
    decoder.mockReturnValueOnce(decoding.promise)
    const expected = bitmap()
    const pending = cache.load('face.guide', 'face')
    const wrongKind = new Error(
      '工程 "image-project" 解析 AssetId "face.guide" 失败:期望 kind=portrait，' +
        '实际 kind=face，path=assets/authored/face.guide.png',
    )
    expect(() => cache.load('face.guide', 'portrait')).toThrow(wrongKind)
    decoding.resolve(expected)
    await expect(pending).resolves.toBe(expected)
    expect(() => cache.load('face.guide', 'portrait')).toThrow(wrongKind)
    await expect(cache.load('face.guide', 'face')).resolves.toBe(expected)
    expect(readBytes.mock.calls).toEqual([[pathFor('face.guide')]])
  })

  test('rejects an unsupported kind before starting any new read on a cold or warm cache', async () => {
    const { cache, readBytes } = projectCache()
    const error = new Error('ProjectImageCache 不支持 kind=music')
    expect(() => cache.load('portrait.guide', 'music')).toThrow(error)
    expect(readBytes).not.toHaveBeenCalled()
    await cache.load('portrait.guide', 'portrait')
    expect(() => cache.load('portrait.guide', 'music')).toThrow(error)
    expect(readBytes.mock.calls).toEqual([[pathFor('portrait.guide')]])
  })

  test('coalesces overlapping callers and reuses the same decoded bitmap without new IO', async () => {
    const { cache, readBytes } = projectCache()
    const entered = deferred<void>()
    const decoding = deferred<ImageBitmap>()
    decoder.mockImplementationOnce(() => {
      entered.resolve(undefined)
      return decoding.promise
    })
    const original = cache.load('portrait.guide', 'portrait')
    await entered.promise
    const overlap = cache.load('portrait.guide', 'portrait')
    const expected = bitmap()
    decoding.resolve(expected)
    await expect(original).resolves.toBe(expected)
    await expect(overlap).resolves.toBe(expected)
    await expect(cache.load('portrait.guide', 'portrait')).resolves.toBe(expected)
    expect(readBytes.mock.calls).toEqual([[pathFor('portrait.guide')]])
    expect(decoder).toHaveBeenCalledOnce()
  })

  test.each(imageCases)('loads %s from its registered %s path', async (id, kind) => {
    const { cache, readBytes } = projectCache()
    const expected = bitmap()
    decoder.mockResolvedValueOnce(expected)
    await expect(cache.load(id, kind)).resolves.toBe(expected)
    expect(readBytes.mock.calls).toEqual([[pathFor(id)]])
  })
})

describe('image decoding and ownership', () => {
  test('passes the registered non-PNG media type and original GIF bytes to the decoder', async () => {
    const { cache, readBytes } = projectCache()
    await cache.load('portrait.animated', 'portrait')
    const blob = decoder.mock.calls[0]?.[0]
    if (!blob) throw new Error('decoder received no image')
    expect(blob.type).toBe('image/gif')
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(gif)
    expect(readBytes.mock.calls).toEqual([[gifPath]])
  })

  test('allows a fresh read after a storage failure without calling the decoder on the failed read', async () => {
    const { cache, readBytes } = projectCache()
    const path = pathFor('portrait.guide')
    readBytes.mockRejectedValueOnce(new DOMException('disk unavailable', 'NotReadableError'))
    await expect(cache.load('portrait.guide', 'portrait')).rejects.toThrow(
      new Error(
        `工程 "image-project" 读取 AssetId "portrait.guide" 失败:期望 kind=portrait，登记 path=${path}；disk unavailable`,
      ),
    )
    expect(decoder).not.toHaveBeenCalled()
    const expected = bitmap()
    decoder.mockResolvedValueOnce(expected)
    await expect(cache.load('portrait.guide', 'portrait')).resolves.toBe(expected)
    expect(readBytes.mock.calls).toEqual([[path], [path]])
  })

  test('allows a fresh read and decode after a decoder failure', async () => {
    const { cache, readBytes } = projectCache()
    decoder.mockRejectedValueOnce(new DOMException('bitmap factory offline', 'InvalidStateError'))
    await expect(cache.load('portrait.guide', 'portrait')).rejects.toThrow(
      new Error('工程 "image-project" 解码 AssetId "portrait.guide" 失败:bitmap factory offline'),
    )
    const expected = bitmap()
    decoder.mockResolvedValueOnce(expected)
    await expect(cache.load('portrait.guide', 'portrait')).resolves.toBe(expected)
    expect(readBytes.mock.calls).toEqual([[pathFor('portrait.guide')], [pathFor('portrait.guide')]])
    expect(decoder).toHaveBeenCalledTimes(2)
  })

  test('closes all finished images, and subsequently reads a new image', async () => {
    const { cache, readBytes } = projectCache()
    const first = bitmap()
    const other = bitmap()
    decoder.mockResolvedValueOnce(first).mockResolvedValueOnce(other)
    await cache.load('portrait.guide', 'portrait')
    await cache.load('face.guide', 'face')
    cache.dispose()
    expect(first.close).toHaveBeenCalledOnce()
    expect(other.close).toHaveBeenCalledOnce()
    const fresh = bitmap()
    decoder.mockResolvedValueOnce(fresh)
    await expect(cache.load('portrait.guide', 'portrait')).resolves.toBe(fresh)
    expect(fresh.close).not.toHaveBeenCalled()
    expect(readBytes.mock.calls).toEqual([
      [pathFor('portrait.guide')],
      [pathFor('face.guide')],
      [pathFor('portrait.guide')],
    ])
  })

  test('only closes this project cache, even when another cache uses the same asset id', async () => {
    const first = projectCache()
    const second = projectCache()
    const own = bitmap()
    const independent = bitmap()
    decoder.mockResolvedValueOnce(own).mockResolvedValueOnce(independent)
    await expect(first.cache.load('face.guide', 'face')).resolves.toBe(own)
    await expect(second.cache.load('face.guide', 'face')).resolves.toBe(independent)
    first.cache.dispose()
    expect(own.close).toHaveBeenCalledOnce()
    expect(independent.close).not.toHaveBeenCalled()
    expect(first.readBytes.mock.calls).toEqual([[pathFor('face.guide')]])
    expect(second.readBytes.mock.calls).toEqual([[pathFor('face.guide')]])
  })
})
