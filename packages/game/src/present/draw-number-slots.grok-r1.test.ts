/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G05-C。
 * 不重复 draw-number.test 的右对齐/左对齐/截断/缺帧不抛，
 * 也不重复结算画面已经钉死的一位中对齐。
 */
import { describe, expect, it } from 'vitest'
import type { IndexedImage } from '../assets/png.js'
import { createDigitFrames } from './__tests__/digit-frames.js'
import { drawNumber } from './draw-number.js'
import { createFramebuffer } from './framebuffer.js'

function frameAt(
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

describe('G05-C draw-number 空位与掩码', () => {
  it('G05-C01 透明孔保留底色，旁边的不透明点写入精灵索引 44', () => {
    const fb = createFramebuffer()
    fb.indices.fill(7)
    const frames = frameAt(19, (indices, opaque) => {
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
    const frames = frameAt(19, (indices, opaque) => {
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
