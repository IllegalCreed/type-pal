import { describe, expect, it, vi } from 'vitest'
import { decodePngToIndices } from '../../../assets/png.js'
import { drawSprite, toSpriteImages } from '../../draw-sprite.js'
import { createFramebuffer } from '../../framebuffer.js'
import { fillSentinel, pixel, SENTINEL } from './images.js'
import { encodeRgbaPng } from './png-rgba.js'
import { cloneInputs } from './world.js'

// 透明孔的 R 在这个 canvas 宿主里会被读成 0；孔是否绘制只由 A 决定。
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

describe('P10 PNG消费与释放', () => {
  it('P10 不透明0、透明孔和不同索引经解码后被drawSprite写进Framebuffer', async () => {
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

  it('P10 getImageData失败仍关闭本次bitmap', async () => {
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

  it('P10 drawImage失败仍关闭本次bitmap', async () => {
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
