/**
 * DOS 商标演出：RNG chunk 6（25 帧/秒）→ 停留 1000ms → 淡黑 600ms。
 * 顺序与参数参考 reference/sdlpal/main.c 的 PAL_TrademarkScreen；palette 3 由 caller 传入。
 * 渐变沿用本项目按经过时间缩放 RGB 的实现；SDLPal 的 PAL_FadeOut 使用 j/64 整数步，
 * 这里不承诺中间帧像素逐字节相同。RNG/计时/呈现由本 Promise 串行推进，caller 管理 RAF。
 */
import type { Palette } from '@type-pal/shared'
import type { IndexedImage } from '../assets/png.js'
import type { Framebuffer } from '../present/framebuffer.js'
import { flushToCanvas } from '../present/present.js'
import { playRng } from './rng-player.js'

export interface PlayTrademarkFallbackOptions {
  fb: Framebuffer
  canvasCtx: CanvasRenderingContext2D
  /** sdlpal `PAL_SetPalette(3, FALSE)` — palette chunk 3(caller fetch 后传入)。 */
  palette: Palette

  /** 显式传入才允许跳过键;默认不允许跳过(对齐 playRng 的 PAL 真值)。 */
  skipKeys?: string[]

  /** 测试 only override fetch(透传到 playRng)。 */
  fetchManifest?: Parameters<typeof playRng>[0]['fetchManifest']
  fetchFrame?: (chunkIdx: number, frameIdx: number) => Promise<IndexedImage>

  /** 测试 only:override timing source(skip delay / fadeOut 用)。 */
  nowFn?: () => number

  /** RNG 播完后到 fadeOut 之间的 delay — sdlpal `UTIL_Delay(1000)` 真值,默认 1000ms。 */
  delayBeforeFadeMs?: number

  /** 淡出时长，默认 600ms（PAL_FadeOut(1) 的 iDelay * 10 * 60）。 */
  fadeOutMs?: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function scalePalette(base: Palette, factor: number): Palette {
  const f = Math.max(0, Math.min(1, factor))
  return {
    ...base,
    colors: base.colors.map(
      (c) =>
        [Math.floor(c[0] * f), Math.floor(c[1] * f), Math.floor(c[2] * f)] as [
          number,
          number,
          number,
        ],
    ),
  }
}

async function fadeOut(
  fb: Framebuffer,
  canvasCtx: CanvasRenderingContext2D,
  palette: Palette,
  durationMs: number,
  nowFn: () => number,
): Promise<void> {
  const start = nowFn()
  while (true) {
    const t = nowFn() - start
    if (t >= durationMs) break
    const factor = 1 - t / durationMs
    flushToCanvas(fb, canvasCtx, scalePalette(palette, factor))
    await sleep(16) // ~60fps
  }
  flushToCanvas(fb, canvasCtx, scalePalette(palette, 0))
}

export async function playTrademarkFallback(options: PlayTrademarkFallbackOptions): Promise<void> {
  const now = options.nowFn ?? (() => performance.now())

  // 1. 播 RNG chunk 6(sdlpal PAL_RNGPlay(6, 0, -1, 25))
  await playRng({
    chunkIdx: 6,
    frameDelayMs: 1000 / 25, // 40ms — sdlpal iSpeed=25
    fb: options.fb,
    canvasCtx: options.canvasCtx,
    palette: options.palette,
    skipKeys: options.skipKeys,
    fetchManifest: options.fetchManifest,
    fetchFrame: options.fetchFrame,
  })

  await sleep(options.delayBeforeFadeMs ?? 1000)

  await fadeOut(options.fb, options.canvasCtx, options.palette, options.fadeOutMs ?? 600, now)
}
