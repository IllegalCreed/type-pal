import { describe, it, expect } from 'vitest'
import { createFramebuffer } from './framebuffer.js'
import { drawSprite } from './draw-sprite.js'

describe('drawSprite', () => {
  it('画一个 2×2 精灵,anchor 在底部中心 (1, 2)', () => {
    const fb = createFramebuffer()
    const indices = new Uint8Array([1, 2, 3, 4])
    drawSprite(fb, { width: 2, height: 2, indices, anchorX: 1, anchorY: 2 }, 10, 10)
    expect(fb.indices[8 * 320 + 9]).toBe(1)
    expect(fb.indices[8 * 320 + 10]).toBe(2)
    expect(fb.indices[9 * 320 + 9]).toBe(3)
  })

  it('索引 0 不覆盖底面', () => {
    const fb = createFramebuffer()
    fb.writePixel(10, 10, 99)
    const indices = new Uint8Array([0])
    drawSprite(fb, { width: 1, height: 1, indices, anchorX: 0, anchorY: 0 }, 10, 10)
    expect(fb.indices[10 * 320 + 10]).toBe(99)
  })

  it('屏幕外像素不抛错', () => {
    const fb = createFramebuffer()
    const indices = new Uint8Array(4).fill(5)
    const ok = () => drawSprite(fb, { width: 2, height: 2, indices, anchorX: 0, anchorY: 0 }, -1, -1)
    expect(ok).not.toThrow()
  })
})
