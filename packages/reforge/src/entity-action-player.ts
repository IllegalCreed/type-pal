import type {
  SpriteActionBinding,
  SpriteActionCue,
  SpriteActionDef,
  SpriteDef,
} from '@type-pal/content'

export interface ResolvedEntityAction {
  binding: SpriteActionBinding
  action: SpriteActionDef
}

export interface EntityActionSeed extends ResolvedEntityAction {
  entity: string
}

export interface SpriteActionPosition {
  stepIndex: number
  elapsedInStepMs: number
  frame: number
  finished: boolean
}

interface Deferred {
  promise: Promise<void>
  resolve: () => void
  reject: (error: Error) => void
  settled: boolean
}

interface ActionTrack extends ResolvedEntityAction {
  stepIndex: number
  elapsedInStepMs: number
  finished: boolean
  /** 有一次性启动段时，进入 loopFrom 的首刻才应用实例循环相位。 */
  pendingLoopStartAtMs?: number
  deferred?: Deferred
  detachAbort?: () => void
}

interface EntityTracks {
  base?: ActionTrack
  override?: ActionTrack
}

function createDeferred(): Deferred {
  let resolvePromise!: () => void
  let rejectPromise!: (error: Error) => void
  const deferred: Deferred = {
    promise: new Promise<void>((resolve, reject) => {
      resolvePromise = resolve
      rejectPromise = reject
    }),
    resolve: () => {},
    reject: () => {},
    settled: false,
  }
  deferred.resolve = () => {
    if (deferred.settled) return
    deferred.settled = true
    resolvePromise()
  }
  deferred.reject = (error) => {
    if (deferred.settled) return
    deferred.settled = true
    rejectPromise(error)
  }
  return deferred
}

function abortError(message = 'sprite action aborted'): DOMException {
  return new DOMException(message, 'AbortError')
}

function assertAction(action: SpriteActionDef): void {
  if (!action.steps.length) throw new Error('sprite action: steps 不能为空')
  action.steps.forEach((step, index) => {
    if (!Number.isFinite(step.durationMs) || step.durationMs <= 0)
      throw new Error(`sprite action: steps[${index}].durationMs 必须为正有限数`)
  })
  if (
    action.loopFrom !== undefined &&
    (!Number.isInteger(action.loopFrom) ||
      action.loopFrom < 0 ||
      action.loopFrom >= action.steps.length)
  )
    throw new Error('sprite action: loopFrom 越界')
}

/** 在任何运行态写入前解析并验证 `(spriteId, actionId)` 复合引用。 */
export function resolveSpriteActionBinding(
  sprite: SpriteDef,
  binding: SpriteActionBinding,
  actualFrameCount?: number,
  where = 'sprite action',
): ResolvedEntityAction {
  if (sprite.id !== binding.sprite)
    throw new Error(`${where}: 实体精灵为 "${sprite.id}"，动作声明却引用 "${binding.sprite}"`)
  const action = sprite.poses?.[binding.action]
  if (!action) throw new Error(`${where}: 动作 "${binding.sprite}/${binding.action}" 不存在`)
  assertAction(action)
  if (actualFrameCount !== undefined) {
    if (!Number.isInteger(actualFrameCount) || actualFrameCount <= 0)
      throw new Error(`${where}: 实际源帧数无效 (${actualFrameCount})`)
    action.steps.forEach((step, index) => {
      if (!Number.isInteger(step.frame) || step.frame < 0 || step.frame >= actualFrameCount)
        throw new Error(
          `${where}: 动作 "${binding.sprite}/${binding.action}" steps[${index}].frame=${step.frame} 超出实际 ${actualFrameCount} 帧`,
        )
    })
  }
  return { binding: { ...binding }, action }
}

function actionDuration(action: SpriteActionDef, start = 0): number {
  let duration = 0
  for (let index = start; index < action.steps.length; index++)
    duration += actionStepAt(action, index).durationMs
  return duration
}

function actionStepAt(action: SpriteActionDef, index: number): SpriteActionDef['steps'][number] {
  const step = action.steps[index]
  if (!step) throw new Error(`sprite action: steps[${index}] 不存在`)
  return step
}

/**
 * 把实例自己的时间偏移解析成动作位置。编辑器预演与 Reforge 运行时共用这一个真值。
 * startAtMs 落在步骤内部时不补发此前 cue；落在边界时由播放器视为进入该步骤。
 */
export function resolveSpriteActionPosition(
  action: SpriteActionDef,
  elapsedMs: number,
  loop: boolean,
  startAtMs = 0,
): SpriteActionPosition {
  assertAction(action)
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0)
    throw new Error('sprite action: elapsedMs 必须为非负有限数')
  if (!Number.isFinite(startAtMs) || startAtMs < 0)
    throw new Error('sprite action: startAtMs 必须为非负有限数')

  const total = actionDuration(action)
  let position = elapsedMs + startAtMs
  if (loop) {
    const loopFrom = action.loopFrom ?? 0
    const intro = actionDuration(action, 0) - actionDuration(action, loopFrom)
    const loopDuration = total - intro
    if (intro > 0 && elapsedMs < intro) position = elapsedMs
    else
      position =
        intro + ((((elapsedMs - intro + startAtMs) % loopDuration) + loopDuration) % loopDuration)
  } else if (position >= total) {
    const lastIndex = action.steps.length - 1
    const last = actionStepAt(action, lastIndex)
    return {
      stepIndex: lastIndex,
      elapsedInStepMs: last.durationMs,
      frame: last.frame,
      finished: true,
    }
  }

  for (let index = 0; index < action.steps.length; index++) {
    const step = actionStepAt(action, index)
    if (position < step.durationMs)
      return {
        stepIndex: index,
        elapsedInStepMs: position,
        frame: step.frame,
        finished: false,
      }
    position -= step.durationMs
  }

  // 浮点舍入只可能把循环时间推到总长边界；边界等价进入循环首步。
  const fallback = loop ? (action.loopFrom ?? 0) : action.steps.length - 1
  const step = actionStepAt(action, fallback)
  return {
    stepIndex: fallback,
    elapsedInStepMs: loop ? 0 : step.durationMs,
    frame: step.frame,
    finished: !loop,
  }
}

function createTrack(resolved: ResolvedEntityAction, deferred?: Deferred): ActionTrack {
  const position = resolveSpriteActionPosition(
    resolved.action,
    0,
    resolved.binding.loop,
    resolved.binding.startAtMs ?? 0,
  )
  const loopFrom = resolved.action.loopFrom ?? 0
  return {
    binding: { ...resolved.binding },
    action: resolved.action,
    stepIndex: position.stepIndex,
    elapsedInStepMs: position.elapsedInStepMs,
    finished: position.finished,
    ...(resolved.binding.loop && loopFrom > 0
      ? { pendingLoopStartAtMs: resolved.binding.startAtMs ?? 0 }
      : {}),
    ...(deferred ? { deferred } : {}),
  }
}

function sameBinding(left: SpriteActionBinding, right: SpriteActionBinding): boolean {
  return (
    left.sprite === right.sprite &&
    left.action === right.action &&
    left.loop === right.loop &&
    (left.startAtMs ?? 0) === (right.startAtMs ?? 0)
  )
}

/**
 * 每实体一套基础页动作 + 一条剧情覆盖轨。播放器只管理实例时间轴，不读取 DOM 或全局壁钟。
 */
export class EntityActionPlayer {
  private readonly entities = new Map<string, EntityTracks>()

  constructor(private readonly onCue: (entity: string, cue: SpriteActionCue) => void = () => {}) {}

  replaceScene(seeds: readonly EntityActionSeed[]): void {
    this.clearScene()
    for (const seed of seeds) {
      if (this.entities.has(seed.entity))
        throw new Error(`sprite action: 实体 ${seed.entity} 重复声明页动作`)
      const base = createTrack(seed)
      this.entities.set(seed.entity, { base })
      this.emitBoundaryCue(seed.entity, base)
    }
  }

  setBase(entity: string, resolved: ResolvedEntityAction | undefined): void {
    const tracks = this.entities.get(entity) ?? {}
    tracks.base = resolved ? createTrack(resolved) : undefined
    if (!tracks.base && !tracks.override) this.entities.delete(entity)
    else this.entities.set(entity, tracks)
    if (tracks.base && !tracks.override) this.emitBoundaryCue(entity, tracks.base)
  }

  /**
   * 相同的活动覆盖请求幂等；不同请求兑现旧 waiter 后原子替换。循环请求立即 resolve，
   * 但仍绑定 signal，以便所属脚本中止时清除覆盖态。
   */
  play(entity: string, resolved: ResolvedEntityAction, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return Promise.reject(abortError())
    const tracks = this.entities.get(entity) ?? {}
    if (tracks.override && sameBinding(tracks.override.binding, resolved.binding))
      return tracks.override.deferred?.promise ?? Promise.resolve()

    this.settleTrack(tracks.override)
    const deferred = resolved.binding.loop ? undefined : createDeferred()
    const override = createTrack(resolved, deferred)
    tracks.override = override
    this.entities.set(entity, tracks)
    this.attachAbort(entity, override, signal)

    if (override.finished) {
      deferred?.resolve()
      this.detachTrack(override)
      tracks.override = undefined
      if (!tracks.base) this.entities.delete(entity)
      return deferred?.promise ?? Promise.resolve()
    }
    this.emitBoundaryCue(entity, override)
    return deferred?.promise ?? Promise.resolve()
  }

  /** 停止剧情覆盖；reset=true 同时把页动作重建到自己的 startAtMs。 */
  stop(entity: string, reset: boolean): void {
    const tracks = this.entities.get(entity)
    if (!tracks) return
    this.settleTrack(tracks.override)
    tracks.override = undefined
    if (reset && tracks.base) {
      tracks.base = createTrack({ binding: tracks.base.binding, action: tracks.base.action })
      this.emitBoundaryCue(entity, tracks.base)
    }
    if (!tracks.base) this.entities.delete(entity)
  }

  clearEntity(entity: string): void {
    const tracks = this.entities.get(entity)
    this.settleTrack(tracks?.override)
    this.entities.delete(entity)
  }

  clearScene(): void {
    for (const tracks of this.entities.values()) this.settleTrack(tracks.override)
    this.entities.clear()
  }

  advance(dtMs: number, paused: (entity: string) => boolean = () => false): void {
    if (!Number.isFinite(dtMs) || dtMs < 0) throw new Error('sprite action: dtMs 必须为非负有限数')
    if (dtMs === 0) return
    for (const [entity, tracks] of this.entities) {
      if (paused(entity)) continue
      const active = tracks.override ?? tracks.base
      if (!active || active.finished) continue
      const remaining = this.advanceTrack(entity, active, dtMs)
      if (tracks.override === active && active.finished) {
        this.settleTrack(active)
        tracks.override = undefined
        if (tracks.base && remaining > 0 && !tracks.base.finished)
          this.advanceTrack(entity, tracks.base, remaining)
        if (!tracks.base) this.entities.delete(entity)
      }
    }
  }

  frame(entity: string): number | undefined {
    const tracks = this.entities.get(entity)
    const active = tracks?.override ?? tracks?.base
    return active?.action.steps[active.stepIndex]?.frame
  }

  hasOverride(entity: string): boolean {
    return this.entities.get(entity)?.override !== undefined
  }

  private advanceTrack(entity: string, track: ActionTrack, dtMs: number): number {
    let remaining = dtMs
    while (remaining > 0 && !track.finished) {
      const step = actionStepAt(track.action, track.stepIndex)
      const untilBoundary = step.durationMs - track.elapsedInStepMs
      if (remaining < untilBoundary) {
        track.elapsedInStepMs += remaining
        return 0
      }
      remaining -= untilBoundary
      const next = track.stepIndex + 1
      if (next < track.action.steps.length) {
        if (
          track.binding.loop &&
          track.pendingLoopStartAtMs !== undefined &&
          next === track.action.loopFrom
        ) {
          const introDuration = actionDuration(track.action) - actionDuration(track.action, next)
          const position = resolveSpriteActionPosition(
            track.action,
            introDuration,
            true,
            track.pendingLoopStartAtMs,
          )
          track.stepIndex = position.stepIndex
          track.elapsedInStepMs = position.elapsedInStepMs
          track.pendingLoopStartAtMs = undefined
        } else {
          track.stepIndex = next
          track.elapsedInStepMs = 0
        }
        this.emitBoundaryCue(entity, track)
        continue
      }
      if (track.binding.loop) {
        track.stepIndex = track.action.loopFrom ?? 0
        track.elapsedInStepMs = 0
        this.emitBoundaryCue(entity, track)
        continue
      }
      track.finished = true
      track.elapsedInStepMs = step.durationMs
    }
    return remaining
  }

  private emitBoundaryCue(entity: string, track: ActionTrack): void {
    if (track.finished || track.elapsedInStepMs !== 0) return
    for (const cue of track.action.steps[track.stepIndex]?.cues ?? []) this.onCue(entity, cue)
  }

  private attachAbort(entity: string, track: ActionTrack, signal?: AbortSignal): void {
    if (!signal) return
    const abort = (): void => {
      const tracks = this.entities.get(entity)
      if (tracks?.override !== track) return
      this.detachTrack(track)
      track.deferred?.reject(abortError())
      tracks.override = undefined
      if (!tracks.base) this.entities.delete(entity)
    }
    signal.addEventListener('abort', abort, { once: true })
    track.detachAbort = () => signal.removeEventListener('abort', abort)
  }

  private detachTrack(track: ActionTrack): void {
    track.detachAbort?.()
    track.detachAbort = undefined
  }

  private settleTrack(track: ActionTrack | undefined): void {
    if (!track) return
    this.detachTrack(track)
    track.deferred?.resolve()
  }
}
