/**
 * G02-A。旧 png.test 只在 G=B=0 时取 R。L23 覆盖 alpha 0 与 200，以及坏 blob 的前缀正则。
 * P10 已覆盖 2×2 行序、失败与成功时的 bitmap.close。本组不重复这些断言。
 */
import { describe, expect, it } from 'vitest'
import { indexedPng } from '../__tests__/grok-render-r1/legal-host.js'
import { decodePngToIndices } from './png.js'

async function blobOf(rgba: readonly number[], width: number, height: number): Promise<Blob> {
  const bytes = await indexedPng(width, height, rgba)
  return new Blob([bytes.slice()], { type: 'image/png' })
}

describe('G02-A decodePngToIndices 通道与上下文', () => {
  it('G02-A01 不透明像素的 G 与 B 非零时，索引仍只取 R', async () => {
    const image = await decodePngToIndices(await blobOf([5, 9, 8, 255], 1, 1))
    expect(image.width).toBe(1)
    expect(image.height).toBe(1)
    expect(Array.from(image.indices)).toEqual([5])
    expect(Array.from(image.opaque)).toEqual([1])
  })

  it('G02-A02 3×2 图的末像素落在下标 5，宽高不是写死的 2×1', async () => {
    const rgba = [
      1, 0, 0, 255, 1, 0, 0, 255, 1, 0, 0, 255, 1, 0, 0, 255, 1, 0, 0, 255, 9, 0, 0, 255,
    ]
    const image = await decodePngToIndices(await blobOf(rgba, 3, 2))
    expect(image.width).toBe(3)
    expect(image.height).toBe(2)
    expect(image.indices).toHaveLength(6)
    expect(image.indices[5]).toBe(9)
    expect(image.opaque[5]).toBe(1)
  })

  it('G02-A03 2d 上下文缺失时抛固定错误，并关闭已经创建的 bitmap', async () => {
    const source = await blobOf([1, 0, 0, 255, 2, 0, 0, 255], 2, 1)
    const originalBitmap = globalThis.createImageBitmap
    const originalGetContext = HTMLCanvasElement.prototype.getContext
    let closes = 0
    globalThis.createImageBitmap = async (input) => {
      const bitmap = await originalBitmap(input)
      const originalClose = bitmap.close.bind(bitmap)
      bitmap.close = () => {
        closes += 1
        originalClose()
      }
      return bitmap
    }
    HTMLCanvasElement.prototype.getContext = () => null
    try {
      await expect(decodePngToIndices(source)).rejects.toThrow(
        'decodePngToIndices: 2d context unavailable',
      )
      expect(closes).toBe(1)
    } finally {
      globalThis.createImageBitmap = originalBitmap
      HTMLCanvasElement.prototype.getContext = originalGetContext
    }
  })

  it('G02-A04 4 字节坏 blob 的错误同时带上字节数和 MIME 类型', async () => {
    const blob = new Blob([Uint8Array.of(1, 2, 3, 4)], { type: 'image/png' })
    await expect(decodePngToIndices(blob)).rejects.toThrow(
      'decodePngToIndices: failed to decode PNG blob (4B, type=image/png)',
    )
  })

  it('G02-A05 解码失败时把原始异常放在 Error.cause 上', async () => {
    const blob = new Blob([Uint8Array.of(9)], { type: 'image/png' })
    const caught = await decodePngToIndices(blob).then(
      () => null,
      (error: unknown) => error,
    )
    expect(caught).toBeInstanceOf(Error)
    if (!(caught instanceof Error)) throw new Error('expected Error')
    expect(caught.message).toBe(
      'decodePngToIndices: failed to decode PNG blob (1B, type=image/png)',
    )
    expect(caught.cause).toBeInstanceOf(Error)
  })
})
