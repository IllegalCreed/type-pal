/**
 * 特效 C/结局:结局动画(port sdlpal ending.c:282-393 PAL_EndingAnimation)。
 *
 * 400 帧(UTIL_Delay(50) ≈ 20fps)结局 cutscene:
 *  - 背景:pUpper(FBP DOS chunk 61)/ pLower(chunk 62)按 i/2 垂直滚动拼接(pLower 下移、pUpper 自顶推入)。
 *  - 水波:wScreenWave=2 全程(PAL_ApplyWave 每帧扭曲背景)。
 *  - 妖兽(MGO chunk 571):帧 0 在 (0,-400+i)、帧 1 在 (0,-200+i),自顶降下(top-left blit,负 y 裁剪)。
 *  - 女孩(MGO chunk 572):4 帧 walk 循环(i%4)在 (220, yPosGirl);yPosGirl 180→80(每隔帧 -1)。
 * modal,caller suspendRaf 包。Space/Enter/Escape 跳过。
 */
import type { Palette } from '@type-pal/shared'
import type { IndexedImage } from '../assets/png.js'
import { drawSprite } from '../present/draw-sprite.js'
import type { Framebuffer } from '../present/framebuffer.js'
import { flushToCanvas } from '../present/present.js'
import { applyScreenWave, resetScreenWavePhase } from '../present/screen-wave.js'

const SCREEN_W = 320
const SCREEN_H = 200
const N = SCREEN_W * SCREEN_H

export interface EndingAnimationOptions {
  /** FBP DOS chunk 61(上半背景)320×200 indices;缺 → 全黑。 */
  upperIndices: Uint8Array
  /** FBP DOS chunk 62(下半背景)。 */
  lowerIndices: Uint8Array
  /** MGO chunk 571 妖兽帧(用 0/1);不足 2 帧则跳过妖兽。 */
  beastFrames: IndexedImage[]
  /** MGO chunk 572 女孩帧(4 帧 walk);空则跳过女孩。 */
  girlFrames: IndexedImage[]
  fb: Framebuffer
  canvasCtx: CanvasRenderingContext2D
  palette: Palette
  skipKeys?: string[]
  /** 测试用:覆盖帧数(默认 400)+ 每帧延时(默认 50ms)。 */
  frameCount?: number
  frameDelayMs?: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * 等一次按键(port sdlpal PAL_WaitForKey(0) — 无限等玩家按键)。
 * 默认 Space/Enter/Escape(游戏 confirm 键);resolve 即继续。modal 序列中"看完按键继续"。
 */
export function waitForKey(keys: string[] = ['Space', 'Enter', 'Escape']): Promise<void> {
  return new Promise((resolve) => {
    const onKey = (e: KeyboardEvent): void => {
      if (keys.includes(e.code)) {
        e.preventDefault()
        window.removeEventListener('keydown', onKey, true)
        resolve()
      }
    }
    window.addEventListener('keydown', onKey, true)
  })
}

/** 把 palette rgb 整体缩放 factor(0=黑,1=原色)。 */
function scalePalette(base: Palette, factor: number): Palette {
  const f = Math.max(0, Math.min(1, factor))
  return {
    ...base,
    colors: base.colors.map(
      (c) =>
        [Math.floor(c[0]! * f), Math.floor(c[1]! * f), Math.floor(c[2]! * f)] as [
          number,
          number,
          number,
        ],
    ),
  }
}

/**
 * 阻塞淡出 —— palette rgb 100%→0%(屏幕内容不变,只暗调色板)。port sdlpal PAL_FadeOut 等价
 * (我们结局编排全程 suspendRaf,fade 不能走 present 驱动的 paletteFadeState,故用阻塞 palette-scale)。
 */
export async function fadeOutBlocking(
  fb: Framebuffer,
  canvasCtx: CanvasRenderingContext2D,
  palette: Palette,
  durationMs: number,
): Promise<void> {
  const start = performance.now()
  for (;;) {
    const t = performance.now() - start
    if (t >= durationMs) break
    flushToCanvas(fb, canvasCtx, scalePalette(palette, 1 - t / durationMs))
    await sleep(16)
  }
  flushToCanvas(fb, canvasCtx, scalePalette(palette, 0))
}

/** 阻塞淡入 —— palette rgb 0%→100%(屏幕内容已是目标图,从黑渐亮)。port PAL_FadeIn 等价。 */
export async function fadeInBlocking(
  fb: Framebuffer,
  canvasCtx: CanvasRenderingContext2D,
  palette: Palette,
  durationMs: number,
): Promise<void> {
  const start = performance.now()
  for (;;) {
    const t = performance.now() - start
    if (t >= durationMs) break
    flushToCanvas(fb, canvasCtx, scalePalette(palette, t / durationMs))
    await sleep(16)
  }
  flushToCanvas(fb, canvasCtx, palette)
}

/**
 * 阻塞 ColorFade —— 整个 palette 朝纯色 colors[colorIdx] crossfade(闪色过渡)。
 * 近似 sdlpal PAL_ColorFade(结局用 ColorFade(7,15):向 color 15 闪);我们做线性 crossfade 到该色,
 * 不复刻 64 步 ±4 nibble 细节(视觉等价的闪色;时长对齐 64*(delay*10)ms)。
 */
export async function colorFadeBlocking(
  fb: Framebuffer,
  canvasCtx: CanvasRenderingContext2D,
  palette: Palette,
  colorIdx: number,
  durationMs: number,
): Promise<void> {
  const c = palette.colors[colorIdx] ?? [0, 0, 0]
  const start = performance.now()
  const blend = (f: number): Palette => ({
    ...palette,
    colors: palette.colors.map(
      (p) =>
        [
          Math.round(p[0]! + (c[0]! - p[0]!) * f),
          Math.round(p[1]! + (c[1]! - p[1]!) * f),
          Math.round(p[2]! + (c[2]! - p[2]!) * f),
        ] as [number, number, number],
    ),
  })
  for (;;) {
    const t = performance.now() - start
    if (t >= durationMs) break
    flushToCanvas(fb, canvasCtx, blend(t / durationMs))
    await sleep(16)
  }
  flushToCanvas(fb, canvasCtx, blend(1))
}

/** top-left blit 一帧 MGO sprite 到 (x,y)(anchor=0,writePixel 自动裁剪负/越界)。 */
function blitTopLeft(fb: Framebuffer, frame: IndexedImage, x: number, y: number): void {
  drawSprite(fb, { ...frame, anchorX: 0, anchorY: 0 }, x, y)
}

export async function playEndingAnimation(o: EndingAnimationOptions): Promise<void> {
  const upper = o.upperIndices.length === N ? o.upperIndices : new Uint8Array(N)
  const lower = o.lowerIndices.length === N ? o.lowerIndices : new Uint8Array(N)
  const frameCount = o.frameCount ?? 400
  const frameDelayMs = o.frameDelayMs ?? 50
  const next = new Uint8Array(N)
  // wScreenWave=2 全程(ending.c:329);sWaveProgression=0 → 恒定波幅。局部状态不污染 gs。
  const wave = { wScreenWave: 2, sWaveProgression: 0 }
  resetScreenWavePhase()
  let yPosGirl = 180

  let skipped = false
  const skipKeys = new Set(o.skipKeys ?? [])
  const onKey = (e: KeyboardEvent): void => {
    if (skipKeys.has(e.code)) {
      e.preventDefault()
      skipped = true
    }
  }
  window.addEventListener('keydown', onKey, true)
  try {
    for (let i = 0; i < frameCount && !skipped; i++) {
      const h = Math.floor(i / 2) // 0..200,背景滚动高度
      // 背景:pLower rows [0,200-h) → 屏 [h,200);pUpper rows [200-h,200) → 屏 [0,h)(ending.c:336-350)
      next.set(lower.subarray(0, (200 - h) * SCREEN_W), h * SCREEN_W)
      next.set(upper.subarray((200 - h) * SCREEN_W, N), 0)
      o.fb.indices.set(next)
      // 水波扭曲背景(wScreenWave=2 恒定)
      if (wave.wScreenWave !== 0) applyScreenWave(o.fb.indices, wave)
      // 妖兽:帧 0@(0,-400+i)、帧 1@(0,-200+i)
      if (o.beastFrames.length >= 2) {
        blitTopLeft(o.fb, o.beastFrames[0]!, 0, -400 + i)
        blitTopLeft(o.fb, o.beastFrames[1]!, 0, -200 + i)
      }
      // 女孩:4 帧 walk 用墙钟时间驱动(L45,ending.c:368 `(SDL_GetTicks()/50)%4`),掉帧时步频仍跟真实
      //   时间、不随渲染抖动错相;yPosGirl 180→80 仍用循环计数 i&1(对齐 ending.c:362)。
      if (o.girlFrames.length > 0) {
        yPosGirl -= i & 1
        if (yPosGirl < 80) yPosGirl = 80
        const gf = o.girlFrames[Math.floor(performance.now() / 50) % o.girlFrames.length]!
        blitTopLeft(o.fb, gf, 220, yPosGirl)
      }
      flushToCanvas(o.fb, o.canvasCtx, o.palette)
      await sleep(frameDelayMs)
    }
  } finally {
    window.removeEventListener('keydown', onKey, true)
  }
}
