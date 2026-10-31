import { describe, expect, it } from 'vitest'
import { solidIndexedImage as solidFrame } from '../../__tests__/raster-fixtures.js'
import { createFramebuffer } from '../../framebuffer.js'
import { blitFrame, blitFrameDeathFade } from '../draw-battle-sprites.js'
import { markedFramebuffer, rowFrame } from './battle-sprite-frames.js'

describe('death-fade pixels', () => {
  // 注:像素落点 (12,0) → k=12 → residue 0 → jr=rgIndexInv[0]=0(块内第一个处理,step=0 即生效)。
  it('residue 0 像素:step=0 高 nibble 立即换背景,低 nibble 未移(仍 bLow)', () => {
    const fb = createFramebuffer()
    // 背景 a = 0x57;sprite b = 0x32。1×1 frame anchor (12,1) → 落点 (12,0)
    fb.writePixel(12, 0, 0x57)
    blitFrameDeathFade(fb, rowFrame([0x32]), 12, 1, 0)
    expect(fb.indices[0 * 320 + 12]).toBe(0x52) // high=a&0xF0=0x50;low=bLow(2 未移)
  })

  it('residue 0 像素 step 中途:低 nibble 朝 aLow 逼近 floor((step-jr)/6) 格', () => {
    const fb = createFramebuffer()
    fb.writePixel(12, 0, 0x09) // a high0 low9
    // jr=0;b low=2;diff=9-2=7;step=18 → nudges=floor(18/6)=3 → low=2+3=5;high=0 → 0x05
    blitFrameDeathFade(fb, rowFrame([0x02]), 12, 1, 18)
    expect(fb.indices[0 * 320 + 12]).toBe(0x05)
  })

  it('6 帧节奏:同一外层 i 内(jr..jr+5)低 nibble 不动,+6 才推进 1 格(battle.c:634-650)', () => {
    // residue 0(jr=0):diff=9-2=7。step=5 → nudges=0(仅高换 bg);step=6 → nudges=1。
    const fb0 = createFramebuffer()
    fb0.writePixel(12, 0, 0x09)
    blitFrameDeathFade(fb0, rowFrame([0x02]), 12, 1, 5)
    expect(fb0.indices[0 * 320 + 12]).toBe(0x02) // low 未移(仍 2),high=0
    const fb1 = createFramebuffer()
    fb1.writePixel(12, 0, 0x09)
    blitFrameDeathFade(fb1, rowFrame([0x02]), 12, 1, 6)
    expect(fb1.indices[0 * 320 + 12]).toBe(0x03) // nudges=1 → low=3
  })

  it('rgIndex 抖动错峰:residue!=0 的像素淡出起点 jr 滞后(step<jr 仍显原敌像素)', () => {
    // (10,0):k=10,residue 4 → jr=rgIndexInv[4]=5;(12,0):residue 0 → jr=0。step=2 时:
    //   r0 已换高 nibble,r4 还没轮到(显原敌像素)→ 抖动错峰的核心证据。
    const fb = createFramebuffer()
    fb.writePixel(10, 0, 0x57)
    fb.writePixel(12, 0, 0x57)
    blitFrameDeathFade(fb, rowFrame([0x32]), 10, 1, 2) // r4 jr5:step2<5 → 原像素 0x32
    blitFrameDeathFade(fb, rowFrame([0x32]), 12, 1, 2) // r0 jr0:step2>=0 → 0x52
    expect(fb.indices[0 * 320 + 10]).toBe(0x32) // 还没轮到 → 原敌像素
    expect(fb.indices[0 * 320 + 12]).toBe(0x52) // 已换高 nibble
  })

  it('aLow < bLow:低 nibble 朝下逼近(diff<0)', () => {
    const fb = createFramebuffer()
    fb.writePixel(12, 0, 0x01) // aLow=1
    // jr=0;bLow=9;diff=1-9=-8;step=18 → nudges=3 → low=9-3=6;high=0 → 0x06
    blitFrameDeathFade(fb, rowFrame([0x09]), 12, 1, 18)
    expect(fb.indices[0 * 320 + 12]).toBe(0x06)
  })

  it('step 足够大:低 nibble 完全收敛到 aLow → 像素 == 背景', () => {
    const fb = createFramebuffer()
    fb.writePixel(12, 0, 0x5a) // a high5 low10(0xA)
    // jr=0;bLow=2;|diff|=8;step=66 → nudges=min(floor(66/6),8)=min(11,8)=8 → low=0xA;high=0x50 → 0x5A
    blitFrameDeathFade(fb, rowFrame([0x32]), 12, 1, 66)
    expect(fb.indices[0 * 320 + 12]).toBe(0x5a)
  })

  it('透明像素(opaque=0)跳过:背景不变', () => {
    const fb = createFramebuffer()
    fb.writePixel(12, 0, 0x77)
    blitFrameDeathFade(fb, rowFrame([0x32], [0]), 12, 1, 5)
    expect(fb.indices[0 * 320 + 12]).toBe(0x77) // 未写入
  })
})

describe('bottom-centred blit clipping', () => {
  it('8×8 精灵 anchor 右缘（baseX=316）：右侧 4 列被裁，界内 4 列照写、不抛错', () => {
    const fb = markedFramebuffer()
    blitFrame(fb, solidFrame(8, 8, 0x33), 320, 100) // baseX = 320-4 = 316
    // 固定屏幕矩形与所有外围像素，防止越界写串到下一行。
    const expected = new Uint8Array(320 * 200).fill(0x5a)
    for (let y = 92; y < 100; y++) expected.fill(0x33, y * 320 + 316, y * 320 + 320)
    expect(Buffer.compare(fb.indices, expected)).toBe(0)
  })

  it('anchor 完全出右界（baseX=320）：全裁剪无写入', () => {
    const fb = markedFramebuffer()
    blitFrame(fb, solidFrame(8, 8, 0x33), 324, 100)
    expect(fb.indices.every((v) => v === 0x5a)).toBe(true)
  })

  it('anchorY 在顶缘（baseY<0）：顶部裁剪，底部行照写；iColorShift 仍应用', () => {
    const fb = markedFramebuffer()
    blitFrame(fb, solidFrame(8, 8, 0x03), 160, 4, 6) // baseY = 4-8 = -4
    const expected = new Uint8Array(320 * 200).fill(0x5a)
    for (let y = 0; y < 4; y++) expected.fill(0x09, y * 320 + 156, y * 320 + 164)
    expect(Buffer.compare(fb.indices, expected)).toBe(0)
  })
})
