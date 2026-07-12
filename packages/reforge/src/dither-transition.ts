/**
 * RGBA 逐像素假色桥接过渡。
 *
 * 一阶段首次访问像素时组合 target 色系与 source 明暗，随后再逐级收敛。Reforge 不恢复
 * palette/index/nibble，而以 target 的 OKLCH 色相/色度 + source 的 OKLab 绝对亮度构造 bridge。
 * 这里有两处有意近似：绝对亮度不等于原 palette ramp 的同一下标亮度；第 12 次访问强制精确
 * target，而原版低 nibble 相差大于 11 时可能留有残差，再由下一张正常帧覆盖。
 */

import type { Command, ScriptStage } from '@type-pal/content'

/** 总步数 = 12 outer × 6 相位。 */
export const DITHER_TOTAL_STEPS = 72
export const DITHER_MAX_VISITS = 12

export type DitherColorSpace = 'srgb' | 'linear-light'

export interface DitherPixelGrid {
  /** RGBA canvas 的物理像素宽度。 */
  width: number
  /** 一个逻辑点阵像素对应的物理边长；reforge 世界层为 4。 */
  pixelScale: number
}

/** phase(0-5) 在 RG_INDEX={0,3,1,5,2,4} 中的次序。 */
const PHASE_RANK = [0, 2, 4, 1, 5, 3] as const // RG_INDEX.indexOf(phase)

const GAMMA = 2.2
const DITHER_SETTLE_LEVELS = DITHER_MAX_VISITS - 1
const LINEAR_LUT_MAX = 65_535
const GAMMA_TO_LINEAR = new Float64Array(256)
const SRGB_TO_LINEAR = new Float64Array(256)
for (let value = 0; value < GAMMA_TO_LINEAR.length; value++) {
  const encoded = value / 255
  GAMMA_TO_LINEAR[value] = encoded ** GAMMA
  SRGB_TO_LINEAR[value] = encoded <= 0.04045 ? encoded / 12.92 : ((encoded + 0.055) / 1.055) ** 2.4
}
let linearToSrgb: Uint8Array | null = null

const OKLAB_NEUTRAL_CHROMA = 0.002
const GAMUT_EPSILON = 1e-7
const GAMUT_SEARCH_STEPS = 12
const BRIDGE_CACHE_LIMIT = 65_536

interface Oklab {
  l: number
  a: number
  b: number
}

interface LinearRgb {
  r: number
  g: number
  b: number
}

function linearToSrgbLut(): Uint8Array {
  if (linearToSrgb) return linearToSrgb
  const lut = new Uint8Array(LINEAR_LUT_MAX + 1)
  for (let value = 0; value <= LINEAR_LUT_MAX; value++) {
    lut[value] = Math.round((value / LINEAR_LUT_MAX) ** (1 / GAMMA) * 255)
  }
  linearToSrgb = lut
  return lut
}

function safeStep(step: number): number {
  return Number.isFinite(step) ? Math.max(0, Math.min(DITHER_TOTAL_STEPS, Math.trunc(step))) : 0
}

/**
 * 某个逻辑像素在全局 step 下已被相位访问的次数 0..12。
 * 首次访问跳到 bridge；其余 11 次从 bridge 收敛到 target。
 */
export function ditherVisitsForPixel(logicalPixelIndex: number, step: number): number {
  const index = Number.isFinite(logicalPixelIndex) ? Math.max(0, Math.trunc(logicalPixelIndex)) : 0
  const normalizedStep = safeStep(step)
  const phaseRank = PHASE_RANK[index % 6] ?? 0
  return normalizedStep > phaseRank
    ? Math.min(DITHER_MAX_VISITS, Math.floor((normalizedStep - 1 - phaseRank) / 6) + 1)
    : 0
}

function blendEncoded(source: number, target: number, level: number, levels: number): number {
  if (level <= 0) return source
  if (level >= levels) return target
  return Math.round((source * (levels - level) + target * level) / levels)
}

function blendLinearLight(source: number, target: number, level: number, levels: number): number {
  if (level <= 0) return source
  if (level >= levels) return target
  const sourceLinear = GAMMA_TO_LINEAR[source] ?? 0
  const targetLinear = GAMMA_TO_LINEAR[target] ?? 0
  const mixed = (sourceLinear * (levels - level) + targetLinear * level) / levels
  return linearToSrgbLut()[Math.round(mixed * LINEAR_LUT_MAX)] ?? 0
}

function rgbToOklab(red: number, green: number, blue: number): Oklab {
  const r = SRGB_TO_LINEAR[red] ?? 0
  const g = SRGB_TO_LINEAR[green] ?? 0
  const b = SRGB_TO_LINEAR[blue] ?? 0
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  }
}

function oklabToLinearRgb(lab: Oklab): LinearRgb {
  const lRoot = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b
  const mRoot = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b
  const sRoot = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b
  const l = lRoot ** 3
  const m = mRoot ** 3
  const s = sRoot ** 3
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  }
}

function isInSrgbGamut(rgb: LinearRgb): boolean {
  return (
    rgb.r >= -GAMUT_EPSILON &&
    rgb.r <= 1 + GAMUT_EPSILON &&
    rgb.g >= -GAMUT_EPSILON &&
    rgb.g <= 1 + GAMUT_EPSILON &&
    rgb.b >= -GAMUT_EPSILON &&
    rgb.b <= 1 + GAMUT_EPSILON
  )
}

function linearToSrgbByte(value: number): number {
  const linear = Math.max(0, Math.min(1, value))
  const encoded = linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055
  return Math.round(encoded * 255)
}

function bridgeRgb(
  sourceRed: number,
  sourceGreen: number,
  sourceBlue: number,
  targetRed: number,
  targetGreen: number,
  targetBlue: number,
): number {
  const sourceLab = rgbToOklab(sourceRed, sourceGreen, sourceBlue)
  const targetLab = rgbToOklab(targetRed, targetGreen, targetBlue)
  let targetA = targetLab.a
  let targetB = targetLab.b
  if (Math.hypot(targetA, targetB) < OKLAB_NEUTRAL_CHROMA) {
    targetA = 0
    targetB = 0
  }

  let mapped = oklabToLinearRgb({ l: sourceLab.l, a: targetA, b: targetB })
  if (!isInSrgbGamut(mapped)) {
    let inGamutScale = 0
    let outOfGamutScale = 1
    for (let step = 0; step < GAMUT_SEARCH_STEPS; step++) {
      const scale = (inGamutScale + outOfGamutScale) / 2
      const candidate = oklabToLinearRgb({
        l: sourceLab.l,
        a: targetA * scale,
        b: targetB * scale,
      })
      if (isInSrgbGamut(candidate)) inGamutScale = scale
      else outOfGamutScale = scale
    }
    mapped = oklabToLinearRgb({
      l: sourceLab.l,
      a: targetA * inGamutScale,
      b: targetB * inGamutScale,
    })
  }

  const red = linearToSrgbByte(mapped.r)
  const green = linearToSrgbByte(mapped.g)
  const blue = linearToSrgbByte(mapped.b)
  return ((red << 16) | (green << 8) | blue) >>> 0
}

/**
 * 预计算假色 bridge：RGB 使用 target hue/chroma + source perceptual L，alpha 保持 source 覆盖率。
 * 相同 source/target 色对只计算一次；缓存有上限，避免高色彩图像造成无界临时内存。
 */
export function buildDitherBridge(
  source: Uint8ClampedArray,
  target: Uint8ClampedArray,
  bridge: Uint8ClampedArray,
  pixelCount: number,
): void {
  if (bridge.buffer === source.buffer || bridge.buffer === target.buffer) {
    throw new Error('dither bridge 必须独立于 source/target')
  }
  const availablePixels = Math.min(
    Math.floor(source.length / 4),
    Math.floor(target.length / 4),
    Math.floor(bridge.length / 4),
  )
  const safePixelCount = Number.isFinite(pixelCount)
    ? Math.max(0, Math.min(availablePixels, Math.trunc(pixelCount)))
    : 0
  const pairCache = new Map<number, number>()
  for (let pixel = 0; pixel < safePixelCount; pixel++) {
    const offset = pixel * 4
    const sourceRed = source[offset] ?? 0
    const sourceGreen = source[offset + 1] ?? 0
    const sourceBlue = source[offset + 2] ?? 0
    const targetRed = target[offset] ?? 0
    const targetGreen = target[offset + 1] ?? 0
    const targetBlue = target[offset + 2] ?? 0
    const sourceKey = sourceRed * 65_536 + sourceGreen * 256 + sourceBlue
    const targetKey = targetRed * 65_536 + targetGreen * 256 + targetBlue
    const pairKey = sourceKey * 16_777_216 + targetKey
    let packed = pairCache.get(pairKey)
    if (packed === undefined) {
      packed = bridgeRgb(sourceRed, sourceGreen, sourceBlue, targetRed, targetGreen, targetBlue)
      if (pairCache.size < BRIDGE_CACHE_LIMIT) pairCache.set(pairKey, packed)
    }
    bridge[offset] = packed >>> 16
    bridge[offset + 1] = (packed >>> 8) & 0xff
    bridge[offset + 2] = packed & 0xff
    bridge[offset + 3] = source[offset + 3] ?? 0
  }
}

/**
 * 从不可变 source/bridge/target 计算指定 step 的 RGBA output。
 * grid 存在时，同一个逻辑点阵像素对应的物理像素共享 visits，避免 4× 块内噪点。
 */
export function applyDitherGradient(
  source: Uint8ClampedArray,
  bridge: Uint8ClampedArray,
  target: Uint8ClampedArray,
  output: Uint8ClampedArray,
  step: number,
  pixelCount: number,
  grid?: DitherPixelGrid,
  colorSpace: DitherColorSpace = 'srgb',
): void {
  if (
    output.buffer === source.buffer ||
    output.buffer === bridge.buffer ||
    output.buffer === target.buffer
  ) {
    throw new Error('dither output 必须独立于 source/bridge/target')
  }
  const normalizedStep = safeStep(step)
  const availablePixels = Math.min(
    Math.floor(source.length / 4),
    Math.floor(bridge.length / 4),
    Math.floor(target.length / 4),
    Math.floor(output.length / 4),
  )
  const safePixelCount = Number.isFinite(pixelCount)
    ? Math.max(0, Math.min(availablePixels, Math.trunc(pixelCount)))
    : 0
  const physicalWidth = grid
    ? Math.max(1, Math.min(safePixelCount || 1, Math.trunc(grid.width)))
    : 0
  const pixelScale = grid ? Math.max(1, Math.trunc(grid.pixelScale)) : 1
  const logicalWidth = physicalWidth ? Math.ceil(physicalWidth / pixelScale) : 0
  for (let k = 0; k < safePixelCount; k++) {
    const logicalX = physicalWidth ? Math.floor((k % physicalWidth) / pixelScale) : 0
    const logicalY = physicalWidth ? Math.floor(Math.floor(k / physicalWidth) / pixelScale) : 0
    const logicalIndex = physicalWidth ? logicalY * logicalWidth + logicalX : k
    const visits = ditherVisitsForPixel(logicalIndex, normalizedStep)
    const offset = k * 4
    const from = visits === 0 ? source : bridge
    const level = Math.max(0, visits - 1)
    for (let channel = 0; channel < 3; channel++) {
      const fromValue = from[offset + channel] ?? 0
      const to = target[offset + channel] ?? 0
      output[offset + channel] =
        colorSpace === 'linear-light'
          ? blendLinearLight(fromValue, to, level, DITHER_SETTLE_LEVELS)
          : blendEncoded(fromValue, to, level, DITHER_SETTLE_LEVELS)
    }
    // alpha 是覆盖率，不做 gamma 变换；全屏场景通常恒为 255。
    output[offset + 3] = blendEncoded(
      from[offset + 3] ?? 0,
      target[offset + 3] ?? 0,
      level,
      DITHER_SETTLE_LEVELS,
    )
  }
}

const DETERMINISTIC_PREFIX_KINDS = new Set<Command['kind']>([
  'animEntity',
  'cameraSnap',
  'clearDialog',
  'endBattle',
  'fleeBattle',
  'giveItem',
  'giveMoney',
  'halveMoney',
  'increaseHpMp',
  'learnSkill',
  'loseItem',
  'mountParty',
  'nudgeEntity',
  'nudgeParty',
  'playMusic',
  'playSound',
  'releaseEntity',
  'revivePartyAll',
  'setAmbience',
  'setEntityAuto',
  'setEntityFacing',
  'setEntityFrame',
  'setEntityLayer',
  'setEntityPos',
  'setEntityPosRelParty',
  'setEntityState',
  'setEntityTrigger',
  'setEntityTriggerMode',
  'setFlag',
  'setFollowers',
  'setMultiEntityState',
  'setParty',
  'setPartyFacing',
  'setSceneOnTeleport',
  'setSceneStage',
  'setScreenWave',
  'setVar',
  'addVar',
  'shakeScreen',
  'stepEntity',
  'takeEntity',
  'teleportParty',
  'toggleDayNight',
  'unequip',
  'unmigrated',
  'unmountParty',
  'vanishEntity',
])

/**
 * 只接受当前活动 stage 的确定性同步前缀。遇到 await、分支、跳场景或未知新命令立即失败关闭，
 * 防止为“可能执行”的 0x73 错误冻结普通 loadScene。
 */
export function hasEarlyDitherScreen(stage: ScriptStage | undefined): boolean {
  if (!stage) return false
  for (const command of stage.body) {
    if (command.kind === 'ditherScreen') return true
    if (!DETERMINISTIC_PREFIX_KINDS.has(command.kind)) return false
  }
  return false
}

export type DitherBackupSource = 'handoff' | 'snapshot'

export interface ActiveDither<T> {
  backup: T
  target: T | null
  bridge: T | null
  output: T | null
  bridgeBuildMs: number | null
  lastStep: number
  startedAt: number | null
  durationMs: number
  source: DitherBackupSource
  resolve: () => void
}

/**
 * 管理跨场景一次性交接与 active Promise。T 用泛型保持本模块可在无 DOM 的 Vitest 中验证；
 * 浏览器运行时实例化为 ImageData。
 */
export class DitherTransitionController<T> {
  private pending: { targetSceneId: string; backup: T } | null = null
  active: ActiveDither<T> | null = null

  get pendingTargetSceneId(): string | null {
    return this.pending?.targetSceneId ?? null
  }

  pendingBackupFor(sceneId: string): T | null {
    return this.pending?.targetSceneId === sceneId ? this.pending.backup : null
  }

  arm(targetSceneId: string, backup: T): void {
    this.cancel()
    this.pending = { targetSceneId, backup }
  }

  begin(sceneId: string, snapshot: () => T, durationMs: number): Promise<void> {
    this.finish()
    const matched = this.pending?.targetSceneId === sceneId ? this.pending : null
    if (matched) this.pending = null
    const backup = matched?.backup ?? snapshot()
    const source: DitherBackupSource = matched ? 'handoff' : 'snapshot'
    return new Promise((resolve) => {
      this.active = {
        backup,
        target: null,
        bridge: null,
        output: null,
        bridgeBuildMs: null,
        lastStep: -1,
        startedAt: null,
        durationMs: Math.max(0, Number.isFinite(durationMs) ? durationMs : 0),
        source,
        resolve,
      }
    })
  }

  clearPendingFor(sceneId: string): void {
    if (this.pending?.targetSceneId === sceneId) this.pending = null
  }

  finish(): void {
    const active = this.active
    this.active = null
    active?.resolve()
  }

  cancel(): void {
    this.pending = null
    this.finish()
  }
}
