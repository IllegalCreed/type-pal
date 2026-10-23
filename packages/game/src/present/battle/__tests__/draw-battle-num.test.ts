import { describe, expect, it } from 'vitest'
import { createDigitFrames } from '../../__tests__/digit-frames.js'
import { createFramebuffer } from '../../framebuffer.js'
import { FloatingNumsLayer } from '../draw-battle-num.js'

describe('FloatingNumsLayer', () => {
  it('缺 uiSpriteFrames → 不写像素(防御)', () => {
    const layer = new FloatingNumsLayer()
    const fb = createFramebuffer()
    fb.indices.fill(77)
    layer.emit({ x: 100, y: 50, value: 25, color: 'yellow', currentFrame: 0 })
    layer.draw(fb, 0)
    expect(fb.indices.every((value) => value === 77)).toBe(true)
    expect(layer.count).toBe(1)
    // 缺图不延长寿命；资源补齐后也不能重新出现已过期条目。
    layer.draw(fb, 11)
    expect(layer.count).toBe(0)
    layer.draw(fb, 12, createDigitFrames())
    expect(fb.indices.every((value) => value === 77)).toBe(true)
  })

  it('寿命 11 帧:age 0..10 显示,age=11 清除(sdlpal uibattle.c:1753)', () => {
    const layer = new FloatingNumsLayer()
    layer.emit({ x: 100, y: 50, value: 25, color: 'yellow', currentFrame: 0 })
    const positions = [
      [0, 50],
      [1, 49],
      [5, 45],
      [10, 40],
    ] as const
    for (const [frame, y] of positions) {
      const fb = createFramebuffer()
      layer.draw(fb, frame, createDigitFrames())
      const expected = Buffer.alloc(320 * 200)
      for (let row = y; row < y + 8; row++) {
        expected.fill(21, row * 320 + 118, row * 320 + 124)
        expected.fill(24, row * 320 + 124, row * 320 + 130)
      }
      expect(Buffer.compare(fb.indices, expected)).toBe(0)
      expect(layer.count).toBe(1)
    }
    const expired = createFramebuffer()
    layer.draw(expired, 11, createDigitFrames())
    expect(layer.count).toBe(0)
    expect(expired.indices.every((value) => value === 0)).toBe(true)
  })

  it('clear() 清空', () => {
    const layer = new FloatingNumsLayer()
    layer.emit({ x: 100, y: 50, value: 25, color: 'yellow', currentFrame: 0 })
    layer.emit({ x: 200, y: 50, value: 50, color: 'blue', currentFrame: 0 })
    expect(layer.count).toBe(2)
    layer.clear()
    expect(layer.count).toBe(0)
    const fb = createFramebuffer()
    layer.draw(fb, 0, createDigitFrames())
    expect(fb.indices.every((value) => value === 0)).toBe(true)
  })

  it('yellow / blue / cyan 选不同 base frame(sprite index 区分)', () => {
    const expectedDigits = [
      ['yellow', 21, 24],
      ['blue', 31, 34],
      ['cyan', 58, 61],
    ] as const
    for (const [color, tens, units] of expectedDigits) {
      const layer = new FloatingNumsLayer()
      const fb = createFramebuffer()
      layer.emit({ x: 100, y: 50, value: 25, color, currentFrame: 0 })
      layer.draw(fb, 0, createDigitFrames())
      expect(fb.indices[50 * 320 + 118]).toBe(tens)
      expect(fb.indices[50 * 320 + 124]).toBe(units)
    }
  })
})
