import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { realCanvasContext } from '../__tests__/canvas-host.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { scrollFbp, showFbp } from './fbp-player.js'

const palette: Palette = {
  colors: Array.from({ length: 256 }, (_, index): [number, number, number] => [index, 20, 40]),
  cycles: [],
}

afterEach(async () => {
  if (vi.isFakeTimers()) await vi.runAllTimersAsync()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function fbpFill(val: number): Uint8Array {
  return new Uint8Array(320 * 200).fill(val)
}

describe('特效 B fbp-player showFbp(PAL_ShowFBP port)', () => {
  it('fade=0 → 整屏 = target FBP indices(瞬时 blit)', async () => {
    const fb = createFramebuffer()
    fb.indices.fill(99)
    await showFbp({
      fbpIndices: fbpFill(0x3c),
      fade: 0,
      chunkNum: 10,
      isWin95: true,
      fb,
      canvasCtx: realCanvasContext(),
      palette,
    })
    expect(fb.indices).toEqual(fbpFill(0x3c))
  })

  it('无图(indices 长度不符)→ framebuffer 索引清零', async () => {
    const fb = createFramebuffer()
    fb.indices.fill(99)
    await showFbp({
      fbpIndices: new Uint8Array(10),
      fade: 0,
      chunkNum: 65535,
      isWin95: true,
      fb,
      canvasCtx: realCanvasContext(),
      palette,
    })
    expect(fb.indices.every((v) => v === 0)).toBe(true)
  })

  it('HACKHACK chunk(win95=68)fade=0 → 跳过最终 blit,fb 保持原样', async () => {
    const fb = createFramebuffer()
    fb.indices.fill(99)
    await showFbp({
      fbpIndices: fbpFill(0x3c),
      fade: 0,
      chunkNum: 68,
      isWin95: true,
      fb,
      canvasCtx: realCanvasContext(),
      palette,
    })
    expect(fb.indices).toEqual(fbpFill(99)) // HACKHACK:不被 target 覆盖
  })

  it('fade>0 + HACKHACK chunk → dither 自身收敛到 target(高 nibble 跳 + 低 nibble migrate 满)', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    fb.indices.fill(0x10) // backup: high=1 low=0
    // chunk 68(win95 HACKHACK)→ 无最终 blit,fb 完全 = dither 结果
    const p = showFbp({
      fbpIndices: fbpFill(0x3c),
      fade: 1,
      chunkNum: 68,
      isWin95: true,
      fb,
      canvasCtx: realCanvasContext(),
      palette,
    })
    await vi.runAllTimersAsync()
    await p
    // target 0x3C(high=3 low=12):high 首触即跳 3;low 0→12 在 16 外圈内 migrate 满 → 0x3C
    expect(fb.indices).toEqual(fbpFill(0x3c))
  })
})

describe('特效 B fbp-player scrollFbp(PAL_ScrollFBP port)', () => {
  it('下滑卷入完成 → 整屏 = 新图(末帧 CopyEntireSurface)', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    fb.indices.fill(0x11) // 旧屏
    const p = scrollFbp({
      fbpIndices: fbpFill(0x22),
      speed: 100,
      fScrollDown: true,
      fb,
      canvasCtx: realCanvasContext(),
      palette,
    })
    await vi.runAllTimersAsync()
    await p
    expect(fb.indices.every((v) => v === 0x22)).toBe(true) // 全是新图
    vi.useRealTimers()
  })

  it('滚动中间帧 = 旧屏下移 + 新图自顶推入(下滑方向)', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    // 旧屏索引 100，新图索引 200，独立观察两侧归属。
    fb.indices.fill(100)
    const target = new Uint8Array(320 * 200).fill(200)
    const p = scrollFbp({
      fbpIndices: target,
      speed: 100,
      fScrollDown: true,
      fb,
      canvasCtx: realCanvasContext(),
      palette,
    })
    // 推进到约一半(110 步)再看:顶部应是新图(200),底部应是旧屏(100)
    await vi.advanceTimersByTimeAsync(8 * 110) // delay=800/100=8ms × 110 步
    const top = fb.indices[0]! // 顶部行
    const bottom = fb.indices[320 * 199]! // 底部行
    await vi.runAllTimersAsync()
    await p
    expect(top).toBe(200) // 顶部 = 新图(自顶推入)
    expect(bottom).toBe(100) // 底部 = 旧屏(下移中)
    vi.useRealTimers()
  })
})

describe('特效 B FBP effectSprite 叠加(g_wCurEffectSprite)', () => {
  it('fade>0 + HACKHACK chunk + effectSprite → 渐变期叠 MGO 精灵帧(末帧无 final blit 故精灵保留)', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    fb.indices.fill(0x10)
    // 10×10 全不透明精灵帧,填 0xAB,贴 (0,0)
    const spr = {
      width: 10,
      height: 10,
      indices: new Uint8Array(100).fill(0xab),
      opaque: new Uint8Array(100).fill(1),
    }
    const p = showFbp({
      fbpIndices: fbpFill(0x3c),
      fade: 1,
      chunkNum: 68,
      isWin95: true, // chunk 68 = win95 HACKHACK → 无 final blit
      fb,
      canvasCtx: realCanvasContext(),
      palette,
      effectSpriteFrames: [spr],
    })
    await vi.runAllTimersAsync()
    await p
    for (let y = 0; y < 10; y++) {
      expect(fb.indices.slice(y * 320, y * 320 + 10)).toEqual(new Uint8Array(10).fill(0xab))
      expect(fb.indices[y * 320 + 10]).toBe(0x3c)
    }
    expect(fb.indices[10 * 320]).toBe(0x3c)
  })
})
