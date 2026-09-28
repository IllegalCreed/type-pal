/**
 * TEST-GLM-PHASE1-LEAVES-3 L14（draw-battle-sprites.ts）— 去重表：
 *  - __tests__/draw-battle-sprites.test（位置/透明/colorShift/死亡淡出/idle/blink/帧选择/排序）
 *    → 不重复
 *  - present-battle.ts：现有 present-battle.test + grok P12/P13/P14 已覆盖 draw 全管线、
 *    fade-only 补帧、消息条、召唤 crossfade、入场 dither —— 本组登记 existing-proof，
 *    新文件只补 blitFrame 边缘裁剪（README 明确的剩余状态，旧例全在屏内）。
 *  - 新差异：blitFrame 底中锚在右/下边缘的像素裁剪（不抛错、界内像素照写、界外不写）。
 */
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
    // 界内列 316-319（local x 0-3）行 92-99 有写入
    expect(fb.indices[92 * 320 + 316]).toBe(0x33)
    expect(fb.indices[99 * 320 + 319]).toBe(0x33)
    // 越界像素静默：无异常即合同；左缘外像素不受影响
    expect(fb.indices[92 * 320 + 315]).toBe(0x5a)
  })

  it('anchor 完全出右界（baseX=320）：全裁剪无写入', () => {
    const fb = freshFb()
    blitFrame(fb, solid(8, 8, 0x33), 324, 100)
    expect(fb.indices.every((v) => v === 0x5a)).toBe(true)
  })

  it('anchorY 在顶缘（baseY<0）：顶部裁剪，底部行照写；iColorShift 仍应用', () => {
    const fb = freshFb()
    blitFrame(fb, solid(8, 8, 0x03), 160, 4, 6) // baseY = 4-8 = -4
    // local row 4..7 → fb y 0..3，idx 0x03+6=0x09
    expect(fb.indices[3 * 320 + 160]).toBe(0x09)
    // 界外行不写
    expect(fb.indices.every((v) => v === 0x09 || v === 0x5a)).toBe(true)
  })
})
