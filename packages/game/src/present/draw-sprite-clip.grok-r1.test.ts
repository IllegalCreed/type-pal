/**
 * G03-B。旧 draw-sprite 测了偶数宽锚点、2×2 落点和整像素透明。
 * 本组补奇数宽、缓冲区归属，以及跨出屏幕时仍写下屏内像素。
 */
import { describe, expect, it } from 'vitest'
import { drawSprite, type SpriteImage, toSpriteImages } from './draw-sprite.js'
import { createFramebuffer } from './framebuffer.js'

function frame(width: number, height: number, pixels: number[], mask?: number[]) {
  return {
    width,
    height,
    indices: Uint8Array.from(pixels),
    opaque: Uint8Array.from(mask ?? pixels.map(() => 1)),
  }
}

function sprite(width: number, height: number, pixels: number[], mask?: number[]): SpriteImage {
  return { ...frame(width, height, pixels, mask), anchorX: 0, anchorY: 0 }
}

describe('G03-B drawSprite 锚点与裁剪', () => {
  it('G03-B01 宽 7 高 4 的帧 anchorX 为 3，anchorY 为自身高度 4', () => {
    const [image] = toSpriteImages([frame(7, 4, Array(28).fill(1))])
    expect(image?.anchorX).toBe(3)
    expect(image?.anchorY).toBe(4)
  })

  it('G03-B02 宽 1 的帧 anchorX 为 0，不跟相邻更宽的帧', () => {
    const images = toSpriteImages([frame(1, 2, [4, 5]), frame(6, 2, Array(12).fill(1))])
    expect(images[0]?.anchorX).toBe(0)
    expect(images[1]?.anchorX).toBe(3)
    expect(images[0]?.anchorY).toBe(2)
  })

  it('G03-B03 toSpriteImages 复用调用方的 indices 与 opaque', () => {
    const source = frame(2, 1, [1, 2])
    const [image] = toSpriteImages([source])
    expect(image?.indices).toBe(source.indices)
    expect(image?.opaque).toBe(source.opaque)
  })

  it('G03-B04 左缘外的像素不写，紧挨着的屏内像素写入 9', () => {
    const fb = createFramebuffer()
    drawSprite(fb, sprite(2, 1, [8, 9]), -1, 5)
    expect(fb.indices[5 * 320]).toBe(9)
    expect(fb.indices[5 * 320 + 1]).toBe(0)
  })

  it('G03-B05 顶缘外的像素不写，下一行屏内像素写入 9', () => {
    const fb = createFramebuffer()
    drawSprite(fb, sprite(1, 2, [8, 9]), 3, -1)
    expect(fb.indices[3]).toBe(9)
    expect(fb.indices[320 + 3]).toBe(0)
  })

  it('G03-B06 右缘只写下 x=319 的像素，调用不抛错', () => {
    const fb = createFramebuffer()
    drawSprite(fb, sprite(2, 1, [8, 9]), 319, 4)
    expect(fb.indices[4 * 320 + 319]).toBe(8)
  })

  it('G03-B07 3×1 按行序写入 11、12、13', () => {
    const fb = createFramebuffer()
    drawSprite(fb, sprite(3, 1, [11, 12, 13]), 10, 7)
    expect(fb.indices[7 * 320 + 10]).toBe(11)
    expect(fb.indices[7 * 320 + 11]).toBe(12)
    expect(fb.indices[7 * 320 + 12]).toBe(13)
  })

  it('G03-B08 中间透明孔不挡住右侧不透明像素', () => {
    const fb = createFramebuffer()
    fb.writePixel(11, 7, 4)
    drawSprite(fb, sprite(3, 1, [1, 2, 3], [1, 0, 1]), 10, 7)
    expect(fb.indices[7 * 320 + 10]).toBe(1)
    expect(fb.indices[7 * 320 + 11]).toBe(4)
    expect(fb.indices[7 * 320 + 12]).toBe(3)
  })
})
