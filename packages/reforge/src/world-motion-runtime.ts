import type { Facing, GridPos, WalkSpeed } from '@type-pal/content'
import { asyncIntentAbortError } from './async-intent.js'
import {
  type MotionActor,
  MotionFairnessClock,
  type MotionIntent,
  type MotionOutcome,
  type MotionPlan,
  type MotionPlanInput,
  type MotionSource,
  motionActorKey,
  planEntityMotion,
  type SideStick,
} from './entity-motion.js'
import { MotionCompletionRecord } from './motion-batch.js'
import { MotionRuntimeCoordinator } from './motion-runtime-coordinator.js'
import { teardownMotionRuntime } from './motion-runtime-wiring.js'
import type { MoveEntityCommitControl } from './script-project-core.js'
import { scriptWorkWait } from './script-work-queue.js'

export type EntityMoveSource = 'script' | 'auto'

/** Semantic locomotion phase only; promises, authority epochs and scene tokens are rebuilt. */
export interface EntityMotionSnapshot {
  gait?: { phase: number; source: MotionSource; owner?: string }
  explicitAnimation?: number
  move?: {
    owner: string
    to: GridPos
    speed: WalkSpeed
    slowRestPending: boolean
    slowCadence: boolean
  }
}

export type MotionAuthority =
  | { kind: 'script' }
  | { kind: 'mount'; parent: string; dx: number; dy: number }

export interface EntityMotionSlotBase {
  source: EntityMoveSource
  commandEpoch: number
  sceneSessionId: string
  /** One-shot motion is no longer eligible for another planner tick after its live commit. */
  readonly committed?: boolean
  activationOwnerId?: string
  activationEpoch?: number
  resolve(): void
  cancel(message: string): void
  dropByAuthority?: () => void
  /** Same-stack notification after the one-shot's live motion attempt is committed. */
  commitAttempt?(): void
}

export interface EntityMoveSlot extends EntityMotionSlotBase {
  kind: 'move'
  to: GridPos
  speed: WalkSpeed
  commitControl?: MoveEntityCommitControl
  blockedAttempts: number
  nextBlockedReportAt: number
  slowRestPending: boolean
  /** Mounted rides keep their authored speed every world tick; ordinary slow moves keep the rest. */
  slowCadence: boolean
  /** A ride translates its carrier; unlike walking it does not turn that carrier. */
  preserveFacing: boolean
  commitSettlement(): void
}

export type AutoOneShotAck = 'attempted' | 'droppedByAuthority'
export type AutoStepAck =
  | { outcome: 'attempted'; commandEpoch: number }
  | { outcome: 'droppedByAuthority' }

export interface EntityStepSlot extends EntityMotionSlotBase {
  kind: 'step'
  dir: Facing
  authorityEpochAtEnqueue: number
  dropByAuthority(): void
}

export interface EntityChaseSlot extends EntityMotionSlotBase {
  kind: 'chase'
  range: number
  floating: boolean
  authorityEpochAtEnqueue?: number
}

export type EntityMotionSlot = EntityMoveSlot | EntityStepSlot | EntityChaseSlot

export interface PartyMoveSlot {
  readonly to: GridPos
  readonly speed: WalkSpeed
}

export interface MotionTraceEntry {
  scene: string
  worldTick: number
  actor: string
  source: MotionSource | 'passive-yield'
  from: GridPos
  proposed: GridPos
  outcome: MotionOutcome['kind']
  to: GridPos
  blockReason?: string
}

interface OwnedPartyMoveSlot extends PartyMoveSlot {
  resolve(): void
}

interface ActivationStamp {
  ownerId: string
  epoch: number
}

interface RegisterMoveInput {
  source: EntityMoveSource
  id: string
  to: GridPos
  speed: WalkSpeed
  sceneId: string
  signal?: AbortSignal
  activation?: ActivationStamp
  commitControl?: MoveEntityCommitControl
  slowCadence?: boolean
  preserveFacing?: boolean
}

interface RegisterAutoStepInput {
  id: string
  dir: Facing
  sceneId: string
  signal: AbortSignal
  activation: ActivationStamp
  onCommitted?(phase: 'continuation' | 'done'): void
}

interface RegisterChaseInput {
  source: EntityMoveSource
  id: string
  range: number
  floating: boolean
  sceneId: string
  signal: AbortSignal
  activation?: ActivationStamp
  onRegistered(slot: EntityChaseSlot): void
  onDropped(): void
  onCancelled(slot: EntityChaseSlot): void
  onCommitted?(phase: 'continuation' | 'done'): void
}

interface PlanWorldMotionInput
  extends Omit<MotionPlanInput, 'tick' | 'sideSticks' | 'fairnessTickForGroup'> {
  liveActors: ReadonlySet<string>
}

const MOTION_TRACE_LIMIT = 4096

/**
 * Owns transient world-motion state around the pure planner and the durable slot coordinator.
 *
 * Live scene/world positions remain with their existing owners. This runtime owns only cadence,
 * command identity, registrations, gait presentation state, contention state and diagnostics, so
 * main can coordinate one atomic live-state commit without maintaining a second slot registry.
 */
export class WorldMotionRuntime {
  readonly coordinator: MotionRuntimeCoordinator<MotionAuthority, EntityMotionSlot>
  private nextCommand = 1
  private partySlot: OwnedPartyMoveSlot | null = null
  private moveAccumulator = 0
  private tick = 0
  private ticksInFrame = 0
  private readonly walkPhases = new Map<string, number>()
  private readonly gaitOwners = new Map<string, { source: MotionSource; epoch: number }>()
  private readonly gaitActivationOwners = new Map<string, string>()
  private readonly lastMovedTicks = new Map<string, number>()
  private readonly scriptGaitHandoffs = new Map<
    string,
    {
      phase: number
      pos: GridPos
      sceneSessionId: string
      authorityEpoch: number
      activation: { ownerId: string; epoch: number }
    }
  >()
  private readonly explicitAnimations = new Map<string, number>()
  private readonly restoredMoves = new Map<string, NonNullable<EntityMotionSnapshot['move']>>()
  private sideSticks: SideStick[] = []
  private readonly fairnessClock = new MotionFairnessClock()
  private readonly traces: MotionTraceEntry[] = []
  private playerEpoch = 1
  private playerDirection: Facing | null = null

  constructor(private readonly stepMs: number) {
    this.coordinator = new MotionRuntimeCoordinator<MotionAuthority, EntityMotionSlot>((id) => {
      if (id === 'party') {
        this.clearStick({ kind: 'party' })
        this.playerEpoch++
      } else {
        // Taking/releasing an entity pauses an automatic owner; it does not restart its walk.
        // Script/hostile gaits still end with their authority. Auto completion/lifecycle owns
        // clearing the retained phase, and the presentation adapter hides it while taken.
        if (this.hasGait(id) && this.gaitOwner(id)?.source !== 'auto') this.clearGait(id)
        if (this.coordinator.authority.has(id)) this.scriptGaitHandoffs.delete(id)
        this.clearStick({ kind: 'entity', id })
      }
    })
  }

  get worldTick(): number {
    return this.tick
  }

  get worldTicksThisFrame(): number {
    return this.ticksInFrame
  }

  get partyMove(): PartyMoveSlot | null {
    return this.partySlot
  }

  nextCommandEpoch(): number {
    return this.nextCommand++
  }

  currentSceneSessionId(sceneId: string): string {
    return this.coordinator.currentSceneSessionId(sceneId)
  }

  advanceCadence(dt: number, frozen: boolean): boolean {
    this.ticksInFrame = 0
    if (frozen) return false
    this.moveAccumulator += dt
    if (this.moveAccumulator < this.stepMs) return false
    this.moveAccumulator -= this.stepMs
    if (this.moveAccumulator > this.stepMs) this.moveAccumulator = 0
    this.ticksInFrame = 1
    this.scriptGaitHandoffs.clear()
    this.tick++
    return true
  }

  resetCadence(): void {
    this.moveAccumulator = 0
  }

  clearWorldTicks(): void {
    this.ticksInFrame = 0
  }

  schedulePartyMove(to: GridPos, speed: WalkSpeed, signal?: AbortSignal): Promise<void> {
    return scriptWorkWait<void>(signal, (resolve, reject) => {
      signal?.throwIfAborted()
      let settled = false
      const entry: OwnedPartyMoveSlot = {
        to: { ...to },
        speed,
        resolve: (): void => {
          if (settled) return
          settled = true
          signal?.removeEventListener('abort', abort)
          if (this.partySlot === entry) this.partySlot = null
          resolve()
        },
      }
      const abort = (): void => {
        if (settled) return
        settled = true
        if (this.partySlot === entry) this.partySlot = null
        signal?.removeEventListener('abort', abort)
        reject(asyncIntentAbortError('队伍走位所属 runner 已取消'))
      }
      this.partySlot?.resolve()
      this.partySlot = entry
      signal?.addEventListener('abort', abort, { once: true })
      if (signal?.aborted) abort()
    })
  }

  completePartyMove(slot: PartyMoveSlot): void {
    if (this.partySlot === slot) this.partySlot.resolve()
  }

  resolvePartyMove(): void {
    this.partySlot?.resolve()
  }

  registerMove(input: RegisterMoveInput): Promise<number> {
    return scriptWorkWait<number>(input.signal, (resolve, reject) => {
      const { source, id, signal } = input
      signal?.throwIfAborted()
      const registry =
        source === 'script' ? this.coordinator.scriptSlots : this.coordinator.autoSlots
      let entry!: EntityMoveSlot
      const abort = (): void => entry.cancel(`实体 ${id} ${source} 走位所属 runner 已取消`)
      const completion = new MotionCompletionRecord<string>(
        () => {
          signal?.removeEventListener('abort', abort)
          if (registry.get(id) === entry) registry.delete(id)
        },
        () => resolve(entry.commandEpoch),
        (message) => reject(asyncIntentAbortError(message)),
      )
      entry = {
        kind: 'move',
        source,
        to: { ...input.to },
        speed: input.speed,
        blockedAttempts: 0,
        nextBlockedReportAt: 20,
        slowRestPending: false,
        slowCadence: input.slowCadence ?? true,
        preserveFacing: input.preserveFacing ?? false,
        commandEpoch: this.nextCommandEpoch(),
        sceneSessionId: this.currentSceneSessionId(input.sceneId),
        ...(input.activation
          ? {
              activationOwnerId: input.activation.ownerId,
              activationEpoch: input.activation.epoch,
            }
          : {}),
        ...(input.commitControl ? { commitControl: input.commitControl } : {}),
        commitSettlement: (): void => void completion.commit(),
        resolve: (): void => void completion.resolve(),
        cancel: (message: string): void => void completion.cancel(message),
      }
      const resumed = this.restoredMoves.get(id)
      this.restoredMoves.delete(id)
      if (
        resumed &&
        source === 'auto' &&
        input.activation?.ownerId === resumed.owner &&
        input.to.col === resumed.to.col &&
        input.to.row === resumed.to.row &&
        input.to.height === resumed.to.height &&
        input.speed === resumed.speed
      ) {
        entry.slowRestPending = resumed.slowRestPending
        entry.slowCadence = resumed.slowCadence
        if (this.hasGait(id)) this.gaitOwners.set(id, { source: 'auto', epoch: entry.commandEpoch })
      }
      registry.get(id)?.cancel(`实体 ${id} 的旧 ${source} 走位已被新走位替换`)
      registry.set(id, entry)
      signal?.addEventListener('abort', abort, { once: true })
      if (signal?.aborted) abort()
    })
  }

  registerAutoStep(input: RegisterAutoStepInput): Promise<AutoStepAck> {
    return scriptWorkWait<AutoStepAck>(input.signal, (resolve, reject) => {
      const { id, signal } = input
      signal.throwIfAborted()
      if (this.coordinator.authority.has(id)) {
        input.onCommitted?.('done')
        resolve({ outcome: 'droppedByAuthority' })
        return
      }
      let settled = false
      let committed = false
      let entry!: EntityStepSlot
      const commitAttempt = (): void => {
        if (settled || committed) return
        committed = true
        input.onCommitted?.('continuation')
      }
      const settle = (outcome: AutoOneShotAck): void => {
        if (settled) return
        if (outcome === 'attempted') commitAttempt()
        else input.onCommitted?.('done')
        settled = true
        signal.removeEventListener('abort', abort)
        if (outcome === 'attempted') this.coordinator.rememberCommittedAutoContinuation(id, entry)
        if (this.coordinator.autoSlots.get(id) === entry) this.coordinator.autoSlots.delete(id)
        resolve(
          outcome === 'attempted' ? { outcome, commandEpoch: entry.commandEpoch } : { outcome },
        )
      }
      entry = {
        kind: 'step',
        source: 'auto',
        get committed() {
          return committed
        },
        dir: input.dir,
        commandEpoch: this.nextCommandEpoch(),
        sceneSessionId: this.currentSceneSessionId(input.sceneId),
        activationOwnerId: input.activation.ownerId,
        activationEpoch: input.activation.epoch,
        authorityEpochAtEnqueue: this.coordinator.epoch(id),
        commitAttempt,
        resolve: (): void => settle('attempted'),
        dropByAuthority: (): void => settle('droppedByAuthority'),
        cancel: (message: string): void => {
          if (settled) return
          settled = true
          signal.removeEventListener('abort', abort)
          if (this.coordinator.autoSlots.get(id) === entry) this.coordinator.autoSlots.delete(id)
          reject(asyncIntentAbortError(message))
        },
      }
      const abort = (): void => entry.cancel(`auto 实体 ${id} 单步所属 runner 已取消`)
      this.coordinator.autoSlots.get(id)?.cancel(`实体 ${id} 的旧 auto locomotion 已被单步替换`)
      this.coordinator.autoSlots.set(id, entry)
      signal.addEventListener('abort', abort, { once: true })
      if (signal.aborted) abort()
    })
  }

  registerChase(input: RegisterChaseInput): Promise<AutoOneShotAck> {
    return scriptWorkWait<AutoOneShotAck>(input.signal, (resolve, reject) => {
      const { source, id, signal } = input
      signal.throwIfAborted()
      const registry =
        source === 'script' ? this.coordinator.scriptSlots : this.coordinator.autoSlots
      if (source === 'auto' && this.coordinator.authority.has(id)) {
        input.onCommitted?.('done')
        input.onDropped()
        resolve('droppedByAuthority')
        return
      }
      let settled = false
      let committed = false
      let entry!: EntityChaseSlot
      const commitAttempt = (): void => {
        if (settled || committed) return
        committed = true
        input.onCommitted?.('continuation')
      }
      const settle = (outcome: AutoOneShotAck): void => {
        if (settled) return
        if (outcome === 'attempted') commitAttempt()
        else input.onCommitted?.('done')
        settled = true
        signal.removeEventListener('abort', abort)
        if (registry.get(id) === entry) registry.delete(id)
        if (outcome === 'droppedByAuthority') input.onDropped()
        resolve(outcome)
      }
      entry = {
        kind: 'chase',
        source,
        get committed() {
          return committed
        },
        range: input.range,
        floating: input.floating,
        commandEpoch: this.nextCommandEpoch(),
        sceneSessionId: this.currentSceneSessionId(input.sceneId),
        commitAttempt,
        ...(input.activation
          ? {
              activationOwnerId: input.activation.ownerId,
              activationEpoch: input.activation.epoch,
            }
          : {}),
        resolve: (): void => settle('attempted'),
        ...(source === 'auto'
          ? {
              authorityEpochAtEnqueue: this.coordinator.epoch(id),
              dropByAuthority: (): void => settle('droppedByAuthority'),
            }
          : {}),
        cancel: (message: string): void => {
          if (settled) return
          settled = true
          signal.removeEventListener('abort', abort)
          if (registry.get(id) === entry) registry.delete(id)
          input.onCancelled(entry)
          reject(asyncIntentAbortError(message))
        },
      }
      const abort = (): void => entry.cancel(`追逐实体 ${id} 所属 runner 已取消`)
      registry.get(id)?.cancel(`实体 ${id} 的旧 ${source} locomotion 已被追逐替换`)
      registry.set(id, entry)
      input.onRegistered(entry)
      signal.addEventListener('abort', abort, { once: true })
      if (signal.aborted) abort()
    })
  }

  gaitPhase(id: string): number | undefined {
    return this.walkPhases.get(id)
  }

  captureEntity(id: string): EntityMotionSnapshot {
    const phase = this.walkPhases.get(id),
      owner = this.gaitOwners.get(id)
    const explicitAnimation = this.explicitAnimations.get(id)
    const slot = this.coordinator.autoSlots.get(id)
    const move =
      slot?.kind === 'move' && slot.activationOwnerId
        ? {
            owner: slot.activationOwnerId,
            to: { ...slot.to },
            speed: slot.speed,
            slowRestPending: slot.slowRestPending,
            slowCadence: slot.slowCadence,
          }
        : this.restoredMoves.get(id)
    return structuredClone({
      ...(phase !== undefined && owner
        ? {
            gait: {
              phase,
              source: owner.source,
              ...(this.gaitActivationOwners.has(id)
                ? { owner: this.gaitActivationOwners.get(id) }
                : {}),
            },
          }
        : {}),
      ...(explicitAnimation !== undefined ? { explicitAnimation } : {}),
      ...(move ? { move } : {}),
    })
  }

  restoreEntity(id: string, saved: EntityMotionSnapshot): void {
    this.clearGait(id)
    this.clearExplicitAnimation(id)
    this.restoredMoves.delete(id)
    if (saved.gait) {
      this.walkPhases.set(id, saved.gait.phase)
      this.gaitOwners.set(id, { source: saved.gait.source, epoch: this.nextCommandEpoch() })
      if (saved.gait.owner) this.gaitActivationOwners.set(id, saved.gait.owner)
      this.lastMovedTicks.set(id, this.tick)
    }
    if (saved.explicitAnimation !== undefined)
      this.explicitAnimations.set(id, saved.explicitAnimation)
    if (saved.move) this.restoredMoves.set(id, structuredClone(saved.move))
  }

  discardRestoredMove(id: string): void {
    this.restoredMoves.delete(id)
  }

  hasGait(id: string): boolean {
    return this.walkPhases.has(id)
  }

  gaitOwner(id: string): { source: MotionSource; epoch: number } | undefined {
    return this.gaitOwners.get(id)
  }

  gaitActivationOwner(id: string): string | undefined {
    return this.gaitActivationOwners.get(id)
  }

  gaitIds(): string[] {
    return [...this.walkPhases.keys()]
  }

  lastMovedWorldTick(id: string): number | undefined {
    return this.lastMovedTicks.get(id)
  }

  clearGait(id: string, expected?: { source: MotionSource; epoch: number }): void {
    const owner = this.gaitOwners.get(id)
    if (expected && (owner?.source !== expected.source || owner.epoch !== expected.epoch)) return
    this.scriptGaitHandoffs.delete(id)
    this.walkPhases.delete(id)
    this.gaitOwners.delete(id)
    this.gaitActivationOwners.delete(id)
    this.lastMovedTicks.delete(id)
  }

  markGait(id: string, source: MotionSource, epoch: number): void {
    this.scriptGaitHandoffs.delete(id)
    // Game keeps one wCurrentFrameNum for set-frame, one-step and animate-object.
    // Preserve that phase when a scripted animation is followed by a step; otherwise
    // the first step silently restarts at phase 0 in Reforge.
    const previous = this.explicitAnimations.get(id) ?? this.walkPhases.get(id)
    this.explicitAnimations.delete(id)
    this.walkPhases.set(id, (previous ?? 0) + 1)
    this.gaitOwners.set(id, { source, epoch })
    const slot = this.coordinator.autoSlots.get(id)
    if (source === 'auto' && slot?.commandEpoch === epoch && slot.activationOwnerId)
      this.gaitActivationOwners.set(id, slot.activationOwnerId)
    else this.gaitActivationOwners.delete(id)
    this.lastMovedTicks.set(id, this.tick)
  }

  /** A real arrival step, kept only until this frame is presented; never a visible idle gait. */
  rememberScriptGaitHandoff(
    id: string,
    pos: GridPos,
    sceneSessionId: string,
    activation: { ownerId: string; epoch: number },
  ): void {
    const phase = (this.walkPhases.get(id) ?? 0) + 1
    this.clearGait(id)
    this.scriptGaitHandoffs.set(id, {
      phase,
      pos: { ...pos },
      sceneSessionId,
      authorityEpoch: this.coordinator.epoch(id),
      activation: { ...activation },
    })
  }

  adoptScriptGaitHandoff(id: string, pos: GridPos, slot: EntityMoveSlot): void {
    const handoff = this.scriptGaitHandoffs.get(id)
    this.scriptGaitHandoffs.delete(id)
    if (
      !handoff ||
      slot.source !== 'auto' ||
      this.coordinator.autoSlots.get(id) !== slot ||
      this.coordinator.authority.has(id) ||
      this.coordinator.epoch(id) !== handoff.authorityEpoch + 1 ||
      slot.sceneSessionId !== handoff.sceneSessionId ||
      slot.activationOwnerId !== handoff.activation.ownerId ||
      slot.activationEpoch !== handoff.activation.epoch ||
      pos.col !== handoff.pos.col ||
      pos.row !== handoff.pos.row ||
      pos.height !== handoff.pos.height ||
      (pos.col === slot.to.col && pos.row === slot.to.row && pos.height === slot.to.height)
    )
      return
    this.walkPhases.set(id, handoff.phase)
    this.gaitOwners.set(id, { source: 'auto', epoch: slot.commandEpoch })
    if (slot.activationOwnerId) this.gaitActivationOwners.set(id, slot.activationOwnerId)
    this.lastMovedTicks.set(id, this.tick)
  }

  clearScriptGaitHandoffs(id?: string): void {
    if (id === undefined) this.scriptGaitHandoffs.clear()
    else this.scriptGaitHandoffs.delete(id)
  }

  explicitAnimation(id: string): number | undefined {
    return this.explicitAnimations.get(id)
  }

  hasExplicitAnimation(id: string): boolean {
    return this.explicitAnimations.has(id)
  }

  advanceExplicitAnimation(id: string): void {
    this.scriptGaitHandoffs.delete(id)
    // 0x87 advances the same current-frame register used by 0x0F/0x14/0x6C.
    // A gait phase must therefore hand off to the next explicit frame instead of
    // leaving the renderer's gait branch active or restarting from zero.
    const previous = this.explicitAnimations.get(id) ?? this.walkPhases.get(id)
    this.walkPhases.delete(id)
    this.gaitOwners.delete(id)
    this.gaitActivationOwners.delete(id)
    this.lastMovedTicks.delete(id)
    this.explicitAnimations.set(id, (previous ?? 0) + 1)
  }

  setExplicitAnimation(id: string, frame: number): void {
    this.scriptGaitHandoffs.delete(id)
    this.walkPhases.delete(id)
    this.gaitOwners.delete(id)
    this.gaitActivationOwners.delete(id)
    this.lastMovedTicks.delete(id)
    this.explicitAnimations.set(id, frame)
  }

  clearExplicitAnimation(id: string): void {
    this.explicitAnimations.delete(id)
  }

  clearStick(actor: MotionActor): void {
    const key = motionActorKey(actor)
    this.sideSticks = this.sideSticks.filter((stick) => motionActorKey(stick.actor) !== key)
  }

  setPlayerDirection(direction: Facing | null): number {
    if (this.playerDirection !== direction) {
      this.playerDirection = direction
      this.playerEpoch++
      this.clearStick({ kind: 'party' })
    }
    return this.playerEpoch
  }

  plan(input: PlanWorldMotionInput): {
    plan: MotionPlan
    previousSideSticks: readonly SideStick[]
  } {
    const previousSideSticks = this.sideSticks
    this.fairnessClock.beginBatch()
    const plan = planEntityMotion({
      ...input,
      tick: this.tick,
      sideSticks: this.sideSticks,
      fairnessTickForGroup: (members) => this.fairnessClock.tickForGroup(members),
    })
    this.fairnessClock.commitBatch(input.liveActors)
    return { plan, previousSideSticks }
  }

  commitSideSticks(
    previous: readonly SideStick[],
    next: readonly SideStick[],
    activeIntents: readonly MotionIntent[],
    retainDormant: (stick: SideStick) => boolean,
  ): void {
    const activeKeys = new Set(activeIntents.map((intent) => motionActorKey(intent.actor)))
    const dormant = previous.filter((stick) => {
      if (activeKeys.has(motionActorKey(stick.actor)) || stick.actor.kind === 'party') return false
      return retainDormant(stick)
    })
    this.sideSticks = [...dormant, ...next]
  }

  recordTrace(
    enabled: boolean,
    scene: string,
    intents: readonly MotionIntent[],
    outcomes: readonly MotionOutcome[],
  ): void {
    if (!enabled) return
    const intentByActor = new Map(
      intents.map((intent) => [motionActorKey(intent.actor), intent] as const),
    )
    const blockReason = (outcome: Extract<MotionOutcome, { kind: 'blocked' }>): string => {
      const reason = outcome.reason
      if (reason.kind === 'terrain') return 'terrain'
      if (reason.kind === 'cycle')
        return `cycle:${reason.actors.map(motionActorKey).sort().join(',')}`
      return `${reason.kind}:${motionActorKey(reason.actor)}`
    }
    const entries = outcomes
      .map((outcome): MotionTraceEntry => {
        const actor = motionActorKey(outcome.actor)
        const intent = intentByActor.get(actor)
        return {
          scene,
          worldTick: this.tick,
          actor,
          source: intent?.source ?? 'passive-yield',
          from: { ...outcome.from },
          proposed: {
            ...(intent?.desired ?? (outcome.kind === 'blocked' ? outcome.from : outcome.to)),
          },
          outcome: outcome.kind,
          to: { ...(outcome.kind === 'blocked' ? outcome.from : outcome.to) },
          ...(outcome.kind === 'blocked' ? { blockReason: blockReason(outcome) } : {}),
        }
      })
      .sort((first, second) => stableCompare(first.actor, second.actor))
    this.traces.push(...entries)
    if (this.traces.length > MOTION_TRACE_LIMIT)
      this.traces.splice(0, this.traces.length - MOTION_TRACE_LIMIT)
  }

  dumpTrace(): MotionTraceEntry[] {
    return structuredClone(this.traces)
  }

  clearTrace(): void {
    this.traces.length = 0
  }

  teardownScene(hooks: {
    beforeCancelSlots(): void
    beforeReleaseAllAuthority(): void
    slotMessage(source: EntityMoveSource, actorId: string): string
  }): void {
    teardownMotionRuntime({
      runtime: this.coordinator,
      beforeCancelSlots: hooks.beforeCancelSlots,
      beforeReleaseAllAuthority: hooks.beforeReleaseAllAuthority,
      slotMessage: hooks.slotMessage,
    })
    this.walkPhases.clear()
    this.gaitOwners.clear()
    this.gaitActivationOwners.clear()
    this.lastMovedTicks.clear()
    this.scriptGaitHandoffs.clear()
    this.explicitAnimations.clear()
    this.restoredMoves.clear()
    this.sideSticks = []
    this.fairnessClock.clear()
  }
}

function stableCompare(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0
}
