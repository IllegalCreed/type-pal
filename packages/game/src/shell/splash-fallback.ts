/**
 * M5.6 T18 Step 5:Splash 卷轴动画(DOS build fallback)— sdlpal `PAL_SplashScreen`
 * `reference/sdlpal/main.c:206-456` 真值 1:1 port。
 *
 * 视觉(sdlpal):
 *  1. FBP chunk 3(上半)/ chunk 4(下半)320×200 全屏背景,起手 iImgPos=200(下半占满),
 *     每帧 iImgPos--,递减到 1 停 → 上半从顶部滚入,下半被推到屏底,中间露出 split line
 *  2. 9 只仙鹤(MGO chunk 73 sprite group 8 帧)随机起始位置 [300-600, 0-80],
 *     8 帧动画(iCraneFrame & 1 时帧 +1 % 8),每帧 cranepos[i][0]--(向左飘),
 *     iImgPos 奇数时 cranepos[i][1]++(向下飘)
 *  3. 标题 RLE 位图(MGO chunk 71 frame 0)在 PAL_XY(255, 10),从 0 行高度递增到完整
 *     height(每帧 +1 行)→ "从上往下长"渐显
 *  4. palette 1 从全 0(黑屏)渐变到 100% 在 15000ms 内(每帧 SetPalette
 *     rgb * dwTime/15000)
 *  5. 帧间隔 sdlpal 真值 `dwBeginTime + dwTime + 85ms`(SDL_GetTicks)≈ 12fps
 *  6. 按 Menu/Search 键:补完渐变 quick(+250ms 步进)+ 0.5s delay + break
 *  7. 退出时 fadeout(留 caller 处理或简版直接清屏)
 *
 * 设计:
 *  - 不知 gs / suspendRaf — caller(bootstrap)try/finally 包
 *  - palette mutable per-frame(rgb 渐变);flushToCanvas 接 Palette,每帧构 fresh
 *  - 用 requestAnimationFrame loop + delta time(同 sdlpal SDL_GetTicks 等价)
 */
import type { Palette } from '@type-pal/shared'
import type { IndexedImage } from '../assets/png.js'
import type { Framebuffer } from '../present/framebuffer.js'
import { flushToCanvas } from '../present/present.js'

export interface CraneSprite {
  frames: IndexedImage[]
  anchorX: number
  anchorY: number
}

export interface PlaySplashFallbackOptions {
  fb: Framebuffer
  canvasCtx: CanvasRenderingContext2D
  /** sdlpal `PAL_GetPalette(1, FALSE)` — palette chunk 1。每帧渐变缩放后画到 canvas。 */
  palette: Palette
  /** FBP chunk 3 SPLASH_UP(320×200 全屏)。 */
  bitmapUp: IndexedImage
  /** FBP chunk 4 SPLASH_DOWN(320×200 全屏)。 */
  bitmapDown: IndexedImage
  /** MGO chunk 73 SPLASH_CRANE 仙鹤 sprite group(8 帧 + anchor)。 */
  craneSprite: CraneSprite
  /** MGO chunk 71 SPLASH_TITLE 标题 sprite frame 0。 */
  titleFrame: IndexedImage
  /** 跳过键,默认 Space/Enter/Escape(sdlpal `kKeyMenu | kKeySearch`,uigame.c:395)。 */
  skipKeys?: string[]
  /** 测试 only:override timing source。 */
  nowFn?: () => number
}

const SCREEN_W = 320
const SCREEN_H = 200
const FADE_IN_MS = 15000 // sdlpal main.c:317 dwTime < 15000 全帧渐变
const FRAME_INTERVAL_MS = 85 // sdlpal main.c:439 `dwTime + 85`
const SKIP_FAST_STEP_MS = 250 // sdlpal main.c:424 跳过时快进步长
const POST_SKIP_DELAY_MS = 500 // sdlpal main.c:426 跳过后 UTIL_Delay(500)
const CRANE_COUNT = 9 // sdlpal main.c:280 `for (i = 0; i < 9; i++)`
const TITLE_POS = { x: 255, y: 10 } // sdlpal main.c:389 PAL_XY(255, 10)

interface CranePos {
  x: number
  y: number
  frameIdx: number
}

function randomLong(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1))
}

/** 构造一份 rgb scaled 当前 palette(0 → 100% over FADE_IN_MS)。 */
function scalePalette(base: Palette, factor: number): Palette {
  const f = Math.max(0, Math.min(1, factor))
  return {
    ...base,
    colors: base.colors.map((c) => [
      Math.floor(c[0] * f),
      Math.floor(c[1] * f),
      Math.floor(c[2] * f),
    ] as [number, number, number]),
  }
}

/** 320×200 全屏 indexed bitmap 整面 blit 到 fb(`fb.indices.set`)。 */
function blitFullScreen(fb: Framebuffer, bitmap: IndexedImage): void {
  // bitmap 期望 320×200;不匹配时只 copy 重叠区域
  if (bitmap.width === SCREEN_W && bitmap.height === SCREEN_H) {
    fb.indices.set(bitmap.indices)
    return
  }
  const w = Math.min(bitmap.width, SCREEN_W)
  const h = Math.min(bitmap.height, SCREEN_H)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      fb.writePixel(x, y, bitmap.indices[y * bitmap.width + x]!)
    }
  }
}

/**
 * 部分行 blit — 从 bitmap 的 srcY 行起取 h 行,写到 fb 的 dstY 行起 h 行。
 * sdlpal `VIDEO_CopySurface` srcrect/dstrect 等价(主要用于上下两 bitmap 滚动)。
 */
function blitRows(
  fb: Framebuffer,
  bitmap: IndexedImage,
  srcY: number,
  dstY: number,
  rows: number,
): void {
  const h = Math.min(rows, SCREEN_H - dstY, bitmap.height - srcY)
  if (h <= 0) return
  for (let y = 0; y < h; y++) {
    const srcOff = (srcY + y) * bitmap.width
    const dstOff = (dstY + y) * SCREEN_W
    fb.indices.set(bitmap.indices.subarray(srcOff, srcOff + Math.min(bitmap.width, SCREEN_W)), dstOff)
  }
}

/**
 * 通用 sprite blit(透明):左上角画在 (posX - anchorX, posY - anchorY)。
 * 开场 splash 的仙鹤 / 标题都走 sdlpal main.c PAL_RLEBlitToSurface = **左上角** blit,
 * 故 caller 传 anchor (0,0)。透明像素由 opaque mask 决定(0 = 透明,跳过)。
 */
function blitSpriteAt(
  fb: Framebuffer,
  frame: IndexedImage,
  anchorX: number,
  anchorY: number,
  posX: number,
  posY: number,
  /** 部分渲染:只画前 visibleRows 行(标题渐显用)。-1 = 全画。 */
  visibleRows = -1,
): void {
  const left = posX - anchorX
  const top = posY - anchorY
  const limitRows = visibleRows < 0 ? frame.height : Math.min(visibleRows, frame.height)
  for (let dy = 0; dy < limitRows; dy++) {
    for (let dx = 0; dx < frame.width; dx++) {
      const sx = left + dx
      const sy = top + dy
      if (sx < 0 || sx >= SCREEN_W || sy < 0 || sy >= SCREEN_H) continue
      const srcIdx = dy * frame.width + dx
      if (frame.opaque[srcIdx]! > 0) {
        fb.writePixel(sx, sy, frame.indices[srcIdx]!)
      }
    }
  }
}

/** 把 indexed framebuffer flush 到 canvas(用给定 palette)。 */
function renderFrame(
  fb: Framebuffer,
  canvasCtx: CanvasRenderingContext2D,
  palette: Palette,
): void {
  flushToCanvas(fb, canvasCtx, palette)
}

/** sleep 帮手(promise + setTimeout)。 */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Splash fallback 主循环 — sdlpal `PAL_SplashScreen` 1:1 port。
 *
 * Promise resolve 时机 = palette 完全淡入 + 用户按跳过键 → 0.5s delay → resolve。
 * (sdlpal `while (TRUE)` 循环只能用按键退出 — 真值 splash 没自动 break。)
 */
export async function playSplashFallback(options: PlaySplashFallbackOptions): Promise<void> {
  const now = options.nowFn ?? (() => performance.now())
  const skipKeys = new Set(options.skipKeys ?? ['Space', 'Enter', 'Escape'])

  let skipped = false
  const onKey = (e: KeyboardEvent): void => {
    if (skipKeys.has(e.code)) {
      e.preventDefault()
      // 同 avi-player.ts:跳过 splash 的键(capture 阶段消费)必须 stopImmediatePropagation,
      // 否则同一个 keydown 继续冒泡进常驻 KeyboardInputSource 被记成 'Confirm' 残留 →
      // 下一帧 OpeningMenu 一上线即被当确认直接开新游戏(DOS 回退路径同 WIN95 AVI 路径的键泄漏)。
      e.stopImmediatePropagation()
      skipped = true
    }
  }
  window.addEventListener('keydown', onKey, true)

  // 9 仙鹤初始位置(sdlpal main.c:280-285)
  const cranes: CranePos[] = []
  for (let i = 0; i < CRANE_COUNT; i++) {
    cranes.push({
      x: randomLong(300, 600),
      y: randomLong(0, 80),
      frameIdx: randomLong(0, options.craneSprite.frames.length - 1),
    })
  }

  let iImgPos = 200
  let iCraneFrame = 0
  let titleVisibleHeight = 0
  const titleHeight = options.titleFrame.height
  const dwBeginTime = now()
  let dwTimeOffset = 0 // 跳过时 fast-forward palette 用

  try {
    while (true) {
      const dwTime = now() - dwBeginTime + dwTimeOffset

      // 1. palette 渐变(0 → 100% over FADE_IN_MS)
      const fadeFactor = Math.min(1, dwTime / FADE_IN_MS)
      const curPalette = scalePalette(options.palette, fadeFactor)

      // 2. 画上下两半滚动 bitmap
      //    sdlpal main.c:334-359:srcrect.y=iImgPos,h=200-iImgPos → 取 bitmapUp 下半 → 画屏顶
      //    srcrect.y=0,h=iImgPos → 取 bitmapDown 上半 → 画到 200-iImgPos 起
      if (iImgPos > 1) iImgPos--
      blitRows(options.fb, options.bitmapUp, iImgPos, 0, SCREEN_H - iImgPos)
      blitRows(options.fb, options.bitmapDown, 0, SCREEN_H - iImgPos, iImgPos)

      // 3. 9 仙鹤(sdlpal main.c:364-372)
      for (const c of cranes) {
        // 仙鹤帧动画(iCraneFrame & 1 时步进)
        c.frameIdx = (c.frameIdx + (iCraneFrame & 1)) % options.craneSprite.frames.length
        // iImgPos 奇数时向下飘 1px
        if (iImgPos > 1 && (iImgPos & 1)) c.y += 1
        const frame = options.craneSprite.frames[c.frameIdx]!
        // sdlpal main.c:369-370 PAL_RLEBlitToSurface(lpFrame, PAL_XY(cranepos.x, cranepos.y)):
        //   **左上角** blit,不减 anchor(cranepos = RandomLong(300,600)/(0,80) 即左上角)。
        //   故 anchor 传 (0,0)(同标题 main.c:378-389)。之前误传中底中心 anchor(15,32)→ 仙鹤偏 (−15,−32)。
        blitSpriteAt(options.fb, frame, 0, 0, c.x, c.y)
        c.x -= 1 // 向左飘
      }
      iCraneFrame++

      // 4. 标题渐显(sdlpal main.c:378-389)
      if (titleVisibleHeight < titleHeight) titleVisibleHeight++
      blitSpriteAt(
        options.fb, options.titleFrame, 0, 0,
        TITLE_POS.x, TITLE_POS.y,
        titleVisibleHeight,
      )

      // 5. flush
      renderFrame(options.fb, options.canvasCtx, curPalette)

      // 6. 跳过键检测(sdlpal main.c:395-433)
      if (skipped) {
        // 补完渐变(快进 SKIP_FAST_STEP_MS 步)
        let fastTime = dwTime
        while (fastTime < FADE_IN_MS) {
          const f = Math.min(1, fastTime / FADE_IN_MS)
          renderFrame(options.fb, options.canvasCtx, scalePalette(options.palette, f))
          fastTime += SKIP_FAST_STEP_MS
          await sleep(8) // sdlpal UTIL_Delay(8)
        }
        // 最终全 100% palette
        renderFrame(options.fb, options.canvasCtx, options.palette)
        await sleep(POST_SKIP_DELAY_MS)
        break
      }

      // 7. 帧间隔(sdlpal main.c:439-443)
      await sleep(FRAME_INTERVAL_MS)
    }
  }
  finally {
    window.removeEventListener('keydown', onKey, true)
  }
}
