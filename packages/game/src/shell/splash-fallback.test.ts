import type { Palette } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { realCanvasContext } from '../__tests__/canvas-host.js'
import type { IndexedImage } from '../assets/png.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { playSplashFallback } from './splash-fallback.js'

function mockBitmap(w: number, h: number, fill: number): IndexedImage {
  return {
    width: w,
    height: h,
    indices: new Uint8Array(w * h).fill(fill),
    opaque: new Uint8Array(w * h).fill(1),
  }
}

function mockCraneSprite(): { frames: IndexedImage[]; anchorX: number; anchorY: number } {
  // 8 帧 16×16 仙鹤
  return {
    frames: Array.from({ length: 8 }, (_, i) => mockBitmap(16, 16, i + 10)),
    anchorX: 8,
    anchorY: 8,
  }
}

const mockPalette: Palette = {
  colors: Array.from({ length: 256 }, () => [50, 100, 150]),
  cycles: [],
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  vi.spyOn(Math, 'random').mockReturnValue(0)
})

afterEach(async () => {
  // Release a pending player even when a pixel assertion fails.
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }))
  await vi.advanceTimersByTimeAsync(2500)
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

async function skipAndFinish(promise: Promise<void>, code: string): Promise<void> {
  let finished = false
  const settled = promise.then(
    () => ({ ok: true as const }),
    (error: unknown) => ({ ok: false as const, error }),
  )
  void settled.then(() => {
    finished = true
  })
  window.dispatchEvent(new KeyboardEvent('keydown', { code }))
  // Bound the clock: a broken skip must fail instead of draining an endless splash loop.
  await vi.advanceTimersByTimeAsync(2500)
  expect(finished).toBe(true)
  const result = await settled
  if (!result.ok) throw result.error
}

describe('playSplashFallback — bitmap、跳过与退出像素合同', () => {
  it('Space 跳过后保留上下背景的各自像素', async () => {
    const fb = createFramebuffer()
    const promise = playSplashFallback({
      fb,
      canvasCtx: realCanvasContext(),
      palette: mockPalette,
      bitmapUp: mockBitmap(320, 200, 0x11),
      bitmapDown: mockBitmap(320, 200, 0x22),
      craneSprite: mockCraneSprite(),
      titleFrame: mockBitmap(64, 32, 0x44),
      nowFn: () => Date.now(),
    })
    await vi.advanceTimersByTimeAsync(100)
    await skipAndFinish(promise, 'Space')
    expect(fb.indices[0]).toBe(0x11)
    expect(fb.indices[199 * 320]).toBe(0x22)
  })

  it('Escape 也能结束播放', async () => {
    const fb = createFramebuffer()
    const promise = playSplashFallback({
      fb,
      canvasCtx: realCanvasContext(),
      palette: mockPalette,
      bitmapUp: mockBitmap(320, 200, 0x11),
      bitmapDown: mockBitmap(320, 200, 0x22),
      craneSprite: mockCraneSprite(),
      titleFrame: mockBitmap(64, 32, 0x44),
      nowFn: () => Date.now(),
    })
    await vi.advanceTimersByTimeAsync(100)
    await skipAndFinish(promise, 'Escape')
  })

  it('自定义 skipKeys 拒绝默认 Space，只接受 KeyQ', async () => {
    const fb = createFramebuffer()
    const promise = playSplashFallback({
      fb,
      canvasCtx: realCanvasContext(),
      palette: mockPalette,
      bitmapUp: mockBitmap(320, 200, 0x11),
      bitmapDown: mockBitmap(320, 200, 0x22),
      craneSprite: mockCraneSprite(),
      titleFrame: mockBitmap(64, 32, 0x44),
      skipKeys: ['KeyQ'],
      nowFn: () => Date.now(),
    })
    await vi.advanceTimersByTimeAsync(100)
    const ignored = new KeyboardEvent('keydown', { code: 'Space', cancelable: true })
    window.dispatchEvent(ignored)
    await vi.advanceTimersByTimeAsync(85)
    const defaultWasIgnored = !ignored.defaultPrevented
    await skipAndFinish(promise, 'KeyQ')
    expect(defaultWasIgnored).toBe(true)
  })

  // L44:sdlpal main.c:400-405 — 按键跳过瞬间先把标题 RLE 高度强制写满再重绘(lpBitmapTitle[2/3]=iTitleHeight
  //   + PAL_RLEBlitToSurface),跳过即显示完整标题。早跳过时标题不应停在半长高度。
  it('L44:早跳过时标题补满完整高度(底部行也被画上)', async () => {
    const fb = createFramebuffer()
    const promise = playSplashFallback({
      fb,
      canvasCtx: realCanvasContext(),
      palette: mockPalette,
      // bitmap 全屏填非 title 色,确保 title 区像素只可能来自 title blit
      bitmapUp: mockBitmap(320, 200, 0x11),
      bitmapDown: mockBitmap(320, 200, 0x22),
      craneSprite: mockCraneSprite(),
      // 标题 (255,10) 64×32,fill 0x44。底部行 = y=41。
      titleFrame: mockBitmap(64, 32, 0x44),
      nowFn: () => Date.now(),
    })
    // 100ms 时标题尚未展开到 32 行。
    await vi.advanceTimersByTimeAsync(100)
    await skipAndFinish(promise, 'Space')
    // 标题底部行 y=40(dy=30)、x=260 — 早跳过时仅靠补满才会是 0x44(否则是滚动 bitmap 像素)
    expect(fb.indices[40 * 320 + 260]).toBe(0x44)
  })

  // L42:sdlpal main.c:455 — PAL_SplashScreen 退出前 PAL_FadeOut(1)=600ms 淡黑(palette.c:163),
  //   不应硬切到满亮主菜单。最终画到 canvas 的帧应为全黑。
  it('L42:splash 结束做 PAL_FadeOut(1) 淡黑(最终帧全黑)', async () => {
    const fb = createFramebuffer()
    const localCtx = realCanvasContext()
    const promise = playSplashFallback({
      fb,
      canvasCtx: localCtx,
      palette: mockPalette,
      bitmapUp: mockBitmap(320, 200, 0x11),
      bitmapDown: mockBitmap(320, 200, 0x22),
      craneSprite: mockCraneSprite(),
      titleFrame: mockBitmap(64, 32, 0x44),
      nowFn: () => Date.now(),
    })
    await vi.advanceTimersByTimeAsync(100)
    await skipAndFinish(promise, 'Space')
    // Actual Canvas output must be opaque black; nonempty dimensions prevent vacuous every().
    const last = localCtx.getImageData(0, 0, 320, 200)
    expect(last.data).toHaveLength(320 * 200 * 4)
    expect(last.data.every((value, i) => value === (i % 4 === 3 ? 255 : 0))).toBe(true)
  })
})
