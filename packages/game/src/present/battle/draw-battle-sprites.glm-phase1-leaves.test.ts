/** 底中锚裁剪的完整像素域；业务姿态与淡出见其它精灵专测，不授宿主全管线信用。 */
import { describe, expect, it } from 'vitest'
import { createFramebuffer, type Framebuffer } from '../framebuffer.js'
import { blitFrame } from './draw-battle-sprites.js'

function solid(w: number, h: number, index: number) {
  const n = w * h
  return {
    width: w,
    height: h,
    indices: new Uint8Array(n).fill(index),
    opaque: new Uint8Array(n).fill(1),
  }
}

function freshFb(): Framebuffer {
  const fb = createFramebuffer()
  fb.indices.fill(0x5a)
  return fb
}

describe('L14 blitFrame 边缘裁剪', () => {
  it('8×8 精灵 anchor 右缘（baseX=316）：右侧 4 列被裁，界内 4 列照写、不抛错', () => {
    const fb = freshFb()
    blitFrame(fb, solid(8, 8, 0x33), 320, 100) // baseX = 320-4 = 316
    // 固定屏幕矩形与所有外围像素，防止越界写串到下一行。
    const expected = new Uint8Array(320 * 200).fill(0x5a)
    for (let y = 92; y < 100; y++) expected.fill(0x33, y * 320 + 316, y * 320 + 320)
    expect(Buffer.compare(fb.indices, expected)).toBe(0)
  })

  it('anchor 完全出右界（baseX=320）：全裁剪无写入', () => {
    const fb = freshFb()
    blitFrame(fb, solid(8, 8, 0x33), 324, 100)
    expect(fb.indices.every((v) => v === 0x5a)).toBe(true)
  })

  it('anchorY 在顶缘（baseY<0）：顶部裁剪，底部行照写；iColorShift 仍应用', () => {
    const fb = freshFb()
    blitFrame(fb, solid(8, 8, 0x03), 160, 4, 6) // baseY = 4-8 = -4
    const expected = new Uint8Array(320 * 200).fill(0x5a)
    for (let y = 0; y < 4; y++) expected.fill(0x09, y * 320 + 156, y * 320 + 164)
    expect(Buffer.compare(fb.indices, expected)).toBe(0)
  })
})
