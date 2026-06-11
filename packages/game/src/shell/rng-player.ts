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
import { applyScreenShake } from '../present/screen-shake.js'

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
  /**
   * 第一帧写入后从黑淡入目标 palette 的时长。用于复刻 PAL_RNGPlay 内 fNeedToFadeIn 分支;
   * undefined/0 表示直接显示。
   */
  initialFadeInMs?: number

  /**
   * DM27:跳过键,**默认空 = 不可跳**(C 真值:PAL_RNGPlay/ShowFBP/ScrollFBP/EndingAnimation
   * 主循环均无 dwKeyPress 检查,rngplay.c:409-443,连 trademark 开机动画都不可跳;且末帧常驻
   * 供后续脚本叠字——可跳会停在中间帧)。仅显式传入才可跳(目前无调用方,dev 工具可用)。
   */
  skipKeys?: string[]

  /**
   * sdlpal rngplay.c:436:每帧 blit 后 VIDEO_UpdateScreen(NULL)(video.c:571-616)——
   * shake 进行中(g_wShakeTime!=0)对**视频帧本身**施加垂直跳动并 g_wShakeTime--。
   * bootstrap 传 gs(结构匹配);不传 = 无 shake(trademark fallback / 测试)。
   * 漏接的后果:0x35 震屏计数在 RNG 播放期间冻结,整段泄漏进下一场景
   * (僵尸王→血池演出:0x35[90] 本该在 25 帧等待 + 64 帧坠落视频里耗完,却带 65 帧进血池狂抖)。
   */
  shakeState?: { shakeTime: number, shakeLevel: number }

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

function scalePalette(base: Palette, factor: number): Palette {
  return {
    colors: base.colors.map(([r, g, b]) => [
      Math.round(r * factor),
      Math.round(g * factor),
      Math.round(b * factor),
    ]),
    cycles: base.cycles,
  }
}

/** 首帧已写入 fb 后,保持该帧并把 palette 从黑升到目标色。 */
async function fadeInFirstFrame(options: PlayRngOptions): Promise<void> {
  const durationMs = options.initialFadeInMs ?? 0
  if (durationMs <= 0) {
    flushToCanvas(options.fb, options.canvasCtx, options.palette)
    return
  }

  const started = performance.now()
  flushToCanvas(options.fb, options.canvasCtx, scalePalette(options.palette, 0))
  while (true) {
    const elapsed = performance.now() - started
    const progress = Math.min(elapsed / durationMs, 1)
    flushToCanvas(options.fb, options.canvasCtx, scalePalette(options.palette, progress))
    if (progress >= 1) break
    await sleep(Math.min(16, Math.max(1, durationMs - elapsed)))
  }
}

/**
 * 播 RNG 动画 — sdlpal `PAL_RNGPlay` 等价。
 *
 * Promise resolve 时机 = 全部帧播完 OR 用户按跳过键 OR manifest/帧加载失败(warn + return)。
 */
export async function playRng(options: PlayRngOptions): Promise<void> {
  const skipKeys = new Set(options.skipKeys ?? [])
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

    // 3. play loop — 逐帧 blit + sleep。PAL_RNGPlay 在首帧后消费 fNeedToFadeIn。
    let firstFrame = true
    let framesShown = 0
    for (const frame of frames) {
      if (skipped) break
      if (!frame) continue
      framesShown++
      // 跨 frame 直接覆盖 fb.indices(RNG 已是完整 320×200,不是 delta — 解码时已累加)
      options.fb.indices.set(frame.indices)
      // sdlpal VIDEO_UpdateScreen(NULL) shake 分支:每显示帧对视频本身施震一次 + shakeTime--。
      //   下一帧 indices.set 整幅覆盖,偏移不累积。
      if (options.shakeState && options.shakeState.shakeTime !== 0) {
        applyScreenShake(options.fb.indices, options.shakeState)
      }
      if (firstFrame) {
        await fadeInFirstFrame(options)
        firstFrame = false
        // PAL_FadeIn 已越过首帧 deadline,淡入后立即解码下一帧。
        if ((options.initialFadeInMs ?? 0) > 0) continue
      }
      else {
        flushToCanvas(options.fb, options.canvasCtx, options.palette)
      }
      await sleep(options.frameDelayMs)
    }

    // 跳过键提前结束(sdlpal 无跳过,全片每帧都 UpdateScreen 递减):把未显示帧的 shake 递减一次性
    //   结清,保证 shakeTime 与"完整播完"一致 —— 否则跳过坠落视频又把残余震屏带进下一场景。
    if (skipped && options.shakeState) {
      const remaining = frames.length - framesShown
      options.shakeState.shakeTime = Math.max(0, options.shakeState.shakeTime - remaining)
    }
  }
  finally {
    window.removeEventListener('keydown', onKey, true)
  }
}
