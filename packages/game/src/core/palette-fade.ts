/**
 * 特效 A(2026-05-29):调色板 ramp 淡入淡出引擎。
 *
 * 与现有 dither 引擎(`gs.fadeState`,present.ts video.c VIDEO_FadeScreen 真值)正交:
 *   - dither 引擎 mutate **fb.indices**(palette nibble blend,backup↔current 两 buffer)。
 *   - 本引擎 mutate **gs.palette.colors**(256 色 RGB LUT),framebuffer 像素不动,只换色表。
 *
 * 服务 sdlpal palette.c 全部色表 fade 函数:
 *   PAL_FadeOut(0x50) / PAL_FadeIn(0x51) / PAL_SceneFade(0x93) / PAL_PaletteFade(0x80)
 *   / PAL_ColorFade(0x8C) / PAL_FadeToRed(0x4F)。
 * (0x9B 是 VIDEO_FadeScreen(dither),复用 gs.fadeState,不在本模块。)
 *
 * 两种 ramp 数学(对应 sdlpal 两类循环):
 *   - 'lerp':每帧按 elapsed/totalMs 在 start↔target 间线性插值。覆盖 FadeOut/FadeIn/SceneFade
 *     (sdlpal `pal[i]*factor>>6` 比例缩放 = lerp(start, target))+ PaletteFade(sdlpal
 *     `(cur*(31-i)+new*i)/31` = lerp(cur, new))。scale-independent,与色值位宽无关。
 *   - 'approach':每帧每通道朝 target 移动至多 `increment*stepN`(sdlpal ColorFade ±4 / FadeToRed ±8
 *     的逐步收敛)。`moveToward(start, target, increment*stepN)` == sdlpal 迭代 stepN 步后的值。
 *
 * 色值说明:pal-extract `(v6<<2)|(v6>>4)` 升 8-bit(0-255 全幅,≈×255/63)。sdlpal 运行时用
 * `v6<<2`(0-252)。lerp 类比例缩放对位宽无关;approach 类 ±4/±8 在 63-scale 是 ±1/±2 单位,
 * 映射到我们 0-255 scale ≈ ±4.05/±8.1 → 直接用 4/8 视觉 1:1。
 */

import type { Palette } from '@type-pal/shared'

export type RGB = [number, number, number]

/** FadeToRed 保留色 index(sdlpal text.c:29 FONT_COLOR_DEFAULT=0x4F;game-over 文字不被染红)。 */
export const FADE_TO_RED_SKIP = 0x4f
/** FadeToRed fb 像素 HACK 目标(sdlpal palette.c:627 `0x4F → 0x4E`,让场景里的 0x4F 像素也染红)。 */
export const FADE_TO_RED_REMAP = { from: 0x4f, to: 0x4e } as const

export interface PaletteFadeState {
  /** fade 起点 256 色快照(本引擎不再改它,只读插值)。 */
  startColors: RGB[]
  /** fade 终点 256 色。 */
  targetColors: RGB[]
  /** performance.now() 在 fade opcode firing 那帧记录。 */
  startTimeMs: number
  /** 总时长(ms),time-based 不受 raf 帧率影响。 */
  totalMs: number
  /** 'lerp' 比例插值 / 'approach' 定步长收敛(见模块注释)。 */
  mode: 'lerp' | 'approach'
  /** approach 模式总步数(sdlpal 循环次数);lerp 模式忽略。 */
  steps: number
  /** approach 模式每步每通道最大位移(ColorFade=4 / FadeToRed=8);lerp 模式忽略。 */
  increment: number
  /** FadeToRed:此 palette index 不参与 ramp(保持原色 = 文字色)。 */
  skipIndex?: number
  /** FadeToRed:渲染前把 fb 像素 from→to 重映射(sdlpal `((LPBYTE)pixels)[i]==0x4F → 0x4E`)。 */
  remap?: { from: number; to: number }
  /**
   * FadeOut(0x50)专用:**冻屏淡黑**。sdlpal `PAL_FadeOut`(palette.c:123-190)整个函数只
   * `VIDEO_SetPalette(palette[i]*j>>6)` 把当前调色板渐缩到黑,**从不调 PAL_MakeScene 重绘 gpScreen** —
   * 淡黑的是 fadeout 触发前那一帧像素。故 present 在此 fade 期间须冻屏(保留上一帧 fb + 仅 palette 渐黑),
   * 不实时重绘 scene;否则 fadeout 前一刻脚本改的数据(如 op0x13 把密道地板瞬间设回原位)会被画出来
   * = "原地、下坠前地板突然关上" bug(2026-06-02 真机 trace 定位:ip105 setObjectPos→ip106 FadeOut)。
   * FadeIn / SceneFade 不设此标志(它们要重绘淡入新场景)。
   */
  freeze?: boolean
  /**
   * L34:FadeOut(0x50)/FadeIn(0x51)专用 —— sdlpal `newpalette[i]=palette[i]*j>>6`(palette.c:170-180/238-250),
   * 亮度系数 j∈0..60 **整数**,循环封顶 60/64≈93.75%:FadeOut 首帧即从 100% 跳到 93.75%、FadeIn 末帧只到
   * 93.75%,精确 100%/0% 由 finalizePaletteFade 补(对齐 palette.c:188/258 循环后 VIDEO_SetPalette)。
   * `'out'`:base=startColors、j=60→0;`'in'`:base=targetColors、j=0→60。其余 lerp-fade(SceneFade
   * 的 i 0..63、PaletteFade)不设此标志,仍纯线性插值。
   */
  fade60?: 'in' | 'out'
}

/** 全黑 256 色(FadeOut/SceneFade-out target、FadeIn/SceneFade-in start)。每次新数组。 */
export function blackColors(): RGB[] {
  return Array.from({ length: 256 }, () => [0, 0, 0] as RGB)
}

/** 深拷 256 色(快照 start/target,避免别名 gs.basePalette / gs.palette)。 */
export function cloneColors(colors: readonly RGB[]): RGB[] {
  return colors.map((c) => [c[0]!, c[1]!, c[2]!] as RGB)
}

/**
 * 按 fNight flag 选调色板色组 —— port sdlpal palette.c PAL_GetPalette
 * `buf[(fNight ? 256*3 : 0) + i*3]`(palette.c:99-104)。
 * night 且该 palette 有 nightColors(实测 PAT.MKF 仅 #0/#5 含夜间半,见 pal-extract decodePalette)
 * → 用 nightColors;否则白天 colors。fade target 用它选淡入目标(夜场淡入到夜色)。
 */
export function resolveNightColors(
  pal: { colors: RGB[], nightColors?: RGB[] } | undefined,
  night: boolean,
): RGB[] {
  if (!pal) return blackColors()
  return night && pal.nightColors ? pal.nightColors : pal.colors
}

/** 256 色全填同一色(ColorFade 的纯色端)。 */
function solidColors(c: RGB): RGB[] {
  return Array.from({ length: 256 }, () => [c[0], c[1], c[2]] as RGB)
}

/** approach 单通道:朝 target 移动至多 maxDelta(sdlpal ±step 收敛,达 target 停)。 */
function moveToward(cur: number, target: number, maxDelta: number): number {
  if (cur < target) return Math.min(cur + maxDelta, target)
  if (cur > target) return Math.max(cur - maxDelta, target)
  return cur
}

// ── 构造器(纯函数,入参为色数组,不依赖 GameState) ───────────────────────────

/** 0x50 FadeOut:cur → 全黑(sdlpal palette.c:176-180 `pal[i]*j>>6` 比例缩到黑)。 */
export function buildFadeOut(
  curColors: readonly RGB[],
  totalMs: number,
  nowMs: number,
): PaletteFadeState {
  return {
    startColors: cloneColors(curColors),
    targetColors: blackColors(),
    startTimeMs: nowMs,
    totalMs,
    mode: 'lerp',
    steps: 60,
    increment: 0,
    fade60: 'out', // L34:j 60→0 量化封顶 93.75%,精确 0% 由 finalize 补
    freeze: true, // sdlpal PAL_FadeOut 只 SetPalette 不 MakeScene → present 冻屏淡黑(见 PaletteFadeState.freeze)
  }
}

/** 0x51 FadeIn:全黑 → 场景调色板(sdlpal 真值 newpalette 起始 ×0 全黑 → 比例放亮到 palette)。 */
export function buildFadeIn(
  baseColors: readonly RGB[],
  totalMs: number,
  nowMs: number,
): PaletteFadeState {
  return {
    startColors: blackColors(),
    targetColors: cloneColors(baseColors),
    startTimeMs: nowMs,
    totalMs,
    mode: 'lerp',
    steps: 60,
    increment: 0,
    fade60: 'in', // L34:j 0→60 量化封顶 93.75%,精确 100% 由 finalize 补
  }
}

/**
 * 0x93 SceneFade:fadeIn(step>0)全黑→base;fadeOut(step<0)cur→全黑。
 * sdlpal palette.c:307-340 `pal*i>>6`,i 0→63(in)/63→0(out)。边淡边 PAL_GameUpdate(NPC 不冻)
 * → 调用方用 waiting='scene-fade' 放行 autoScript。
 */
export function buildSceneFade(
  curColors: readonly RGB[],
  baseColors: readonly RGB[],
  fadeIn: boolean,
  totalMs: number,
  nowMs: number,
): PaletteFadeState {
  return {
    startColors: fadeIn ? blackColors() : cloneColors(curColors),
    targetColors: fadeIn ? cloneColors(baseColors) : blackColors(),
    startTimeMs: nowMs,
    totalMs,
    mode: 'lerp',
    steps: 64,
    increment: 0,
  }
}

/**
 * 0x80 PaletteFade:cur → target(sdlpal palette.c:432-437 `lerp(cur, new, i/31)`,32 步)。
 * target 由调用方算(PAL_GetPalette(numPalette, newNight);夜间色值未提取 → 暂 = 白天 base)。
 */
export function buildPaletteFade(
  curColors: readonly RGB[],
  targetColors: readonly RGB[],
  totalMs: number,
  nowMs: number,
): PaletteFadeState {
  return {
    startColors: cloneColors(curColors),
    targetColors: cloneColors(targetColors),
    startTimeMs: nowMs,
    totalMs,
    mode: 'lerp',
    steps: 32,
    increment: 0,
  }
}

/**
 * 0x8C ColorFade:approach ±4,64 步(sdlpal palette.c:507-541 / 549-583)。
 *   fFrom=TRUE:纯色 base[color] → 场景 base(从纯色淡回场景)。
 *   fFrom=FALSE:场景 base → 纯色 base[color](场景淡成纯色)。
 */
export function buildColorFade(
  baseColors: readonly RGB[],
  color: number,
  fFrom: boolean,
  totalMs: number,
  nowMs: number,
): PaletteFadeState {
  const solid = baseColors[color & 0xff] ?? [0, 0, 0]
  return {
    startColors: fFrom ? solidColors([solid[0]!, solid[1]!, solid[2]!]) : cloneColors(baseColors),
    targetColors: fFrom ? cloneColors(baseColors) : solidColors([solid[0]!, solid[1]!, solid[2]!]),
    startTimeMs: nowMs,
    totalMs,
    mode: 'approach',
    steps: 64,
    increment: 4,
  }
}

/**
 * 0x4F FadeToRed:approach ±8,32 步(sdlpal palette.c:633-666)。
 *   target[j] = { r: min((base.r+g+b)/4 + 64, 255), g: 0, b: 0 }。
 *   skip idx 0x4F(文字色不染);调用方另需 fb 像素 0x4F→0x4E 重映射。
 */
export function buildFadeToRed(
  baseColors: readonly RGB[],
  totalMs: number,
  nowMs: number,
): PaletteFadeState {
  const target: RGB[] = baseColors.map((c) => {
    const lum = Math.floor((c[0]! + c[1]! + c[2]!) / 4) + 64
    return [Math.min(lum, 255), 0, 0] as RGB
  })
  // 不足 256 兜底
  while (target.length < 256) target.push([0, 0, 0])
  return {
    startColors: cloneColors(baseColors),
    targetColors: target,
    startTimeMs: nowMs,
    totalMs,
    mode: 'approach',
    steps: 32,
    increment: 8,
    skipIndex: FADE_TO_RED_SKIP,
    remap: { from: FADE_TO_RED_REMAP.from, to: FADE_TO_RED_REMAP.to },
  }
}

// ── 每帧应用 / 收尾 ──────────────────────────────────────────────────────────

/**
 * 每帧把 `colors` 从 start ramp 到 target(按 elapsed/totalMs)。原地 mutate `colors`(=gs.palette.colors)。
 * lerp:线性插值;approach:每通道朝 target 移动至多 increment*floor(progress*steps)。
 * skipIndex 不动(保留 colors[idx] 原值)。
 */
export function stepPaletteFade(colors: RGB[], pf: PaletteFadeState, nowMs: number): void {
  const progress = Math.min(Math.max((nowMs - pf.startTimeMs) / pf.totalMs, 0), 1)
  if (pf.mode === 'lerp') {
    if (pf.fade60) {
      // L34:sdlpal PAL_FadeOut/FadeIn `newpalette[i]=base[i]*j>>6`(palette.c:170-180/238-250)。
      //   j∈0..60 整数 → 循环封顶 60/64≈93.75%(FadeOut 首帧即跳到 93.75%、FadeIn 末帧 93.75%);
      //   精确 0%/100% 由 finalizePaletteFade 补(palette.c:188/258 循环后 VIDEO_SetPalette)。
      const isIn = pf.fade60 === 'in'
      const jj = isIn ? Math.trunc(60 * progress) : Math.trunc(60 * (1 - progress)) // in 0→60, out 60→0
      const base = isIn ? pf.targetColors : pf.startColors // 非黑端
      for (let i = 0; i < 256; i++) {
        if (i === pf.skipIndex) continue
        const b = base[i]!
        colors[i] = [(b[0] * jj) >> 6, (b[1] * jj) >> 6, (b[2] * jj) >> 6]
      }
      return
    }
    for (let j = 0; j < 256; j++) {
      if (j === pf.skipIndex) continue
      const s = pf.startColors[j]!
      const t = pf.targetColors[j]!
      colors[j] = [
        Math.round(s[0] + (t[0] - s[0]) * progress),
        Math.round(s[1] + (t[1] - s[1]) * progress),
        Math.round(s[2] + (t[2] - s[2]) * progress),
      ]
    }
  } else {
    const maxDelta = pf.increment * Math.floor(progress * pf.steps)
    for (let j = 0; j < 256; j++) {
      if (j === pf.skipIndex) continue
      const s = pf.startColors[j]!
      const t = pf.targetColors[j]!
      colors[j] = [
        moveToward(s[0], t[0], maxDelta),
        moveToward(s[1], t[1], maxDelta),
        moveToward(s[2], t[2], maxDelta),
      ]
    }
  }
}

/** fade 完成:把 `colors` 精确设为 target(skipIndex 不动)。waiting handler 结束 fade 时调。 */
export function finalizePaletteFade(colors: RGB[], pf: PaletteFadeState): void {
  for (let j = 0; j < 256; j++) {
    if (j === pf.skipIndex) continue
    const t = pf.targetColors[j]!
    colors[j] = [t[0], t[1], t[2]]
  }
}

/** 由现有 Palette 造一份「可变工作副本」(fades 原地改它的 colors;cycles 沿用引用即可)。 */
export function makeWorkingPalette(src: Palette): Palette {
  return { colors: cloneColors(src.colors), cycles: src.cycles }
}
