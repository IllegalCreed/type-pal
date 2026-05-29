/**
 * 特效 B:FBP 全屏图显示(port sdlpal ending.c:48-150 PAL_ShowFBP)。
 *
 * - fade==0:整屏 blit FBP indices + flush(瞬时)。
 * - fade>0:96 步(16 外圈 × 6 内相位 rgIndex={0,3,1,5,2,4})**palette-index nibble 渐变**:
 *     每像素高 nibble 首触即跳目标(a&0xF0),低 nibble 每外圈向目标 ±1 migrate;
 *     每步 RestoreScreen(写回累积 buffer)+ flush + delay = (fade+1)*10 ms。modal,caller suspendRaf 包。
 * - HACKHACK(ending.c:144):chunk == (win95?68:49)时跳过最终整屏 blit(保留渐变结果)。
 *
 * 数据源:FBP.MKF chunk 已提取为 BattleBgAsset(320×200 indexed);caller 传 fbpIndices。
 * 无图(in-game 0xFFFF / decompress fail)→ 传全黑(sdlpal memset 0 / WIN95 SDL_FillRect)。
 * MGO effect sprite overlay(g_wCurEffectSprite)留 Phase 3(0x76 默认不叠)。
 */
import type { Palette } from '@type-pal/shared'
import type { Framebuffer } from '../present/framebuffer.js'
import { flushToCanvas } from '../present/present.js'

const SCREEN_W = 320
const SCREEN_H = 200
const N = SCREEN_W * SCREEN_H
const RG_INDEX = [0, 3, 1, 5, 2, 4] as const

export interface ShowFbpOptions {
  /** 320×200 FBP 目标 indices;长度不符(无图)→ 视作全黑。 */
  fbpIndices: Uint8Array
  /** sdlpal wFade(0=瞬时;>0 渐变)。 */
  fade: number
  /** FBP chunk 号(HACKHACK 判断)。 */
  chunkNum: number
  /** WIN95? → HACKHACK chunk 68;否则 DOS chunk 49。 */
  isWin95: boolean
  fb: Framebuffer
  canvasCtx: CanvasRenderingContext2D
  palette: Palette
  /** 跳过键,默认 Space/Enter/Escape。 */
  skipKeys?: string[]
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function showFbp(o: ShowFbpOptions): Promise<void> {
  const target = o.fbpIndices.length === N ? o.fbpIndices : new Uint8Array(N) // 无图 → 全黑
  const hackChunk = o.isWin95 ? 68 : 49

  if (o.fade > 0) {
    const wFade = (o.fade + 1) * 10
    const back = new Uint8Array(o.fb.indices) // VIDEO_BackupScreen(当前屏 → 累积 buffer)
    let skipped = false
    const skipKeys = new Set(o.skipKeys ?? ['Space', 'Enter', 'Escape'])
    const onKey = (e: KeyboardEvent): void => {
      if (skipKeys.has(e.code)) { e.preventDefault(); skipped = true }
    }
    window.addEventListener('keydown', onKey, true)
    try {
      for (let i = 0; i < 16 && !skipped; i++) {
        for (let j = 0; j < 6 && !skipped; j++) {
          for (let k = RG_INDEX[j]!; k < N; k += 6) {
            const a = target[k]!
            let b = back[k]!
            if (i > 0) {
              const aLow = a & 0x0F
              const bLow = b & 0x0F
              if (aLow > bLow) b = (b + 1) & 0xFF
              else if (aLow < bLow) b = (b - 1) & 0xFF
            }
            back[k] = (a & 0xF0) | (b & 0x0F)
          }
          o.fb.indices.set(back) // VIDEO_RestoreScreen(累积 buffer → 屏幕)
          flushToCanvas(o.fb, o.canvasCtx, o.palette)
          await sleep(wFade)
        }
      }
    }
    finally {
      window.removeEventListener('keydown', onKey, true)
    }
  }

  // HACKHACK: chunk == (win95?68:49) 跳过最终整屏 blit(保留渐变结果)。
  if (o.chunkNum !== hackChunk) {
    o.fb.indices.set(target)
  }
  flushToCanvas(o.fb, o.canvasCtx, o.palette)
}

export interface ScrollFbpOptions {
  /** 新图 320×200 indices(滚入的目标);长度不符 → 不滚(sdlpal decompress fail return)。 */
  fbpIndices: Uint8Array
  /** sdlpal wScrollSpeed(op2;0→1);每步 delay = 800/speed ms。 */
  speed: number
  /** TRUE=下滑(0xA4 恒 TRUE);FALSE=上滚。 */
  fScrollDown: boolean
  fb: Framebuffer
  canvasCtx: CanvasRenderingContext2D
  palette: Palette
  skipKeys?: string[]
}

/**
 * FBP 全屏图滚动卷入(port sdlpal ending.c:152-279 PAL_ScrollFBP)。
 * 220 步:下滑时旧屏(快照)整体下移、新图自底向上从顶部推入;每步 800/speed ms。末帧整屏 = 新图。
 * MGO effect sprite overlay + PAL_ApplyWave 留 Phase 3(结局 ScrollFBP(74) g_wCurEffectSprite=0 + wScreenWave=0)。
 * modal,caller suspendRaf 包。
 */
export async function scrollFbp(o: ScrollFbpOptions): Promise<void> {
  if (o.fbpIndices.length !== N) return // 无图 → 不滚(sdlpal decompress<=0 return)
  const target = o.fbpIndices
  const back = new Uint8Array(o.fb.indices) // VIDEO_BackupScreen
  const speed = o.speed === 0 ? 1 : o.speed
  const delay = Math.max(1, Math.floor(800 / speed))
  let skipped = false
  const skipKeys = new Set(o.skipKeys ?? ['Space', 'Enter', 'Escape'])
  const onKey = (e: KeyboardEvent): void => {
    if (skipKeys.has(e.code)) { e.preventDefault(); skipped = true }
  }
  window.addEventListener('keydown', onKey, true)
  try {
    const next = new Uint8Array(N)
    for (let l = 0; l < 220 && !skipped; l++) {
      const i = Math.min(l, 200)
      if (o.fScrollDown) {
        // 旧屏 top [0,200-i) → 下移到 [i,200);新图 bottom [200-i,200) → 顶部 [0,i)
        next.set(back.subarray(0, (200 - i) * SCREEN_W), i * SCREEN_W)
        next.set(target.subarray((200 - i) * SCREEN_W, N), 0)
      }
      else {
        // 上滚:旧屏 [i,200) → [0,200-i);新图 [0,i) → 底部 [200-i,200)
        next.set(back.subarray(i * SCREEN_W, N), 0)
        next.set(target.subarray(0, i * SCREEN_W), (200 - i) * SCREEN_W)
      }
      o.fb.indices.set(next)
      flushToCanvas(o.fb, o.canvasCtx, o.palette)
      await sleep(delay)
    }
  }
  finally {
    window.removeEventListener('keydown', onKey, true)
  }
  o.fb.indices.set(target) // VIDEO_CopyEntireSurface(p, gpScreen) 末帧整屏新图
  flushToCanvas(o.fb, o.canvasCtx, o.palette)
}
