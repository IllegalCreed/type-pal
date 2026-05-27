/**
 * M5.6 T18 Step 4:RNG.MKF 动画播放(DOS build 路径 — Trademark fallback 用)。
 *
 * 用途:sdlpal `PAL_RNGPlay(iNumRNG, iStartFrame, iEndFrame, iSpeed)`(rngplay.c:371-448)
 *      —— main.c:200 `PAL_TrademarkScreen` fallback 调 `PAL_RNGPlay(6, 0, -1, 25)`,
 *      即播 RNG.MKF chunk 6 从 frame 0 到 last,iSpeed=25 → 帧间隔 1/25s。
 *
 * 数据源(M5.6 T18 Step 2 pal-extract 真做):
 *   - `/extracted/data/rng-frames.json` manifest(每 chunk frame 列表)
 *   - `/extracted/images/animation/rng-{NN}/frame-{NNN}.png`(320×200 8-bit indexed)
 *
 * 设计:
 *  - Prefetch 全帧 PNG → IndexedImage[](chunk 6 = 54 帧,~MB,可接受)
 *  - 逐帧 fb.indices 直写 + flushToCanvas + sleep(frameDelayMs)
 *  - Space/Enter/Escape 跳过
 *  - 不知 gs — caller(bootstrap)try/finally 包 suspendRaf
 */
import type { Palette } from '@type-pal/shared'
import { decodePngToIndices, type IndexedImage } from '../assets/png.js'
import type { Framebuffer } from '../present/framebuffer.js'
import { flushToCanvas } from '../present/present.js'

interface RngFramesManifest {
  chunks: Array<{
    chunkIndex: number
    frameCount: number
    frames: Array<{ index: number }>
  }>
}

export interface PlayRngOptions {
  /** RNG.MKF chunk index(0-11)。sdlpal `PAL_RNGPlay` 第 1 参 iNumRNG。 */
  chunkIdx: number

  /** sdlpal iSpeed=25 → 1000/25 = 40ms;trademark fallback 真值用 25。 */
  frameDelayMs: number

  fb: Framebuffer
  canvasCtx: CanvasRenderingContext2D
  /** 当前 palette(sdlpal `PAL_SetPalette(3)` 在 Trademark fallback 前调 → palette 3)。 */
  palette: Palette

  /** 起始帧,默认 0(sdlpal iStartFrame)。 */
  startFrame?: number
  /** 结束帧,默认 -1 = 全播(sdlpal iEndFrame;-1 → manifest 内 frameCount-1)。 */
  endFrame?: number

  /** 跳过键,默认 Space/Enter/Escape。 */
  skipKeys?: string[]

  /**
   * 测试 only override fetchers — 生产从 `/extracted/` fetch,测试注入 mock。
   * 不传则用默认 `fetch + decodePngToIndices`。
   */
  fetchManifest?: () => Promise<RngFramesManifest>
  fetchFrame?: (chunkIdx: number, frameIdx: number) => Promise<IndexedImage>
}

async function fetchPng(url: string): Promise<IndexedImage> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`rng-player: fetch ${url} failed (${res.status})`)
  return decodePngToIndices(await res.blob())
}

async function defaultFetchManifest(): Promise<RngFramesManifest> {
  const res = await fetch('/extracted/data/rng-frames.json')
  if (!res.ok) throw new Error(`rng-player: manifest fetch failed (${res.status})`)
  return (await res.json()) as RngFramesManifest
}

async function defaultFetchFrame(chunkIdx: number, frameIdx: number): Promise<IndexedImage> {
  const chunkPad = chunkIdx.toString().padStart(2, '0')
  const framePad = frameIdx.toString().padStart(3, '0')
  return fetchPng(`/extracted/images/animation/rng-${chunkPad}/frame-${framePad}.png`)
}

/** sleep 帮手(promise + setTimeout)。 */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * 播 RNG 动画 — sdlpal `PAL_RNGPlay` 等价。
 *
 * Promise resolve 时机 = 全部帧播完 OR 用户按跳过键 OR manifest/帧加载失败(warn + return)。
 */
export async function playRng(options: PlayRngOptions): Promise<void> {
  const skipKeys = new Set(options.skipKeys ?? ['Space', 'Enter', 'Escape'])
  let skipped = false
  const onKey = (e: KeyboardEvent): void => {
    if (skipKeys.has(e.code)) {
      e.preventDefault()
      skipped = true
    }
  }
  window.addEventListener('keydown', onKey, true)

  const fetchManifest = options.fetchManifest ?? defaultFetchManifest
  const fetchFrame = options.fetchFrame ?? defaultFetchFrame

  try {
    // 1. fetch manifest
    let manifest: RngFramesManifest
    try {
      manifest = await fetchManifest()
    }
    catch (err) {
      console.warn('[rng-player] manifest fetch failed:', err)
      return
    }
    const chunk = manifest.chunks.find((c) => c.chunkIndex === options.chunkIdx)
    if (!chunk) {
      console.warn(`[rng-player] chunk ${options.chunkIdx} 不在 manifest`)
      return
    }

    const startFrame = options.startFrame ?? 0
    const endFrameRaw = options.endFrame ?? -1
    const endFrame = endFrameRaw < 0 ? chunk.frameCount - 1 : endFrameRaw
    if (startFrame > endFrame) return

    // 2. prefetch 全部帧 PNG
    const frameIndices = chunk.frames
      .filter((f) => f.index >= startFrame && f.index <= endFrame)
      .map((f) => f.index)

    const frames = await Promise.all(
      frameIndices.map(async (fi) => {
        try {
          return await fetchFrame(options.chunkIdx, fi)
        }
        catch (err) {
          console.warn(`[rng-player] frame ${fi} fetch fail, skip:`, err)
          return null
        }
      }),
    )

    // 3. play loop — 逐帧 blit + sleep
    for (const frame of frames) {
      if (skipped) break
      if (!frame) continue
      // 跨 frame 直接覆盖 fb.indices(RNG 已是完整 320×200,不是 delta — 解码时已累加)
      options.fb.indices.set(frame.indices)
      flushToCanvas(options.fb, options.canvasCtx, options.palette)
      await sleep(options.frameDelayMs)
    }
  }
  finally {
    window.removeEventListener('keydown', onKey, true)
  }
}
