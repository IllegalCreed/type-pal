/**
 * TEST-GLM-REFORGE-ASSET-RESOLVER-1：ProjectImageCache 解码生命周期（project-image-cache.ts）。
 * 旧测覆盖：kind 门（.test.ts:34 / lifecycle.test.ts B5）、pending 复用与 decoded 命中零读、
 * readBytes 失败不缓存、完成态 dispose（B6/B7）。未证轴：createImageBitmap 解码失败分支
 * （:56-60）、传给解码器的 Blob 保真（:55 mediaType/字节）、PROJECT_IMAGE_KINDS 四 kind 正面
 * 枚举（:4-9）。在途 dispose 轴见 inflight-dispose 文件，不在此重复。
 */
import type { AssetCatalogV1, AssetKind, AssetRecordV1 } from '@type-pal/content'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { AssetResolver } from './asset-resolver.js'
import type { FileSource } from './file-source.js'
import { ProjectImageCache } from './project-image-cache.js'

interface Bitmap {
  id: number
  closed: boolean
  close(): void
}

interface DecodeHarness {
  cache: ProjectImageCache
  reads: string[]
  blobs: Blob[]
  /** 故障注入：failDecoders(n) 让随后 n 次 createImageBitmap 拒绝；0 = 全修复。 */
  failDecoders: (n: number) => void
}

const imageAsset = (id: string, kind: AssetKind, path: string): [string, AssetRecordV1] => [
  id,
  {
    kind,
    path,
    mediaType: 'image/png',
    bytes: 8,
    sha256: id[0]?.repeat(64) ?? 'a'.repeat(64),
    origin: { kind: 'generated' },
  },
]

const catalogOf = (entries: [string, AssetRecordV1][]): AssetCatalogV1 => ({
  version: 1,
  assets: Object.fromEntries(entries),
})

/** 可控 createImageBitmap 替身：记录 Blob、可注入解码失败；平台边界替身，非业务核心。 */
function harness(catalog: AssetCatalogV1, bytesOf: (path: string) => ArrayBuffer): DecodeHarness {
  const reads: string[] = []
  const blobs: Blob[] = []
  let failures = 0
  let seq = 0
  const source: FileSource = {
    async readText() {
      return ''
    },
    async readJson<T>() {
      return {} as T
    },
    async readBytes(path) {
      reads.push(path)
      return bytesOf(path)
    },
    async urlFor(path) {
      return `blob:${path}`
    },
  }
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async (blob: Blob) => {
      blobs.push(blob)
      if (failures > 0) {
        failures -= 1
        throw new Error('bitmap factory offline')
      }
      const bitmap: Bitmap = {
        id: ++seq,
        closed: false,
        close() {
          bitmap.closed = true
        },
      }
      return bitmap
    }),
  )
  const resolver = new AssetResolver('decode-proj', catalog, {}, source)
  return {
    cache: new ProjectImageCache(resolver),
    reads,
    blobs,
    failDecoders: (n) => {
      failures = n
    },
  }
}

const fixedBytes = (): ArrayBuffer => Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]).buffer

afterEach(() => vi.unstubAllGlobals())

describe('ProjectImageCache 解码生命周期', () => {
  test('解码失败：消息含工程/asset/底层原因；失败不缓存，修复后重试成功（重读+重解码双见证）', async () => {
    const h = harness(
      catalogOf([imageAsset('portrait.a', 'portrait', 'assets/generated/pa.png')]),
      fixedBytes,
    )
    h.failDecoders(1)
    const error = (await h.cache.load('portrait.a', 'portrait').catch((e: unknown) => e)) as Error
    expect(error).toBeInstanceOf(Error)
    // project-image-cache.ts:56-60 解码失败分支（区别于 readBytes 失败的 B6 已证轴）
    expect(error.message).toContain('decode-proj')
    expect(error.message).toContain('解码 AssetId "portrait.a" 失败')
    expect(error.message).toContain('bitmap factory offline')
    // 失败不被缓存：同实例修复后重试真实重读 + 重解码（重试产出首个位图 id=1）
    const bitmap = (await h.cache.load('portrait.a', 'portrait')) as unknown as Bitmap
    expect(bitmap.id).toBe(1)
    expect(h.reads).toEqual(['assets/generated/pa.png', 'assets/generated/pa.png'])
    expect(h.blobs).toHaveLength(2)
  })

  test('解码输入保真：createImageBitmap 收到的 Blob 携带 catalog mediaType 且字节与 readBytes 相符', async () => {
    const h = harness(
      catalogOf([imageAsset('portrait.a', 'portrait', 'assets/generated/pa.png')]),
      fixedBytes,
    )
    await h.cache.load('portrait.a', 'portrait')
    expect(h.blobs).toHaveLength(1)
    const blob = h.blobs[0]
    if (!blob) throw new Error('decoder 未收到 Blob')
    // project-image-cache.ts:55：Blob type 来自 catalog 登记而非硬编码
    expect(blob.type).toBe('image/png')
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual(
      Array.from(new Uint8Array(fixedBytes())),
    )
  })

  test('登记支持的四种 image kind 全部可经 cache 载入（正面枚举）', async () => {
    const h = harness(
      catalogOf([
        imageAsset('portrait.a', 'portrait', 'assets/generated/k-portrait.png'),
        imageAsset('face.a', 'face', 'assets/generated/k-face.png'),
        imageAsset('icon.a', 'item-icon', 'assets/generated/k-item-icon.png'),
        imageAsset('bg.a', 'battle-background', 'assets/generated/k-battle-bg.png'),
      ]),
      fixedBytes,
    )
    // load() 在 kind 门处同步抛错：逐项收集结果再整体断言，失败落成值断言
    const cases = [
      ['portrait.a', 'portrait'],
      ['face.a', 'face'],
      ['icon.a', 'item-icon'],
      ['bg.a', 'battle-background'],
    ] as const
    const outcomes: Array<[string, string]> = []
    const bitmaps: Bitmap[] = []
    for (const [id, kind] of cases) {
      try {
        bitmaps.push((await h.cache.load(id, kind)) as unknown as Bitmap)
        outcomes.push([id, 'loaded'])
      } catch (error) {
        outcomes.push([id, (error as Error).message])
      }
    }
    expect(outcomes).toEqual(cases.map(([id]) => [id, 'loaded']))
    expect(new Set(bitmaps.map((b) => b.id)).size).toBe(4)
    expect(h.reads).toEqual([
      'assets/generated/k-portrait.png',
      'assets/generated/k-face.png',
      'assets/generated/k-item-icon.png',
      'assets/generated/k-battle-bg.png',
    ])
  })
})
