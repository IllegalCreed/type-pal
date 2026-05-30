/**
 * draw-battle-effect.test.ts —— D17a overlay effect sprite 渲染(像素级断言)。
 * 对照 sdlpal fight.c:2183/2188 底中 anchor 落点。
 */

import { describe, expect, it } from 'vitest'
import type { BattleAnimOverlay } from '../../../core/battle/battle-state.js'
import { createFramebuffer } from '../../framebuffer.js'
import { drawBattleEffectOverlay } from '../draw-battle-effect.js'
import type { SpriteAsset } from '../draw-battle-sprites.js'

function mkSprite(frames: Array<{ w: number; h: number; fill: number }>): SpriteAsset {
  return {
    frames: frames.map((f) => ({
      width: f.w,
      height: f.h,
      indices: new Uint8Array(f.w * f.h).fill(f.fill),
      opaque: new Uint8Array(f.w * f.h).fill(1),
    })),
  }
}

describe('drawBattleEffectOverlay', () => {
  it('画 overlay.frameIdx 帧到落点(底中 anchor:x - w/2, y - h)', () => {
    const fb = createFramebuffer()
    // 3 帧 sprite,取 frameIdx=1(值 22);落点 (160,90),帧 2×2 → baseX=159,baseY=88
    const sprite = mkSprite([
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
    const overlay: BattleAnimOverlay = {
      kind: 'effect',
      spriteChunk: 10,
      frameIdx: 0,
      x: 160,
      y: 90,
    }
    expect(() => drawBattleEffectOverlay(fb, overlay, undefined)).not.toThrow()
    expect(fb.indices[90 * 320 + 160]).toBe(0) // 背景未被写
  })

  it('frameIdx 越界 → no-op,不抛', () => {
    const fb = createFramebuffer()
    const sprite = mkSprite([{ w: 2, h: 2, fill: 11 }])
    const overlay: BattleAnimOverlay = {
      kind: 'effect',
      spriteChunk: 10,
      frameIdx: 99,
      x: 160,
      y: 90,
    }
    expect(() => drawBattleEffectOverlay(fb, overlay, sprite)).not.toThrow()
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
