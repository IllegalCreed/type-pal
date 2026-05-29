import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFramebuffer } from '../present/framebuffer.js'
import { scrollFbp, showFbp } from './fbp-player.js'

const mockPalette = {
  colors: Array.from({ length: 256 }, () => [0, 0, 0]),
  cycles: [],
} as unknown as import('@type-pal/shared').Palette
const mockCanvasCtx = { putImageData: vi.fn() } as unknown as CanvasRenderingContext2D

function fbpFill(val: number): Uint8Array {
  return new Uint8Array(320 * 200).fill(val)
}

describe('特效 B fbp-player showFbp(PAL_ShowFBP port)', () => {
  afterEach(() => vi.useRealTimers())

  it('fade=0 → 整屏 = target FBP indices(瞬时 blit)', async () => {
    const fb = createFramebuffer()
    fb.indices.fill(99)
    await showFbp({ fbpIndices: fbpFill(0x3C), fade: 0, chunkNum: 10, isWin95: true, fb, canvasCtx: mockCanvasCtx, palette: mockPalette })
    expect(fb.indices[0]).toBe(0x3C)
    expect(fb.indices[320 * 200 - 1]).toBe(0x3C)
  })

  it('无图(indices 长度不符)→ 全黑(sdlpal memset 0 / WIN95 SDL_FillRect)', async () => {
    const fb = createFramebuffer()
    fb.indices.fill(99)
    await showFbp({ fbpIndices: new Uint8Array(10), fade: 0, chunkNum: 65535, isWin95: true, fb, canvasCtx: mockCanvasCtx, palette: mockPalette })
    expect(fb.indices.every((v) => v === 0)).toBe(true)
  })

  it('HACKHACK chunk(win95=68)fade=0 → 跳过最终 blit,fb 保持原样', async () => {
    const fb = createFramebuffer()
    fb.indices.fill(99)
    await showFbp({ fbpIndices: fbpFill(0x3C), fade: 0, chunkNum: 68, isWin95: true, fb, canvasCtx: mockCanvasCtx, palette: mockPalette })
    expect(fb.indices[0]).toBe(99) // HACKHACK:不被 target 覆盖
  })

  it('fade>0 + HACKHACK chunk → dither 自身收敛到 target(高 nibble 跳 + 低 nibble migrate 满)', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    fb.indices.fill(0x10) // backup: high=1 low=0
    // chunk 68(win95 HACKHACK)→ 无最终 blit,fb 完全 = dither 结果
    const p = showFbp({ fbpIndices: fbpFill(0x3C), fade: 1, chunkNum: 68, isWin95: true, fb, canvasCtx: mockCanvasCtx, palette: mockPalette })
    await vi.runAllTimersAsync()
    await p
    // target 0x3C(high=3 low=12):high 首触即跳 3;low 0→12 在 16 外圈内 migrate 满 → 0x3C
    expect(fb.indices[0]).toBe(0x3C)
  })
})

describe('特效 B fbp-player scrollFbp(PAL_ScrollFBP port)', () => {
  it('下滑卷入完成 → 整屏 = 新图(末帧 CopyEntireSurface)', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    fb.indices.fill(0x11) // 旧屏
    const p = scrollFbp({ fbpIndices: fbpFill(0x22), speed: 100, fScrollDown: true, fb, canvasCtx: mockCanvasCtx, palette: mockPalette })
    await vi.runAllTimersAsync()
    await p
    expect(fb.indices.every((v) => v === 0x22)).toBe(true) // 全是新图
    vi.useRealTimers()
  })

  it('滚动中间帧 = 旧屏下移 + 新图自顶推入(下滑方向)', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    // 旧屏行号填充:row r → 值 100;新图 → 值 200(用不同值区分)
    fb.indices.fill(100)
    const target = new Uint8Array(320 * 200).fill(200)
    let topAfterFirstStep = -1
    // 在第一步后(i=0 → 全旧屏,i=1 → 顶部 1 行新图)抓一帧:用 putImageData 调用次数间接难,改为跑到中途停
    const p = scrollFbp({ fbpIndices: target, speed: 100, fScrollDown: true, fb, canvasCtx: mockCanvasCtx, palette: mockPalette })
    // 推进到约一半(110 步)再看:顶部应是新图(200),底部应是旧屏(100)
    await vi.advanceTimersByTimeAsync(8 * 110) // delay=800/100=8ms × 110 步
    topAfterFirstStep = fb.indices[0]! // 顶部行
    const bottom = fb.indices[320 * 199]! // 底部行
    await vi.runAllTimersAsync()
    await p
    expect(topAfterFirstStep).toBe(200) // 顶部 = 新图(自顶推入)
    expect(bottom).toBe(100) // 底部 = 旧屏(下移中)
    vi.useRealTimers()
  })
})
