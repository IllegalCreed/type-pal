/**
 * 屏幕级特效(演出审计 §2-1)—— 战斗/探索**共用装配管线**的引擎模块。
 *
 * 波动(PAL_ApplyWave,scene.c:364-450)与震屏(VIDEO_ShakeScreen,video.c:571-616)
 * 的 RGBA 等效精确移植:一阶段索引缓冲的逐行循环卷动,在「行整体左移」语义下与
 * RGBA 行切片 drawImage 像素级等效(行内无重采样)。
 *
 * **全部 time-based 纯派生**(波形相位 = floor(now/40)%32、震屏奇偶 = 40ms 拍翻转),
 * 零可变计数器 —— 一阶段 DM32 判据:frame-counted 副作用须门控补帧,time-based
 * 幂等插值天然免疫;这里直接选后者,把整类"fade 补帧误推计数"坑结构性消除。
 *
 * 层序铁律(一阶段 2deb52bd 血泪):**波只卷背景层**,精灵画在卷完的背景上自身笔直
 * (误放精灵之后 = boss 边缘竖向撕裂);震屏在**整帧合成最后**(所有图层+UI 之上,
 * 对齐 video.c UpdateScreen 输出级;一阶段 daaaae51:战斗路径漏接 = 山神震屏不显示)。
 */

/** 逻辑拍(ms):原版 static index 每逻辑帧 +1(battle 25fps≈40ms;explore 10fps 观感差异可忽略)。 */
const PHASE_MS = 40

/** 32 相位偏移表(scene.c:404-417:a=0,b=68;16 次 b-=8,a+=b;后 16 镜像 320−wave[i])。 */
export function waveOffsets(amp: number): number[] {
  const wave = new Array<number>(32)
  let a = 0
  let b = 68
  for (let i = 0; i < 16; i++) {
    b -= 8
    a += b
    wave[i] = Math.trunc((a * amp) / 256)
    wave[i + 16] = 320 - (wave[i] ?? 0)
  }
  return wave
}

/** 波形滚动相位(原版逐帧 +1 % 32 的 time-based 等效)。 */
export function wavePhase(nowMs: number): number {
  return Math.floor(nowMs / PHASE_MS) % 32
}

/**
 * 波动背景缓存:仅 (amp, phase) 变化时重卷一次(≈40ms),其余 rAF 帧直接复用 ——
 * 「计数推进只在逻辑拍、渲染只读」的结构化落地。amp<=0 或 >=256 = 关闭原样
 * (scene.c:391-398 越界清零语义)。
 */
export class WavedBgCache {
  private cvs: HTMLCanvasElement | null = null
  private key = ''

  /** 返回可直接铺底的背景(无波 = 原 src;有波 = 卷动后的缓存 canvas)。srcTag = 源标识(源可换,如召唤染色合成帧)。 */
  render(
    src: CanvasImageSource,
    amp: number,
    nowMs: number,
    w = 320,
    h = 200,
    srcTag = '',
  ): CanvasImageSource {
    if (amp <= 0 || amp >= 256) return src
    const phase = wavePhase(nowMs)
    const key = `${srcTag}:${amp}:${phase}`
    if (this.cvs && key === this.key) return this.cvs
    if (!this.cvs) {
      this.cvs = document.createElement('canvas')
      this.cvs.width = w
      this.cvs.height = h
    }
    const ctx = this.cvs.getContext('2d')
    if (!ctx) return src
    ctx.imageSmoothingEnabled = false
    const wave = waveOffsets(amp)
    let ai = phase
    for (let y = 0; y < h; y++) {
      const shift = wave[ai] ?? 0
      if (shift > 0 && shift < w) {
        // 行左卷 shift px:右段接到行首、左段卷回行尾(scene.c:429-447 memcpy 三连的等效)
        ctx.drawImage(src, shift, y, w - shift, 1, 0, y, w - shift, 1)
        ctx.drawImage(src, 0, y, shift, 1, w - shift, y, shift, 1)
      } else {
        ctx.drawImage(src, 0, y, w, 1, 0, y, w, 1)
      }
      ai = (ai + 1) % 32
    }
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
