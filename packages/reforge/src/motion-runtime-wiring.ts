import type { MotionCollision } from './entity-motion.js'
import type {
  CoordinatedMotionSlot,
  MotionRuntimeCoordinator,
} from './motion-runtime-coordinator.js'

/**
 * Original PAL movement domains are deliberately different:
 * authored walk/step commands are presentation movement and bypass collision, while enemy/player
 * chase remains autonomous movement. `floating` is evaluated separately by the planner and skips
 * the whole original obstacle check (terrain plus blocking event objects).
 */
export function runtimeMotionCollision(
  kind: CoordinatedMotionSlot['kind'] | 'hostile',
): MotionCollision {
  return kind === 'move' || kind === 'step' ? 'scriptedBypass' : 'dynamic'
}

export interface DurableEndpointSlot extends CoordinatedMotionSlot {
  commitControl?: { commitMoveEntityEndpoint(): void }
  commitSettlement(): void
  resolve(): void
}

export interface DeferredOneShotSlot extends CoordinatedMotionSlot {
  kind: 'step' | 'chase'
  resolve(): void
}

/** Production endpoint linearization used by main before live position/contact side effects. */
export function commitDurableMotionEndpoint<
  TAuthority,
  TRuntimeSlot extends CoordinatedMotionSlot,
  TSlot extends TRuntimeSlot & DurableEndpointSlot,
>(
  runtime: MotionRuntimeCoordinator<TAuthority, TRuntimeSlot>,
  targetId: string,
  slot: TSlot,
): void {
  slot.commitControl?.commitMoveEntityEndpoint()
  runtime.rememberCommittedAutoContinuation(targetId, slot)
  slot.commitSettlement()
}

/** Queued command wake-up paired with commitDurableMotionEndpoint. */
export function wakeDurableMotionEndpoint<
  TAuthority,
  TRuntimeSlot extends CoordinatedMotionSlot,
  TSlot extends TRuntimeSlot & DurableEndpointSlot,
>(
  _runtime: MotionRuntimeCoordinator<TAuthority, TRuntimeSlot>,
  _targetId: string,
  slot: TSlot,
): void {
  slot.resolve()
}

/**
 * Releases the durable owner lineage only after the auto command has crossed its authority/touch
 * safe point. Wake-up alone is too early: a touch runner may take now and hide/remove the target
 * later in the same chain, and lifecycle termination must still find the exact activation owner.
 */
export function finishDurableMotionContinuation<
  TAuthority,
  TRuntimeSlot extends CoordinatedMotionSlot,
>(
  runtime: MotionRuntimeCoordinator<TAuthority, TRuntimeSlot>,
  targetId: string,
  commandEpoch: number,
): void {
  runtime.forgetCommittedAutoContinuation(targetId, commandEpoch)
}

/** Deferred touch owns the next auto command boundary without freezing the current world tick. */
export function autoActivationSafePointOpen(
  lifecycleAllowed: boolean,
  deferredTouchPending: boolean,
): boolean {
  return lifecycleAllowed && !deferredTouchPending
}

export interface AutoTargetContinuationSnapshot {
  sceneCurrent: boolean
  activationCurrent: boolean
  targetPresent: boolean
  targetRemoved: boolean
  targetLifecycleAllowed: boolean
  ownerLifecycleAllowed: boolean
  authorityHeld: boolean
  deferredTouchBarrier: boolean
}

/**
 * Shared move/step/chase continuation gate for an auto command whose target may differ from its
 * activation owner. Invalid lineage aborts; suspend/take/deferred-touch merely waits.
 */
export async function waitForAutoTargetContinuation(args: {
  signal: AbortSignal
  read(): AutoTargetContinuationSnapshot
  wait(): Promise<void>
  invalid(snapshot: AutoTargetContinuationSnapshot): Error
}): Promise<void> {
  while (true) {
    args.signal.throwIfAborted()
    const snapshot = args.read()
    if (
      !snapshot.sceneCurrent ||
      !snapshot.activationCurrent ||
      !snapshot.targetPresent ||
      snapshot.targetRemoved
    )
      throw args.invalid(snapshot)
    if (
      snapshot.targetLifecycleAllowed &&
      snapshot.ownerLifecycleAllowed &&
      !snapshot.authorityHeld &&
      !snapshot.deferredTouchBarrier
    )
      return
    await args.wait()
  }
}

/**
 * Settles a one-shot only after the motion batch has offered touch its takeover window.
 *
 * Keeping the exact slot registered until this boundary lets same-tick take/hide/replace observe
 * and own the command. An obsolete or cancelled slot must never wake a replacement command.
 */
export function settleDeferredOneShotMotion<
  TAuthority,
  TRuntimeSlot extends CoordinatedMotionSlot,
  TSlot extends TRuntimeSlot & DeferredOneShotSlot,
>(
  runtime: MotionRuntimeCoordinator<TAuthority, TRuntimeSlot>,
  targetId: string,
  slot: TSlot,
): boolean {
  const registry = slot.source === 'script' ? runtime.scriptSlots : runtime.autoSlots
  if (registry.get(targetId) !== slot) return false
  slot.resolve()
  return true
}

export interface LifecycleMotionTerminationHooks {
  activationEpoch(ownerId: string): number | undefined
  abortActivation(ownerId: string, expectedEpoch: number): void
  cancelAutoTarget(message: string): void
  cancelScriptTarget(message: string): void
  releaseTargetAuthority(): void
}

/**
 * Applies the motion-owned half of lifecycle hide/remove.
 *
 * Exact activation epochs are mandatory: an endpoint can be durable while its old owner behavior
 * has already been replaced, and that stale lineage must never abort the replacement activation.
 */
export function terminateLifecycleMotion<TAuthority, TSlot extends CoordinatedMotionSlot>(args: {
  runtime: MotionRuntimeCoordinator<TAuthority, TSlot>
  kind: 'hide' | 'remove'
  targetId: string
  targetHasAuto: boolean
  hooks: LifecycleMotionTerminationHooks
}): string[] {
  const { runtime, kind, targetId, targetHasAuto, hooks } = args
  if (kind === 'hide' && targetHasAuto) runtime.rememberLifecycleHiddenAutoTarget(targetId)

  const exactOwners = new Map<string, number>()
  for (const lineage of runtime.activeAutoLineagesForTarget(targetId, hooks.activationEpoch)) {
    exactOwners.set(lineage.activationOwnerId, lineage.activationEpoch)
    if (kind === 'hide' && lineage.activationOwnerId !== targetId)
      runtime.rememberHiddenTargetOwner(targetId, lineage.activationOwnerId)
  }
  const ownEpoch = hooks.activationEpoch(targetId)
  if (ownEpoch !== undefined) exactOwners.set(targetId, ownEpoch)
  for (const [ownerId, epoch] of exactOwners) hooks.abortActivation(ownerId, epoch)

  hooks.cancelAutoTarget(`实体 ${targetId} lifecycle 已终止 auto 位移`)
  if (kind === 'remove') {
    runtime.forgetHiddenTarget(targetId)
    hooks.cancelScriptTarget(`实体 ${targetId} 已移除，script 位移未完成`)
    hooks.releaseTargetAuthority()
  }
  return [...exactOwners.keys()].sort(stableCompare)
}

/** Scene replacement teardown for the coordinator-owned runtime state. */
export function teardownMotionRuntime<TAuthority, TSlot extends CoordinatedMotionSlot>(args: {
  runtime: MotionRuntimeCoordinator<TAuthority, TSlot>
  beforeCancelSlots?: () => void
  beforeReleaseAllAuthority?: () => void
  slotMessage: (source: 'script' | 'auto', actorId: string) => string
}): void {
  args.beforeCancelSlots?.()
  args.runtime.cancelAllSlots(args.slotMessage)
  args.runtime.clearHiddenTargetRestarts()
  args.beforeReleaseAllAuthority?.()
  args.runtime.releaseAllAuthority()
  args.runtime.invalidateSceneSession()
}

function stableCompare(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0
}
