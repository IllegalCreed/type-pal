/**
 * RNG 序列图动画播放(过场编排 · 运行时)—— 播原版 RNG.MKF chunk(开场梦境 / 剧情过场 / 结局)。
 *
 * 数据源(与一阶段共享同一提取产物):
 *   - `/extracted/data/rng-frames.json` manifest(每 chunk frameCount + frame index 列表)
 *   - `/extracted/data/animation/rng-{NN}.rle`(gzip 原始 RNG chunk)→ decompressGzip →
 *     shared decodeRngFrames 解出全帧(每帧 = 完整 320×200 索引面,delta 已在解码累加)。
 *
 * 渲染出口有两种:引擎传 `onFrame` 时只输出 RGBA 帧，由 Cinematic Layer 统一合成；独立预览不传时
 * 自建全屏 `<canvas>`。播放器只负责解码、上色、计时与跳过键，不决定引擎内的视觉层级。
 *
 * clean 版对齐一阶段 UX(全屏黑底 + 跳过键),但用 canvas 上色而非一阶段的索引 framebuffer。
 * palette 由调用方按过场指定(原版 PAL_SetPalette 在 PAL_RNGPlay 前设);frameDelayMs = 1000/iSpeed。
 */
import { decodeRngFrames, type Palette, RNG_HEIGHT, RNG_WIDTH } from '@type-pal/shared'
import { decompressGzip } from './assets.js'

/**
 * 每个 RNG 序列图的**正确调色盘号**(从原版脚本 `setPalette→SetRNG→PlayRNG` 链扒出;chunk 6 = 开机
 * `PAL_SetPalette(3)`)。RNG 是固定一份调色盘的素材 —— 用对的这份烘一次就完事,**运行时/编辑器都不该
 * 暴露"调色盘"给使用者选**(清洁重写不把 1995 索引色概念带进新系统)。缺表 = 场景默认盘 0。
 * 归宿:该随 RNG 素材做成 metadata(rng-frames.json)在提取期定死;暂列此处为单一真源。
 */
export const RNG_PALETTE: Readonly<Record<number, number>> = { 3: 2, 6: 3, 7: 6 }
export function rngPaletteId(chunkIdx: number): number {
  return RNG_PALETTE[chunkIdx] ?? 0
}

export interface PlayRngOptions {
  /** RNG.MKF chunk index(0-11)。sdlpal PAL_RNGPlay 第 1 参 iNumRNG。 */
  chunkIdx: number
  /** 上色用调色板(过场按剧情指定;原版 PAL_SetPalette 在 RNGPlay 前设)。 */
  palette: Palette
  /** 帧间隔 ms(= 1000/iSpeed;trademark fallback iSpeed=25 → 40ms)。默认 40。 */
  frameDelayMs?: number
  /** 起始帧,默认 0。 */
  startFrame?: number
  /** 结束帧,默认 -1 = 播到末帧。 */
  endFrame?: number
  /** 跳过键(KeyboardEvent.code),默认 Space/Enter/Escape。 */
  skipKeys?: string[]
  containerEl?: HTMLElement
  /** 引擎呈现栈帧出口；提供后不挂 DOM overlay，由调用方的 Cinematic Layer 合成。 */
  onFrame?: (frame: RngFrameSnapshot) => void
  /** 测试注入:替换 chunk 加载(免真 fetch)。 */
  loadChunk?: (
    chunkIdx: number,
  ) => Promise<{ frameCount: number; framesByIndex: Map<number, Uint8Array> }>
}

/** RNG 播放结束时最后一张真正落到屏幕上的 RGBA 帧。供后续对话保持动画末帧。 */
export interface RngFrameSnapshot {
  readonly width: number
  readonly height: number
  readonly rgba: Uint8ClampedArray
}

async function defaultLoadChunk(
  chunkIdx: number,
): Promise<{ frameCount: number; framesByIndex: Map<number, Uint8Array> }> {
  const url = `/extracted/data/animation/rng-${chunkIdx.toString().padStart(2, '0')}.rle`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`rng-player: fetch ${url} failed (${res.status})`)
  const bytes = await decompressGzip(await res.blob())
  const framesByIndex = new Map<number, Uint8Array>()
  for (const f of decodeRngFrames(bytes)) framesByIndex.set(f.index, f.pixels)
  return { frameCount: framesByIndex.size, framesByIndex }
}

/** sleep 帮手。 */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** 索引面 → RGBA ImageData(经 palette 上色;RNG 全屏不透明,alpha 恒 255)。 */
function colorFrame(pixels: Uint8Array, palette: Palette, out: ImageData): void {
  const colors = palette.colors
  const data = out.data
  for (let i = 0; i < pixels.length; i++) {
    const c = colors[pixels[i] ?? 0] ?? [0, 0, 0]
    const o = i * 4
    data[o] = c[0]
    data[o + 1] = c[1]
    data[o + 2] = c[2]
    data[o + 3] = 255
  }
}

/**
 * 播 RNG 动画 — sdlpal PAL_RNGPlay 等价。Promise resolve 时机 = 全帧播完 / 跳过键 / 加载失败(warn)。
 * 成功画过至少一帧时返回最后一帧快照；SSR、加载失败或零帧则返回 undefined。
 */
export async function playRng(options: PlayRngOptions): Promise<RngFrameSnapshot | undefined> {
  if (typeof document === 'undefined') return
  const skipKeys = new Set(options.skipKeys ?? ['Space', 'Enter', 'Escape'])
  const container = options.containerEl ?? document.body
  const frameDelayMs = options.frameDelayMs ?? 40
  const loadChunk = options.loadChunk ?? defaultLoadChunk

  let chunk: { frameCount: number; framesByIndex: Map<number, Uint8Array> }
  try {
    chunk = await loadChunk(options.chunkIdx)
  } catch (err) {
    console.warn('[rng-player] chunk load failed:', err)
    return
  }
  const startFrame = options.startFrame ?? 0
  const endRaw = options.endFrame ?? -1
  const endFrame = endRaw < 0 ? chunk.frameCount - 1 : endRaw
  if (startFrame > endFrame) return

  const canvas = document.createElement('canvas')
  canvas.width = RNG_WIDTH
  canvas.height = RNG_HEIGHT
  if (!options.onFrame)
    canvas.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:100vw',
      'height:100vh',
      'object-fit:contain', // 等比 + 黑边
      'background-color:#000',
      'image-rendering:pixelated', // 整数放大不糊
      'z-index:10000',
    ].join(';')
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const img = ctx.createImageData(RNG_WIDTH, RNG_HEIGHT)

  let skipped = false
  let rendered = false
  let lastSnapshot: RngFrameSnapshot | undefined
  const onKey = (e: KeyboardEvent): void => {
    if (!skipKeys.has(e.code)) return
    e.preventDefault()
    e.stopImmediatePropagation()
    skipped = true
  }
  window.addEventListener('keydown', onKey, true)
  if (!options.onFrame) container.appendChild(canvas)

  try {
    for (let fi = startFrame; fi <= endFrame; fi++) {
      if (skipped) break
      const pixels = chunk.framesByIndex.get(fi)
      if (!pixels) continue
      colorFrame(pixels, options.palette, img)
      if (options.onFrame) {
        lastSnapshot = {
          width: RNG_WIDTH,
          height: RNG_HEIGHT,
          rgba: new Uint8ClampedArray(img.data),
        }
        options.onFrame(lastSnapshot)
      } else {
        ctx.putImageData(img, 0, 0)
      }
      rendered = true
      await sleep(frameDelayMs)
    }
  } finally {
    window.removeEventListener('keydown', onKey, true)
    canvas.parentElement?.removeChild(canvas)
  }
  if (!rendered) return
  return (
    lastSnapshot ?? {
      width: RNG_WIDTH,
      height: RNG_HEIGHT,
      rgba: new Uint8ClampedArray(img.data),
    }
  )
}
