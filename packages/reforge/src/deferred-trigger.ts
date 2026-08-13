/** A same-scene touch landing that could not acquire the single interactive runner immediately. */
export interface DeferredTouchTriggerClaim<TPosition> {
  sceneSessionId: string
  entityId: string
  landingTick: number
  landing: TPosition
}

export type DeferredTouchDrainResult = 'empty' | 'held' | 'dropped' | 'started'
export type DeferredTouchClaimDisposition = 'ready' | 'hold' | 'drop'

/**
 * Keeps at most one player landing claim until the current runner releases its slot.
 *
 * The player cannot produce a second legitimate landing while this claim is live: the motion
 * adapter disables passive yield and an interactive runner already suppresses direct input. Keeping
 * this as a separate state machine makes "landing committed now, trigger delivered later" explicit
 * without coupling NPC world motion to dialogue time.
 */
export class DeferredTouchTrigger<TPosition> {
  private claim: DeferredTouchTriggerClaim<TPosition> | null = null
  private deliveryFence = false

  enqueue(claim: DeferredTouchTriggerClaim<TPosition>): boolean {
    if (this.claim) return false
    this.claim = claim
    return true
  }

  clear(): void {
    this.claim = null
    this.deliveryFence = false
  }

  clearEntity(entityId: string): boolean {
    if (this.claim?.entityId !== entityId) return false
    this.claim = null
    return true
  }

  get pending(): boolean {
    return this.claim !== null
  }

  /**
   * The claim stays an auto safe-point barrier until its newly started trigger has received one
   * microtask/macrotask execution opportunity. This lets a first take/hide/suspend command become
   * visible without coupling the current world tick to dialogue duration.
   */
  get blocksAutoSafePoint(): boolean {
    return this.claim !== null || this.deliveryFence
  }

  releaseDeliveryFence(): void {
    this.deliveryFence = false
  }

  drain(options: {
    sceneSessionId: string
    busy: boolean
    disposition: (claim: DeferredTouchTriggerClaim<TPosition>) => DeferredTouchClaimDisposition
    fire: (claim: DeferredTouchTriggerClaim<TPosition>) => boolean
  }): DeferredTouchDrainResult {
    const claim = this.claim
    if (!claim) return 'empty'
    if (claim.sceneSessionId !== options.sceneSessionId) {
      this.claim = null
      return 'dropped'
    }
    const disposition = options.disposition(claim)
    if (disposition === 'drop') {
      this.claim = null
      return 'dropped'
    }
    if (disposition === 'hold') return 'held'
    if (options.busy) return 'held'
    this.claim = null
    if (!options.fire(claim)) return 'dropped'
    this.deliveryFence = true
    return 'started'
  }
}
