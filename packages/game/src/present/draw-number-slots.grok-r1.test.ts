/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G05-C。
 * 不重复 draw-number.test 的右对齐/左对齐/截断/缺帧不抛，
 * 也不重复结算画面已经钉死的一位中对齐。
 */
import { describe, expect, it } from 'vitest'
import type { IndexedImage } from '../assets/png.js'
import { drawNumber } from './draw-number.js'
import { createFramebuffer } from './framebuffer.js'

function filledFrames(): IndexedImage[] {
  return Array.from({ length: 80 }, (_, slot) => ({
    width: 6,
    height: 8,
    indices: new Uint8Array(48).fill(slot),
    opaque: new Uint8Array(48).fill(1),
  }))
}

function frameAt(
  slot: number,
  paint: (indices: Uint8Array, opaque: Uint8Array) => void,
): IndexedImage[] {
  const frames = filledFrames()
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
    })
    drawNumber(fb, 0, 1, { x: 20, y: 10 }, 'yellow', 'left', frames)
    expect(fb.indices[10 * 320 + 20]).toBe(7)
    expect(fb.indices[10 * 320 + 21]).toBe(44)
  })

  it('G05-C02 只点亮最后一行时，像素写在 y+7，首行保持底色', () => {
    const fb = createFramebuffer()
    fb.indices.fill(7)
    const frames = frameAt(19, (indices, opaque) => {
      indices[7 * 6] = 44
      opaque[7 * 6] = 1
    })
    drawNumber(fb, 0, 1, { x: 30, y: 12 }, 'yellow', 'left', frames)
    expect(fb.indices[12 * 320 + 30]).toBe(7)
    expect(fb.indices[19 * 320 + 30]).toBe(44)
  })

  it('G05-C03 个位帧缺失时仍把十位画到左移 6 像素的位置', () => {
    const fb = createFramebuffer()
    const frames = filledFrames()
    delete frames[19]
    drawNumber(fb, 10, 2, { x: 49, y: 14 }, 'yellow', 'left', frames)
    expect(fb.indices[14 * 320 + 49]).toBe(20)
    expect(fb.indices[14 * 320 + 55]).toBe(0)
  })

  it('G05-C04 nLength 为 0 且数字大于 0 时，一个数字像素都不写', () => {
    const fb = createFramebuffer()
    fb.indices.fill(7)
    drawNumber(fb, 5, 0, { x: 49, y: 14 }, 'yellow', 'left', filledFrames())
    let ink = 0
    for (const value of fb.indices) if (value !== 7) ink += 1
    expect(ink).toBe(0)
  })

  it('G05-C05 数字 0 且 nLength 为 0 时，右对齐把这一位画在 pos.x-6', () => {
    const fb = createFramebuffer()
    drawNumber(fb, 0, 0, { x: 49, y: 14 }, 'yellow', 'right', filledFrames())
    expect(fb.indices[14 * 320 + 43]).toBe(19)
    expect(fb.indices[14 * 320 + 49]).toBe(0)
  })
})
