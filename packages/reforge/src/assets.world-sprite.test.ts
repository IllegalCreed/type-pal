import type { AssetRecordV1 } from '@type-pal/content'
import { expect, test, vi } from 'vitest'
import { gzipFrames, rleRecord } from './__tests__/asset-rle-fixtures.js'
import {
  decodeWorldSpriteAssetBytes,
  loadSpriteAsset,
  SpriteAssetCache,
  type SpriteAssetReader,
} from './assets.js'
import { sha256Bytes } from './hash.js'

const first = [17, 31, 47, 63] as const
const second = [2, 3, 5, 7] as const

test('大世界精灵接线读取指定 AssetId、kind 和已登记的字节', async () => {
  const bytes = await gzipFrames(first)
  const entry = {
    ...(await rleRecord('sprite', 'hero', bytes)),
    path: 'assets/migrated/sprites/hero.rle',
    origin: { kind: 'legacy-migrated' as const },
  }
  const record = vi.fn<SpriteAssetReader['record']>().mockReturnValue(entry)
  const readBytes = vi.fn<SpriteAssetReader['readBytes']>().mockResolvedValue(bytes)
  const image = await loadSpriteAsset({ record, readBytes }, 'sprite.hero')
  expect(record).toHaveBeenCalledExactlyOnceWith('sprite.hero', 'sprite')
  expect(readBytes).toHaveBeenCalledExactlyOnceWith('sprite.hero', 'sprite')
  expect(image).toMatchObject({
    profile: 'legacy-migrated',
    frames: [{ pixels: Uint8Array.from(first) }],
  })
  await expect(
    loadSpriteAsset({ record: () => ({ ...entry, sha256: '0'.repeat(64) }), readBytes }, 'bad'),
  ).rejects.toThrow('sprite AssetId "bad": sha256 不符')
  await expect(
    loadSpriteAsset(
      { record: () => ({ ...entry, mediaType: 'application/octet-stream' }), readBytes },
      'bad',
    ),
  ).rejects.toThrow('sprite AssetId "bad": mediaType 非法 application/octet-stream')
  await expect(
    loadSpriteAsset({ record: () => entry, readBytes: async () => new ArrayBuffer(1) }, 'bad'),
  ).rejects.toThrow(`sprite AssetId "bad": bytes 登记 ${entry.bytes}，实际 1`)
})

test('大世界精灵的解码边界分别拒收错误 kind 和 SHA 正确的裸 RLE', async () => {
  const bytes = await gzipFrames(first)
  const entry = await rleRecord('sprite', 'hero', bytes)
  await expect(
    decodeWorldSpriteAssetBytes({ ...entry, kind: 'battle-sprite' }, bytes, 'world-sprite probe'),
  ).rejects.toThrow('world-sprite probe: 期望 kind=sprite，实际 battle-sprite')

  const raw = Uint8Array.of(1, 0, 1, 0, 1, 0, 1, 7)
  await expect(
    decodeWorldSpriteAssetBytes(
      { ...entry, bytes: raw.byteLength, sha256: await sha256Bytes(raw) },
      raw.buffer,
      'world-sprite probe',
    ),
  ).rejects.toThrow('world-sprite probe: canonical .rle 必须带 gzip 头')
})

test('同一大世界精灵并发只读一次，登记和失败变化能取得新像素', async () => {
  let bytes = await gzipFrames(first)
  let entry = await rleRecord('sprite', 'hero', bytes)
  const id = 'sprite.hero'
  const readBytes = vi.fn(async () => bytes)
  const reader = { record: () => entry, readBytes }
  const cache = new SpriteAssetCache()
  const images = await Promise.all([cache.load(reader, id), cache.load(reader, id)])
  expect(images[0]).toBe(images[1])
  expect(images[0].frames[0]?.pixels).toEqual(Uint8Array.from(first))
  expect(readBytes).toHaveBeenCalledTimes(1)

  bytes = await gzipFrames(second)
  entry = await rleRecord('sprite', 'hero-v2', bytes)
  const changed = await cache.load(reader, id)
  expect(changed.frames[0]?.pixels).toEqual(Uint8Array.from(second))

  entry = { ...entry, origin: { kind: 'legacy-migrated' }, path: 'assets/migrated/hero.rle' }
  expect((await cache.load(reader, id)).profile).toBe('legacy-migrated')

  await expect(
    cache.load({ ...reader, readBytes: async () => new ArrayBuffer(1) }, 'sprite.retry'),
  ).rejects.toThrow(`sprite AssetId "sprite.retry": bytes 登记 ${entry.bytes}，实际 1`)
  expect((await cache.load(reader, 'sprite.retry')).frames[0]?.pixels).toEqual(
    Uint8Array.from(second),
  )
})

test('只改工程路径也会清除大世界精灵的旧缓存', async () => {
  const bytes = await gzipFrames(first)
  let entry = await rleRecord('sprite', 'hero', bytes)
  const readBytes = vi.fn(async () => bytes)
  const reader = { record: () => entry, readBytes }
  const cache = new SpriteAssetCache()
  const id = 'sprite.hero'
  const initial = await cache.load(reader, id)
  expect(cache.get(reader, id)).toBe(initial)
  entry = { ...entry, path: 'assets/generated/hero-v2.rle' }
  expect(cache.get(reader, id)).toBeUndefined()
  const restored = await cache.load(reader, id)
  expect(restored).not.toBe(initial)
  expect(restored.frames[0]?.pixels).toEqual(Uint8Array.from(first))
  expect(cache.get(reader, id)).toBe(restored)
  expect(readBytes).toHaveBeenCalledTimes(2)
})

test('容量裁剪保留受保护和最近的大世界精灵，逐出最旧非保护项', async () => {
  const resources = new Map<string, { record: AssetRecordV1; bytes: ArrayBuffer }>()
  for (const [id, pixels] of [
    ['sprite.a', first],
    ['sprite.b', [11, 13, 19, 23]],
    ['sprite.c', second],
  ] as const) {
    const bytes = await gzipFrames(pixels)
    resources.set(id, { record: await rleRecord('sprite', id, bytes), bytes })
  }
  const lookup = (id: string) => {
    const resource = resources.get(id)
    if (!resource) throw new Error(`missing ${id}`)
    return resource
  }
  const reader = {
    record: (id: string) => lookup(id).record,
    readBytes: async (id: string) => lookup(id).bytes,
  }
  const cache = new SpriteAssetCache(2)
  for (const id of resources.keys()) await cache.load(reader, id)
  cache.prune(new Set(['sprite.a']))

  expect(cache.get(reader, 'sprite.a')?.frames[0]?.pixels).toEqual(Uint8Array.from(first))
  expect(cache.get(reader, 'sprite.b')).toBeUndefined()
  expect(cache.get(reader, 'sprite.c')?.frames[0]?.pixels).toEqual(Uint8Array.from(second))
})
