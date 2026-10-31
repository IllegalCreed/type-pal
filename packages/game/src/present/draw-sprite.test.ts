import { describe, expect, it } from 'vitest'
import type { SpriteImage } from './draw-sprite.js'
import { drawSprite, toSpriteImages } from './draw-sprite.js'
import { createFramebuffer } from './framebuffer.js'

describe('per-frame sprite anchors', () => {
  const emptyFrame = (w: number, h: number) => ({
    width: w,
    height: h,
    indices: new Uint8Array(w * h),
    opaque: new Uint8Array(w * h),
  })

  it('每帧 anchorY = 自身高度,anchorX = 自身宽度/2(非整组钉死 frame0)', () => {
    // chunk193 爬行精灵真实高度剖面:frame0=31,爬帧 frame3..6=54/56/65/73
    const sprites = toSpriteImages([
      emptyFrame(45, 31),
      emptyFrame(45, 63),
      emptyFrame(45, 41),
      emptyFrame(45, 54),
      emptyFrame(45, 56),
      emptyFrame(45, 65),
      emptyFrame(45, 73),
    ])
    expect(sprites[0]!.anchorY).toBe(31)
    expect(sprites[6]!.anchorY).toBe(73) // ← bug 时会是 31(frame0),脚底下溢 42px
    expect(sprites[5]!.anchorY).toBe(65)
    expect(sprites.map((s) => s.anchorX)).toEqual([22, 22, 22, 22, 22, 22, 22])
  })

  it('脚底对齐:任意高度帧在 drawSprite(cy) 处底边都落在同一行(sdlpal PAL_RLEGetHeight 逐帧)', () => {
    // anchorY=height → 底边 = cy - anchorY + (height-1) = cy - 1,与帧高无关
    const cy = 100
    for (const h of [31, 54, 73]) {
      const fb = createFramebuffer()
      const s = toSpriteImages([emptyFrame(2, h)])[0]!
      s.opaque.fill(1)
      s.indices.fill(7)
      drawSprite(fb, s, 10, cy)
      const bottomRow = cy - 1 // 底边像素行
      expect(fb.indices[bottomRow * 320 + (10 - 1)]).toBe(7)
      // 底边再往下一行必须空(没有向下溢出)
      expect(fb.indices[(bottomRow + 1) * 320 + (10 - 1)]).toBe(0)
    }
  })
})

describe('sprite pixels and transparency', () => {
  it('画一个 2×2 精灵,anchor 在底部中心 (1, 2)', () => {
    const fb = createFramebuffer()
    const indices = new Uint8Array([1, 2, 3, 4])
    const opaque = new Uint8Array([1, 1, 1, 1])
    drawSprite(fb, { width: 2, height: 2, indices, opaque, anchorX: 1, anchorY: 2 }, 10, 10)
    expect(fb.indices[8 * 320 + 9]).toBe(1)
    expect(fb.indices[8 * 320 + 10]).toBe(2)
    expect(fb.indices[9 * 320 + 9]).toBe(3)
    expect(fb.indices[9 * 320 + 10]).toBe(4)
  })

  it('opaque=0 不覆盖底面(M3.5 fix:透明判定走 opaque mask,非 idx===0)', () => {
    const fb = createFramebuffer()
    fb.writePixel(10, 10, 99)
    const indices = new Uint8Array([0])
    const opaque = new Uint8Array([0])
    drawSprite(fb, { width: 1, height: 1, indices, opaque, anchorX: 0, anchorY: 0 }, 10, 10)
    expect(fb.indices[10 * 320 + 10]).toBe(99)
  })

  it('opaque=1 且 idx=0 仍画(palette index 0 是合法 opaque 像素,M3.5 fix)', () => {
    const fb = createFramebuffer()
    fb.writePixel(10, 10, 99)
    const indices = new Uint8Array([0])
    const opaque = new Uint8Array([1])
    drawSprite(fb, { width: 1, height: 1, indices, opaque, anchorX: 0, anchorY: 0 }, 10, 10)
    expect(fb.indices[10 * 320 + 10]).toBe(0)
  })

  it('左上角跨界时仍写入屏内的右下像素', () => {
    const fb = createFramebuffer()
    const indices = new Uint8Array(4).fill(5)
    const opaque = new Uint8Array(4).fill(1)
    drawSprite(fb, { width: 2, height: 2, indices, opaque, anchorX: 0, anchorY: 0 }, -1, -1)
    expect(fb.indices[0]).toBe(5)
    expect(fb.indices[1]).toBe(0)
  })
})

function pixelFrame(width: number, height: number, pixels: number[], mask?: number[]) {
  return {
    width,
    height,
    indices: Uint8Array.from(pixels),
    opaque: Uint8Array.from(mask ?? pixels.map(() => 1)),
  }
}

function topLeftSprite(
  width: number,
  height: number,
  pixels: number[],
  mask?: number[],
): SpriteImage {
  return { ...pixelFrame(width, height, pixels, mask), anchorX: 0, anchorY: 0 }
}

describe('sprite frame ownership and edge clipping', () => {
  it('宽 1 的帧 anchorX 为 0，不跟相邻更宽的帧', () => {
    const images = toSpriteImages([pixelFrame(1, 2, [4, 5]), pixelFrame(6, 2, Array(12).fill(1))])
    expect(images[0]?.anchorX).toBe(0)
    expect(images[1]?.anchorX).toBe(3)
    expect(images[0]?.anchorY).toBe(2)
  })

  it('toSpriteImages 复用调用方的 indices 与 opaque', () => {
    const source = pixelFrame(2, 1, [1, 2])
    const [image] = toSpriteImages([source])
    expect(image?.indices).toBe(source.indices)
    expect(image?.opaque).toBe(source.opaque)
  })

  it('左缘外的像素不写，紧挨着的屏内像素写入 9', () => {
    const fb = createFramebuffer()
    drawSprite(fb, topLeftSprite(2, 1, [8, 9]), -1, 5)
    expect(fb.indices[5 * 320]).toBe(9)
    expect(fb.indices[5 * 320 + 1]).toBe(0)
  })

  it('顶缘外的像素不写，下一行屏内像素写入 9', () => {
    const fb = createFramebuffer()
    drawSprite(fb, topLeftSprite(1, 2, [8, 9]), 3, -1)
    expect(fb.indices[3]).toBe(9)
    expect(fb.indices[320 + 3]).toBe(0)
  })

  it('右缘只写下 x=319 的像素，调用不抛错', () => {
    const fb = createFramebuffer()
    drawSprite(fb, topLeftSprite(2, 1, [8, 9]), 319, 4)
    expect(fb.indices[4 * 320 + 319]).toBe(8)
  })

  it('底缘只写下 y=199 的像素，不绕回首行', () => {
    const fb = createFramebuffer()
    drawSprite(fb, topLeftSprite(1, 2, [8, 9]), 3, 199)
    expect(fb.indices[199 * 320 + 3]).toBe(8)
    expect(fb.indices[3]).toBe(0)
  })

  it('中间透明孔不挡住右侧不透明像素', () => {
    const fb = createFramebuffer()
    fb.writePixel(11, 7, 4)
    drawSprite(fb, topLeftSprite(3, 1, [1, 2, 3], [1, 0, 1]), 10, 7)
    expect(fb.indices[7 * 320 + 10]).toBe(1)
    expect(fb.indices[7 * 320 + 11]).toBe(4)
    expect(fb.indices[7 * 320 + 12]).toBe(3)
  })
})
