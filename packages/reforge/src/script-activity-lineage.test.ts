import { afterEach, describe, expect, test, vi } from 'vitest'
import { deferred, nextTestTask } from './__tests__/deferred.js'
import { expectDefined } from './defined.js'
import {
  registeredScriptActivityLease,
  withRegisteredScriptActivityLineage,
  withScriptActivityLineage,
} from './script-activity-lineage.js'
import { FlowActivationLease, FlowActivityLease, FlowRuntimeCoordinator } from './script-world.js'

afterEach(() => vi.restoreAllMocks())
const owner = (scene: string) => ({
  kind: 'scene-hook' as const,
  scene,
  slot: 'onTeleport' as const,
})
const cursor = { kind: 'stage' as const, stage: 'next' }

describe('internal lineage uses actual live membership', () => {
  test('same runtime/exact signal/coordinator borrows live activity and cleans registration', async () => {
    const c = new FlowRuntimeCoordinator(),
      key = {},
      signal = new AbortController().signal
    let lease: FlowActivityLease | FlowActivationLease | undefined
    await withScriptActivityLineage(key, c, signal, async () => {
      lease = registeredScriptActivityLease(key, c, signal)
      expect(lease).toBeDefined()
      const barrier = c.requestSaveBarrier()
      let ready = false
      void barrier.ready.then(
        () => {
          ready = true
        },
        () => {},
      )
      await withScriptActivityLineage(key, c, signal, () => {
        expect(registeredScriptActivityLease(key, c, signal)).toBe(lease)
        expect(ready).toBe(false)
      })
      barrier.cancel()
    })
    expect(registeredScriptActivityLease(key, c, signal)).toBeUndefined()
    expect(c.hasActiveLease(lease!)).toBe(false)
    const barrier = c.requestSaveBarrier()
    await barrier.ready
    barrier.release()
  })

  test.each([
    'runtime',
    'signal',
    'coordinator',
  ] as const)('different %s waits as an independent root', async (axis) => {
    const c = new FlowRuntimeCoordinator(),
      other = new FlowRuntimeCoordinator()
    const key = {},
      signal = new AbortController().signal,
      root = c.beginActivity()!
    await withRegisteredScriptActivityLineage(key, c, signal, root, async () => {
      const target = axis === 'coordinator' ? other : c
      const barrier = target.requestSaveBarrier()
      const waitEntered = deferred<void>()
      const original = target.waitForActivationGate.bind(target)
      vi.spyOn(target, 'waitForActivationGate').mockImplementation((s) => {
        waitEntered.resolve()
        return original(s)
      })
      const body = vi.fn()
      const child = withScriptActivityLineage(
        axis === 'runtime' ? {} : key,
        target,
        axis === 'signal' ? new AbortController().signal : signal,
        body,
      )
      await waitEntered.promise
      expect(body).not.toHaveBeenCalled()
      root.close()
      await barrier.ready
      barrier.release()
      await child
      expect(body).toHaveBeenCalledTimes(1)
    })
  })

  test.each([
    'closed',
    'foreign',
    'forged',
    'forged-persistent',
  ] as const)('registration refuses %s lease before body', async (kind) => {
    const c = new FlowRuntimeCoordinator(),
      foreign = new FlowRuntimeCoordinator()
    const lease =
      kind === 'foreign'
        ? foreign.beginActivity()!
        : kind === 'forged'
          ? new FlowActivityLease(c, 'transient:1')
          : kind === 'forged-persistent'
            ? new FlowActivationLease(c, 'hook:s:onTeleport', 0, () => {})
            : c.beginActivity()!
    if (kind === 'closed') lease.close()
    const body = vi.fn()
    await expect(
      withRegisteredScriptActivityLineage({}, c, new AbortController().signal, lease, body),
    ).rejects.toThrow(/活跃 lease/)
    expect(body).not.toHaveBeenCalled()
    lease.close()
  })

  test('closed lease with pending finally cannot enter after ready, nor impersonate its replacement', async () => {
    const c = new FlowRuntimeCoordinator(),
      key = {},
      signal = new AbortController().signal
    const root = c.begin(owner('s'), () => {})!,
      held = deferred<void>()
    const registered = withRegisteredScriptActivityLineage(key, c, signal, root, () => held.promise)
    const barrier = c.requestSaveBarrier()
    expect(await root.reachSafePoint(cursor)).toBe('stop')
    await barrier.ready
    expect(registeredScriptActivityLease(key, c, signal)).toBeUndefined()
    const body = vi.fn(),
      waiting = deferred<void>()
    const original = c.waitForActivationGate.bind(c)
    vi.spyOn(c, 'waitForActivationGate').mockImplementation((s) => {
      waiting.resolve()
      return original(s)
    })
    const next = withScriptActivityLineage(key, c, signal, body)
    await waiting.promise
    expect(body).not.toHaveBeenCalled()
    barrier.release()
    await next
    const replacement = c.begin(owner('s'), () => {})!
    expect(c.hasActiveLease(root)).toBe(false)
    expect(c.hasActiveLease(replacement)).toBe(true)
    held.resolve()
    await registered
    replacement.close()
  })

  test.each([
    'earlier',
    'latest',
    'closed-latest',
  ] as const)('%s registration finishing first preserves the other live lease', async (first) => {
    const coordinator = new FlowRuntimeCoordinator()
    const key = {}
    const signal = new AbortController().signal
    const earlier = expectDefined(coordinator.beginActivity())
    const latest = expectDefined(coordinator.beginActivity())
    const endEarlier = deferred()
    const endLatest = deferred()
    const earlierScope = withRegisteredScriptActivityLineage(
      key,
      coordinator,
      signal,
      earlier,
      () => endEarlier.promise,
    )
    const latestScope = withRegisteredScriptActivityLineage(
      key,
      coordinator,
      signal,
      latest,
      () => endLatest.promise,
    )
    const active = () => registeredScriptActivityLease(key, coordinator, signal)
    expect(active()).toBe(latest)

    if (first === 'earlier') {
      endEarlier.resolve()
      await earlierScope
      expect(active()).toBe(latest)
    } else {
      if (first === 'closed-latest') {
        latest.close()
        expect(active()).toBe(earlier)
      }
      endLatest.resolve()
      await latestScope
      expect(active()).toBe(earlier)
    }

    endEarlier.resolve()
    endLatest.resolve()
    await Promise.all([earlierScope, latestScope])
    earlier.close()
    latest.close()
    expect(active()).toBeUndefined()
  })

  test.each([
    'coordinator',
    'signal',
  ] as const)('a failing registration cannot erase another %s with the same runtime key', async (axis) => {
    const coordinator = new FlowRuntimeCoordinator()
    const another = axis === 'coordinator' ? new FlowRuntimeCoordinator() : coordinator
    const key = {}
    const signal = new AbortController().signal
    const separate = axis === 'signal' ? new AbortController().signal : signal
    const failingLease = expectDefined(coordinator.beginActivity())
    const survivingLease = expectDefined(another.beginActivity())
    const failing = deferred()
    const survives = deferred()
    const first = withRegisteredScriptActivityLineage(
      key,
      coordinator,
      signal,
      failingLease,
      () => failing.promise,
    )
    const second = withRegisteredScriptActivityLineage(
      key,
      another,
      separate,
      survivingLease,
      () => survives.promise,
    )
    expect(registeredScriptActivityLease(key, coordinator, signal)).toBe(failingLease)
    expect(registeredScriptActivityLease(key, another, separate)).toBe(survivingLease)

    const failure = new Error('execution failed')
    const rejected = expect(first).rejects.toBe(failure)
    failing.reject(failure)
    await rejected
    expect(registeredScriptActivityLease(key, coordinator, signal)).toBeUndefined()
    expect(registeredScriptActivityLease(key, another, separate)).toBe(survivingLease)
    expect(coordinator.hasActiveLease(failingLease)).toBe(true)

    survives.resolve()
    await second
    expect(registeredScriptActivityLease(key, another, separate)).toBeUndefined()
    failingLease.close()
    survivingLease.close()
  })

  test('a failing borrowed registration leaves the lease and save barrier with the lender', async () => {
    const coordinator = new FlowRuntimeCoordinator()
    const key = {}
    const signal = new AbortController().signal
    const lease = expectDefined(coordinator.beginActivity())
    const failure = new Error('borrowed scope failed')
    await expect(
      withRegisteredScriptActivityLineage(key, coordinator, signal, lease, () => {
        throw failure
      }),
    ).rejects.toBe(failure)
    expect(registeredScriptActivityLease(key, coordinator, signal)).toBeUndefined()
    expect(coordinator.hasActiveLease(lease)).toBe(true)

    const barrier = coordinator.requestSaveBarrier()
    const settled = await Promise.race([
      barrier.ready.then(() => 'ready'),
      nextTestTask().then(() => 'pending'),
    ])
    expect(settled).toBe('pending')
    lease.close()
    await barrier.ready
    barrier.release()
  })

  test('an activity failing while a save waits releases its lease and can restart on the same signal', async () => {
    const coordinator = new FlowRuntimeCoordinator()
    const key = {}
    const signal = new AbortController().signal
    const work = deferred()
    const failure = new Error('script activity failed')
    const first = withScriptActivityLineage(key, coordinator, signal, () => work.promise)
    const lease = expectDefined(registeredScriptActivityLease(key, coordinator, signal))
    const barrier = coordinator.requestSaveBarrier()
    const settled = await Promise.race([
      barrier.ready.then(() => 'ready'),
      nextTestTask().then(() => 'pending'),
    ])
    expect(settled).toBe('pending')
    expect(coordinator.hasActiveLease(lease)).toBe(true)

    const rejected = expect(first).rejects.toBe(failure)
    work.reject(failure)
    await rejected
    expect(registeredScriptActivityLease(key, coordinator, signal)).toBeUndefined()
    expect(coordinator.hasActiveLease(lease)).toBe(false)
    await barrier.ready
    barrier.release()

    let replacement: FlowActivityLease | FlowActivationLease | undefined
    const result = await withScriptActivityLineage(key, coordinator, signal, () => {
      replacement = expectDefined(registeredScriptActivityLease(key, coordinator, signal))
      expect(replacement).not.toBe(lease)
      expect(coordinator.hasActiveLease(replacement)).toBe(true)
      return 'restarted'
    })
    expect(result).toBe('restarted')
    expect(coordinator.hasActiveLease(expectDefined(replacement))).toBe(false)
    expect(registeredScriptActivityLease(key, coordinator, signal)).toBeUndefined()
  })

  test('abort before registration or while waiting never invokes the body', async () => {
    const c = new FlowRuntimeCoordinator(),
      key = {},
      aborted = new AbortController(),
      body = vi.fn()
    const reason = new Error('already cancelled')
    aborted.abort(reason)
    await expect(withScriptActivityLineage(key, c, aborted.signal, body)).rejects.toBe(reason)
    const lease = c.beginActivity()!
    await expect(
      withRegisteredScriptActivityLineage(key, c, aborted.signal, lease, body),
    ).rejects.toBe(reason)
    lease.close()
    const barrier = c.requestSaveBarrier()
    await barrier.ready
    const controller = new AbortController()
    const waiting = withScriptActivityLineage(key, c, controller.signal, body)
    const rejected = expect(waiting).rejects.toMatchObject({
      name: 'AbortError',
      message: 'script activation aborted',
    })
    controller.abort(new Error('cancelled while waiting'))
    await rejected
    barrier.release()
    await nextTestTask()
    expect(body).not.toHaveBeenCalled()
  })
})

describe('nested persistent leases preserve save and owner boundaries', () => {
  test('child/grandchild keep the barrier pending even if parent closes first', async () => {
    const c = new FlowRuntimeCoordinator(),
      parent = c.beginActivity()!,
      commit = vi.fn()
    const barrier = c.requestSaveBarrier()
    const child = c.begin(owner('child'), commit, parent)!
    const grandchild = c.begin(owner('grandchild'), commit, child)!
    let ready = false
    void barrier.ready.then(() => {
      ready = true
    })
    parent.close()
    expect(await child.reachSafePoint(cursor)).toBe('continue')
    expect(commit).toHaveBeenCalledWith(cursor, undefined)
    child.close()
    expect(await grandchild.reachSafePoint(cursor)).toBe('continue')
    expect(ready).toBe(false)
    expect(c.begin(owner('new-root'), commit)).toBeUndefined()
    grandchild.close()
    await barrier.ready
    expect(ready).toBe(true)
    expect(c.beginActivity()).toBeUndefined()
    barrier.release()
  })

  test('a busy owner is not duplicated; unrelated existing roots also block ready', async () => {
    const c = new FlowRuntimeCoordinator(),
      a = c.begin(owner('a'), () => {})!,
      b = c.begin(owner('b'), () => {})!
    const barrier = c.requestSaveBarrier()
    expect(c.begin(owner('a'), () => {}, a)).toBeUndefined()
    const child = c.begin(owner('child'), () => {}, a)!
    let ready = false
    void barrier.ready.then(() => {
      ready = true
    })
    child.close()
    a.close()
    await Promise.resolve()
    expect(ready).toBe(false)
    expect(await b.reachSafePoint(cursor)).toBe('stop')
    await barrier.ready
    barrier.release()
  })

  test.each([
    'closed',
    'foreign',
    'forged',
  ] as const)('begin rejects %s parent even while gate is open', (kind) => {
    const c = new FlowRuntimeCoordinator()
    const parent =
      kind === 'foreign'
        ? new FlowRuntimeCoordinator().beginActivity()!
        : kind === 'forged'
          ? new FlowActivityLease(c, 'transient:1')
          : c.beginActivity()!
    if (kind === 'closed') parent.close()
    expect(() => c.begin(owner('child'), () => {}, parent)).toThrow(/parent lease/)
    parent.close()
  })

  test('epoch invalidation does not kill live lineage, but never commits its stale cursor', async () => {
    const c = new FlowRuntimeCoordinator(),
      key = {},
      signal = new AbortController().signal,
      commit = vi.fn()
    const parent = c.begin(owner('parent'), commit)!
    await withRegisteredScriptActivityLineage(key, c, signal, parent, async () => {
      c.bump(owner('parent'))
      const barrier = c.requestSaveBarrier()
      const admitted = registeredScriptActivityLease(key, c, signal)
      expect(admitted).toBe(parent)
      const child = c.begin(owner('child'), commit, admitted)!
      c.bump(owner('child'))
      expect(await child.reachSafePoint(cursor)).toBe('stop')
      expect(await parent.reachSafePoint(cursor)).toBe('stop')
      expect(commit).not.toHaveBeenCalled()
      await barrier.ready
      barrier.release()
    })
  })
})
