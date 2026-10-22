/**
 * G02-B。旧 tileset-blob 测试已覆盖完整 gzip 往返、空 gzip、首字节 0x02 的裸 chunk、
 * 偶数宽锚点、两份像素数组借用。本组只补魔数两侧、缺 DecompressionStream、分块拼接和奇数宽。
 */
import { gzipSync } from 'node:zlib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IndexedImage } from './png.js'
import { decodeTilesetBlob, decompressGzip, framesToCharacterSprite } from './tileset-blob.js'

const unsupported =
  'tileset-blob: DecompressionStream unsupported in this environment ' +
  '(需要 Chrome 80+/Safari 16.4+/Firefox 113+)。可后续引入 fflate 兜底。'

describe('G02-B gzip 魔数与帧锚点', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })
  it('G02-B01 只有一个 0x1f 字节时原样返回，不进入解压', async () => {
    const out = await decompressGzip(new Blob([Uint8Array.of(0x1f)]))
    expect(Array.from(out)).toEqual([0x1f])
  })

  it('G02-B02 第二字节不是 0x8b 时，即使首字节是 0x1f 也原样返回', async () => {
    const out = await decompressGzip(new Blob([Uint8Array.of(0x1f, 0x00)]))
    expect(Array.from(out)).toEqual([0x1f, 0x00])
  })

  it('G02-B03 环境没有 DecompressionStream 时抛出固定兜底错误', async () => {
    vi.stubGlobal('DecompressionStream', undefined)
    await expect(decompressGzip(new Blob([gzipSync(Uint8Array.of(1))]))).rejects.toThrow(
      unsupported,
    )
  })

  it('G02-B04 带魔数但主体损坏时拒绝为 TypeError，不走缺流兜底文案', async () => {
    const caught = await decompressGzip(new Blob([Uint8Array.of(0x1f, 0x8b, 0x00)])).then(
      () => null,
      (error: unknown) => error,
    )
    expect(caught).toBeInstanceOf(TypeError)
    if (!(caught instanceof TypeError)) throw new Error('expected TypeError')
    expect(caught.message).not.toContain('DecompressionStream unsupported')
  })

  it('G02-B05 解压流分成两段时按偏移拼回 [9, 8, 7]', async () => {
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

  it('G02-B07 首帧宽 7 时 anchorX 为 3，更高的后续帧不改锚点', () => {
    const first: IndexedImage = {
      width: 7,
      height: 4,
      indices: new Uint8Array(28),
      opaque: new Uint8Array(28),
    }
    const later: IndexedImage = {
      width: 2,
      height: 9,
      indices: new Uint8Array(18),
      opaque: new Uint8Array(18),
    }
    const sprite = framesToCharacterSprite([first, later])
    expect(sprite.anchorX).toBe(3)
    expect(sprite.anchorY).toBe(4)
    expect(sprite.frames).toHaveLength(2)
  })

  it('G02-B08 framesToCharacterSprite 保留调用方传入的帧数组引用', () => {
    const frames: IndexedImage[] = [
      { width: 2, height: 2, indices: new Uint8Array(4), opaque: new Uint8Array(4) },
    ]
    expect(framesToCharacterSprite(frames).frames).toBe(frames)
  })

  it('G02-B09 imagecount 为 0 的 chunk 得到空 Map', () => {
    expect(decodeTilesetBlob(Uint8Array.of(0, 0)).size).toBe(0)
  })
})
