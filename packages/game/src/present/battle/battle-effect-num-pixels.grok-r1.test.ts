/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G08-D。
 * 奇数宽特效锚点和真实 framebuffer 上的五位飘字。不重领偶数 2×2、寿命和颜色集合。
 */
import { describe, expect, it } from 'vitest'
import { legalPalette } from '../../__tests__/grok-render-r1/legal-host.js'
import type { IndexedImage } from '../../assets/png.js'
import type { BattleAnimOverlay } from '../../core/battle/battle-state.js'
import { fillSentinel, pixel, SENTINEL } from '../__tests__/grok-present/images.js'
import { createFramebuffer } from '../framebuffer.js'
import { flushToCanvas } from '../present.js'
import { drawBattleEffectOverlay } from './draw-battle-effect.js'
import { FloatingNumsLayer } from './draw-battle-num.js'
import type { SpriteAsset } from './draw-battle-sprites.js'

function solid(width: number, height: number, index: number): SpriteAsset {
  const count = width * height
  return {
    frames: [
      {
        width,
        height,
        indices: new Uint8Array(count).fill(index),
        opaque: new Uint8Array(count).fill(1),
      },
    ],
  }
}

function numFrames(): IndexedImage[] {
  const frames: IndexedImage[] = []
  for (let i = 0; i < 66; i++) {
    frames.push({ width: 1, height: 1, indices: new Uint8Array([0]), opaque: new Uint8Array([0]) })
  }
  for (let digit = 0; digit <= 9; digit++) {
    frames[19 + digit] = {
      width: 1,
      height: 1,
      indices: new Uint8Array([0xb0 + digit]),
      opaque: new Uint8Array([1]),
    }
    frames[29 + digit] = {
      width: 1,
      height: 1,
      indices: new Uint8Array([0xd0 + digit]),
      opaque: new Uint8Array([1]),
    }
  }
  return frames
}

function overlayAt(x: number, y: number): BattleAnimOverlay {
  return { kind: 'effect', spriteChunk: 10, frameIdx: 0, x, y }
}

describe('G08-D 特效与飘字像素', () => {
  it('G08-D01 宽 3 的特效锚点只减 1，左缘和多出来的右缘都写入', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawBattleEffectOverlay(fb, overlayAt(160, 90), solid(3, 1, 0x2d))
    expect(pixel(fb, 159, 89)).toBe(0x2d)
    expect(pixel(fb, 161, 89)).toBe(0x2d)
    expect(pixel(fb, 162, 89)).toBe(SENTINEL)
    expect(pixel(fb, 158, 89)).toBe(SENTINEL)
  })

  it('G08-D02 宽 1 时右移半宽为 0，像素落在锚点列而不是左边一列', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawBattleEffectOverlay(fb, overlayAt(160, 90), solid(1, 1, 0x2d))
    expect(pixel(fb, 160, 89)).toBe(0x2d)
    expect(pixel(fb, 159, 89)).toBe(SENTINEL)
  })

  it('G08-D03 五位右对齐的个位在 x+24，十位不补零', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    const layer = new FloatingNumsLayer()
    layer.emit({ x: 100, y: 50, value: 7, color: 'yellow', currentFrame: 0 })
    layer.draw(fb, 0, numFrames())
    expect(pixel(fb, 124, 50)).toBe(0xb7)
    expect(pixel(fb, 118, 50)).toBe(SENTINEL)
  })

  it('G08-D04 六位数只留低五位，最高位不画到个位左边第六格', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    const layer = new FloatingNumsLayer()
    layer.emit({ x: 100, y: 50, value: 123456, color: 'yellow', currentFrame: 0 })
    layer.draw(fb, 0, numFrames())
    expect(pixel(fb, 124, 50)).toBe(0xb6)
    expect(pixel(fb, 100, 50)).toBe(0xb2)
    expect(pixel(fb, 94, 50)).toBe(SENTINEL)
  })

  it('G08-D05 两条飘字各写自己的个位，黄 7 和蓝 3 不互相覆盖', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    const layer = new FloatingNumsLayer()
    layer.emit({ x: 100, y: 50, value: 7, color: 'yellow', currentFrame: 0 })
    layer.emit({ x: 200, y: 80, value: 3, color: 'blue', currentFrame: 0 })
    layer.draw(fb, 0, numFrames())
    expect(pixel(fb, 124, 50)).toBe(0xb7)
    expect(pixel(fb, 224, 80)).toBe(0xd3)
    expect(layer.count).toBe(2)
  })

  it('G08-D06 数值 0 仍画一位黄 0，左边不补位', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    const layer = new FloatingNumsLayer()
    layer.emit({ x: 100, y: 50, value: 0, color: 'yellow', currentFrame: 0 })
    layer.draw(fb, 0, numFrames())
    expect(pixel(fb, 124, 50)).toBe(0xb0)
    expect(pixel(fb, 118, 50)).toBe(SENTINEL)
    expect(layer.count).toBe(1)
  })

  it('G08-D07 奇数宽右缘索引 0x2D 经 flushToCanvas 写成调色板 RGB，缓冲仍是 0x2D', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawBattleEffectOverlay(fb, overlayAt(160, 90), solid(3, 1, 0x2d))
    const palette = legalPalette((colors) => {
      colors[0x2d] = [45, 9, 18]
    })
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 200
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) throw new Error('2d context unavailable')
    flushToCanvas(fb, ctx2d, palette)
    expect(Array.from(ctx2d.getImageData(161, 89, 1, 1).data)).toEqual([45, 9, 18, 255])
    expect(pixel(fb, 161, 89)).toBe(0x2d)
  })
})
