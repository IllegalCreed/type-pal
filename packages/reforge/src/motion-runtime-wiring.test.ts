import { describe, expect, test, vi } from 'vitest'
import { commitMotionBatch } from './motion-batch.js'
import { MotionRuntimeCoordinator } from './motion-runtime-coordinator.js'
import {
  autoActivationSafePointOpen,
  commitDurableMotionEndpoint,
  type DeferredOneShotSlot,
  type DurableEndpointSlot,
  finishDurableMotionContinuation,
  runtimeMotionCollision,
  settleDeferredOneShotMotion,
  teardownMotionRuntime,
  terminateLifecycleMotion,
  waitForAutoTargetContinuation,
  wakeDurableMotionEndpoint,
} from './motion-runtime-wiring.js'

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

  test.each([
    'endpoint',
    'step',
    'chase',
  ])('pending touch is a next-command auto safe-point barrier after %s acknowledgement', (_kind) => {
    let nextMutation = 0
    const runNext = (lifecycleAllowed: boolean, pendingTouch: boolean): void => {
      if (autoActivationSafePointOpen(lifecycleAllowed, pendingTouch)) nextMutation++
    }

    runNext(true, true)
    expect(nextMutation).toBe(0)
    runNext(true, false)
    expect(nextMutation).toBe(1)
  })

  test.each([
    'move',
    'step',
    'chase',
  ])('target-scoped %s continuation waits through target suspend and resumes after restore', async (_kind) => {
    const controller = new AbortController()
    let targetAllowed = false
    let releaseWait: (() => void) | undefined
    let completed = false
    const continuation = waitForAutoTargetContinuation({
      signal: controller.signal,
      read: () => ({
        sceneCurrent: true,
        activationCurrent: true,
        targetPresent: true,
        targetRemoved: false,
        targetLifecycleAllowed: targetAllowed,
        ownerLifecycleAllowed: true,
        authorityHeld: false,
        deferredTouchBarrier: false,
      }),
      wait: () =>
        new Promise<void>((resolve) => {
          releaseWait = resolve
        }),
      invalid: () => new Error('invalid'),
    }).then(() => {
      completed = true
    })

    await Promise.resolve()
    expect(completed).toBe(false)
    targetAllowed = true
    releaseWait?.()
    await continuation
    expect(completed).toBe(true)
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

  test('touch scene replacement keeps endpoint durability but invalidates old continuation session', () => {
    const runtime = new MotionRuntimeCoordinator<Authority, DurableEndpointSlot>()
    const { slot, events } = endpointSlot()
    runtime.autoSlots.set('target', slot)
    const capturedSession = runtime.currentSceneSessionId('s001')
    const activation = new AbortController()
    const nextCommand = vi.fn()
    commitDurableMotionEndpoint(runtime, 'target', slot)

    teardownMotionRuntime({
      runtime,
      slotMessage: (source, actorId) => `${source}:${actorId}`,
      beforeCancelSlots: () => activation.abort(),
    })
    wakeDurableMotionEndpoint(runtime, 'target', slot)
    if (!activation.signal.aborted) nextCommand()

    expect(runtime.currentSceneSessionId('s001')).not.toBe(capturedSession)
    expect(events).toEqual(['canonical', 'settlement', 'wake'])
    expect(nextCommand).not.toHaveBeenCalled()
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

  test.each([
    ['adjacent', 1, 4],
    ['out-of-range', 5, 4],
  ])('queued chase %s settlement waits until same-tick touch take owns the next safe point', async (_case, distance, range) => {
    expect(distance <= 1 || distance > range).toBe(true)
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

    await new Promise<void>((resolve) => {
      commitMotionBatch({
        commitCanonicalEndpoints: () => undefined,
        commitLivePositions: () => undefined,
        afterLiveCommit: () => undefined,
        runTouch: () => {
          events.push('touch')
          queueMicrotask(() => {
            runtime.setAuthority('target', { kind: 'script' })
            events.push('take')
          })
          return true
        },
        runPostContact: () => {
          throw new Error('touch takeover must suppress post-contact')
        },
        queueContinuations: () => {
          expect(settled).toBe(false)
          setTimeout(() => {
            expect(settleDeferredOneShotMotion(runtime, 'target', slot)).toBe(true)
            resolve()
          }, 0)
        },
      })
    })

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
