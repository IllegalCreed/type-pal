import { afterEach, describe, expect, test, vi } from 'vitest'
import { deferred } from './__tests__/save-lineage-fixture.js'
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
      const waitEntered = deferred()
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
      held = deferred()
    const registered = withRegisteredScriptActivityLineage(key, c, signal, root, () => held.promise)
    const barrier = c.requestSaveBarrier()
    expect(await root.reachSafePoint(cursor)).toBe('stop')
    await barrier.ready
    expect(registeredScriptActivityLease(key, c, signal)).toBeUndefined()
    const body = vi.fn(),
      waiting = deferred()
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

  test('overlapping registrations settle out of order without erasing the live sibling', async () => {
    const c = new FlowRuntimeCoordinator(),
      key = {},
      signal = new AbortController().signal
    const a = c.beginActivity()!,
      b = c.beginActivity()!,
      endA = deferred(),
      endB = deferred()
    const ra = withRegisteredScriptActivityLineage(key, c, signal, a, () => endA.promise)
    const rb = withRegisteredScriptActivityLineage(key, c, signal, b, () => endB.promise)
    expect(registeredScriptActivityLease(key, c, signal)).toBe(b)
    endA.resolve()
    await ra
    a.close()
    expect(registeredScriptActivityLease(key, c, signal)).toBe(b)
    endB.resolve()
    await rb
    b.close()
    expect(registeredScriptActivityLease(key, c, signal)).toBeUndefined()
  })

  test('failed activity releases membership and does not strand later snapshots', async () => {
    const c = new FlowRuntimeCoordinator(),
      key = {},
      signal = new AbortController().signal
    let captured: FlowActivityLease | FlowActivationLease | undefined
    await expect(
      withScriptActivityLineage(key, c, signal, () => {
        captured = registeredScriptActivityLease(key, c, signal)
        throw new Error('body failed')
      }),
    ).rejects.toThrow('body failed')
    expect(registeredScriptActivityLease(key, c, signal)).toBeUndefined()
    expect(captured).toBeDefined()
    expect(c.hasActiveLease(captured!)).toBe(false)
    const b = c.requestSaveBarrier()
    await b.ready
    b.release()
  })

  test('abort before registration or while waiting never invokes the body', async () => {
    const c = new FlowRuntimeCoordinator(),
      key = {},
      aborted = new AbortController(),
      body = vi.fn()
    aborted.abort()
    await expect(withScriptActivityLineage(key, c, aborted.signal, body)).rejects.toMatchObject({
      name: 'AbortError',
    })
    const lease = c.beginActivity()!
    await expect(
      withRegisteredScriptActivityLineage(key, c, aborted.signal, lease, body),
    ).rejects.toMatchObject({ name: 'AbortError' })
    lease.close()
    const barrier = c.requestSaveBarrier()
    await barrier.ready
    const controller = new AbortController()
    const waiting = withScriptActivityLineage(key, c, controller.signal, body)
    const rejected = expect(waiting).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort()
    await rejected
    barrier.release()
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
    expect(commit).toHaveBeenCalledWith(cursor)
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
