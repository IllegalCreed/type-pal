/** PNG palette conversion, bitmap ownership and real sprite consumption; hand-encoded input stays independent of canvas. */
import { describe, expect, it, vi } from 'vitest'
import { encodeRgbaPng } from '../__tests__/rgba-png.js'
import { fillSentinel, pixel, SENTINEL } from '../present/__tests__/raster-fixtures.js'
import { cloneInputs } from '../present/__tests__/render-input-snapshots.js'
import { drawSprite, toSpriteImages } from '../present/draw-sprite.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { decodePngToIndices } from './png.js'

function blobOf(rgba: readonly number[], width: number, height: number): Blob {
  const bytes = encodeRgbaPng(width, height, Uint8Array.from(rgba))
  return new Blob([Buffer.from(bytes)], { type: 'image/png' })
}

describe('PNG palette-index conversion and decode failure', () => {
  it('3×2 按行保留 R 索引、高位、透明孔与半透明调色板0', async () => {
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

  it('2d 上下文缺失时抛固定错误，并关闭已经创建的 bitmap', async () => {
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

  it('解码失败时把原始异常放在 Error.cause 上', async () => {
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

const RGBA = Uint8Array.from([0, 0, 0, 255, 9, 0, 0, 0, 12, 12, 12, 255, 7, 7, 7, 255])

function pngBlob(): Blob {
  return new Blob([Buffer.from(encodeRgbaPng(2, 2, RGBA))], { type: 'image/png' })
}

function installBitmapProbe(): {
  created: () => number
  closes: () => number
  restore: () => void
} {
  const original = globalThis.createImageBitmap
  let created = 0
  let closes = 0
  globalThis.createImageBitmap = async (source: ImageBitmapSource) => {
    const bitmap = await original(source)
    created += 1
    const originalClose = bitmap.close.bind(bitmap)
    bitmap.close = () => {
      closes += 1
      originalClose()
    }
    return bitmap
  }
  return {
    created: () => created,
    closes: () => closes,
    restore: () => {
      globalThis.createImageBitmap = original
    },
  }
}

async function withBitmapProbe(
  check: (probe: ReturnType<typeof installBitmapProbe>) => Promise<void>,
  fault?: { method: 'getImageData' | 'drawImage'; error: Error },
): Promise<void> {
  const probe = installBitmapProbe()
  let restoreContext: (() => void) | undefined
  try {
    if (fault) {
      const originalGetContext = HTMLCanvasElement.prototype.getContext
      const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
      restoreContext = () => context.mockRestore()
      context.mockImplementation(function getContext(
        this: HTMLCanvasElement,
        type: string,
        options?: unknown,
      ) {
        const ctx = originalGetContext.call(this, type, options)
        if (type === '2d' && ctx && 'getImageData' in ctx) {
          ctx[fault.method] = () => {
            throw fault.error
          }
        }
        return ctx
      })
    }
    await check(probe)
  } finally {
    try {
      restoreContext?.()
    } finally {
      probe.restore()
    }
  }
}

describe('decoded PNG consumer and bitmap cleanup', () => {
  it('不透明0、透明孔和不同索引经解码后被drawSprite写进Framebuffer', async () => {
    await withBitmapProbe(async (probe) => {
      const decoded = await decodePngToIndices(pngBlob())
      expect(decoded.width).toBe(2)
      expect(decoded.height).toBe(2)
      expect(Array.from(decoded.indices)).toEqual([0, 0, 12, 7])
      expect(Array.from(decoded.opaque)).toEqual([1, 0, 1, 1])
      expect(probe.created()).toBe(1)
      expect(probe.closes()).toBe(1)
      const sprites = toSpriteImages([decoded])
      expect(sprites[0]?.indices).toBe(decoded.indices)
      expect(sprites[0]?.opaque).toBe(decoded.opaque)
      expect(sprites[0]?.anchorX).toBe(1)
      expect(sprites[0]?.anchorY).toBe(2)
      const fb = createFramebuffer()
      fillSentinel(fb)
      const before = cloneInputs({ bitmap: decoded })
      drawSprite(fb, sprites[0]!, 10, 20)
      expect(cloneInputs({ bitmap: decoded })).toEqual(before)
      expect(sprites[0]?.indices).toBe(decoded.indices)
      expect(pixel(fb, 9, 18)).toBe(0)
      expect(pixel(fb, 10, 18)).toBe(SENTINEL)
      expect(pixel(fb, 9, 19)).toBe(12)
      expect(pixel(fb, 10, 19)).toBe(7)
    })
  })

  it('getImageData失败仍关闭本次bitmap', async () => {
    const error = new Error('injected getImageData failure')
    await withBitmapProbe(
      async (probe) => {
        await expect(decodePngToIndices(pngBlob())).rejects.toThrow(error.message)
        expect(probe.created()).toBe(1)
        expect(probe.closes()).toBe(1)
      },
      { method: 'getImageData', error },
    )
  })

  it('drawImage失败仍关闭本次bitmap', async () => {
    const error = new Error('injected drawImage failure')
    await withBitmapProbe(
      async (probe) => {
        await expect(decodePngToIndices(pngBlob())).rejects.toThrow(error.message)
        expect(probe.created()).toBe(1)
        expect(probe.closes()).toBe(1)
      },
      { method: 'drawImage', error },
    )
  })
})
