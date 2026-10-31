import { describe, expect, it } from 'vitest'
import type { IndexedImage } from '../assets/png.js'
import { createDigitFrames } from './__tests__/digit-frames.js'
import { drawNumber } from './draw-number.js'
import { createFramebuffer, type Framebuffer } from './framebuffer.js'

function digitFramesWithMask(
  slot: number,
  paint: (indices: Uint8Array, opaque: Uint8Array) => void,
): IndexedImage[] {
  const frames = createDigitFrames()
  const indices = new Uint8Array(48)
  const opaque = new Uint8Array(48)
  paint(indices, opaque)
  frames[slot] = { width: 6, height: 8, indices, opaque }
  return frames
}

function expectDigitPixels(
  fb: Framebuffer,
  digits: { x: number; y: number; index: number }[],
): void {
  const expected = Buffer.alloc(fb.width * fb.height)
  for (const { x, y, index } of digits) {
    for (let row = y; row < y + 8; row++)
      expected.fill(index, row * fb.width + x, row * fb.width + x + 6)
  }
  expect(Buffer.compare(fb.indices, expected)).toBe(0)
}

describe('Number sprite layout and mask pixels', () => {
  it('num=0,nLength=6,right-align 到 (49, 14) — 1 个 0 digit 在 (79, 14)', () => {
    const fb = createFramebuffer()
    drawNumber(fb, 0, 6, { x: 49, y: 14 }, 'yellow', 'right', createDigitFrames())
    expectDigitPixels(fb, [{ x: 79, y: 14, index: 19 }])
  })

  it('num=123,nLength=6,right-align — 3 digits 末位 3 在 (79, 14),2 在 (73, 14),1 在 (67, 14)', () => {
    const fb = createFramebuffer()
    drawNumber(fb, 123, 6, { x: 49, y: 14 }, 'yellow', 'right', createDigitFrames())
    expectDigitPixels(fb, [
      { x: 67, y: 14, index: 20 },
      { x: 73, y: 14, index: 21 },
      { x: 79, y: 14, index: 22 },
    ])
  })

  it('blue color → base frame 29', () => {
    const fb = createFramebuffer()
    drawNumber(fb, 5, 1, { x: 100, y: 50 }, 'blue', 'right', createDigitFrames())
    expectDigitPixels(fb, [{ x: 100, y: 50, index: 34 }])
  })

  it('cyan color → base frame 56', () => {
    const fb = createFramebuffer()
    drawNumber(fb, 7, 1, { x: 100, y: 50 }, 'cyan', 'right', createDigitFrames())
    expectDigitPixels(fb, [{ x: 100, y: 50, index: 63 }])
  })

  it('left-align num=42,nLength=6 — digit 起 (49 - 6 + 6*2 = 55) — 2 在 55,4 在 49', () => {
    const fb = createFramebuffer()
    drawNumber(fb, 42, 6, { x: 49, y: 14 }, 'yellow', 'left', createDigitFrames())
    expectDigitPixels(fb, [
      { x: 49, y: 14, index: 23 },
      { x: 55, y: 14, index: 21 },
    ])
  })

  it('mid-align num=42,nLength=6：两位居中于六位槽，首位在 61，末位在 67', () => {
    const fb = createFramebuffer()
    drawNumber(fb, 42, 6, { x: 49, y: 14 }, 'yellow', 'mid', createDigitFrames())
    expectDigitPixels(fb, [
      { x: 61, y: 14, index: 23 },
      { x: 67, y: 14, index: 21 },
    ])
  })

  it('num 超过 nLength → truncate(actualLength = nLength)', () => {
    const fb = createFramebuffer()
    // num=12345,nLength=3 → 只画 3 位最低位 345
    drawNumber(fb, 12345, 3, { x: 49, y: 14 }, 'yellow', 'right', createDigitFrames())
    expectDigitPixels(fb, [
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

  it('G05-C01 透明孔保留底色，旁边的不透明点写入精灵索引 44', () => {
    const fb = createFramebuffer()
    fb.indices.fill(7)
    const frames = digitFramesWithMask(19, (indices, opaque) => {
      indices[0] = 99
      opaque[0] = 0
      indices[1] = 44
      opaque[1] = 1
      indices[2] = 0
      opaque[2] = 1
    })
    drawNumber(fb, 0, 1, { x: 20, y: 10 }, 'yellow', 'left', frames)
    const expected = Buffer.alloc(320 * 200, 7)
    expected[10 * 320 + 21] = 44
    expected[10 * 320 + 22] = 0 // 不透明黑色不能被当成透明孔。
    expect(Buffer.compare(fb.indices, expected)).toBe(0)
  })

  it('G05-C02 只点亮最后一行时，像素写在 y+7，首行保持底色', () => {
    const fb = createFramebuffer()
    fb.indices.fill(7)
    const frames = digitFramesWithMask(19, (indices, opaque) => {
      indices[7 * 6] = 44
      opaque[7 * 6] = 1
    })
    drawNumber(fb, 0, 1, { x: 30, y: 12 }, 'yellow', 'left', frames)
    const expected = Buffer.alloc(320 * 200, 7)
    expected[19 * 320 + 30] = 44
    expect(Buffer.compare(fb.indices, expected)).toBe(0)
  })

  it('G05-C03 个位帧缺失时仍把十位画到左移 6 像素的位置', () => {
    const fb = createFramebuffer()
    const frames = createDigitFrames()
    delete frames[19]
    drawNumber(fb, 10, 2, { x: 49, y: 14 }, 'yellow', 'left', frames)
    const expected = Buffer.alloc(320 * 200)
    for (let row = 14; row < 22; row++) expected.fill(20, row * 320 + 49, row * 320 + 55)
    expect(Buffer.compare(fb.indices, expected)).toBe(0)
  })

  it('G05-C04 nLength 为 0 且数字大于 0 时，一个数字像素都不写', () => {
    const fb = createFramebuffer()
    fb.indices.fill(7)
    drawNumber(fb, 5, 0, { x: 49, y: 14 }, 'yellow', 'left', createDigitFrames())
    expect(Buffer.compare(fb.indices, Buffer.alloc(320 * 200, 7))).toBe(0)
  })

  it('G05-C05 数字 0 且 nLength 为 0 时，右对齐把这一位画在 pos.x-6', () => {
    const fb = createFramebuffer()
    drawNumber(fb, 0, 0, { x: 49, y: 14 }, 'yellow', 'right', createDigitFrames())
    const expected = Buffer.alloc(320 * 200)
    for (let row = 14; row < 22; row++) expected.fill(19, row * 320 + 43, row * 320 + 49)
    expect(Buffer.compare(fb.indices, expected)).toBe(0)
  })
})
