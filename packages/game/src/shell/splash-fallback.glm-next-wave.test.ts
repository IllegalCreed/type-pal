/** GLM Wave I / I06 — splash-fallback.ts 标题渐显逐帧推进未证公开合同(生产冻结 ced193f4)。
 *
 * 旧证去重:splash-fallback.test.ts 已证三跳过键 / 自定义键表 / 滚动 bitmap blit /
 * L44 早跳过标题补满 / L42 退出淡黑;不含「未跳过时标题每帧 +1 行渐显」的前半段行为。
 * 本文件用 fake timers 精确停在第 3 帧后(sdlpal main.c:378-389:titleVisibleHeight 每帧 +1):
 *  - 第 3 帧后:title dy=0..2 已画(fb 行 10..12),dy=5(fb 行 15)未画;
 *  - 仙鹤帧全透明替换,保证 title 区像素只可能来自 title blit(锚定断言)。
 * nowFn 传 Date.now(被 fake Date 驱动)使跳过补完渐变 + 600ms 淡出在 fake 时钟下可终止。
 */

import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

/** DOM 替身:原型链正确的 2D 上下文,只实现 flushToCanvas 声明的 putImageData 端口。 */
/** DOM 替身:原型取自环境自身 2D 上下文,只实现 flushToCanvas 声明的 putImageData 端口。 */
function ctxSpy(): CanvasRenderingContext2D {
  const probe = document.createElement('canvas').getContext('2d')
  const proto = probe ? Object.getPrototypeOf(probe) : Object.prototype
  return Object.assign(Object.create(proto), { putImageData: vi.fn() })
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('playSplashFallback 标题渐显(sdlpal main.c:378-389 每帧 +1 行)', () => {
  it('未跳过的前 3 帧:title 只画 dy=0..2;dy=5 仍未画(fake timers 逐帧停点)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const fb = createFramebuffer()
    const p = playSplashFallback({
      fb,
      canvasCtx: ctxSpy(),
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
    expect(at(10, 255)).toBe(0x44) // dy=0(第 1 帧起)
    expect(at(12, 255)).toBe(0x44) // dy=2(第 3 帧新画)
    expect(at(15, 255)).not.toBe(0x44) // dy=5 未画

    // 收尾:真实释放 fake 时钟前先让挂起的 sleep 在 fake 时钟内自然走完跳过路径。
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await vi.runAllTimersAsync()
    await p
  }, 10_000)
})
