import { describe, expect, test, vi } from 'vitest'
import { deferred, nextTestTask } from './__tests__/deferred.js'
import { commitMotionBatch } from './motion-batch.js'
import { MotionRuntimeCoordinator } from './motion-runtime-coordinator.js'
import {
  autoActivationSafePointOpen,
  commitDurableMotionEndpoint,
  type DeferredOneShotSlot,
  type DurableEndpointSlot,
  finishDurableMotionContinuation,
  partyBodyContactDistance,
  partyBodyOverlaps,
  runtimeMotionCollision,
  settleDeferredOneShotMotion,
  terminateLifecycleMotion,
  waitForAutoTargetContinuation,
  wakeDurableMotionEndpoint,
} from './motion-runtime-wiring.js'
import { WorldMotionRuntime } from './world-motion-runtime.js'

type Authority = { kind: 'script' }

function endpointSlot(overrides: Partial<DurableEndpointSlot> = {}) {
  const events: string[] = []
  let committed = false
  return {
    slot: {
      source: 'auto',
      kind: 'move',
      commandEpoch: 12,
      sceneSessionId: 's001:1',
      activationOwnerId: 'owner',
      activationEpoch: 7,
      cancel: (message) => {
        if (!committed) events.push(`cancel:${message}`)
      },
      commitControl: { commitMoveEntityEndpoint: () => events.push('canonical') },
      commitSettlement: () => {
        committed = true
        events.push('settlement')
      },
      resolve: () => events.push('wake'),
      ...overrides,
    } satisfies DurableEndpointSlot,
    events,
  }
}

function lifecycleHooks(active: Map<string, number>) {
  const aborted: string[] = []
  return {
    aborted,
    hooks: {
      activationEpoch: (ownerId: string) => active.get(ownerId),
      abortActivation: (ownerId: string, expectedEpoch: number) => {
        if (active.get(ownerId) !== expectedEpoch) return
        active.delete(ownerId)
        aborted.push(`${ownerId}@${expectedEpoch}`)
      },
      cancelAutoTarget: vi.fn(),
      cancelScriptTarget: vi.fn(),
      releaseTargetAuthority: vi.fn(),
    },
  }
}

describe('production motion runtime wiring', () => {
  test('legacy contact matches the first-stage weighted pixel footprint', () => {
    expect(partyBodyContactDistance({ col: 125.75, row: 45 }, { col: 126, row: 45 })).toBe(8)
    expect(partyBodyOverlaps({ col: 125.75, row: 45 }, { col: 126, row: 45 })).toBe(true)
    expect(partyBodyOverlaps({ col: 125.75, row: 45 }, { col: 126, row: 46 })).toBe(false)
  })

  test.each([
    ['move', 'scriptedBypass'],
    ['step', 'scriptedBypass'],
    ['chase', 'dynamic'],
    ['hostile', 'dynamic'],
  ] as const)('%s uses the original PAL collision domain %s', (kind, collision) => {
    expect(runtimeMotionCollision(kind)).toBe(collision)
  })

  test('same-scene dialogue touch preserves a durable endpoint and continuation session', () => {
    const runtime = new MotionRuntimeCoordinator<
      Authority,
      DurableEndpointSlot | DeferredOneShotSlot
    >()
    const { slot, events } = endpointSlot()
    runtime.autoSlots.set('target', slot)
    let live = 0
    let dialogueStarted = false

    commitMotionBatch({
      commitCanonicalEndpoints: () => commitDurableMotionEndpoint(runtime, 'target', slot),
      commitLivePositions: () => {
        live = 7
      },
      afterLiveCommit: () => undefined,
      runTouch: () => {
        dialogueStarted = true
        return true
      },
      runPostContact: () => {
        throw new Error('touch takeover must suppress post-contact')
      },
      queueContinuations: () => wakeDurableMotionEndpoint(runtime, 'target', slot),
    })

    expect(dialogueStarted).toBe(true)
    expect(live).toBe(7)
    expect(events).toEqual(['canonical', 'settlement', 'wake'])
    expect(runtime.currentSceneSessionId('s001')).toBe('s001:1')
  })

  test('same-actor take happens after endpoint durability and only gates the next safe point', () => {
    const runtime = new MotionRuntimeCoordinator<
      Authority,
      DurableEndpointSlot | DeferredOneShotSlot
    >()
    const { slot, events } = endpointSlot()
    runtime.autoSlots.set('target', slot)
    let canonical = 0

    commitMotionBatch({
      commitCanonicalEndpoints: () => {
        canonical = 7
        commitDurableMotionEndpoint(runtime, 'target', slot)
      },
      commitLivePositions: () => undefined,
      afterLiveCommit: () => undefined,
      runTouch: () => {
        runtime.setAuthority('target', { kind: 'script' })
        return true
      },
      runPostContact: () => undefined,
      queueContinuations: () => wakeDurableMotionEndpoint(runtime, 'target', slot),
    })

    expect(canonical).toBe(7)
    expect(events).toEqual(['canonical', 'settlement', 'wake'])
    expect(runtime.authority.get('target')).toEqual({ kind: 'script' })
  })

  test('a newer touch position wins after the old endpoint without rolling durability back', () => {
    const runtime = new MotionRuntimeCoordinator<Authority, DurableEndpointSlot>()
    const { slot } = endpointSlot()
    let canonical = 0
    let live = 0
    commitMotionBatch({
      commitCanonicalEndpoints: () => {
        canonical = 7
        commitDurableMotionEndpoint(runtime, 'target', slot)
      },
      commitLivePositions: () => {
        live = 7
      },
      afterLiveCommit: () => undefined,
      runTouch: () => {
        canonical = 11
        live = 11
        return true
      },
      runPostContact: () => undefined,
      queueContinuations: () => wakeDurableMotionEndpoint(runtime, 'target', slot),
    })
    expect({ canonical, live }).toEqual({ canonical: 11, live: 11 })
  })

  test('cross-target touch hide aborts the exact committed owner and records canonical restart', () => {
    const runtime = new MotionRuntimeCoordinator<Authority, DurableEndpointSlot>()
    const { slot, events } = endpointSlot({ activationOwnerId: 'owner-a', activationEpoch: 7 })
    const active = new Map([['owner-a', 7]])
    const { hooks, aborted } = lifecycleHooks(active)
    runtime.autoSlots.set('target', slot)
    commitDurableMotionEndpoint(runtime, 'target', slot)

    expect(
      terminateLifecycleMotion({
        runtime,
        kind: 'hide',
        targetId: 'target',
        targetHasAuto: false,
        hooks,
      }),
    ).toEqual(['owner-a'])
    wakeDurableMotionEndpoint(runtime, 'target', slot)

    expect(aborted).toEqual(['owner-a@7'])
    expect(runtime.takeHiddenTargetRestartOwners('target', true)).toEqual(['owner-a'])
    expect(events).toEqual(['canonical', 'settlement', 'wake'])
  })

  test('durable cross-target lineage survives wake/take until the exact auto safe point finishes', () => {
    const runtime = new MotionRuntimeCoordinator<Authority, DurableEndpointSlot>()
    const { slot } = endpointSlot({ activationOwnerId: 'owner-a', activationEpoch: 7 })
    runtime.autoSlots.set('target', slot)
    commitDurableMotionEndpoint(runtime, 'target', slot)
    // Production MotionCompletionRecord detaches the live slot at durable settlement.
    runtime.autoSlots.delete('target')
    wakeDurableMotionEndpoint(runtime, 'target', slot)
    runtime.setAuthority('target', { kind: 'script' })

    expect(runtime.autoLineagesForTarget('target')).toMatchObject([
      { activationOwnerId: 'owner-a', activationEpoch: 7, commandEpoch: 12 },
    ])
    finishDurableMotionContinuation(runtime, 'target', slot.commandEpoch)
    expect(runtime.autoLineagesForTarget('target')).toEqual([])
  })

  test('attempted cross-target step lineage lets deferred touch hide abort and restart its owner', () => {
    const runtime = new MotionRuntimeCoordinator<
      Authority,
      DurableEndpointSlot | DeferredOneShotSlot
    >()
    const step = {
      source: 'auto',
      kind: 'step',
      commandEpoch: 18,
      sceneSessionId: 's001:1',
      activationOwnerId: 'owner-a',
      activationEpoch: 7,
      cancel: () => undefined,
      resolve: () => undefined,
    } as const
    runtime.autoSlots.set('target', step)
    // Production scheduleAutoStep records lineage as the accepted attempt settles, then detaches.
    runtime.rememberCommittedAutoContinuation('target', step)
    runtime.autoSlots.delete('target')
    const active = new Map([['owner-a', 7]])
    const { hooks, aborted } = lifecycleHooks(active)

    terminateLifecycleMotion({
      runtime,
      kind: 'hide',
      targetId: 'target',
      targetHasAuto: false,
      hooks,
    })

    expect(aborted).toEqual(['owner-a@7'])
    expect(runtime.takeHiddenTargetRestartOwners('target', false)).toEqual([])
    expect(runtime.takeHiddenTargetRestartOwners('target', true)).toEqual(['owner-a'])
    finishDurableMotionContinuation(runtime, 'target', step.commandEpoch)
    expect(runtime.autoLineagesForTarget('target')).toEqual([])
  })

  test('the next automatic command requires both lifecycle permission and an empty touch barrier', () => {
    expect(autoActivationSafePointOpen(true, false)).toBe(true)
    expect(autoActivationSafePointOpen(true, true)).toBe(false)
    expect(autoActivationSafePointOpen(false, false)).toBe(false)
  })

  test('a suspended automatic target waits until both target and owner can continue', async () => {
    let targetAllowed = false
    let ownerAllowed = true
    const first = deferred()
    const second = deferred()
    const waitedAgain = deferred()
    const continuation = waitForAutoTargetContinuation({
      signal: new AbortController().signal,
      read: () => ({
        sceneCurrent: true,
        activationCurrent: true,
        targetPresent: true,
        targetRemoved: false,
        targetLifecycleAllowed: targetAllowed,
        ownerLifecycleAllowed: ownerAllowed,
        authorityHeld: false,
        deferredTouchBarrier: false,
      }),
      wait: () => {
        if (!targetAllowed) return first.promise
        waitedAgain.resolve()
        return second.promise
      },
      invalid: () => new Error('obsolete continuation'),
    })
    const result = continuation.then(() => 'continued')
    await expect(Promise.race([result, nextTestTask().then(() => 'waiting')])).resolves.toBe(
      'waiting',
    )
    targetAllowed = true
    ownerAllowed = false
    first.resolve()
    await expect(Promise.race([result, waitedAgain.promise.then(() => 'waiting')])).resolves.toBe(
      'waiting',
    )
    ownerAllowed = true
    second.resolve()
    await expect(result).resolves.toBe('continued')
  })

  test('deferred touch gets first command opportunity before target authority can release', async () => {
    const controller = new AbortController()
    let touchBarrier = true
    let authorityHeld = false
    const waiters: Array<() => void> = []
    let completed = false
    const continuation = waitForAutoTargetContinuation({
      signal: controller.signal,
      read: () => ({
        sceneCurrent: true,
        activationCurrent: true,
        targetPresent: true,
        targetRemoved: false,
        targetLifecycleAllowed: true,
        ownerLifecycleAllowed: true,
        authorityHeld,
        deferredTouchBarrier: touchBarrier,
      }),
      wait: () =>
        new Promise<void>((resolve) => {
          waiters.push(resolve)
        }),
      invalid: () => new Error('invalid'),
    }).then(() => {
      completed = true
    })

    await Promise.resolve()
    expect(completed).toBe(false)
    // Delivery starts: the claim fence clears only after the trigger's first command takes target.
    touchBarrier = false
    authorityHeld = true
    waiters.shift()?.()
    await Promise.resolve()
    expect(completed).toBe(false)
    authorityHeld = false
    waiters.shift()?.()
    await continuation
    expect(completed).toBe(true)
  })

  test('touch scene replacement keeps endpoint durability but rejects the old continuation', async () => {
    const motion = new WorldMotionRuntime(100)
    const runtime = motion.coordinator
    const settled = motion.registerMove({
      source: 'auto',
      id: 'target',
      to: { col: 7, row: 0, height: 0 },
      speed: 'normal',
      sceneId: 's001',
      activation: { ownerId: 'owner', epoch: 7 },
    })
    const slot = runtime.autoSlots.get('target')
    if (slot?.kind !== 'move') throw new Error('pending automatic move missing')
    const capturedSession = slot.sceneSessionId
    commitDurableMotionEndpoint(runtime, 'target', slot)

    motion.teardownScene({
      beforeCancelSlots: () => undefined,
      beforeReleaseAllAuthority: () => undefined,
      slotMessage: (source, actorId) => `${source}:${actorId}`,
    })
    wakeDurableMotionEndpoint(runtime, 'target', slot)
    await expect(settled).resolves.toBe(slot.commandEpoch)
    const obsolete = new Error('obsolete scene continuation')
    await expect(
      waitForAutoTargetContinuation({
        signal: new AbortController().signal,
        read: () => ({
          sceneCurrent: motion.currentSceneSessionId('s001') === capturedSession,
          activationCurrent: true,
          targetPresent: true,
          targetRemoved: false,
          targetLifecycleAllowed: true,
          ownerLifecycleAllowed: true,
          authorityHeld: false,
          deferredTouchBarrier: false,
        }),
        wait: () => Promise.reject(new Error('obsolete continuation must neither run nor wait')),
        invalid: () => obsolete,
      }),
    ).rejects.toBe(obsolete)
  })

  test('stale committed owner epoch never aborts or restarts a replacement activation', () => {
    const runtime = new MotionRuntimeCoordinator<Authority, DurableEndpointSlot>()
    const { slot } = endpointSlot({ activationOwnerId: 'owner-a', activationEpoch: 7 })
    runtime.rememberCommittedAutoContinuation('target', slot)
    const active = new Map([['owner-a', 8]])
    const { hooks, aborted } = lifecycleHooks(active)

    terminateLifecycleMotion({
      runtime,
      kind: 'hide',
      targetId: 'target',
      targetHasAuto: false,
      hooks,
    })

    expect(aborted).toEqual([])
    expect(active.get('owner-a')).toBe(8)
    expect(runtime.takeHiddenTargetRestartOwners('target', true)).toEqual([])
  })

  test('a queued chase settlement observes same-tick touch authority before waking', async () => {
    const runtime = new MotionRuntimeCoordinator<
      Authority,
      DurableEndpointSlot | DeferredOneShotSlot
    >()
    const events: string[] = []
    let settled = false
    const slot = {
      source: 'auto',
      kind: 'chase',
      commandEpoch: 21,
      sceneSessionId: 's001:1',
      activationOwnerId: 'target',
      activationEpoch: 3,
      cancel: () => undefined,
      resolve: () => {
        settled = true
        runtime.autoSlots.delete('target')
        events.push(runtime.authority.has('target') ? 'wake:taken' : 'wake:world')
      },
    } as const
    runtime.autoSlots.set('target', slot)

    const pending: (() => void)[] = []
    const tookControl = deferred()
    commitMotionBatch({
      commitCanonicalEndpoints: () => undefined,
      commitLivePositions: () => undefined,
      afterLiveCommit: () => undefined,
      runTouch: () => {
        events.push('touch')
        queueMicrotask(() => {
          runtime.setAuthority('target', { kind: 'script' })
          events.push('take')
          tookControl.resolve()
        })
        return true
      },
      runPostContact: () => {
        throw new Error('touch takeover must suppress post-contact')
      },
      queueContinuations: () => {
        pending.push(() => {
          expect(settleDeferredOneShotMotion(runtime, 'target', slot)).toBe(true)
        })
      },
    })
    await tookControl.promise
    expect(settled).toBe(false)
    for (const wake of pending) wake()

    expect(events).toEqual(['touch', 'take', 'wake:taken'])
  })

  test('a cancelled or replaced deferred one-shot cannot wake the new slot', () => {
    const runtime = new MotionRuntimeCoordinator<
      Authority,
      DurableEndpointSlot | DeferredOneShotSlot
    >()
    const oldWake = vi.fn()
    const oldSlot = {
      source: 'auto',
      kind: 'chase',
      commandEpoch: 31,
      sceneSessionId: 's001:1',
      cancel: () => undefined,
      resolve: oldWake,
    } as const
    const replacement = endpointSlot({ commandEpoch: 32 }).slot
    runtime.autoSlots.set('target', replacement)

    expect(settleDeferredOneShotMotion(runtime, 'target', oldSlot)).toBe(false)
    expect(oldWake).not.toHaveBeenCalled()
    expect(runtime.autoSlots.get('target')).toBe(replacement)
  })
})
