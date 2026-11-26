import { drawWaveRows, WAVE_HEIGHT, WAVE_PHASES, WAVE_WIDTH } from './wave-distortion.js'

/** Battle visuals derive each phase from the battle clock. Exploration advances its own world-phase owner. */
const PHASE_MS = 40

export function wavePhase(nowMs: number): number {
  return Math.floor(nowMs / PHASE_MS) % WAVE_PHASES
}

/**
 * 波动背景缓存:仅 (amp, phase) 变化时重卷一次(≈40ms),其余 rAF 帧直接复用 ——
 * 波幅在 1–255 时使用卷动画布，其他幅度直接绘源背景。
 */
export class WavedBgCache {
  private cvs: HTMLCanvasElement | null = null
  private key = ''

  /** 返回可直接铺底的背景(无波 = 原 src;有波 = 卷动后的缓存 canvas)。srcTag = 源标识(源可换,如召唤染色合成帧)。 */
  render(src: CanvasImageSource, amp: number, nowMs: number, srcTag = ''): CanvasImageSource {
    if (amp <= 0 || amp >= 256) return src
    const phase = wavePhase(nowMs)
    const key = `${srcTag}:${amp}:${phase}`
    if (this.cvs && key === this.key) return this.cvs
    if (!this.cvs) {
      this.cvs = document.createElement('canvas')
      this.cvs.width = WAVE_WIDTH
      this.cvs.height = WAVE_HEIGHT
    }
    const ctx = this.cvs.getContext('2d')
    if (!ctx) return src
    ctx.imageSmoothingEnabled = false
    drawWaveRows(ctx, src, amp, phase, 1)
    this.key = key
    return this.cvs
  }
}

/** 震屏态(法术末 N 帧 / 0x35 脚本;level 法术侧恒 3,video.c fight.c:2718)。 */
export interface ScreenShake {
  untilMs: number
  level: number
}

/**
 * 当前震屏垂直位移(逻辑 px;0 = 不抖)。40ms 拍奇偶交替上/下(video.c:583-616 的
 * g_wShakeTime 奇偶分支 time-based 等效);露出条带由调用方在合成级填黑。
 */
export function shakeOffsetY(shake: ScreenShake | null, nowMs: number): number {
  if (!shake || nowMs >= shake.untilMs) return 0
  return Math.floor(nowMs / PHASE_MS) % 2 === 0 ? shake.level : -shake.level
}
