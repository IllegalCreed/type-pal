/**
 * RGBA 逐像素渐变过渡。
 *
 * 一阶段 dither-fade.ts 的核心动态不是“每像素到点后硬切”，而是 6 个 stride 相位错峰，
 * 同一像素在 12 个 outer 中反复向目标色逼近。Reforge 不恢复 palette/index/nibble，
 * 改用 12 级 RGBA 插值保留这段动态；old/target 始终不可变，output 每级重新计算。
 */

import type { Command, ScriptStage } from '@type-pal/content'

/** 总步数 = 12 outer × 6 相位。 */
export const DITHER_TOTAL_STEPS = 72
export const DITHER_COLOR_LEVELS = 12

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
const LINEAR_LUT_MAX = 65_535
const SRGB_TO_LINEAR = new Float64Array(256)
for (let value = 0; value < SRGB_TO_LINEAR.length; value++) {
  SRGB_TO_LINEAR[value] = (value / 255) ** GAMMA
}
let linearToSrgb: Uint8Array | null = null

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
 * 某个逻辑像素在全局 step 下已走到的颜色级别 0..12。
 * 每个 outer 所有像素升一级；inner 再按 RG_INDEX 提前推进当轮已轮到的相位。
 */
export function ditherLevelForPixel(logicalPixelIndex: number, step: number): number {
  const index = Number.isFinite(logicalPixelIndex) ? Math.max(0, Math.trunc(logicalPixelIndex)) : 0
  const normalizedStep = safeStep(step)
  const outer = Math.floor(normalizedStep / 6)
  const inner = normalizedStep % 6
  const phaseRank = PHASE_RANK[index % 6] ?? 0
  return Math.max(0, Math.min(DITHER_COLOR_LEVELS, outer + (phaseRank < inner ? 1 : 0)))
}

function blendEncoded(source: number, target: number, level: number): number {
  if (level <= 0) return source
  if (level >= DITHER_COLOR_LEVELS) return target
  return Math.round((source * (DITHER_COLOR_LEVELS - level) + target * level) / DITHER_COLOR_LEVELS)
}

function blendLinearLight(source: number, target: number, level: number): number {
  if (level <= 0) return source
  if (level >= DITHER_COLOR_LEVELS) return target
  const sourceLinear = SRGB_TO_LINEAR[source] ?? 0
  const targetLinear = SRGB_TO_LINEAR[target] ?? 0
  const mixed =
    (sourceLinear * (DITHER_COLOR_LEVELS - level) + targetLinear * level) / DITHER_COLOR_LEVELS
  return linearToSrgbLut()[Math.round(mixed * LINEAR_LUT_MAX)] ?? 0
}

/**
 * 从不可变 source/target 计算指定 step 的 RGBA output。
 * grid 存在时，同一个逻辑点阵像素对应的物理像素共享 level，避免 4× 块内噪点。
 */
export function applyDitherGradient(
  source: Uint8ClampedArray,
  target: Uint8ClampedArray,
  output: Uint8ClampedArray,
  step: number,
  pixelCount: number,
  grid?: DitherPixelGrid,
  colorSpace: DitherColorSpace = 'srgb',
): void {
  if (output.buffer === source.buffer || output.buffer === target.buffer) {
    throw new Error('dither output 必须独立于 source/target')
  }
  const normalizedStep = safeStep(step)
  const availablePixels = Math.min(
    Math.floor(source.length / 4),
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
    const level = ditherLevelForPixel(logicalIndex, normalizedStep)
    const offset = k * 4
    for (let channel = 0; channel < 3; channel++) {
      const from = source[offset + channel] ?? 0
      const to = target[offset + channel] ?? 0
      output[offset + channel] =
        colorSpace === 'linear-light'
          ? blendLinearLight(from, to, level)
          : blendEncoded(from, to, level)
    }
    // alpha 是覆盖率，不做 gamma 变换；全屏场景通常恒为 255。
    output[offset + 3] = blendEncoded(source[offset + 3] ?? 0, target[offset + 3] ?? 0, level)
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
  output: T | null
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
        output: null,
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
