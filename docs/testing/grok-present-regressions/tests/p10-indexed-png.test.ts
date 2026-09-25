import { describe, expect, it } from 'vitest'
import { decodePngToIndices } from '../../../../packages/game/src/assets/png.js'
import { drawSprite, toSpriteImages } from '../../../../packages/game/src/present/draw-sprite.js'
import { createFramebuffer } from '../../../../packages/game/src/present/framebuffer.js'
import { fillSentinel, pixel, SENTINEL } from '../fixtures/images.js'
import { encodeRgbaPng } from '../fixtures/png-rgba.js'

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

describe('P10 PNG消费与释放', () => {
  it('P10 不透明0、透明孔和不同索引经解码后被drawSprite写进Framebuffer', async () => {
    const decoded = await decodePngToIndices(pngBlob())
    expect(decoded.width).toBe(2)
    expect(decoded.height).toBe(2)
    expect(Array.from(decoded.indices)).toEqual([0, 0, 12, 7])
    expect(Array.from(decoded.opaque)).toEqual([1, 0, 1, 1])
    const sprites = toSpriteImages([decoded])
    expect(sprites[0]?.indices).toBe(decoded.indices)
    expect(sprites[0]?.opaque).toBe(decoded.opaque)
    expect(sprites[0]?.anchorX).toBe(1)
    expect(sprites[0]?.anchorY).toBe(2)
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawSprite(fb, sprites[0]!, 10, 20)
    expect(pixel(fb, 9, 18)).toBe(0)
    expect(pixel(fb, 10, 18)).toBe(SENTINEL)
    expect(pixel(fb, 9, 19)).toBe(12)
    expect(pixel(fb, 10, 19)).toBe(7)
  })

  it('P10 解码失败不持有bitmap，getImageData或drawImage失败仍关闭', async () => {
    const probe = installBitmapProbe()
    const originalGetContext = HTMLCanvasElement.prototype.getContext
    const patchContext = (mutate: (ctx: CanvasRenderingContext2D) => void): void => {
      HTMLCanvasElement.prototype.getContext = function getContext(
        this: HTMLCanvasElement,
        type: string,
        options?: unknown,
      ) {
        const ctx = originalGetContext.call(
          this,
          type as '2d',
          options as CanvasRenderingContext2DSettings | undefined,
        )
        if (type === '2d' && ctx && 'getImageData' in ctx) mutate(ctx as CanvasRenderingContext2D)
        return ctx
      } as typeof HTMLCanvasElement.prototype.getContext
    }
    try {
      await expect(
        decodePngToIndices(new Blob([Uint8Array.from([1, 2, 3])], { type: 'image/png' })),
      ).rejects.toThrow(/decodePngToIndices: failed to decode PNG blob/)
      expect(probe.created()).toBe(0)
      expect(probe.closes()).toBe(0)

      patchContext((ctx) => {
        ctx.getImageData = () => {
          throw new Error('injected getImageData failure')
        }
      })
      await expect(decodePngToIndices(pngBlob())).rejects.toThrow('injected getImageData failure')
      expect(probe.created()).toBe(1)
      expect(probe.closes()).toBe(1)

      patchContext((ctx) => {
        ctx.drawImage = () => {
          throw new Error('injected drawImage failure')
        }
      })
      await expect(decodePngToIndices(pngBlob())).rejects.toThrow('injected drawImage failure')
      expect(probe.created()).toBe(2)
      expect(probe.closes()).toBe(2)

      HTMLCanvasElement.prototype.getContext = originalGetContext
      const ok = await decodePngToIndices(pngBlob())
      expect(ok.indices[2]).toBe(12)
      expect(probe.created()).toBe(3)
      expect(probe.closes()).toBe(3)
    } finally {
      HTMLCanvasElement.prototype.getContext = originalGetContext
      probe.restore()
    }
  })
})
