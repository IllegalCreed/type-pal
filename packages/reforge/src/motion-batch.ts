/**
 * Linearizes the side effects that follow one accepted world-motion plan.
 *
 * The planner itself is pure. This boundary keeps the runtime ordering explicit and testable:
 * canonical endpoints become durable before live positions, touch gets first takeover rights after
 * the atomic position commit, and command continuations are only queued after contact arbitration.
 */
export interface MotionBatchCommitHooks {
  commitCanonicalEndpoints(): void
  commitLivePositions(): void
  afterLiveCommit(): void
  runTouch(): boolean
  runPostContact(): void
  queueContinuations(): void
}

export function commitMotionBatch(hooks: MotionBatchCommitHooks): { touchTookOver: boolean } {
  hooks.commitCanonicalEndpoints()
  hooks.commitLivePositions()
  hooks.afterLiveCommit()
  const touchTookOver = hooks.runTouch()
  if (!touchTookOver) hooks.runPostContact()
  hooks.queueContinuations()
  return { touchTookOver }
}

export interface MotionContactPoint {
  col: number
  row: number
}

/** Contact is evaluated only after every accepted actor position in the batch is live. */
export function motionActorsAtContact(
  first: MotionContactPoint,
  second: MotionContactPoint,
  range = 1,
): boolean {
  return Math.max(Math.abs(first.col - second.col), Math.abs(first.row - second.row)) <= range
}

/**
 * A slot has two distinct boundaries: durable commit and later Promise wake-up. Once committed it
 * detaches from cancellation registries immediately; remove/replace may stop later commands but
 * cannot retroactively reject this completed command or roll back its endpoint.
 */
export class MotionCompletionRecord<TCancel> {
  private state: 'pending' | 'committed' | 'settled' = 'pending'

  constructor(
    private readonly detach: () => void,
    private readonly wake: () => void,
    private readonly reject: (reason: TCancel) => void,
  ) {}

  commit(): boolean {
    if (this.state !== 'pending') return false
    this.state = 'committed'
    this.detach()
    return true
  }

  resolve(): boolean {
    if (this.state === 'settled') return false
    const needsDetach = this.state === 'pending'
    this.state = 'settled'
    if (needsDetach) this.detach()
    this.wake()
    return true
  }

  cancel(reason: TCancel): boolean {
    if (this.state !== 'pending') return false
    this.state = 'settled'
    this.detach()
    this.reject(reason)
    return true
  }

  get committed(): boolean {
    return this.state === 'committed'
  }
}
