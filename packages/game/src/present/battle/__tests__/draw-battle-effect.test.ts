import { describe, expect, it } from 'vitest'
import { legalPalette } from '../../../__tests__/asset-fixtures.js'
import { dumpFramebuffer } from '../../../__tests__/grok-render-r1/dump-evidence.js'
import type { BattleAnimOverlay } from '../../../core/battle/battle-state.js'
import { fillSentinel, pixel, SENTINEL } from '../../__tests__/raster-fixtures.js'
import { createFramebuffer } from '../../framebuffer.js'
import { flushToCanvas } from '../../present.js'
import { drawBattleEffectOverlay, drawBattleMagicOverlay } from '../draw-battle-effect.js'
import type { SpriteAsset } from '../draw-battle-sprites.js'

function filledSprite(frames: Array<{ w: number; h: number; fill: number }>): SpriteAsset {
  return {
    frames: frames.map((f) => ({
      width: f.w,
      height: f.h,
      indices: new Uint8Array(f.w * f.h).fill(f.fill),
      opaque: new Uint8Array(f.w * f.h).fill(1),
    })),
  }
}

describe('effect overlay frames and resources', () => {
  it('画 overlay.frameIdx 帧到落点(底中 anchor:x - w/2, y - h)', () => {
    const fb = createFramebuffer()
    // 3 帧 sprite,取 frameIdx=1(值 22);落点 (160,90),帧 2×2 → baseX=159,baseY=88
    const sprite = filledSprite([
      { w: 2, h: 2, fill: 11 },
      { w: 2, h: 2, fill: 22 },
      { w: 2, h: 2, fill: 33 },
    ])
    const overlay: BattleAnimOverlay = {
      kind: 'effect',
      spriteChunk: 10,
      frameIdx: 1,
      x: 160,
      y: 90,
    }
    drawBattleEffectOverlay(fb, overlay, sprite)
    expect(fb.indices[88 * 320 + 159]).toBe(22)
    expect(fb.indices[89 * 320 + 160]).toBe(22)
  })

  it('sprite 缺(loader 未注入)→ no-op,不抛', () => {
    const fb = createFramebuffer()
    fb.indices.fill(77)
    const overlay: BattleAnimOverlay = {
      kind: 'effect',
      spriteChunk: 10,
      frameIdx: 0,
      x: 160,
      y: 90,
    }
    expect(() => drawBattleEffectOverlay(fb, overlay, undefined)).not.toThrow()
    expect(fb.indices.every((value) => value === 77)).toBe(true)
  })

  it('frameIdx 越界 → no-op,不抛', () => {
    const fb = createFramebuffer()
    fb.indices.fill(77)
    const sprite = filledSprite([{ w: 2, h: 2, fill: 11 }])
    const overlay: BattleAnimOverlay = {
      kind: 'effect',
      spriteChunk: 10,
      frameIdx: 99,
      x: 160,
      y: 90,
    }
    expect(() => drawBattleEffectOverlay(fb, overlay, sprite)).not.toThrow()
    expect(fb.indices.every((value) => value === 77)).toBe(true)
  })

  it('透明像素(opaque=0)不覆盖背景', () => {
    const fb = createFramebuffer()
    fb.writePixel(159, 88, 77)
    const indices = new Uint8Array([5, 5, 5, 5])
    const opaque = new Uint8Array([0, 0, 0, 0]) // 全透明
    const sprite: SpriteAsset = { frames: [{ width: 2, height: 2, indices, opaque }] }
    const overlay: BattleAnimOverlay = {
      kind: 'effect',
      spriteChunk: 10,
      frameIdx: 0,
      x: 160,
      y: 90,
    }
    drawBattleEffectOverlay(fb, overlay, sprite)
    expect(fb.indices[88 * 320 + 159]).toBe(77) // 背景保留
  })
})

describe('magic overlay frames and resources', () => {
  it('从 magicSprites.get(spriteChunk) 取帧 blit 到落点(底中 anchor)', () => {
    const fb = createFramebuffer()
    // chunk 12 → 2 帧;frameIdx=1(值 44);落点 (160,90),帧 2×2 → baseX=159,baseY=88。
    const magicSprites = new Map<number, SpriteAsset>([
      [
        12,
        filledSprite([
          { w: 2, h: 2, fill: 33 },
          { w: 2, h: 2, fill: 44 },
        ]),
      ],
    ])
    const overlay: BattleAnimOverlay = {
      kind: 'magic',
      spriteChunk: 12,
      frameIdx: 1,
      x: 160,
      y: 90,
    }
    drawBattleMagicOverlay(fb, overlay, magicSprites)
    expect(fb.indices[88 * 320 + 159]).toBe(44)
    expect(fb.indices[89 * 320 + 160]).toBe(44)
  })

  it('chunk 缺(magicSprites 无该 key)→ no-op,不抛', () => {
    const fb = createFramebuffer()
    fb.indices.fill(77)
    const magicSprites = new Map<number, SpriteAsset>()
    const overlay: BattleAnimOverlay = {
      kind: 'magic',
      spriteChunk: 99,
      frameIdx: 0,
      x: 160,
      y: 90,
    }
    expect(() => drawBattleMagicOverlay(fb, overlay, magicSprites)).not.toThrow()
    expect(fb.indices.every((value) => value === 77)).toBe(true)
  })

  it('magicSprites 整个 undefined → no-op,不抛', () => {
    const fb = createFramebuffer()
    fb.indices.fill(77)
    const overlay: BattleAnimOverlay = {
      kind: 'magic',
      spriteChunk: 12,
      frameIdx: 0,
      x: 160,
      y: 90,
    }
    expect(() => drawBattleMagicOverlay(fb, overlay, undefined)).not.toThrow()
    expect(fb.indices.every((value) => value === 77)).toBe(true)
  })
})

function overlayAt(x: number, y: number): BattleAnimOverlay {
  return { kind: 'effect', spriteChunk: 10, frameIdx: 0, x, y }
}

describe('effect odd-width anchors and palette readback', () => {
  it('宽 3 的特效锚点只减 1，左缘和多出来的右缘都写入', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawBattleEffectOverlay(fb, overlayAt(160, 90), filledSprite([{ w: 3, h: 1, fill: 0x2d }]))
    expect(pixel(fb, 159, 89)).toBe(0x2d)
    expect(pixel(fb, 161, 89)).toBe(0x2d)
    expect(pixel(fb, 162, 89)).toBe(SENTINEL)
    expect(pixel(fb, 158, 89)).toBe(SENTINEL)
  })

  it('宽 1 时右移半宽为 0，像素落在锚点列而不是左边一列', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawBattleEffectOverlay(fb, overlayAt(160, 90), filledSprite([{ w: 1, h: 1, fill: 0x2d }]))
    expect(pixel(fb, 160, 89)).toBe(0x2d)
    expect(pixel(fb, 159, 89)).toBe(SENTINEL)
  })

  it('奇数宽右缘索引 0x2D 经 flushToCanvas 写成调色板 RGB，缓冲仍是 0x2D', async () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawBattleEffectOverlay(fb, overlayAt(160, 90), filledSprite([{ w: 3, h: 1, fill: 0x2d }]))
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
    const snap = ctx2d.getImageData(0, 0, 320, 200)
    await dumpFramebuffer('G08-D07', 320, 200, snap.data, [
      { x: 161, y: 89, rgba: [45, 9, 18, 255] },
    ])
  })
})
