/**
 * TEST-GLM-NEW-G-1 G03：assets 端口错误/缓存失效残差。
 * 旧证（assets.test.ts + 两个 residual）已证 AssetId 唯一链 happy path、sprite 的
 * kind/media/bytes/hash/gzip 门、缓存并发/裁剪、战场背景索引链；本文件只补旧题
 * 未覆盖的臂：
 *   1) loadStandardPalette 结构守卫（非 256 / 非整数 RGB / 缺 cycles，assets.ts:63-77）；
 *   2) loadTilesetAsset record 三门（mediaType / bytes / sha，assets.ts:105-113）；
 *   3) decodeWorldSpriteAssetBytes 的 kind 臂与合法 sha 的非 gzip 字节臂（:155-165）；
 *   4) SpriteAssetCache.get 签名漂移逐出（:246-249）；
 *   5) decompressGzip 缺 DecompressionStream 端口 fail-loud（:597-599）。
 * 端口替身只替外部 IO（record/readBytes/文本），被测解码/校验/缓存全部真实。
 */
import type { AssetCatalogV1, AssetRecordV1 } from '@type-pal/content'
import { encodeSpriteChunk } from '@type-pal/shared'
import { describe, expect, test, vi } from 'vitest'
import { AssetResolver } from './asset-resolver.js'
import type { AssetBase } from './assets.js'
import {
  compressGzip,
  decodeWorldSpriteAssetBytes,
  decompressGzip,
  loadStandardPalette,
  loadTilesetAsset,
  SpriteAssetCache,
} from './assets.js'
import type { FileSource } from './file-source.js'
import { sha256Bytes } from './hash.js'

const PALETTE_JSON = JSON.stringify({
  colors: Array.from({ length: 256 }, (_, v) => [v, v, v]),
  cycles: [],
})

const paletteCatalog: AssetCatalogV1 = {
  version: 1,
  assets: {
    standard: {
      kind: 'color-table',
      path: 'assets/generated/colors.json',
      mediaType: 'application/json',
      bytes: 0,
      sha256: 'a'.repeat(64),
      origin: { kind: 'generated' },
    },
  },
}

/** 真实 AssetResolver + 注入文本的内存 source（与 assets.test.ts 同型，无强转）。 */
function paletteBase(text: string): AssetBase {
  const source: FileSource = {
    readText: async () => text,
    readJson: async <T>() => text as T,
    readBytes: async () => new ArrayBuffer(0),
    urlFor: async (rel: string) => rel,
  }
  return {
    source,
    assetResolver: new AssetResolver(
      'test',
      paletteCatalog,
      { 'visual.standardColorTable': 'standard' },
      source,
    ),
  }
}

/** 最小合法 sprite chunk（1×1 帧 ×N），gzip 后作为正控字节。 */
async function gzipSpriteChunk(frames = 1): Promise<Uint8Array> {
  const chunk = encodeSpriteChunk(
    Array.from({ length: frames }, () => ({
      width: 1,
      height: 1,
      pixels: new Uint8Array([1]),
      opaque: new Uint8Array([1]),
    })),
  )
  return compressGzip(chunk)
}

function spriteRecord(overrides: Partial<AssetRecordV1>, bytes: Uint8Array): AssetRecordV1 {
  return {
    kind: 'sprite',
    path: 'assets/generated/sprite.rle',
    mediaType: 'application/vnd.type-pal.rle',
    bytes: bytes.byteLength,
    sha256: 'sha-mismatch-placeholder',
    origin: { kind: 'generated' },
    ...overrides,
  }
}

describe('G03 assets 端口错误与缓存失效残差', () => {
  test('loadStandardPalette 结构守卫逐臂 fail-loud；合法对照通过', async () => {
    await expect(loadStandardPalette(paletteBase(PALETTE_JSON))).resolves.toHaveProperty(
      'colors.length',
      256,
    )
    await expect(
      loadStandardPalette(paletteBase(JSON.stringify({ colors: [[0, 0, 0]], cycles: [] }))),
    ).rejects.toThrowError('工程标准色彩必须包含 256 个 RGB 颜色')
    await expect(
      loadStandardPalette(
        paletteBase(
          JSON.stringify({
            colors: Array.from({ length: 255 }, () => [0, 0, 0]).concat([[1.5, 0, 0]]),
            cycles: [],
          }),
        ),
      ),
    ).rejects.toThrowError('工程标准色彩第 255 项不是合法 RGB')
    await expect(
      loadStandardPalette(
        paletteBase(JSON.stringify({ colors: Array.from({ length: 256 }, () => [0, 0, 0]) })),
      ),
    ).rejects.toThrowError('工程标准色彩缺 cycles 数组')
    await expect(loadStandardPalette(paletteBase('{not json'))).rejects.toThrowError(
      /工程标准色彩 JSON 非法/,
    )
  })

  test('loadTilesetAsset record 三门：mediaType / bytes / sha 逐臂精确拒绝', async () => {
    const bytes = await gzipSpriteChunk()
    const goodRecord: AssetRecordV1 = {
      kind: 'tileset',
      path: 'assets/generated/tiles.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: bytes.byteLength,
      sha256: await sha256Bytes(bytes),
      origin: { kind: 'generated' },
    }
    const reader = (record: AssetRecordV1, served: ArrayBuffer) => ({
      record: () => record,
      readBytes: async () => served,
    })
    await expect(
      loadTilesetAsset(reader(goodRecord, bytes.slice().buffer), 'tiles.ok'),
    ).resolves.toBeInstanceOf(Map)
    await expect(
      loadTilesetAsset(
        reader({ ...goodRecord, mediaType: 'application/json' }, bytes.slice().buffer),
        'tiles.media',
      ),
    ).rejects.toThrowError('tileset AssetId "tiles.media": mediaType 非法 application/json')
    await expect(
      loadTilesetAsset(
        reader({ ...goodRecord, bytes: bytes.byteLength + 1 }, bytes.slice().buffer),
        'tiles.bytes',
      ),
    ).rejects.toThrowError(
      `tileset AssetId "tiles.bytes": bytes 登记 ${bytes.byteLength + 1}，实际 ${bytes.byteLength}`,
    )
    await expect(
      loadTilesetAsset(
        reader({ ...goodRecord, sha256: '0'.repeat(64) }, bytes.slice().buffer),
        'tiles.sha',
      ),
    ).rejects.toThrowError('tileset AssetId "tiles.sha": sha256 不符')
  })

  test('decodeWorldSpriteAssetBytes：kind 臂与合法 sha 的非 gzip 字节臂 fail-loud', async () => {
    const bytes = await gzipSpriteChunk()
    const sha = await sha256Bytes(bytes)
    await expect(
      decodeWorldSpriteAssetBytes(
        spriteRecord({ kind: 'battle-sprite', sha256: sha }, bytes),
        bytes.slice().buffer,
        'probe.kind',
      ),
    ).rejects.toThrowError('probe.kind: 期望 kind=sprite，实际 battle-sprite')
    const plain = new TextEncoder().encode('definitely not gzip').slice().buffer
    const plainBytes = new Uint8Array(plain)
    await expect(
      decodeWorldSpriteAssetBytes(
        spriteRecord({ sha256: await sha256Bytes(plainBytes) }, plainBytes),
        plain,
        'probe.gzip',
      ),
    ).rejects.toThrowError('probe.gzip: canonical .rle 必须带 gzip 头')
  })

  test('SpriteAssetCache.get 签名漂移：逐出并返回 undefined，重读不复活旧值', async () => {
    const bytes = await gzipSpriteChunk()
    const sha = await sha256Bytes(bytes)
    let record: AssetRecordV1 = spriteRecord({ sha256: sha }, bytes)
    let reads = 0
    const reader = {
      record: () => structuredClone(record),
      readBytes: async () => {
        reads += 1
        return bytes.slice().buffer
      },
    }
    const cache = new SpriteAssetCache(4)
    const loaded = await cache.load(reader, 'sprite.drift')
    expect(loaded.frames.length).toBe(1)
    expect(cache.get(reader, 'sprite.drift')).toBe(loaded)
    // 单点变异 catalog 签名（path 漂移；sha/bytes 与真实字节保持一致）→
    // get 必须逐出并返回 undefined，且重读可重新落缓存。
    record = spriteRecord({ sha256: sha, path: 'assets/generated/sprite-v2.rle' }, bytes)
    expect(cache.get(reader, 'sprite.drift')).toBeUndefined()
    // 逐出后 load 重新走真实读取路径（读数 +1），并以新签名落缓存。
    const reloaded = await cache.load(reader, 'sprite.drift')
    expect(reads).toBe(2)
    expect(cache.get(reader, 'sprite.drift')).toBe(reloaded)
  })

  test('decompressGzip 缺 DecompressionStream 端口时 fail-loud（gzip 头字节进入解压臂）', async () => {
    const bytes = await gzipSpriteChunk()
    vi.stubGlobal('DecompressionStream', undefined)
    try {
      await expect(decompressGzip(new Blob([bytes.slice().buffer]))).rejects.toThrowError(
        'reforge: DecompressionStream 不可用',
      )
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
