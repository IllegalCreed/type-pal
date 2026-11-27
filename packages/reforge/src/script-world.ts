import type {
  AutoScriptContinuation,
  BaseSceneDef,
  BaseSceneEntity,
  EntityAddress,
  FlowCursor,
  WorldScriptState,
} from '@type-pal/content'
import {
  commitEntityBehaviorCursor,
  commitSceneHookCursor,
  entityOwner,
  hookOwner,
  type ResolvedEntityBehavior,
  type ResolvedSceneHook,
  resolveEntityBehavior,
  resolveSceneHook,
} from './script-flow-bindings.js'
import type {
  FlowCheckpointDecision,
  FlowCursorController,
  SafePointDecision,
} from './script-runner-core.js'
import { scriptWorkWait } from './script-work-queue.js'

export type PersistentFlowOwner =
  | {
      kind: 'entity-behavior'
      target: EntityAddress
      channel: 'trigger' | 'auto'
    }
  | {
      kind: 'scene-hook'
      scene: string
      slot: 'onEnter' | 'onTeleport'
    }

export interface FlowSaveBarrierHandle {
  ready: Promise<void>
  release(): void
  cancel(reason?: unknown): void
}

function ownerKey(owner: PersistentFlowOwner): string {
  return owner.kind === 'entity-behavior'
    ? JSON.stringify([owner.kind, owner.target.scene, owner.target.entity, owner.channel])
    : JSON.stringify([owner.kind, owner.scene, owner.slot])
}

export class FlowActivationLease implements FlowCursorController {
  private active = true
  private lastCursor?: FlowCursor

  constructor(
    private readonly coordinator: FlowRuntimeCoordinator,
    private readonly key: string,
    private readonly epoch: number,
    private readonly commit: (cursor: FlowCursor, resume?: AutoScriptContinuation) => void,
    private readonly nested = false,
    readonly checkpointEnabled = false,
  ) {}

  async reachSafePoint(cursor: FlowCursor): Promise<SafePointDecision> {
    if (!this.active) return 'stop'
    if (this.coordinator.epochForKey(this.key) !== this.epoch) {
      this.active = false
      this.coordinator.finish(this.key, this)
      return 'stop'
    }
    this.commit(structuredClone(cursor))
    this.lastCursor = structuredClone(cursor)
    if (this.checkpointEnabled) {
      this.coordinator.markSnapshotReady(this, true)
      return 'continue'
    }
    // Nested invocations finish the caller's command rather than return an intermediate
    // save stop as success. Their own lease remains active until normal return.
    if (this.coordinator.gateClosed() && !this.nested) {
      this.active = false
      this.coordinator.finish(this.key, this)
      return 'stop'
    }
    return 'continue'
  }

  checkpoint(
    cursor: FlowCursor,
    resume: AutoScriptContinuation,
    ready: boolean,
  ): FlowCheckpointDecision {
    if (!this.active || this.coordinator.epochForKey(this.key) !== this.epoch) return 'stop'
    if (!ready && this.coordinator.gateClosed()) return 'wait'
    this.commit(structuredClone(cursor), structuredClone(resume))
    this.lastCursor = structuredClone(cursor)
    this.coordinator.markSnapshotReady(this, ready)
    return 'continue'
  }

  async waitForCheckpointGate(signal: AbortSignal): Promise<void> {
    await this.coordinator.waitForActivationGate(signal)
  }

  setCheckpointReady(ready: boolean): FlowCheckpointDecision {
    if (!this.active || this.coordinator.epochForKey(this.key) !== this.epoch) return 'stop'
    if (!ready && this.coordinator.gateClosed()) return 'wait'
    this.coordinator.markSnapshotReady(this, ready)
    return 'continue'
  }

  /** Normal activation return (including stopScript) starts the next activation normally.
   * Cancellation retains a continuation; a superseded epoch must never overwrite the new slot.
   */
  discardContinuation(): void {
    if (
      this.checkpointEnabled &&
      this.active &&
      this.lastCursor &&
      this.lastCursor.kind !== 'completed' &&
      this.coordinator.epochForKey(this.key) === this.epoch
    )
      this.commit(structuredClone(this.lastCursor))
  }

  close(): void {
    if (!this.active) return
    this.active = false
    this.coordinator.finish(this.key, this)
  }
}

/**
 * 不持久化 FlowCursor 的脚本活动租约。共享脚本、物品私有脚本和临时 command
 * 仍必须进入与持久 flow 相同的 active 注册表，否则 save barrier 会漏看正在等待
 * confirm / battle / host effect 的执行。
 */
export class FlowActivityLease {
  private active = true

  constructor(
    private readonly coordinator: FlowRuntimeCoordinator,
    private readonly key: string,
  ) {}

  close(): void {
    if (!this.active) return
    this.active = false
    this.coordinator.finish(this.key, this)
  }
}

export interface ActiveEntityBehavior extends ResolvedEntityBehavior {
  lease: FlowActivationLease
}

export type FlowLease = FlowActivationLease | FlowActivityLease

export interface ActiveSceneHook extends ResolvedSceneHook {
  lease: FlowActivationLease
}

interface PendingBarrier {
  ready: boolean
  resolve: () => void
  reject: (reason?: unknown) => void
  opened: Promise<void>
  resolveOpened: () => void
}

export class FlowRuntimeCoordinator {
  private readonly idleWaiters = new Map<string, Set<() => void>>()
  private readonly epochs = new Map<string, number>()
  private readonly active = new Map<string, FlowLease>()
  private readonly leaseKeys = new WeakMap<FlowLease, string>()
  private readonly snapshotReady = new WeakSet<FlowLease>()
  private nextActivityId = 1
  private pending?: PendingBarrier

  constructor(private readonly flowCompleted?: (owner: PersistentFlowOwner) => void) {}

  epoch(owner: PersistentFlowOwner): number {
    return this.epochForKey(ownerKey(owner))
  }

  /** 只读活跃身份查询；epoch失效的在途lease仍然是busy，不允许同owner重新租用。 */
  isOwnerActive(owner: PersistentFlowOwner): boolean {
    return this.active.has(ownerKey(owner))
  }

  bump(owner: PersistentFlowOwner): number {
    const key = ownerKey(owner)
    const epoch = this.epochForKey(key) + 1
    this.epochs.set(key, epoch)
    return epoch
  }

  begin(
    owner: PersistentFlowOwner,
    commit: (cursor: FlowCursor, resume?: AutoScriptContinuation) => void,
    parent?: FlowLease,
  ): FlowActivationLease | undefined {
    if (parent && !this.hasActiveLease(parent))
      throw new Error('script parent lease 已失效或不属于当前 coordinator')
    if (this.pending && (!parent || this.pending.ready)) return
    const key = ownerKey(owner)
    if (this.active.has(key)) return
    const lease = new FlowActivationLease(
      this,
      key,
      this.epochForKey(key),
      (cursor, resume) => {
        commit(cursor, resume)
        if (cursor.kind === 'completed') this.flowCompleted?.(structuredClone(owner))
      },
      !!parent,
      !parent && owner.kind === 'entity-behavior' && owner.channel === 'auto',
    )
    this.leaseKeys.set(lease, key)
    this.active.set(key, lease)
    // No command has begun yet: a gameplay/modal gate may suspend this activation indefinitely.
    // The existing saved cursor (or canonical initial cursor) is already a valid snapshot.
    if (lease.checkpointEnabled) this.snapshotReady.add(lease)
    return lease
  }

  /**
   * 登记一个无 cursor 的完整脚本活动。save barrier 已关闭时拒绝新活动；调用方应通过
   * waitForActivationGate 等待并重试，与持久 flow 的激活纪律一致。
   */
  beginActivity(): FlowActivityLease | undefined {
    if (this.pending) return
    const key = `transient:${this.nextActivityId++}`
    const lease = new FlowActivityLease(this, key)
    this.leaseKeys.set(lease, key)
    this.active.set(key, lease)
    return lease
  }

  requestSaveBarrier(): FlowSaveBarrierHandle {
    if (this.pending) throw new Error('save barrier 已经关闭')
    let resolve!: () => void
    let reject!: (reason?: unknown) => void
    let resolveOpened!: () => void
    const ready = new Promise<void>((accept, decline) => {
      resolve = accept
      reject = decline
    })
    const opened = new Promise<void>((accept) => {
      resolveOpened = accept
    })
    const pending = { ready: false, resolve, reject, opened, resolveOpened }
    this.pending = pending
    this.resolveBarrierIfReady()
    return {
      ready,
      release: () => {
        if (this.pending !== pending) throw new Error('save barrier handle 已失效')
        if (!pending.ready) throw new Error('save barrier 尚未 ready，不能 release')
        this.pending = undefined
        pending.resolveOpened()
      },
      cancel: (reason?: unknown) => {
        if (this.pending !== pending) return
        this.pending = undefined
        pending.resolveOpened()
        if (!pending.ready)
          pending.reject(
            reason instanceof Error
              ? reason
              : new Error(reason === undefined ? 'save barrier cancelled' : String(reason)),
          )
      },
    }
  }

  async waitForActivationGate(signal: AbortSignal): Promise<void> {
    while (this.pending) {
      if (signal.aborted) throw new DOMException('script activation aborted', 'AbortError')
      const pending = this.pending
      await scriptWorkWait<void>(signal, (resolve, reject) => {
        let settled = false
        const finish = (): void => {
          if (settled) return
          settled = true
          signal.removeEventListener('abort', abort)
          resolve()
        }
        const abort = (): void => {
          if (settled) return
          settled = true
          reject(new DOMException('script activation aborted', 'AbortError'))
        }
        void pending.opened.then(finish)
        signal.addEventListener('abort', abort, { once: true })
        if (signal.aborted) abort()
      })
    }
  }

  beginEntityBehavior(
    world: WorldScriptState,
    entity: BaseSceneEntity,
    target: EntityAddress,
    channel: 'trigger' | 'auto',
    parent?: FlowLease,
    beforeCommit?: () => void,
  ): ActiveEntityBehavior | undefined {
    const resolved = resolveEntityBehavior(entity, world, target, channel)
    if (!resolved || resolved.cursor.kind === 'completed') return
    const lease = this.begin(
      entityOwner(target, channel),
      (cursor, resume) => {
        beforeCommit?.()
        commitEntityBehaviorCursor(world, target, channel, resolved, cursor, resume)
      },
      parent,
    )
    if (!lease) return
    return { ...resolved, lease }
  }

  beginSceneHook(
    world: WorldScriptState,
    scene: BaseSceneDef,
    slot: 'onEnter' | 'onTeleport',
    parent?: FlowLease,
    beforeCommit?: () => void,
  ): ActiveSceneHook | undefined {
    const resolved = resolveSceneHook(scene, world, slot)
    if (!resolved || resolved.cursor.kind === 'completed') return
    const lease = this.begin(
      hookOwner(scene.id, slot),
      (cursor) => {
        beforeCommit?.()
        commitSceneHookCursor(world, scene.id, slot, resolved, cursor)
      },
      parent,
    )
    if (!lease) return
    return { ...resolved, lease }
  }

  epochForKey(key: string): number {
    return this.epochs.get(key) ?? 0
  }

  gateClosed(): boolean {
    return this.pending !== undefined
  }

  /** Membership, not epoch: a superseded invocation still runs to its safe point. */
  hasActiveLease(lease: FlowLease): boolean {
    const key = this.leaseKeys.get(lease)
    return key !== undefined && this.active.get(key) === lease
  }

  finish(key: string, lease: FlowLease): void {
    if (this.active.get(key) === lease) {
      this.active.delete(key)
      for (const wake of [...(this.idleWaiters.get(key) ?? [])]) wake()
    }
    this.resolveBarrierIfReady()
  }

  waitForOwnerIdle(owner: PersistentFlowOwner, signal: AbortSignal): Promise<void> {
    const key = ownerKey(owner)
    signal.throwIfAborted()
    if (!this.active.has(key)) return Promise.resolve()
    return scriptWorkWait<void>(signal, (resolve, reject) => {
      const waiters = this.idleWaiters.get(key) ?? new Set<() => void>()
      const cleanup = () => {
        waiters.delete(wake)
        if (!waiters.size) this.idleWaiters.delete(key)
        signal.removeEventListener('abort', abort)
      }
      const wake = () => {
        cleanup()
        resolve()
      }
      const abort = () => {
        cleanup()
        reject(new DOMException('automatic owner wait aborted', 'AbortError'))
      }
      waiters.add(wake)
      this.idleWaiters.set(key, waiters)
      signal.addEventListener('abort', abort, { once: true })
      if (signal.aborted) abort()
    })
  }

  markSnapshotReady(lease: FlowLease, ready: boolean): void {
    if (ready) this.snapshotReady.add(lease)
    else this.snapshotReady.delete(lease)
    this.resolveBarrierIfReady()
  }

  private resolveBarrierIfReady(): void {
    if (!this.pending || this.pending.ready) return
    for (const lease of this.active.values()) if (!this.snapshotReady.has(lease)) return
    this.pending.ready = true
    this.pending.resolve()
  }
}

export { evalAuthorCondition } from './script-conditions.js'
export {
  assertFlowCursor,
  type EntityPageSelectionResult,
  initialFlowCursor,
  type ResolvedEntityBehavior,
  type ResolvedSceneHook,
  resolveBaseEntityPage,
  resolveEntityBehavior,
  resolveEntityTriggerActivation,
  resolveSceneHook,
  selectBaseEntityPage,
  selectBaseSceneHooks,
  selectEntityBehavior,
  setEntityTriggerActivation,
} from './script-flow-bindings.js'
