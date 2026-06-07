import { afterEach, describe, expect, it, vi } from 'vitest'
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

const mockPalette = {
  colors: Array.from({ length: 256 }, () => [50, 100, 150] as [number, number, number]),
  cycles: [],
} as unknown as import('@type-pal/shared').Palette

const mockCanvasCtx = {
  putImageData: vi.fn(),
} as unknown as CanvasRenderingContext2D

afterEach(() => {
  vi.restoreAllMocks()
})

describe('playSplashFallback — sdlpal main.c:206-456 PAL_SplashScreen 1:1 port', () => {
  it('Space 跳过 → 补完渐变 + 0.5s delay + resolve', async () => {
    const fb = createFramebuffer()
    const promise = playSplashFallback({
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      bitmapUp: mockBitmap(320, 200, 0x11),
      bitmapDown: mockBitmap(320, 200, 0x22),
      craneSprite: mockCraneSprite(),
      titleFrame: mockBitmap(64, 32, 0x44),
      nowFn: () => Date.now(),
    })
    // 等第一帧渲染
    await new Promise((r) => setTimeout(r, 100))
    // 按 Space 跳过
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await promise
    // fb 应被某帧填充(非全 0)
    expect(fb.indices.some((v) => v !== 0)).toBe(true)
  }, 10_000)

  it('Enter / Escape 也跳过', async () => {
    const fb = createFramebuffer()
    const promise = playSplashFallback({
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      bitmapUp: mockBitmap(320, 200, 0x11),
      bitmapDown: mockBitmap(320, 200, 0x22),
      craneSprite: mockCraneSprite(),
      titleFrame: mockBitmap(64, 32, 0x44),
      nowFn: () => Date.now(),
    })
    await new Promise((r) => setTimeout(r, 100))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }))
    await promise
  }, 10_000)

  it('自定义 skipKeys 覆盖默认', async () => {
    const fb = createFramebuffer()
    const promise = playSplashFallback({
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      bitmapUp: mockBitmap(320, 200, 0x11),
      bitmapDown: mockBitmap(320, 200, 0x22),
      craneSprite: mockCraneSprite(),
      titleFrame: mockBitmap(64, 32, 0x44),
      skipKeys: ['KeyQ'],
      nowFn: () => Date.now(),
    })
    await new Promise((r) => setTimeout(r, 100))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }))
    await promise
  }, 10_000)

  it('画屏后 fb 含 bitmapUp 或 bitmapDown 像素(滚动 bitmap blit 真的运行)', async () => {
    const fb = createFramebuffer()
    const promise = playSplashFallback({
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      bitmapUp: mockBitmap(320, 200, 0xAA),
      bitmapDown: mockBitmap(320, 200, 0xBB),
      craneSprite: mockCraneSprite(),
      titleFrame: mockBitmap(64, 32, 0x44),
      nowFn: () => Date.now(),
    })
    await new Promise((r) => setTimeout(r, 200))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await promise
    // fb 至少含 0xAA(up)或 0xBB(down)或仙鹤 0x0A-0x11 或 title 0x44
    const hasContent = fb.indices.some((v) =>
      v === 0xAA || v === 0xBB || (v >= 0x0A && v <= 0x11) || v === 0x44,
    )
    expect(hasContent).toBe(true)
  }, 10_000)

  // L44:sdlpal main.c:400-405 — 按键跳过瞬间先把标题 RLE 高度强制写满再重绘(lpBitmapTitle[2/3]=iTitleHeight
  //   + PAL_RLEBlitToSurface),跳过即显示完整标题。早跳过时标题不应停在半长高度。
  it('L44:早跳过时标题补满完整高度(底部行也被画上)', async () => {
    const fb = createFramebuffer()
    const promise = playSplashFallback({
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      // bitmap 全屏填非 title 色,确保 title 区像素只可能来自 title blit
      bitmapUp: mockBitmap(320, 200, 0x11),
      bitmapDown: mockBitmap(320, 200, 0x22),
      craneSprite: mockCraneSprite(),
      // 标题 (255,10) 64×32,fill 0x44。底部行 = y=41。
      titleFrame: mockBitmap(64, 32, 0x44),
      nowFn: () => Date.now(),
    })
    // 早跳过:仅 ~1-2 帧(85ms/帧)→ titleVisibleHeight 远小于 32
    await new Promise((r) => setTimeout(r, 100))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await promise
    // 标题底部行 y=40(dy=30)、x=260 — 早跳过时仅靠补满才会是 0x44(否则是滚动 bitmap 像素)
    expect(fb.indices[40 * 320 + 260]).toBe(0x44)
  }, 10_000)

  // L42:sdlpal main.c:455 — PAL_SplashScreen 退出前 PAL_FadeOut(1)=600ms 淡黑(palette.c:163),
  //   不应硬切到满亮主菜单。最终画到 canvas 的帧应为全黑。
  it('L42:splash 结束做 PAL_FadeOut(1) 淡黑(最终帧全黑)', async () => {
    const fb = createFramebuffer()
    const calls: ImageData[] = []
    const localCtx = {
      putImageData: (img: ImageData) => {
        calls.push(img)
      },
    } as unknown as CanvasRenderingContext2D
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
    await new Promise((r) => setTimeout(r, 100))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await promise
    // 最后一帧 = fadeOut 终点,所有 RGB 应为 0(alpha 通道忽略)
    const last = calls.at(-1)!
    const allBlack = last.data.every((v, i) => i % 4 === 3 || v === 0)
    expect(allBlack).toBe(true)
  }, 10_000)
})
