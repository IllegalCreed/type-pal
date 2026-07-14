/**
 * RGBA 屏幕的 72 步错相溶解。
 *
 * 开始时把 source/target RGB 映射到当前工程已加载的 256 色表。某像素首次被访问时，
 * 保留 source 在本色系中的明暗层级，换入 target 的色系；后续 11 次访问再把该层级
 * 每次向 target 推进一格。这会保留旧帧文字/轮廓，同时立即显出新场景的色系，不是 alpha
 * crossfade，也不是 target-only 假色。
 *
 * 色表只是渲染特效的输入，不进入内容 schema；正常场景仍是 RGBA 渲染。
 */

import type { Command, ScriptStage } from '@type-pal/content'
import type { Palette } from '@type-pal/shared'

/** 总步数 = 12 outer × 6 相位。 */
export const DITHER_TOTAL_STEPS = 72
export const DITHER_MAX_VISITS = 12

export interface DitherPixelGrid {
  /** RGBA canvas 的物理像素宽度。 */
  width: number
  /** 一个逻辑点阵像素对应的物理边长；reforge 世界层为 4。 */
  pixelScale: number
}

/** phase(0-5) 在 RG_INDEX={0,3,1,5,2,4} 中的次序。 */
const PHASE_RANK = [0, 2, 4, 1, 5, 3] as const // RG_INDEX.indexOf(phase)

function safeStep(step: number): number {
  return Number.isFinite(step) ? Math.max(0, Math.min(DITHER_TOTAL_STEPS, Math.trunc(step))) : 0
}

/**
 * 某个逻辑像素在全局 step 下已被相位访问的次数 0..12。
 * 首次访问换入 target 色系；其余 11 次逐级向 target 明暗收敛。
 */
export function ditherVisitsForPixel(logicalPixelIndex: number, step: number): number {
  const index = Number.isFinite(logicalPixelIndex) ? Math.max(0, Math.trunc(logicalPixelIndex)) : 0
  const normalizedStep = safeStep(step)
  const phaseRank = PHASE_RANK[index % 6] ?? 0
  return normalizedStep > phaseRank
    ? Math.min(DITHER_MAX_VISITS, Math.floor((normalizedStep - 1 - phaseRank) / 6) + 1)
    : 0
}

/** 过渡起手预计算的索引计划；大小约为两张 8-bit 屏幕。 */
export interface DitherPalettePlan {
  /** source 每个像素的明暗层级 0..15。 */
  sourceLevels: Uint8Array
  /** target 每个像素对应的色表位置。 */
  targetIndices: Uint8Array
  /** 256 个 RGB 三元组的扁平快照。 */
  colors: Uint8Array
}

function packRgb(red: number, green: number, blue: number): number {
  return (red * 65_536 + green * 256 + blue) >>> 0
}

/**
 * 把 RGBA 端点预映射到当前 256 色表。正常场景/文字都是该色表烘焙的精确 RGB；
 * 氛围 multiply 等产生的非精确色才走最近 RGB 容错，并按颜色缓存。
 */
export function buildDitherPalettePlan(
  source: Uint8ClampedArray,
  target: Uint8ClampedArray,
  paletteColors: Palette['colors'],
  pixelCount: number,
): DitherPalettePlan {
  if (paletteColors.length < 256) throw new Error('dither 需要完整的 256 色渲染表')
  const availablePixels = Math.min(Math.floor(source.length / 4), Math.floor(target.length / 4))
  const safePixelCount = Number.isFinite(pixelCount)
    ? Math.max(0, Math.min(availablePixels, Math.trunc(pixelCount)))
    : 0
  const colors = new Uint8Array(256 * 3)
  const exact = new Map<number, number>()
  for (let index = 0; index < 256; index++) {
    const color = paletteColors[index] ?? [0, 0, 0]
    const offset = index * 3
    colors[offset] = color[0]
    colors[offset + 1] = color[1]
    colors[offset + 2] = color[2]
    const key = packRgb(colors[offset] ?? 0, colors[offset + 1] ?? 0, colors[offset + 2] ?? 0)
    if (!exact.has(key)) exact.set(key, index)
  }
  const resolved = new Map<number, number>(exact)
  const resolveIndex = (red: number, green: number, blue: number): number => {
    const key = packRgb(red, green, blue)
    const cached = resolved.get(key)
    if (cached !== undefined) return cached
    let nearestIndex = 0
    let nearestDistance = Number.POSITIVE_INFINITY
    for (let index = 0; index < 256; index++) {
      const offset = index * 3
      const dr = red - (colors[offset] ?? 0)
      const dg = green - (colors[offset + 1] ?? 0)
      const db = blue - (colors[offset + 2] ?? 0)
      const distance = dr * dr + dg * dg + db * db
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = index
      }
    }
    resolved.set(key, nearestIndex)
    return nearestIndex
  }

  const sourceLevels = new Uint8Array(safePixelCount)
  const targetIndices = new Uint8Array(safePixelCount)
  for (let pixel = 0; pixel < safePixelCount; pixel++) {
    const offset = pixel * 4
    const sourceIndex = resolveIndex(
      source[offset] ?? 0,
      source[offset + 1] ?? 0,
      source[offset + 2] ?? 0,
    )
    sourceLevels[pixel] = sourceIndex & 0x0f
    targetIndices[pixel] = resolveIndex(
      target[offset] ?? 0,
      target[offset + 1] ?? 0,
      target[offset + 2] ?? 0,
    )
  }
  return { sourceLevels, targetIndices, colors }
}

function copyRgba(from: Uint8ClampedArray, to: Uint8ClampedArray, offset: number): void {
  to[offset] = from[offset] ?? 0
  to[offset + 1] = from[offset + 1] ?? 0
  to[offset + 2] = from[offset + 2] ?? 0
  to[offset + 3] = from[offset + 3] ?? 0
}

/**
 * 从不可变 source/target + 预计算计划生成指定 step 的 RGBA output。
 * grid 存在时，同一个逻辑点阵像素对应的物理像素共享 visits，避免 4× 块内噪点。
 */
export function applyDitherPaletteTransition(
  source: Uint8ClampedArray,
  target: Uint8ClampedArray,
  output: Uint8ClampedArray,
  step: number,
  pixelCount: number,
  plan: DitherPalettePlan,
  grid?: DitherPixelGrid,
): void {
  if (output.buffer === source.buffer || output.buffer === target.buffer) {
    throw new Error('dither output 必须独立于 source/target')
  }
  const normalizedStep = safeStep(step)
  const availablePixels = Math.min(
    Math.floor(source.length / 4),
    Math.floor(target.length / 4),
    Math.floor(output.length / 4),
    plan.sourceLevels.length,
    plan.targetIndices.length,
  )
  const safePixelCount = Number.isFinite(pixelCount)
    ? Math.max(0, Math.min(availablePixels, Math.trunc(pixelCount)))
    : 0
  const physicalWidth = grid
    ? Math.max(1, Math.min(safePixelCount || 1, Math.trunc(grid.width)))
    : 0
  const pixelScale = grid ? Math.max(1, Math.trunc(grid.pixelScale)) : 1
  const logicalWidth = physicalWidth ? Math.ceil(physicalWidth / pixelScale) : 0
  for (let pixel = 0; pixel < safePixelCount; pixel++) {
    const offset = pixel * 4
    if (normalizedStep === DITHER_TOTAL_STEPS) {
      copyRgba(target, output, offset)
      continue
    }
    const logicalX = physicalWidth ? Math.floor((pixel % physicalWidth) / pixelScale) : 0
    const logicalY = physicalWidth ? Math.floor(Math.floor(pixel / physicalWidth) / pixelScale) : 0
    const logicalIndex = physicalWidth ? logicalY * logicalWidth + logicalX : pixel
    const visits = ditherVisitsForPixel(logicalIndex, normalizedStep)
    if (visits === 0) {
      copyRgba(source, output, offset)
      continue
    }

    const targetIndex = plan.targetIndices[pixel] ?? 0
    const targetLevel = targetIndex & 0x0f
    const sourceLevel = plan.sourceLevels[pixel] ?? 0
    const moves = visits - 1
    const currentLevel =
      sourceLevel < targetLevel
        ? Math.min(targetLevel, sourceLevel + moves)
        : Math.max(targetLevel, sourceLevel - moves)
    const currentIndex = (targetIndex & 0xf0) | currentLevel
    const colorOffset = currentIndex * 3
    output[offset] = plan.colors[colorOffset] ?? 0
    output[offset + 1] = plan.colors[colorOffset + 1] ?? 0
    output[offset + 2] = plan.colors[colorOffset + 2] ?? 0
    // 原索引帧无 alpha；访问后该像素已属于 target 画面，覆盖率直接取 target。
    output[offset + 3] = target[offset + 3] ?? 0
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
  'setSceneOnEnter',
  'setSceneOnTeleport',
  'clearSceneScripts',
  'setScreenWave',
  'setVar',
  'addVar',
  'shakeScreen',
  'stepEntity',
  'takeEntity',
  'teleportParty',
  'toggleDayNight',
  'unequip',
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
  plan: DitherPalettePlan | null
  output: T | null
  prepareMs: number | null
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
        plan: null,
        output: null,
        prepareMs: null,
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
