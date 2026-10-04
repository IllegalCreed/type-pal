/**
 * TEST-GLM-REFORGE-ASSET-RESOLVER-1：ProjectImageCache 在途 dispose（取消/缓存失效轴）。
 * TEST-REFORGE-ASSET-IO-1 r2 明确把「在途 dispose 回填政策」隔离待证；本文件补证：
 * dispose 不取消也不改写在途 promise 的结局；dispose 后、回填前的新 load 不复活已清
 * pending（真重解码）；回填完成后命中同一 bitmap 零新 IO；二次 dispose 关闭回填位图。
 * 早于回填的新 load 会让首个位图失去 close 通道（现行政策，登记交 Codex 复核）。
 */
import type { AssetCatalogV1, AssetRecordV1 } from '@type-pal/content'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { deferred } from './__tests__/glm-runtime-contract-fixtures.js'
import { AssetResolver } from './asset-resolver.js'
import type { FileSource } from './file-source.js'
import { ProjectImageCache } from './project-image-cache.js'

interface Bitmap {
  id: number
  closed: boolean
  close(): void
}

interface DeferredDecode {
  promise: Promise<Bitmap>
  resolve: (bitmap: Bitmap) => void
}

const record: AssetRecordV1 = {
  kind: 'portrait',
  path: 'assets/generated/pa.png',
  mediaType: 'image/png',
  bytes: 8,
  sha256: 'a'.repeat(64),
  origin: { kind: 'generated' },
}

const catalog: AssetCatalogV1 = { version: 1, assets: { 'portrait.a': record } }

/** createImageBitmap 每次调用返回一个手工 deferred，精确控制解码完成时机。 */
function harness(): {
  cache: ProjectImageCache
  reads: string[]
  nextDecode: () => DeferredDecode
} {
  const reads: string[] = []
  const decodes: DeferredDecode[] = []
  const source: FileSource = {
    async readText() {
      return ''
    },
    async readJson<T>() {
      return {} as T
    },
    async readBytes(path) {
      reads.push(path)
      return new ArrayBuffer(8)
    },
    async urlFor(path) {
      return `blob:${path}`
    },
  }
  // 平台边界替身（非业务核心）：vi.stubGlobal 不约束返回类型，无需强转
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(() => {
      const gate = deferred<Bitmap>()
      decodes.push(gate)
      return gate.promise
    }),
  )
  const resolver = new AssetResolver('inflight-proj', catalog, {}, source)
  return {
    cache: new ProjectImageCache(resolver),
    reads,
    nextDecode: () => {
      const gate = decodes.shift()
      if (!gate) throw new Error('没有在途解码')
      return gate
    },
  }
}

const bitmap = (id: number): Bitmap => {
  const value: Bitmap = {
    id,
    closed: false,
    close() {
      value.closed = true
    },
  }
  return value
}

/** load() 先 await readBytes 再调 createImageBitmap；宏任务边界确保解码门已创建。 */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => vi.unstubAllGlobals())

describe('ProjectImageCache 在途 dispose', () => {
  test('dispose 不取消在途；窗口内新 load 真重解码（不复活已清 pending）；二次 dispose 只关闭最后回填位图', async () => {
    const { cache, reads, nextDecode } = harness()
    const first = cache.load('portrait.a', 'portrait')
    await flush()
    const decode1 = nextDecode()
    cache.dispose() // 取消点：解码仍在途
    // 窗口内（回填前）新 load：pending 已被 dispose 清空 → 必须发起第二次真实解码
    const second = cache.load('portrait.a', 'portrait')
    await flush()
    // 重读见证先于取门：若 dispose 未清 pending，这里第二次读取不会发生（AssertionError）
    expect(reads).toEqual(['assets/generated/pa.png', 'assets/generated/pa.png'])
    const decode2 = nextDecode()
    // 在途 promise 不被 dispose 改写：两者照常各自 resolve 出位图
    decode1.resolve(bitmap(1))
    decode2.resolve(bitmap(2))
    const [firstBitmap, secondBitmap] = (await Promise.all([first, second])) as unknown as Bitmap[]
    if (!firstBitmap || !secondBitmap) throw new Error('两次在途 load 均应产出位图')
    expect(firstBitmap.id).toBe(1)
    expect(secondBitmap.id).toBe(2)
    expect(secondBitmap).not.toBe(firstBitmap)
    // dispose 早于两者完成：当时 decoded 为空，两个位图均未被关闭
    expect(firstBitmap.closed).toBe(false)
    expect(secondBitmap.closed).toBe(false)
    // 回填按完成顺序写 decoded：最后完成者占据缓存槽，二次 dispose 只关闭它；
    // 先完成者（bitmap 1）失去 close 通道 —— 现行政策，登记待 Codex 复核
    cache.dispose()
    expect(secondBitmap.closed).toBe(true)
    expect(firstBitmap.closed).toBe(false)
  })

  test('完成回填后命中同一 bitmap（零新 IO）；二次 dispose 关闭回填位图', async () => {
    const { cache, reads, nextDecode } = harness()
    const first = cache.load('portrait.a', 'portrait')
    await flush()
    const decode = nextDecode()
    cache.dispose() // 取消点：解码仍在途
    decode.resolve(bitmap(7))
    const firstBitmap = (await first) as unknown as Bitmap
    expect(firstBitmap.id).toBe(7)
    // 在途完成照常回填 decoded：dispose 后的 load 命中同一 bitmap，不再产生读取
    const secondBitmap = (await cache.load('portrait.a', 'portrait')) as unknown as Bitmap
    expect(secondBitmap).toBe(firstBitmap)
    expect(reads).toEqual(['assets/generated/pa.png'])
    expect(secondBitmap.closed).toBe(false)
    cache.dispose()
    expect(secondBitmap.closed).toBe(true)
  })
})
