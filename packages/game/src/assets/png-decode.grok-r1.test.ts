/**
 * G02-A：R 通道、3×2 完整平面、缺上下文释放、错误上下文与原始 cause。
 * 通道、透明与高位索引合并到同一完整平面；P10 保留真实消费与释放。
 */
import { describe, expect, it, vi } from 'vitest'
import { encodeRgbaPng } from '../present/__tests__/grok-present/png-rgba.js'
import { decodePngToIndices } from './png.js'

function blobOf(rgba: readonly number[], width: number, height: number): Blob {
  const bytes = encodeRgbaPng(width, height, Uint8Array.from(rgba))
  return new Blob([Buffer.from(bytes)], { type: 'image/png' })
}

describe('G02-A decodePngToIndices 通道与上下文', () => {
  it('G02-A02 3×2 按行保留 R 索引、高位、透明孔与半透明调色板0', async () => {
    const rgba = [
      42, 13, 14, 255, 200, 9, 8, 255, 0, 0, 0, 200, 9, 9, 9, 0, 5, 9, 8, 255, 9, 4, 3, 255,
    ]
    const image = await decodePngToIndices(blobOf(rgba, 3, 2))
    expect(image.width).toBe(3)
    expect(image.height).toBe(2)
    // Canvas 将 alpha=0 的 RGB 归零；非零 alpha 的调色板0仍须不透明。
    expect(Array.from(image.indices)).toEqual([42, 200, 0, 0, 5, 9])
    expect(Array.from(image.opaque)).toEqual([1, 1, 1, 0, 1, 1])
  })

  it('G02-A03 2d 上下文缺失时抛固定错误，并关闭已经创建的 bitmap', async () => {
    const source = blobOf([1, 0, 0, 255, 2, 0, 0, 255], 2, 1)
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

  it('G02-A05 解码失败时把原始异常放在 Error.cause 上', async () => {
    const blob = new Blob([Uint8Array.of(9)], { type: 'image/png' })
    const readBitmap = vi.spyOn(globalThis, 'createImageBitmap')
    try {
      const caught = await decodePngToIndices(blob).then(
        () => null,
        (error: unknown) => error,
      )
      expect(caught).toBeInstanceOf(Error)
      if (!(caught instanceof Error)) throw new Error('expected Error')
      expect(caught.message).toBe(
        'decodePngToIndices: failed to decode PNG blob (1B, type=image/png)',
      )
      expect(readBitmap).toHaveBeenCalledTimes(1)
      expect(readBitmap).toHaveBeenCalledWith(blob)
      const pending = readBitmap.mock.results[0]
      expect(pending?.type).toBe('return')
      if (!pending || pending.type !== 'return') throw new Error('bitmap promise missing')
      const originalFailure = await pending.value.then(
        () => null,
        (error: unknown) => error,
      )
      expect(originalFailure).toBeInstanceOf(Error)
      expect(caught.cause).toBe(originalFailure)
    } finally {
      readBitmap.mockRestore()
    }
  })
})
