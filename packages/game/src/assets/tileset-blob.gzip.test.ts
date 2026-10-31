import { gzipSync } from 'node:zlib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { twoFrameChunk } from '../__tests__/asset-fixtures.js'
import { decompressGzip } from './tileset-blob.js'

const unsupported =
  'tileset-blob: DecompressionStream unsupported in this environment ' +
  '(需要 Chrome 80+/Safari 16.4+/Firefox 113+)。可后续引入 fflate 兜底。'

describe('gzip and raw byte transport', () => {
  it('gzip roundtrip:解压后 == 原始字节', async () => {
    const original = twoFrameChunk()
    const gzipped = gzipSync(original)
    const blob = new Blob([gzipped])
    const decompressed = await decompressGzip(blob)
    expect(Array.from(decompressed)).toEqual(Array.from(original))
  })

  it('空 blob 也支持(边界)', async () => {
    const original = new Uint8Array(0)
    const gzipped = gzipSync(original)
    const blob = new Blob([gzipped])
    const decompressed = await decompressGzip(blob)
    expect(decompressed.byteLength).toBe(0)
  })

  it('Content-Encoding 已解压(无 gzip 魔数)→ 原样返回,不二次解压', async () => {
    // 模拟 nginx/CDN 自动解掉 Content-Encoding 后,fetch 拿到的是裸 chunk 字节(非 gzip)。
    const rawChunk = twoFrameChunk() // 首字节 0x02(小端 count),非 0x1f
    const blob = new Blob([Buffer.from(rawChunk)])
    const out = await decompressGzip(blob)
    expect(Array.from(out)).toEqual(Array.from(rawChunk))
  })
})

describe('gzip signatures and stream ownership', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('只有一个 0x1f 字节时原样返回，不进入解压', async () => {
    const out = await decompressGzip(new Blob([Uint8Array.of(0x1f)]))
    expect(Array.from(out)).toEqual([0x1f])
  })

  it('第二字节不是 0x8b 时，即使首字节是 0x1f 也原样返回', async () => {
    const out = await decompressGzip(new Blob([Uint8Array.of(0x1f, 0x00)]))
    expect(Array.from(out)).toEqual([0x1f, 0x00])
  })

  it('环境没有 DecompressionStream 时明确拒绝 gzip', async () => {
    vi.stubGlobal('DecompressionStream', undefined)
    await expect(decompressGzip(new Blob([gzipSync(Uint8Array.of(1))]))).rejects.toThrow(
      unsupported,
    )
  })

  it('带魔数但主体损坏时拒绝为 TypeError，不误报缺流', async () => {
    const caught = await decompressGzip(new Blob([Uint8Array.of(0x1f, 0x8b, 0x00)])).then(
      () => null,
      (error: unknown) => error,
    )
    expect(caught).toBeInstanceOf(TypeError)
    if (!(caught instanceof TypeError)) throw new Error('expected TypeError')
    expect(caught.message).not.toContain('DecompressionStream unsupported')
  })

  it('解压流分成两段时按偏移拼回 [9, 8, 7]', async () => {
    const SplitGzip = class extends TransformStream<BufferSource, Uint8Array<ArrayBuffer>> {
      constructor(_format: CompressionFormat) {
        super({
          // 该例只控制解压后的分块；原生 gzip 正确性由主测试的字节往返核验。
          transform() {},
          flush(controller) {
            controller.enqueue(Uint8Array.of(9, 8))
            controller.enqueue(Uint8Array.of(7))
          },
        })
      }
    } satisfies typeof DecompressionStream
    vi.stubGlobal('DecompressionStream', SplitGzip)
    expect(Array.from(await decompressGzip(new Blob([gzipSync(Uint8Array.of(1))])))).toEqual([
      9, 8, 7,
    ])
  })
})
