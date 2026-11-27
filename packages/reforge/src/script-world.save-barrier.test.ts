import type { AutoScriptContinuation, FlowCursor } from '@type-pal/content'
import { expect, test } from 'vitest'
import { nextTestTask } from './__tests__/deferred.js'
import { expectDefined } from './defined.js'
import { FlowRuntimeCoordinator, type PersistentFlowOwner } from './script-world.js'

const target = { scene: 'village', entity: 'keeper' }
const trigger: PersistentFlowOwner = { kind: 'entity-behavior', target, channel: 'trigger' }
const automatic: PersistentFlowOwner = { kind: 'entity-behavior', target, channel: 'auto' }
const arrival: PersistentFlowOwner = { kind: 'scene-hook', scene: target.scene, slot: 'onEnter' }
const departure: PersistentFlowOwner = {
  kind: 'scene-hook',
  scene: target.scene,
  slot: 'onTeleport',
}
const cursor = { kind: 'stage', stage: 'next' } as const

const ignoreCursor = () => {}

function settlement(promise: Promise<void>) {
  return Promise.race([promise.then(() => 'settled'), nextTestTask().then(() => 'waiting')])
}

test('only one lease can own a given channel, while another channel can run', () => {
  const coordinator = new FlowRuntimeCoordinator()
  const auto = expectDefined(coordinator.begin(automatic, ignoreCursor))
  expect(coordinator.begin(automatic, ignoreCursor)).toBeUndefined()
  const foreground = expectDefined(coordinator.begin(trigger, ignoreCursor))
  auto.close()
  expect(expectDefined(coordinator.begin(automatic, ignoreCursor))).not.toBe(auto)
  expect(coordinator.hasActiveLease(foreground)).toBe(true)
})

test('a barrier waits for each active flow and only its release allows a new owner', async () => {
  const coordinator = new FlowRuntimeCoordinator()
  const committed: FlowCursor[] = []
  const first = expectDefined(coordinator.begin(trigger, (at) => committed.push(at)))
  const second = expectDefined(coordinator.begin(arrival, (at) => committed.push(at)))
  const barrier = coordinator.requestSaveBarrier()
  const waiting = coordinator.waitForActivationGate(new AbortController().signal)

  expect(await settlement(barrier.ready)).toBe('waiting')
  expect(coordinator.begin(departure, ignoreCursor)).toBeUndefined()
  expect(await first.reachSafePoint(cursor)).toBe('stop')
  expect(await settlement(barrier.ready)).toBe('waiting')

  second.close()
  await barrier.ready
  expect(committed).toEqual([cursor])
  expect(await settlement(waiting)).toBe('waiting')
  barrier.release()
  await waiting
  expectDefined(coordinator.begin(departure, ignoreCursor)).close()
})

test('a transient activity prevents saving until it closes', async () => {
  const coordinator = new FlowRuntimeCoordinator()
  const activity = expectDefined(coordinator.beginActivity())
  const barrier = coordinator.requestSaveBarrier()
  expect(await settlement(barrier.ready)).toBe('waiting')
  expect(coordinator.beginActivity()).toBeUndefined()
  activity.close()
  await barrier.ready
  barrier.release()
  expectDefined(coordinator.beginActivity()).close()
})

test('a running automatic command publishes its first valid checkpoint before the save resumes', async () => {
  const coordinator = new FlowRuntimeCoordinator()
  const committed: { cursor: FlowCursor; resume?: AutoScriptContinuation }[] = []
  const lease = expectDefined(
    coordinator.begin(automatic, (at, resume) => committed.push({ cursor: at, resume })),
  )
  expect(lease.setCheckpointReady(false)).toBe('continue')
  const barrier = coordinator.requestSaveBarrier()
  const resume = { digest: 'a'.repeat(64), frames: [{ index: 0 }] } satisfies AutoScriptContinuation

  expect(await settlement(barrier.ready)).toBe('waiting')
  expect(lease.checkpoint(cursor, resume, false)).toBe('wait')
  expect(committed).toEqual([])
  expect(lease.checkpoint(cursor, resume, true)).toBe('continue')
  await barrier.ready
  expect(committed).toEqual([{ cursor, resume }])
  expect(coordinator.hasActiveLease(lease)).toBe(true)
  barrier.release()
  lease.close()
})

test('a barrier cannot release early, and its old handle cannot open a later barrier', async () => {
  const coordinator = new FlowRuntimeCoordinator()
  const lease = expectDefined(coordinator.begin(trigger, ignoreCursor))
  const first = coordinator.requestSaveBarrier()
  expect(() => first.release()).toThrow('save barrier 尚未 ready，不能 release')
  expect(await lease.reachSafePoint(cursor)).toBe('stop')
  await first.ready
  first.release()

  const activity = expectDefined(coordinator.beginActivity())
  const second = coordinator.requestSaveBarrier()
  expect(() => first.release()).toThrow('save barrier handle 已失效')
  first.cancel('stale request')
  expect(await settlement(second.ready)).toBe('waiting')
  expect(coordinator.gateClosed()).toBe(true)
  const rejected = expect(second.ready).rejects.toThrow('save barrier cancelled')
  second.cancel()
  await rejected
  activity.close()
})

test('cancelling a barrier releases its waiters and forwards the original error or wrapped reason', async () => {
  const coordinator = new FlowRuntimeCoordinator()
  const activity = expectDefined(coordinator.beginActivity())
  const failure = new Error('snapshot failed')
  const first = coordinator.requestSaveBarrier()
  const waiting = coordinator.waitForActivationGate(new AbortController().signal)
  const rejected = expect(first.ready).rejects.toBe(failure)
  first.cancel(failure)
  await rejected
  await waiting

  const second = coordinator.requestSaveBarrier()
  const wrapped = expect(second.ready).rejects.toThrow('disk full')
  second.cancel('disk full')
  await wrapped
  expect(coordinator.gateClosed()).toBe(false)
  activity.close()
})

test('an activation waiter can abort while another waiter stays behind the same barrier', async () => {
  const coordinator = new FlowRuntimeCoordinator()
  const activity = expectDefined(coordinator.beginActivity())
  const barrier = coordinator.requestSaveBarrier()
  const controller = new AbortController()
  const cancelled = coordinator.waitForActivationGate(controller.signal)
  const survivor = coordinator.waitForActivationGate(new AbortController().signal)
  const rejected = expect(cancelled).rejects.toMatchObject({ name: 'AbortError' })
  controller.abort()
  await rejected
  await expect(coordinator.waitForActivationGate(controller.signal)).rejects.toMatchObject({
    name: 'AbortError',
  })
  expect(await settlement(survivor)).toBe('waiting')
  activity.close()
  await barrier.ready
  barrier.release()
  await survivor
})

test('a closed or superseded lease cannot publish a checkpoint or a cursor', async () => {
  const coordinator = new FlowRuntimeCoordinator()
  const committed: FlowCursor[] = []
  const superseded = expectDefined(coordinator.begin(automatic, (at) => committed.push(at)))
  const closed = expectDefined(coordinator.begin(trigger, (at) => committed.push(at)))
  coordinator.bump(automatic)
  expect(superseded.setCheckpointReady(true)).toBe('stop')
  superseded.close()
  closed.close()
  expect(await closed.reachSafePoint(cursor)).toBe('stop')
  expect(committed).toEqual([])
})

test('waiting for an owner can be cancelled without waking another waiter early', async () => {
  const coordinator = new FlowRuntimeCoordinator()
  const controller = new AbortController()
  await expect(coordinator.waitForOwnerIdle(trigger, controller.signal)).resolves.toBeUndefined()
  const lease = expectDefined(coordinator.begin(trigger, ignoreCursor))
  const cancelled = coordinator.waitForOwnerIdle(trigger, controller.signal)
  const survivor = coordinator.waitForOwnerIdle(trigger, new AbortController().signal)
  const rejected = expect(cancelled).rejects.toMatchObject({ name: 'AbortError' })
  controller.abort()
  await rejected
  expect(await settlement(survivor)).toBe('waiting')
  lease.close()
  await survivor
})
