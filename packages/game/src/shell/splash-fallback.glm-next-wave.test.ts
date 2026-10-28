/** Title reveal before skipping: three 85ms steps expose rows 0..2, not row 5.
 * Transparent cranes isolate this pixel oracle from the separately tested bitmap/skip paths.
 * This is a software pixel test, not full opening-sequence visual acceptance.
 */

import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { realCanvasContext } from '../__tests__/canvas-host.js'
import type { IndexedImage } from '../assets/png.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { playSplashFallback } from './splash-fallback.js'

const palette: Palette = {
  colors: Array.from({ length: 256 }, () => [50, 100, 150] as [number, number, number]),
  cycles: [],
}

function bitmap(w: number, h: number, fill: number, opaque = 1): IndexedImage {
  return {
    width: w,
    height: h,
    indices: new Uint8Array(w * h).fill(fill),
    opaque: new Uint8Array(w * h).fill(opaque),
  }
}

afterEach(async () => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
  await vi.advanceTimersByTimeAsync(2500)
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('playSplashFallback 标题渐显(sdlpal main.c:378-389 每帧 +1 行)', () => {
  it('未跳过的前 3 帧:title 只画 dy=0..2;dy=5 仍未画(fake timers 逐帧停点)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    // Keep transparent cranes on-screen so their opacity path is deterministic.
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const fb = createFramebuffer()
    const p = playSplashFallback({
      fb,
      canvasCtx: realCanvasContext(),
      palette,
      bitmapUp: bitmap(320, 200, 0x11),
      bitmapDown: bitmap(320, 200, 0x22),
      // 仙鹤帧全透明:不写任何像素,title 区像素只可能来自 title blit。
      craneSprite: {
        frames: [bitmap(1, 1, 0x99, 0), bitmap(1, 1, 0x99, 0), bitmap(1, 1, 0x99, 0)],
        anchorX: 0,
        anchorY: 0,
      },
      titleFrame: bitmap(64, 32, 0x44),
      nowFn: () => Date.now(),
    })

    // 3 × 85ms 帧间隔 → 恰完成 3 个循环体,停在第 4 帧 sleep。
    await vi.advanceTimersByTimeAsync(3 * 85)
    const at = (row: number, x: number): number => fb.indices[row * 320 + x]!
    const revealed = [at(10, 255), at(12, 255), at(15, 255)]

    // 收尾:真实释放 fake 时钟前先让挂起的 sleep 在 fake 时钟内自然走完跳过路径。
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await vi.advanceTimersByTimeAsync(2500)
    await p
    expect(revealed.slice(0, 2)).toEqual([0x44, 0x44])
    expect(revealed[2]).not.toBe(0x44)
  })
})
