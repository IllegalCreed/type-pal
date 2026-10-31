import type { Palette } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { legalPalette } from '../__tests__/asset-fixtures.js'
import { realCanvasContext } from '../__tests__/canvas-host.js'
import type { IndexedImage } from '../assets/png.js'
import { solidIndexedImage } from '../present/__tests__/raster-fixtures.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { createOpeningPlaybackOwner } from './__tests__/opening-playback.js'
import { playSplashFallback } from './splash-fallback.js'

let playback: ReturnType<typeof createOpeningPlaybackOwner>
beforeEach(() => {
  playback = createOpeningPlaybackOwner()
})
afterEach(async () => {
  try {
    await playback.close()
  } finally {
    vi.restoreAllMocks()
    vi.useRealTimers()
  }
})
describe('Splash title reveal', () => {
  const palette: Palette = {
    colors: Array.from({ length: 256 }, (): [number, number, number] => [50, 100, 150]),
    cycles: [],
  }

  it('未跳过的前 3 帧:title 只画 dy=0..2;dy=5 仍未画(fake timers 逐帧停点)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    // Keep transparent cranes on-screen so their opacity path is deterministic.
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const fb = createFramebuffer()
    const p = playback.track(
      playSplashFallback({
        fb,
        canvasCtx: realCanvasContext(),
        palette,
        bitmapUp: solidIndexedImage(320, 200, 0x11),
        bitmapDown: solidIndexedImage(320, 200, 0x22),
        // 仙鹤帧全透明:不写任何像素,title 区像素只可能来自 title blit。
        craneSprite: {
          frames: [
            solidIndexedImage(1, 1, 0x99, 0),
            solidIndexedImage(1, 1, 0x99, 0),
            solidIndexedImage(1, 1, 0x99, 0),
          ],
          anchorX: 0,
          anchorY: 0,
        },
        titleFrame: solidIndexedImage(64, 32, 0x44),
        nowFn: () => Date.now(),
      }),
    )

    // The first frame is synchronous at t=0; two intervals reach the third frame.
    await vi.advanceTimersByTimeAsync(2 * 85)
    const at = (row: number, x: number): number => fb.indices[row * 320 + x]!
    const revealed = [at(10, 255), at(12, 255), at(13, 255), at(15, 255)]

    await playback.finishSplash(p, 'Space')
    expect(revealed).toEqual([0x44, 0x44, 0x22, 0x22])
  })
})

describe('Splash bitmap, skip and exit', () => {
  function craneSprite(): { frames: IndexedImage[]; anchorX: number; anchorY: number } {
    // 8 帧 16×16 仙鹤
    return {
      frames: Array.from({ length: 8 }, (_, i) => solidIndexedImage(16, 16, i + 10)),
      anchorX: 8,
      anchorY: 8,
    }
  }

  const splashPalette: Palette = {
    colors: Array.from({ length: 256 }, () => [50, 100, 150]),
    cycles: [],
  }
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  it('Space 跳过后保留上下背景的各自像素', async () => {
    const fb = createFramebuffer()
    const promise = playback.track(
      playSplashFallback({
        fb,
        canvasCtx: realCanvasContext(),
        palette: splashPalette,
        bitmapUp: solidIndexedImage(320, 200, 0x11),
        bitmapDown: solidIndexedImage(320, 200, 0x22),
        craneSprite: craneSprite(),
        titleFrame: solidIndexedImage(64, 32, 0x44),
        nowFn: () => Date.now(),
      }),
    )
    await vi.advanceTimersByTimeAsync(100)
    await playback.finishSplash(promise, 'Space')
    expect(fb.indices[0]).toBe(0x11)
    expect(fb.indices[199 * 320]).toBe(0x22)
  })
  it('Escape 也能结束播放', async () => {
    const fb = createFramebuffer()
    const promise = playback.track(
      playSplashFallback({
        fb,
        canvasCtx: realCanvasContext(),
        palette: splashPalette,
        bitmapUp: solidIndexedImage(320, 200, 0x11),
        bitmapDown: solidIndexedImage(320, 200, 0x22),
        craneSprite: craneSprite(),
        titleFrame: solidIndexedImage(64, 32, 0x44),
        nowFn: () => Date.now(),
      }),
    )
    await vi.advanceTimersByTimeAsync(100)
    await playback.finishSplash(promise, 'Escape')
  })
  it('自定义 skipKeys 拒绝默认 Space，只接受 KeyQ', async () => {
    const fb = createFramebuffer()
    const promise = playback.track(
      playSplashFallback({
        fb,
        canvasCtx: realCanvasContext(),
        palette: splashPalette,
        bitmapUp: solidIndexedImage(320, 200, 0x11),
        bitmapDown: solidIndexedImage(320, 200, 0x22),
        craneSprite: craneSprite(),
        titleFrame: solidIndexedImage(64, 32, 0x44),
        skipKeys: ['KeyQ'],
        nowFn: () => Date.now(),
      }),
    )
    await vi.advanceTimersByTimeAsync(100)
    const ignored = new KeyboardEvent('keydown', { code: 'Space', cancelable: true })
    window.dispatchEvent(ignored)
    await vi.advanceTimersByTimeAsync(85)
    const defaultWasIgnored = !ignored.defaultPrevented
    await playback.finishSplash(promise, 'KeyQ')
    expect(defaultWasIgnored).toBe(true)
  })
  it('L44:早跳过时标题补满完整高度(底部行也被画上)', async () => {
    const fb = createFramebuffer()
    const promise = playback.track(
      playSplashFallback({
        fb,
        canvasCtx: realCanvasContext(),
        palette: splashPalette,
        // bitmap 全屏填非 title 色,确保 title 区像素只可能来自 title blit
        bitmapUp: solidIndexedImage(320, 200, 0x11),
        bitmapDown: solidIndexedImage(320, 200, 0x22),
        craneSprite: craneSprite(),
        // 标题 (255,10) 64×32,fill 0x44。底部行 = y=41。
        titleFrame: solidIndexedImage(64, 32, 0x44),
        nowFn: () => Date.now(),
      }),
    )
    // 100ms 时标题尚未展开到 32 行。
    await vi.advanceTimersByTimeAsync(100)
    await playback.finishSplash(promise, 'Space')
    // 标题倒数第二行 y=40(dy=30)、x=260；早跳过时仅靠补满才会是 0x44。
    expect(fb.indices[40 * 320 + 260]).toBe(0x44)
  })
  it('L42:splash 结束做 PAL_FadeOut(1) 淡黑(最终帧全黑)', async () => {
    const fb = createFramebuffer()
    const localCtx = realCanvasContext()
    const promise = playback.track(
      playSplashFallback({
        fb,
        canvasCtx: localCtx,
        palette: splashPalette,
        bitmapUp: solidIndexedImage(320, 200, 0x11),
        bitmapDown: solidIndexedImage(320, 200, 0x22),
        craneSprite: craneSprite(),
        titleFrame: solidIndexedImage(64, 32, 0x44),
        nowFn: () => Date.now(),
      }),
    )
    await vi.advanceTimersByTimeAsync(100)
    await playback.finishSplash(promise, 'Space')
    // Actual Canvas output must be opaque black; nonempty dimensions prevent vacuous every().
    const last = localCtx.getImageData(0, 0, 320, 200)
    expect(last.data).toHaveLength(320 * 200 * 4)
    expect(last.data.every((value, i) => value === (i % 4 === 3 ? 255 : 0))).toBe(true)
  })
})

describe('Splash bitmap boundaries', () => {
  function crane() {
    return { frames: [solidIndexedImage(1, 1, 1)], anchorX: 0, anchorY: 0 }
  }
  beforeEach(() => vi.useFakeTimers())
  // TS defensive clipping input; production FBP is 320×200, so this is not an original-asset oracle.
  it('窄图只拷贝自身宽度', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999999999999999)
    const fb = createFramebuffer()
    const pending = playback.track(
      playSplashFallback({
        fb,
        canvasCtx: realCanvasContext(),
        palette: legalPalette(),
        bitmapUp: solidIndexedImage(10, 200, 77),
        bitmapDown: solidIndexedImage(320, 200, 22),
        craneSprite: crane(),
        titleFrame: solidIndexedImage(2, 2, 9),
      }),
    )
    await playback.finishSplash(pending, 'Space')
    expect(fb.indices[0]).toBe(77)
    expect(fb.indices[10]).toBe(0)
  })
  it('卷轴停在 iImgPos 1，底行仍是下图', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999999999999999)
    const fb = createFramebuffer()
    const pending = playback.track(
      playSplashFallback({
        fb,
        canvasCtx: realCanvasContext(),
        palette: legalPalette(),
        bitmapUp: solidIndexedImage(320, 200, 11),
        bitmapDown: solidIndexedImage(320, 200, 22),
        craneSprite: crane(),
        titleFrame: solidIndexedImage(2, 2, 9),
      }),
    )
    await vi.advanceTimersByTimeAsync(198 * 85)
    await playback.finishSplash(pending, 'Space')
    expect(fb.indices[0]).toBe(11)
    expect(fb.indices[198 * 320]).toBe(11)
    expect(fb.indices[199 * 320]).toBe(22)
  })
})
