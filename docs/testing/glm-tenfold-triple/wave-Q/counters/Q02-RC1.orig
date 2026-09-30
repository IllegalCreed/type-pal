// Q02 · assets.ts 解码门与缓存残差（排重：base/G03/battle-bg.residual/presentation.residual
// 已证 world-sprite 门、palette 守卫、tileset 三门、bg 索引链、nibble 位移、缓存共享/驱逐；
// 本文件只补 battle-sprite 解码门、battle 缓存 label/origin.ref 失效与保护裁剪、
// effect-sprite record 门、tilesFromChunkBytes 标签、decompress 非 gzip 透传、gzip 偏移视图）。
import {
  type AssetRecordV1,
  PAL_PHYSICAL_EFFECT_ASSET_ID,
  palMagicEffectSpriteAssetId,
} from '@type-pal/content'
import { encodeSpriteChunk, type RleFrame } from '@type-pal/shared'
import { expect, test, vi } from 'vitest'
import { AssetResolver } from './asset-resolver.js'
import {
  type AssetBase,
  BattleSpriteAssetCache,
  compressGzip,
  decodeBattleSpriteAssetBytes,
  decompressGzip,
  loadEffectSprite,
  loadFireSprite,
  tilesFromChunkBytes,
} from './assets.js'
import { sha256Bytes } from './hash.js'

const SPRITE_FRAMES = Array.from({ length: 3 }, () => ({
  width: 2,
  height: 2,
  pixels: new Uint8Array([1, 2, 3, 4]),
  opaque: new Uint8Array([1, 1, 1, 1]),
}))

async function gzipSpriteBytes(): Promise<ArrayBuffer> {
  return (await compressGzip(encodeSpriteChunk(SPRITE_FRAMES))).slice().buffer as ArrayBuffer
}

async function battleRecord(overrides: Partial<AssetRecordV1> = {}): Promise<AssetRecordV1> {
  const bytes = await gzipSpriteBytes()
  return {
    kind: 'battle-sprite',
    path: 'assets/generated/bs.rle',
    mediaType: 'application/vnd.type-pal.rle',
    bytes: bytes.byteLength,
    sha256: await sha256Bytes(new Uint8Array(bytes)),
    origin: { kind: 'generated' },
    ...overrides,
  }
}

test('Q02 battle-sprite 解码核：kind / mediaType / bytes / sha256 逐门精确拒绝', async () => {
  const bytes = await gzipSpriteBytes()
  const good = await battleRecord()
  const kindBad = await battleRecord({ kind: 'sprite' })
  const mediaBad = await battleRecord({ mediaType: 'image/png' })
  const bytesBad = await battleRecord({ bytes: good.bytes + 1 })
  const shaBad = await battleRecord({ sha256: '0'.repeat(64) })
  await expect(decodeBattleSpriteAssetBytes(kindBad, bytes)).rejects.toThrow(
    '期望 kind=battle-sprite，实际 sprite',
  )
  await expect(decodeBattleSpriteAssetBytes(mediaBad, bytes)).rejects.toThrow(
    'mediaType 非法 image/png',
  )
  await expect(decodeBattleSpriteAssetBytes(bytesBad, bytes)).rejects.toThrow(
    `bytes 登记 ${good.bytes + 1}，实际 ${bytes.byteLength}`,
  )
  await expect(decodeBattleSpriteAssetBytes(shaBad, bytes)).rejects.toThrow('sha256 不符')
})

test('Q02 battle-sprite 解码核：非 gzip 字节拒收；合法字节解出锚点与 canonical profile', async () => {
  const raw = new TextEncoder().encode('plain rle bytes').buffer as ArrayBuffer
  const record = await battleRecord({
    bytes: raw.byteLength,
    sha256: await sha256Bytes(new Uint8Array(raw)),
  })
  await expect(decodeBattleSpriteAssetBytes(record, raw)).rejects.toThrow('.rle 必须带 gzip 头')
  const good = await battleRecord()
  const decoded = await decodeBattleSpriteAssetBytes(good, await gzipSpriteBytes())
  expect(decoded.profile).toBe('canonical')
  expect(decoded.frames).toHaveLength(3)
  expect(decoded.anchorX).toBe(1)
  expect(decoded.anchorY).toBe(2)
})

test('Q02 battle-sprite 解码核：legacy-migrated origin 选择 legacy profile', async () => {
  const record = await battleRecord({ origin: { kind: 'legacy-migrated' } })
  const decoded = await decodeBattleSpriteAssetBytes(record, await gzipSpriteBytes())
  expect(decoded.profile).toBe('legacy-migrated')
})

test('Q02 battle 缓存以完整 record（含 label/origin.ref）为失效签名', async () => {
  const bytes = await gzipSpriteBytes()
  let label: string | undefined = 'first'
  let ref: string | undefined
  const record = await battleRecord({ label, bytes: bytes.byteLength })
  let reads = 0
  const reader = {
    record: (): AssetRecordV1 => ({
      ...record,
      label,
      origin: { kind: record.origin.kind, ref },
    }),
    readBytes: async (): Promise<ArrayBuffer> => {
      reads += 1
      return bytes.slice(0)
    },
  }
  const cache = new BattleSpriteAssetCache()
  await cache.load(reader, 'bs')
  expect(cache.get(reader, 'bs')?.frames).toHaveLength(3)
  expect(reads).toBe(1)
  label = 'renamed' // 仅 label 变化也必须失效
  expect(cache.get(reader, 'bs')).toBeUndefined()
  await cache.load(reader, 'bs')
  expect(reads).toBe(2)
  ref = 'repointed' // origin.ref 变化同样失效
  expect(cache.get(reader, 'bs')).toBeUndefined()
  await cache.load(reader, 'bs')
  expect(reads).toBe(3)
})

test('Q02 battle 缓存保护裁剪：受保护项存活、非保护项逐出后重读', async () => {
  const bytes = await gzipSpriteBytes()
  const record = await battleRecord({ bytes: bytes.byteLength })
  const reader = {
    record: (): AssetRecordV1 => record,
    readBytes: async (): Promise<ArrayBuffer> => bytes.slice(0),
  }
  const cache = new BattleSpriteAssetCache(1)
  await cache.load(reader, 'a')
  await cache.load(reader, 'b')
  await cache.load(reader, 'keep')
  cache.prune(new Set(['keep']))
  expect(cache.get(reader, 'a')).toBeUndefined()
  expect(cache.get(reader, 'b')).toBeUndefined()
  expect(cache.get(reader, 'keep')?.frames).toHaveLength(3)
})

/** 合法 FileSource 对象 + 真实 AssetResolver；catalog 可按用例整体替换 record。 */
function effectBase(
  assetId: string,
  projectId = 'q2-project',
): {
  base: AssetBase
  setRecord: (record: AssetRecordV1) => void
  setBytes: (bytes: ArrayBuffer) => void
} {
  const catalog = { version: 1 as const, assets: {} as Record<string, AssetRecordV1> }
  let bytes = new ArrayBuffer(0)
  const source = {
    async readText(rel: string): Promise<string> {
      throw new Error(`unexpected readText ${rel}`)
    },
    async readJson<T>(rel: string): Promise<T> {
      throw new Error(`unexpected readJson ${rel}`)
    },
    async readBytes(rel: string): Promise<ArrayBuffer> {
      void rel
      return bytes.slice(0)
    },
    async urlFor(rel: string): Promise<string> {
      return `https://fixture.invalid/${rel}`
    },
  }
  const resolver = new AssetResolver(projectId, catalog, {}, source)
  return {
    base: { source, assetResolver: resolver },
    setRecord: (record) => {
      catalog.assets[assetId] = record
    },
    setBytes: (next: ArrayBuffer) => {
      bytes = next
    },
  }
}

async function effectGzip(): Promise<ArrayBuffer> {
  const out = await compressGzip(encodeSpriteChunk(SPRITE_FRAMES))
  return out.slice().buffer as ArrayBuffer
}

test('Q02 effect-sprite record 门：mediaType / bytes 登记 / sha256 逐臂拒绝 + 合法对照', async () => {
  const gz = await effectGzip()
  const digest = await sha256Bytes(new Uint8Array(gz))
  const goodAsset = PAL_PHYSICAL_EFFECT_ASSET_ID
  const good = effectBase(goodAsset)
  good.setRecord({
    kind: 'effect-sprite',
    path: 'assets/generated/fx.rle',
    mediaType: 'application/vnd.type-pal.rle',
    bytes: gz.byteLength,
    sha256: digest,
    origin: { kind: 'generated' },
  })
  good.setBytes(gz)
  await loadEffectSprite(good.base) // 合法对照通过
  const media = effectBase(goodAsset)
  media.setRecord({
    kind: 'effect-sprite',
    path: 'assets/generated/fx.rle',
    mediaType: 'image/png',
    bytes: gz.byteLength,
    sha256: digest,
    origin: { kind: 'generated' },
  })
  media.setBytes(gz)
  await expect(loadEffectSprite(media.base)).rejects.toThrow('mediaType 非法 image/png')
  const sha = effectBase(goodAsset)
  sha.setRecord({
    kind: 'effect-sprite',
    path: 'assets/generated/fx.rle',
    mediaType: 'application/vnd.type-pal.rle',
    bytes: gz.byteLength,
    sha256: '1'.repeat(64),
    origin: { kind: 'generated' },
  })
  sha.setBytes(gz)
  await expect(loadEffectSprite(sha.base)).rejects.toThrow('sha256 不符')
  const len = effectBase(goodAsset)
  len.setRecord({
    kind: 'effect-sprite',
    path: 'assets/generated/fx.rle',
    mediaType: 'application/vnd.type-pal.rle',
    bytes: gz.byteLength + 1,
    sha256: digest,
    origin: { kind: 'generated' },
  })
  len.setBytes(gz)
  await expect(loadEffectSprite(len.base)).rejects.toThrow(
    `bytes 登记 ${gz.byteLength + 1}，实际 ${gz.byteLength}`,
  )
})

test('Q02 loadFireSprite 按 chunk 派生 catalog 身份读取法术特效', async () => {
  const gz = await effectGzip()
  const assetId = palMagicEffectSpriteAssetId(7)
  const base = effectBase(assetId)
  base.setRecord({
    kind: 'effect-sprite',
    path: 'assets/generated/magic-007.rle',
    mediaType: 'application/vnd.type-pal.rle',
    bytes: gz.byteLength,
    sha256: await sha256Bytes(new Uint8Array(gz)),
    origin: { kind: 'generated' },
  })
  base.setBytes(gz)
  const sprite = await loadFireSprite(base.base, 7)
  expect(sprite.frames).toHaveLength(3)
  expect(sprite.anchorX).toBe(0)
})

test('Q02 tilesFromChunkBytes：非 gzip 拒收带默认与显式标签；合法字节解出帧表', async () => {
  const raw = new TextEncoder().encode('plain').buffer as ArrayBuffer
  await expect(tilesFromChunkBytes(raw)).rejects.toThrow('tileset: canonical .rle 必须带 gzip 头')
  await expect(tilesFromChunkBytes(raw, { label: 'q2-tiles' })).rejects.toThrow(
    'q2-tiles: canonical .rle 必须带 gzip 头',
  )
  const frames = await tilesFromChunkBytes((await gzipSpriteBytes()).slice(0))
  expect([...frames.keys()]).toEqual([0, 1, 2])
  const first: RleFrame | undefined = frames.get(0)
  expect(first?.width).toBe(2)
})

test('Q02 decompressGzip 对无 gzip 魔数的字节原样透传', async () => {
  const plain = new Uint8Array([1, 2, 3, 4, 5])
  const out = await decompressGzip(new Blob([plain]))
  expect([...out]).toEqual([1, 2, 3, 4, 5])
})

test('Q02 compressGzip 接受带偏移的字节视图并只压缩可见区间', async () => {
  const frame = SPRITE_FRAMES[0]
  if (!frame) throw new Error('fixture frame missing')
  const payload = encodeSpriteChunk([frame])
  const padded = new Uint8Array(payload.length + 4)
  padded.set(payload, 4)
  const gz = await compressGzip(padded.subarray(4))
  const round = await decompressGzip(new Blob([gz.slice().buffer as ArrayBuffer]))
  expect([...round]).toEqual([...payload])
})

test('Q02 compressGzip 缺 CompressionStream 端口时 fail-loud', async () => {
  vi.stubGlobal('CompressionStream', undefined)
  try {
    await expect(compressGzip(new Uint8Array([1]))).rejects.toThrow(
      'reforge: CompressionStream 不可用',
    )
  } finally {
    vi.unstubAllGlobals()
  }
})
