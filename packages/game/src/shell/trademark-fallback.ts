/**
 * M5.6 T18 Step 6:Trademark fallback(DOS build)— sdlpal `PAL_TrademarkScreen`
 * `reference/sdlpal/main.c:197-203` 真值 1:1 port:
 *
 *   {
 *      if (PAL_PlayAVI("1.avi")) return;  // WIN95 路径,DOS 跳过
 *      PAL_SetPalette(3, FALSE);
 *      PAL_RNGPlay(6, 0, -1, 25);
 *      UTIL_Delay(1000);
 *      PAL_FadeOut(1);
 *   }
 *
 * 流程(DOS):
 *  1. palette 切到 chunk 3(caller 已加载并传入)
 *  2. 播 RNG.MKF chunk 6 全帧,iSpeed=25 → 帧间隔 1000/25 = 40ms
 *  3. 1 秒 delay 让 user 看清最后一帧
 *  4. 1 秒淡出到全黑(palette rgb 缩放 1.0 → 0.0)
 *
 * 设计:复用 [playRng](rng-player.ts);fadeOut 内嵌(scalePalette + flushToCanvas
 * loop)— 简版,跟 splash-fallback.ts 一致。
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

  /** 跳过键,默认 Space/Enter/Escape;透传到 playRng。 */
  skipKeys?: string[]

  /** 测试 only override fetch(透传到 playRng)。 */
  fetchManifest?: Parameters<typeof playRng>[0]['fetchManifest']
  fetchFrame?: (chunkIdx: number, frameIdx: number) => Promise<IndexedImage>

  /** 测试 only:override timing source(skip delay / fadeOut 用)。 */
  nowFn?: () => number

  /** RNG 播完后到 fadeOut 之间的 delay — sdlpal `UTIL_Delay(1000)` 真值,默认 1000ms。 */
  delayBeforeFadeMs?: number

  /** L43:fadeOut 时长 — sdlpal `PAL_FadeOut(1)` = iDelay*10*60 = 600ms(palette.c:163),非 1000ms。 */
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

/**
 * 1 秒 fadeOut — palette rgb 从 100% 缩放到 0%。
 * sdlpal `PAL_FadeOut(1)` 等价(细节 fadescreen.c 略)。
 */
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

  // 2. 1s delay(sdlpal UTIL_Delay(1000))
  await sleep(options.delayBeforeFadeMs ?? 1000)

  // 3. 1s fadeOut(sdlpal PAL_FadeOut(1))
  await fadeOut(options.fb, options.canvasCtx, options.palette, options.fadeOutMs ?? 600, now) // L43:PAL_FadeOut(1)=600ms
}
