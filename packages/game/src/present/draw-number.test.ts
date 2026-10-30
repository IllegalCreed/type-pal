import { describe, expect, it } from 'vitest'
import { createDigitFrames } from './__tests__/digit-frames.js'
import { drawNumber } from './draw-number.js'
import { createFramebuffer, type Framebuffer } from './framebuffer.js'

/** 期望矩形位置由每例给出；不重算 drawNumber 的对齐或取位公式。 */
function expectDigits(fb: Framebuffer, digits: { x: number; y: number; index: number }[]): void {
  const expected = Buffer.alloc(fb.width * fb.height)
  for (const { x, y, index } of digits) {
    for (let row = y; row < y + 8; row++)
      expected.fill(index, row * fb.width + x, row * fb.width + x + 6)
  }
  expect(Buffer.compare(fb.indices, expected)).toBe(0)
}

describe('drawNumber — sdlpal ui.c:640-732 PAL_DrawNumber port', () => {
  it('num=0,nLength=6,right-align 到 (49, 14) — 1 个 0 digit 在 (79, 14)', () => {
    const fb = createFramebuffer()
    drawNumber(fb, 0, 6, { x: 49, y: 14 }, 'yellow', 'right', createDigitFrames())
    expectDigits(fb, [{ x: 79, y: 14, index: 19 }])
  })

  it('num=123,nLength=6,right-align — 3 digits 末位 3 在 (79, 14),2 在 (73, 14),1 在 (67, 14)', () => {
    const fb = createFramebuffer()
    drawNumber(fb, 123, 6, { x: 49, y: 14 }, 'yellow', 'right', createDigitFrames())
    expectDigits(fb, [
      { x: 67, y: 14, index: 20 },
      { x: 73, y: 14, index: 21 },
      { x: 79, y: 14, index: 22 },
    ])
  })

  it('blue color → base frame 29', () => {
    const fb = createFramebuffer()
    drawNumber(fb, 5, 1, { x: 100, y: 50 }, 'blue', 'right', createDigitFrames())
    expectDigits(fb, [{ x: 100, y: 50, index: 34 }])
  })

  it('cyan color → base frame 56', () => {
    const fb = createFramebuffer()
    drawNumber(fb, 7, 1, { x: 100, y: 50 }, 'cyan', 'right', createDigitFrames())
    expectDigits(fb, [{ x: 100, y: 50, index: 63 }])
  })

  it('left-align num=42,nLength=6 — digit 起 (49 - 6 + 6*2 = 55) — 2 在 55,4 在 49', () => {
    const fb = createFramebuffer()
    drawNumber(fb, 42, 6, { x: 49, y: 14 }, 'yellow', 'left', createDigitFrames())
    expectDigits(fb, [
      { x: 49, y: 14, index: 23 },
      { x: 55, y: 14, index: 21 },
    ])
  })

  it('mid-align num=42,nLength=6：两位居中于六位槽，首位在 61，末位在 67', () => {
    const fb = createFramebuffer()
    drawNumber(fb, 42, 6, { x: 49, y: 14 }, 'yellow', 'mid', createDigitFrames())
    expectDigits(fb, [
      { x: 61, y: 14, index: 23 },
      { x: 67, y: 14, index: 21 },
    ])
  })

  it('num 超过 nLength → truncate(actualLength = nLength)', () => {
    const fb = createFramebuffer()
    // num=12345,nLength=3 → 只画 3 位最低位 345
    drawNumber(fb, 12345, 3, { x: 49, y: 14 }, 'yellow', 'right', createDigitFrames())
    expectDigits(fb, [
      { x: 49, y: 14, index: 22 },
      { x: 55, y: 14, index: 23 },
      { x: 61, y: 14, index: 24 },
    ])
  })

  it('uiSpriteFrames 缺失对应 base+digit 时跳过 blit 不抛', () => {
    const fb = createFramebuffer()
    const empty: ReturnType<typeof createDigitFrames> = []
    expect(() => drawNumber(fb, 0, 1, { x: 49, y: 14 }, 'yellow', 'right', empty)).not.toThrow()
    // fb 应全 0
    expect(fb.indices.every((v) => v === 0)).toBe(true)
  })
})
