export type CoordinatedMotionSource = 'script' | 'auto'

export interface CoordinatedMotionSlot {
  source: CoordinatedMotionSource
  kind: 'move' | 'step' | 'chase'
  commandEpoch: number
  sceneSessionId: string
  activationOwnerId?: string
  activationEpoch?: number
  authorityEpochAtEnqueue?: number
  cancel(message: string): void
  dropByAuthority?: () => void
}

export interface CommittedAutoContinuation {
  commandEpoch: number
  sceneSessionId: string
  activationOwnerId: string
  activationEpoch: number
}

/**
 * Stateful ownership boundary shared by main's script/auto motion adapters.
 *
 * Geometry and rendering deliberately stay outside. This class owns only the state whose identity
 * must agree across registration, the 100ms planner snapshot, commit, lifecycle transitions and
 * scene teardown; tests can therefore exercise the same maps/epochs that production main uses.
 */
export class MotionRuntimeCoordinator<
  TAuthority,
  TSlot extends CoordinatedMotionSlot = CoordinatedMotionSlot,
> {
  readonly authority = new Map<string, TAuthority>()
  readonly authorityEpoch = new Map<string, number>()
  readonly scriptSlots = new Map<string, TSlot>()
  readonly autoSlots = new Map<string, TSlot>()
  private readonly hiddenTargetRestartOwners = new Map<string, Set<string>>()
  private readonly lifecycleHiddenAutoTargets = new Set<string>()
  private readonly committedAutoContinuations = new Map<
    string,
    Map<number, CommittedAutoContinuation>
  >()
  private sceneSessionEpoch = 1

  constructor(private readonly authorityChanged: (actorId: string) => void = () => undefined) {}

  currentSceneSessionId(sceneId: string): string {
    return `${sceneId}:${this.sceneSessionEpoch}`
  }

  invalidateSceneSession(): void {
    this.sceneSessionEpoch++
  }

  epoch(actorId: string): number {
    return this.authorityEpoch.get(actorId) ?? 0
  }

  setAuthority(actorId: string, authority: TAuthority): void {
    this.authority.set(actorId, authority)
    this.bumpAuthority(actorId)
  }

  releaseAuthority(actorId: string): boolean {
    if (!this.authority.delete(actorId)) return false
    this.bumpAuthority(actorId)
    return true
  }

  releaseAllAuthority(): void {
    for (const actorId of [...this.authority.keys()]) this.bumpAuthority(actorId)
    this.authority.clear()
  }

  canCommit(actorId: string, authorityStamp: number): boolean {
    return this.epoch(actorId) === authorityStamp
  }

  shouldDropAutoOneShot(actorId: string, slot: TSlot): boolean {
    return (
      slot.source === 'auto' &&
      slot.kind !== 'move' &&
      (this.authority.has(actorId) ||
        this.epoch(actorId) !== (slot.authorityEpochAtEnqueue ?? this.epoch(actorId)))
    )
  }

  slotInvalidReason(
    slot: TSlot,
    currentSceneSessionId: string,
    activationEpoch: (ownerId: string) => number | undefined,
  ): 'sceneSession' | 'activation' | undefined {
    if (slot.sceneSessionId !== currentSceneSessionId) return 'sceneSession'
    if (slot.source !== 'auto') return undefined
    if (
      !slot.activationOwnerId ||
      slot.activationEpoch === undefined ||
      activationEpoch(slot.activationOwnerId) !== slot.activationEpoch
    )
      return 'activation'
    return undefined
  }

  rememberHiddenTargetOwner(targetId: string, ownerId: string): void {
    if (targetId === ownerId) return
    const owners = this.hiddenTargetRestartOwners.get(targetId) ?? new Set<string>()
    owners.add(ownerId)
    this.hiddenTargetRestartOwners.set(targetId, owners)
  }

  takeHiddenTargetRestartOwners(targetId: string, effectiveAutoAllowed: boolean): string[] {
    if (!effectiveAutoAllowed) return []
    const owners = this.hiddenTargetRestartOwners.get(targetId)
    if (!owners) return []
    this.hiddenTargetRestartOwners.delete(targetId)
    return [...owners].sort(stableCompare)
  }

  rememberLifecycleHiddenAutoTarget(targetId: string): void {
    this.lifecycleHiddenAutoTargets.add(targetId)
  }

  takeLifecycleHiddenAutoTarget(targetId: string, effectiveAutoAllowed: boolean): boolean {
    if (!effectiveAutoAllowed || !this.lifecycleHiddenAutoTargets.has(targetId)) return false
    this.lifecycleHiddenAutoTargets.delete(targetId)
    return true
  }

  pendingLifecycleRestartTargetIds(): string[] {
    return [
      ...new Set([...this.lifecycleHiddenAutoTargets, ...this.hiddenTargetRestartOwners.keys()]),
    ].sort(stableCompare)
  }

  rememberCommittedAutoContinuation(targetId: string, slot: TSlot): void {
    if (slot.source !== 'auto' || !slot.activationOwnerId || slot.activationEpoch === undefined)
      return
    const byCommand = this.committedAutoContinuations.get(targetId) ?? new Map()
    byCommand.set(slot.commandEpoch, {
      commandEpoch: slot.commandEpoch,
      sceneSessionId: slot.sceneSessionId,
      activationOwnerId: slot.activationOwnerId,
      activationEpoch: slot.activationEpoch,
    })
    this.committedAutoContinuations.set(targetId, byCommand)
  }

  forgetCommittedAutoContinuation(targetId: string, commandEpoch: number): void {
    const byCommand = this.committedAutoContinuations.get(targetId)
    if (!byCommand) return
    byCommand.delete(commandEpoch)
    if (byCommand.size === 0) this.committedAutoContinuations.delete(targetId)
  }

  autoLineagesForTarget(targetId: string): CommittedAutoContinuation[] {
    const lineages = new Map<string, CommittedAutoContinuation>()
    const live = this.autoSlots.get(targetId)
    if (live?.activationOwnerId && live.activationEpoch !== undefined)
      lineages.set(`${live.activationOwnerId}:${live.activationEpoch}:${live.commandEpoch}`, {
        commandEpoch: live.commandEpoch,
        sceneSessionId: live.sceneSessionId,
        activationOwnerId: live.activationOwnerId,
        activationEpoch: live.activationEpoch,
      })
    for (const continuation of this.committedAutoContinuations.get(targetId)?.values() ?? [])
      lineages.set(
        `${continuation.activationOwnerId}:${continuation.activationEpoch}:${continuation.commandEpoch}`,
        continuation,
      )
    return [...lineages.values()].sort((first, second) => {
      const ownerOrder = stableCompare(first.activationOwnerId, second.activationOwnerId)
      return ownerOrder || first.activationEpoch - second.activationEpoch
    })
  }

  activeAutoLineagesForTarget(
    targetId: string,
    activationEpoch: (ownerId: string) => number | undefined,
  ): CommittedAutoContinuation[] {
    return this.autoLineagesForTarget(targetId).filter(
      (lineage) => activationEpoch(lineage.activationOwnerId) === lineage.activationEpoch,
    )
  }

  forgetHiddenTarget(targetId: string): void {
    this.hiddenTargetRestartOwners.delete(targetId)
    this.lifecycleHiddenAutoTargets.delete(targetId)
    this.committedAutoContinuations.delete(targetId)
  }

  cancelAllSlots(message: (source: CoordinatedMotionSource, actorId: string) => string): void {
    for (const [actorId, slot] of this.scriptSlots) slot.cancel(message('script', actorId))
    for (const [actorId, slot] of this.autoSlots) slot.cancel(message('auto', actorId))
    this.scriptSlots.clear()
    this.autoSlots.clear()
  }

  clearHiddenTargetRestarts(): void {
    this.hiddenTargetRestartOwners.clear()
    this.lifecycleHiddenAutoTargets.clear()
    this.committedAutoContinuations.clear()
  }

  private bumpAuthority(actorId: string): void {
    this.authorityEpoch.set(actorId, this.epoch(actorId) + 1)
    this.authorityChanged(actorId)
  }
}

function stableCompare(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0
}
