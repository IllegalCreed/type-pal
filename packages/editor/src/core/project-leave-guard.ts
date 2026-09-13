import type { EditSession } from './edit-session.js'
import type { ScriptEditSession } from './script-editor.js'

export type ProjectLeaveIntent = 'new' | 'open'
export type ProjectOperation = ProjectLeaveIntent | 'save' | 'save-as' | 'export'
export type ProjectSaveOutcome = 'committed' | 'cancelled' | 'failed'
type Revision = readonly [number, number]
export interface ProjectOperationLease {
  readonly kind: ProjectOperation
  readonly revision: Revision
}
interface LeaveDecision {
  readonly intent: ProjectLeaveIntent
  readonly phase: 'decision' | 'saving' | 'ready'
  readonly revision: Revision
}
interface LeaveSnapshot {
  readonly decision: LeaveDecision | null
  readonly operation: ProjectOperation | null
}

/** Session-local UI admission, not a directory/write capability or a new undo timeline. */
export class ProjectLeaveGuard {
  private active = false
  private lease: ProjectOperationLease | null = null
  private writing = false
  private snapshot: LeaveSnapshot = { decision: null, operation: null }
  private readonly listeners = new Set<() => void>()

  constructor(
    private readonly main: EditSession,
    private readonly script: ScriptEditSession,
  ) {}

  getSnapshot = (): LeaveSnapshot => this.snapshot
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  connect(): () => void {
    this.active = true
    this.publish({ ...this.snapshot })
    const refresh = (): void => {
      const decision = this.snapshot.decision
      if (decision?.phase === 'ready' && (this.isDirty() || !this.unchanged(decision.revision)))
        this.publish({ ...this.snapshot, decision: { ...decision, phase: 'decision' } })
    }
    const offMain = this.main.subscribe(refresh)
    const offScript = this.script.subscribe(refresh)
    return () => {
      offMain()
      offScript()
      this.active = false
      this.lease = null
      this.writing = false
      this.publish({ decision: null, operation: null })
    }
  }

  isDirty(): boolean {
    return this.main.isDirty() || this.script.isDirty()
  }

  blocked(): boolean {
    return !this.active || this.lease !== null || this.snapshot.decision !== null
  }

  shouldWarnBeforeUnload(): boolean {
    return this.active && (this.isDirty() || this.writing)
  }

  /** Returns true only for a clean, immediately executable click. Never schedules a picker. */
  request(intent: ProjectLeaveIntent): boolean {
    if (this.blocked()) return false
    if (!this.isDirty()) return true
    this.publish({
      operation: null,
      decision: { intent, phase: 'decision', revision: this.revision() },
    })
    return false
  }

  cancel(): void {
    if (!this.lease) this.publish({ ...this.snapshot, decision: null })
  }

  /** Called by a fresh explicit discard/continue click; consent is not retained after cancellation. */
  confirm(): ProjectLeaveIntent | undefined {
    const decision = this.snapshot.decision
    if (!this.active || this.lease || !decision) return
    if (decision.phase === 'ready' && (this.isDirty() || !this.unchanged(decision.revision))) {
      this.publish({ ...this.snapshot, decision: { ...decision, phase: 'decision' } })
      return
    }
    this.publish({ decision: null, operation: null })
    return decision.intent
  }

  begin(kind: ProjectOperation, saveBeforeLeaving = false): ProjectOperationLease | undefined {
    if (!this.active || this.lease) return
    const decision = this.snapshot.decision
    if (decision && !(kind === 'save' && saveBeforeLeaving && decision.phase === 'decision')) return
    const lease = { kind, revision: this.revision() }
    this.lease = lease
    this.writing = kind === 'save' || kind === 'save-as'
    this.publish({
      operation: kind,
      decision: decision ? { ...decision, phase: 'saving' } : null,
    })
    return lease
  }

  isCurrent(lease: ProjectOperationLease): boolean {
    return this.active && this.lease === lease
  }

  canReplace(lease: ProjectOperationLease): boolean {
    return this.isCurrent(lease) && this.unchanged(lease.revision)
  }

  recovering(lease: ProjectOperationLease): void {
    if (this.isCurrent(lease)) this.writing = true
  }

  finish(lease: ProjectOperationLease, outcome?: ProjectSaveOutcome): void {
    if (!this.isCurrent(lease)) return
    const decision = this.snapshot.decision
    const ready = outcome === 'committed' && !this.isDirty() && this.unchanged(lease.revision)
    this.lease = null
    this.writing = false
    this.publish({
      operation: null,
      decision: decision
        ? { ...decision, phase: ready ? 'ready' : 'decision', revision: this.revision() }
        : null,
    })
  }

  private revision(): Revision {
    return [this.main.getHistoryVersion(), this.script.getHistoryVersion()]
  }

  private unchanged(revision: Revision): boolean {
    // discardRedo also increments historyVersion: conservatively invalidate, never rewrite history.
    return (
      this.main.getHistoryVersion() === revision[0] &&
      this.script.getHistoryVersion() === revision[1]
    )
  }

  private publish(snapshot: LeaveSnapshot): void {
    this.snapshot = snapshot
    for (const listener of this.listeners) listener()
  }
}
