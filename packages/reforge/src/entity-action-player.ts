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

export type EntityActionSource = 'automatic' | 'script'

/** Logical timeline state only; definitions and runtime owners are resolved again on restore. */
export interface EntityActionTrackSnapshot {
  binding: SpriteActionBinding
  source: EntityActionSource
  /** Whether the invoking script awaits this command, independently of timeline loop mode. */
  awaited: boolean
  /** Stable automatic-behavior owner in this scene, never a runtime activation epoch. */
  owner?: string
  stepIndex: number
  elapsedInStepMs: number
  finished: boolean
  pendingLoopStartAtMs?: number
}

export interface EntityActionSnapshot {
  entity: string
  base?: EntityActionTrackSnapshot
  override?: EntityActionTrackSnapshot
  /** Normally fulfilled commands awaiting cursor acknowledgement, not necessarily final frames. */
  completed?: EntityActionTrackSnapshot[]
}

export interface EntityActionCaptureOptions {
  /** Only the host knows which fulfilled command still belongs to an awaited continuation. */
  includeCompleted?(
    entity: string,
    binding: Readonly<SpriteActionBinding>,
    signal: AbortSignal | undefined,
    owner: string | undefined,
  ): boolean
}

export type EntityActionRestoreResolver = (
  entity: string,
  binding: SpriteActionBinding,
  slot: 'base' | 'override' | 'completed',
) => ResolvedEntityAction

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
  source: EntityActionSource
  awaited: boolean
  owner?: string
  signal?: AbortSignal
  stepIndex: number
  elapsedInStepMs: number
  finished: boolean
  /** 有一次性启动段时，进入 loopFrom 的首刻才应用实例循环相位。 */
  pendingLoopStartAtMs?: number
  deferred?: Deferred
  detachAbort?: () => void
  /** An automatic once-action cannot outrun its re-entering continuation. */
  awaitingRestoredPlay?: boolean
  /** Permits the scene host to attach the new activation without restarting this timeline. */
  restoredOwner?: boolean
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

function createTrack(
  resolved: ResolvedEntityAction,
  deferred?: Deferred,
  source: EntityActionSource = 'automatic',
  awaited = false,
): ActionTrack {
  const position = resolveSpriteActionPosition(
    resolved.action,
    0,
    resolved.binding.loop,
    resolved.binding.startAtMs ?? 0,
  )
  const loopFrom = resolved.action.loopFrom ?? 0
  return {
    source,
    awaited,
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

function captureTrack(track: ActionTrack): EntityActionTrackSnapshot {
  return {
    binding: { ...track.binding },
    source: track.source,
    awaited: track.awaited,
    ...(track.owner !== undefined ? { owner: track.owner } : {}),
    stepIndex: track.stepIndex,
    elapsedInStepMs: track.elapsedInStepMs,
    finished: track.finished,
    ...(track.pendingLoopStartAtMs !== undefined
      ? { pendingLoopStartAtMs: track.pendingLoopStartAtMs }
      : {}),
  }
}

function prepareRestoredTrack(
  entity: string,
  slot: 'base' | 'override' | 'completed',
  input: EntityActionTrackSnapshot,
  resolve: EntityActionRestoreResolver,
): ActionTrack {
  const snapshot = { ...input, binding: { ...input.binding } }
  const resolved = resolve(entity, { ...snapshot.binding }, slot)
  const fail = (message: string): never => {
    throw new Error(`sprite action restore: ${entity}.${slot}: ${message}`)
  }
  if (!sameBinding(snapshot.binding, resolved.binding)) fail('解析的 binding 不匹配')
  assertAction(resolved.action)
  if (snapshot.source !== 'automatic' && snapshot.source !== 'script') fail('未知 source')
  if (typeof snapshot.awaited !== 'boolean') fail('awaited 必须为 boolean')
  if (slot === 'base' && snapshot.source !== 'automatic') fail('base 必须属于 automatic')
  if (slot === 'base' && snapshot.awaited) fail('base 不能被脚本等待')
  if (
    snapshot.owner !== undefined &&
    (typeof snapshot.owner !== 'string' ||
      snapshot.owner.length === 0 ||
      snapshot.source !== 'automatic' ||
      slot === 'base')
  )
    fail('owner 必须是 automatic override 的稳定实体 id')
  if (
    slot === 'completed' &&
    (snapshot.source !== 'automatic' || snapshot.binding.loop || !snapshot.awaited)
  )
    fail('完成收据必须属于被等待的 automatic 非循环命令')
  const step = resolved.action.steps[snapshot.stepIndex]
  if (!Number.isInteger(snapshot.stepIndex) || snapshot.stepIndex < 0 || !step)
    return fail('stepIndex 越界')
  if (!Number.isFinite(snapshot.elapsedInStepMs) || snapshot.elapsedInStepMs < 0)
    fail('elapsedInStepMs 必须为非负有限数')
  if (typeof snapshot.finished !== 'boolean') fail('finished 必须为 boolean')
  if (snapshot.finished) {
    if (
      snapshot.binding.loop ||
      snapshot.stepIndex !== resolved.action.steps.length - 1 ||
      snapshot.elapsedInStepMs !== step.durationMs
    )
      fail('结束位置不匹配')
  } else if (snapshot.elapsedInStepMs >= step.durationMs) fail('活动步骤耗时越界')
  const introEnd = resolved.action.loopFrom ?? 0
  if (snapshot.pendingLoopStartAtMs !== undefined) {
    if (
      !snapshot.binding.loop ||
      snapshot.finished ||
      introEnd <= 0 ||
      snapshot.stepIndex >= introEnd ||
      !Number.isFinite(snapshot.pendingLoopStartAtMs) ||
      snapshot.pendingLoopStartAtMs < 0 ||
      snapshot.pendingLoopStartAtMs !== (snapshot.binding.startAtMs ?? 0)
    )
      fail('待应用循环相位不匹配')
  } else if (snapshot.binding.loop && snapshot.stepIndex < introEnd)
    fail('启动段缺少待应用循环相位')
  return {
    ...snapshot,
    action: resolved.action,
    ...(slot !== 'base' && snapshot.source === 'automatic'
      ? {
          restoredOwner: true,
          ...(snapshot.awaited && !snapshot.binding.loop ? { awaitingRestoredPlay: true } : {}),
        }
      : {}),
  }
}

/**
 * 每实体一套基础页动作 + 一条剧情覆盖轨。播放器只管理实例时间轴，不读取 DOM 或全局壁钟。
 */
export class EntityActionPlayer {
  private readonly entities = new Map<string, EntityTracks>()
  private readonly completed = new Map<string, ActionTrack[]>()

  constructor(private readonly onCue: (entity: string, cue: SpriteActionCue) => void = () => {}) {}

  capture(options: EntityActionCaptureOptions = {}): EntityActionSnapshot[] {
    const snapshots: EntityActionSnapshot[] = []
    for (const entity of new Set([...this.entities.keys(), ...this.completed.keys()])) {
      const tracks = this.entities.get(entity)
      const completed = (this.completed.get(entity) ?? []).filter((track) =>
        options.includeCompleted?.(entity, { ...track.binding }, track.signal, track.owner),
      )
      if (!tracks?.base && !tracks?.override && completed.length === 0) continue
      snapshots.push({
        entity,
        ...(tracks?.base ? { base: captureTrack(tracks.base) } : {}),
        ...(tracks?.override ? { override: captureTrack(tracks.override) } : {}),
        ...(completed.length > 0 ? { completed: completed.map(captureTrack) } : {}),
      })
    }
    return snapshots
  }

  /** Validate every reference/progress before returning a synchronous, one-use scene commit. */
  prepareRestore(
    snapshots: readonly EntityActionSnapshot[],
    resolve: EntityActionRestoreResolver,
  ): () => void {
    const prepared = new Map<string, EntityTracks>()
    const receipts = new Map<string, ActionTrack[]>()
    for (const snapshot of snapshots) {
      if (!snapshot.entity || prepared.has(snapshot.entity))
        throw new Error(`sprite action restore: 无效或重复实体 ${snapshot.entity}`)
      if (!snapshot.base && !snapshot.override && !snapshot.completed?.length)
        throw new Error(`sprite action restore: ${snapshot.entity} 没有动作轨道`)
      prepared.set(snapshot.entity, {
        ...(snapshot.base
          ? { base: prepareRestoredTrack(snapshot.entity, 'base', snapshot.base, resolve) }
          : {}),
        ...(snapshot.override
          ? {
              override: prepareRestoredTrack(
                snapshot.entity,
                'override',
                snapshot.override,
                resolve,
              ),
            }
          : {}),
      })
      if (snapshot.completed?.length)
        receipts.set(
          snapshot.entity,
          snapshot.completed.map((track) =>
            prepareRestoredTrack(snapshot.entity, 'completed', track, resolve),
          ),
        )
    }
    let committed = false
    return () => {
      if (committed) throw new Error('sprite action restore: 准备结果已提交')
      committed = true
      this.clearScene()
      for (const [entity, tracks] of prepared)
        if (tracks.base || tracks.override) this.entities.set(entity, tracks)
      for (const [entity, tracks] of receipts) this.completed.set(entity, tracks)
      // The saved boundary cue has already been consumed. No historical event is re-emitted.
    }
  }

  restore(snapshots: readonly EntityActionSnapshot[], resolve: EntityActionRestoreResolver): void {
    this.prepareRestore(snapshots, resolve)()
  }

  /** Caller validates the stable continuation owner; runtime AbortSignals are never persisted. */
  attachRestoredOwner(entity: string, signal: AbortSignal, owner?: string): boolean {
    if (signal.aborted) throw abortError()
    let attached = false
    const override = this.entities.get(entity)?.override
    if (override?.restoredOwner && override.source === 'automatic' && override.owner === owner) {
      this.detachTrack(override)
      override.signal = signal
      this.attachAbort(entity, override, signal)
      attached = true
    }
    for (const track of this.completed.get(entity) ?? []) {
      if (!track.restoredOwner || track.owner !== owner) continue
      this.detachTrack(track)
      track.signal = signal
      this.attachCompletedAbort(entity, track, signal)
      attached = true
    }
    return attached
  }

  /** Called after the host has closed the checkpoint for the fulfilled awaited command. */
  acknowledgeCompleted(
    entity: string,
    binding: Readonly<SpriteActionBinding>,
    signal?: AbortSignal,
  ): boolean {
    const receipt = this.completed
      .get(entity)
      ?.find((track) => track.signal === signal && sameBinding(track.binding, binding))
    if (!receipt) return false
    this.deleteCompleted(entity, receipt)
    return true
  }

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

  /** Refresh page bindings without restarting unchanged timelines or touching override owners. */
  syncBases(seeds: readonly EntityActionSeed[]): void {
    const prepared = new Map<string, ActionTrack>()
    for (const seed of seeds) {
      if (!seed.entity || prepared.has(seed.entity))
        throw new Error(`sprite action: 无效或重复实体 ${seed.entity}`)
      assertAction(seed.action)
      const current = this.entities.get(seed.entity)?.base
      prepared.set(
        seed.entity,
        current && sameBinding(current.binding, seed.binding) ? current : createTrack(seed),
      )
    }
    const cues: Array<[string, ActionTrack]> = []
    for (const [entity, tracks] of this.entities) {
      if (!tracks.base || prepared.has(entity)) continue
      delete tracks.base
      if (!tracks.override) this.entities.delete(entity)
    }
    for (const [entity, base] of prepared) {
      const tracks = this.entities.get(entity) ?? {}
      if (tracks.base === base) continue
      tracks.base = base
      this.entities.set(entity, tracks)
      if (!tracks.override) cues.push([entity, base])
    }
    for (const [entity, base] of cues) this.emitBoundaryCue(entity, base)
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
  resumesAwaited(
    entity: string,
    binding: SpriteActionBinding,
    source: EntityActionSource,
    owner?: string,
  ): boolean {
    return [this.entities.get(entity)?.override, ...(this.completed.get(entity) ?? [])].some(
      (track) =>
        track?.awaitingRestoredPlay &&
        track.source === source &&
        track.owner === owner &&
        sameBinding(track.binding, binding),
    )
  }

  play(
    entity: string,
    resolved: ResolvedEntityAction,
    signal?: AbortSignal,
    source: EntityActionSource = 'script',
    owner?: string,
    awaited = !resolved.binding.loop,
  ): Promise<void> {
    if (signal?.aborted) return Promise.reject(abortError())
    const receipt = this.completed
      .get(entity)
      ?.find(
        (track) =>
          track.awaitingRestoredPlay &&
          track.source === source &&
          track.awaited === awaited &&
          track.owner === owner &&
          sameBinding(track.binding, resolved.binding),
      )
    if (receipt) {
      this.detachTrack(receipt)
      delete receipt.awaitingRestoredPlay
      receipt.signal = signal
      this.attachCompletedAbort(entity, receipt, signal)
      return Promise.resolve()
    }
    const tracks = this.entities.get(entity) ?? {}
    const restored = tracks.override
    if (
      restored?.awaitingRestoredPlay &&
      restored.source === source &&
      restored.awaited === awaited &&
      restored.owner === owner &&
      sameBinding(restored.binding, resolved.binding)
    ) {
      this.detachTrack(restored)
      delete restored.awaitingRestoredPlay
      restored.signal = signal
      const deferred = createDeferred()
      restored.deferred = deferred
      this.attachAbort(entity, restored, signal)
      if (restored.finished) {
        this.fulfillOverride(entity, restored)
        tracks.override = undefined
        if (!tracks.base) this.entities.delete(entity)
      }
      return deferred.promise
    }
    if (
      tracks.override?.source === source &&
      tracks.override.awaited === awaited &&
      tracks.override.owner === owner &&
      tracks.override.signal === signal &&
      sameBinding(tracks.override.binding, resolved.binding)
    )
      return tracks.override.deferred?.promise ?? Promise.resolve()

    if (tracks.override) this.fulfillOverride(entity, tracks.override)
    const deferred = resolved.binding.loop ? undefined : createDeferred()
    const override = createTrack(resolved, deferred, source, awaited)
    if (owner !== undefined) override.owner = owner
    override.signal = signal
    tracks.override = override
    this.entities.set(entity, tracks)
    this.attachAbort(entity, override, signal)

    if (override.finished) {
      this.fulfillOverride(entity, override)
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
    if (tracks.override) this.fulfillOverride(entity, tracks.override)
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
    for (const track of [...(this.completed.get(entity) ?? [])]) this.deleteCompleted(entity, track)
  }

  clearScene(): void {
    for (const tracks of this.entities.values()) this.settleTrack(tracks.override)
    this.entities.clear()
    for (const tracks of this.completed.values())
      for (const track of tracks) this.detachTrack(track)
    this.completed.clear()
  }

  advance(
    dtMs: number,
    paused: (entity: string, source: EntityActionSource, owner?: string) => boolean = () => false,
  ): void {
    if (!Number.isFinite(dtMs) || dtMs < 0) throw new Error('sprite action: dtMs 必须为非负有限数')
    if (dtMs === 0) return
    for (const [entity, tracks] of this.entities) {
      const active = tracks.override ?? tracks.base
      if (!active || active.finished || active.awaitingRestoredPlay) continue
      if (paused(entity, active.source, active.owner)) continue
      const remaining = this.advanceTrack(entity, active, dtMs)
      if (tracks.override === active && active.finished) {
        this.fulfillOverride(entity, active)
        tracks.override = undefined
        if (
          tracks.base &&
          remaining > 0 &&
          !tracks.base.finished &&
          !paused(entity, tracks.base.source, tracks.base.owner)
        )
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

  private fulfillOverride(entity: string, track: ActionTrack): void {
    this.settleTrack(track)
    if (track.source !== 'automatic' || track.binding.loop || !track.awaited) return
    const receipt: ActionTrack = {
      ...captureTrack(track),
      action: track.action,
      signal: track.signal,
    }
    const receipts = this.completed.get(entity) ?? []
    receipts.push(receipt)
    this.completed.set(entity, receipts)
    this.attachCompletedAbort(entity, receipt, receipt.signal)
  }

  private deleteCompleted(entity: string, track: ActionTrack): void {
    const remaining = this.completed.get(entity)?.filter((candidate) => candidate !== track)
    this.detachTrack(track)
    if (remaining?.length) this.completed.set(entity, remaining)
    else this.completed.delete(entity)
  }

  private attachCompletedAbort(entity: string, track: ActionTrack, signal?: AbortSignal): void {
    if (!signal) return
    const abort = (): void => this.deleteCompleted(entity, track)
    signal.addEventListener('abort', abort, { once: true })
    track.detachAbort = () => signal.removeEventListener('abort', abort)
  }

  private settleTrack(track: ActionTrack | undefined): void {
    if (!track) return
    this.detachTrack(track)
    track.deferred?.resolve()
  }
}
