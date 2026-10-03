import { expect, test, vi } from 'vitest'
import { deferred } from './__tests__/save-lineage-fixture.js'
import {
  registeredScriptActivityLease,
  withRegisteredScriptActivityLineage,
  withScriptActivityLineage,
} from './script-activity-lineage.js'
import type { FlowLease, FlowRuntimeCoordinator } from './script-world.js'
import { FlowRuntimeCoordinator as Coordinator } from './script-world.js'

const flush = async (turns = 5) => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}
const key = () => ({})
const signalOf = () => new AbortController().signal

function barrierReadyFlag(coordinator: FlowRuntimeCoordinator) {
  const barrier = coordinator.requestSaveBarrier()
  const state = { barrier, ready: false }
  void barrier.ready.then(
    () => {
      state.ready = true
    },
    () => {},
  )
  return state
}

// KM-LIFE-L01 外借 lease:body 拒绝同一 reason,registration 移除但 helper 不越权 close,barrier 仍等外部 close。
test('L01 a rejected body on a borrowed lease keeps the same reason, drops the registration and never closes the lease', async () => {
  const c = new Coordinator()
  const k = key()
  const signal = signalOf()
  const borrowed = c.beginActivity()
  if (!borrowed) throw new Error('expected an activity lease')
  const failure = new Error('borrowed scope failed')
  await expect(
    withRegisteredScriptActivityLineage(k, c, signal, borrowed, () => {
      throw failure
    }),
  ).rejects.toBe(failure)
  expect(registeredScriptActivityLease(k, c, signal)).toBeUndefined()
  expect(c.hasActiveLease(borrowed)).toBe(true)

  const state = barrierReadyFlag(c)
  await flush()
  expect(state.ready).toBe(false)
  borrowed.close()
  await state.barrier.ready
  state.barrier.release()
})

// KM-LIFE-L02 最新 scope 先正常结束:lookup 退回仍活的较早 lease,随后全清。
test('L02 the latest scope settling first falls lookup back to the earlier live lease', async () => {
  const c = new Coordinator()
  const k = key()
  const signal = signalOf()
  const earlier = c.beginActivity()
  const latest = c.beginActivity()
  if (!earlier || !latest) throw new Error('expected two activity leases')
  const endEarlier = deferred()
  const endLatest = deferred()
  const scopeEarlier = withRegisteredScriptActivityLineage(
    k,
    c,
    signal,
    earlier,
    () => endEarlier.promise,
  )
  const scopeLatest = withRegisteredScriptActivityLineage(
    k,
    c,
    signal,
    latest,
    () => endLatest.promise,
  )
  expect(registeredScriptActivityLease(k, c, signal)).toBe(latest)

  endLatest.resolve()
  await scopeLatest
  expect(registeredScriptActivityLease(k, c, signal)).toBe(earlier)
  latest.close()
  expect(registeredScriptActivityLease(k, c, signal)).toBe(earlier)

  endEarlier.resolve()
  await scopeEarlier
  earlier.close()
  expect(registeredScriptActivityLease(k, c, signal)).toBeUndefined()
})

// KM-LIFE-L03 最新 lease 已 close 但 finally 未结:lookup 跳过它退回较早 live;finally 结清不删较早 registration。
test('L03 a closed latest lease with a pending finally is skipped for the earlier live one and its finally keeps that registration', async () => {
  const c = new Coordinator()
  const k = key()
  const signal = signalOf()
  const earlier = c.beginActivity()
  const latest = c.beginActivity()
  if (!earlier || !latest) throw new Error('expected two activity leases')
  const endEarlier = deferred()
  const endLatest = deferred()
  const scopeEarlier = withRegisteredScriptActivityLineage(
    k,
    c,
    signal,
    earlier,
    () => endEarlier.promise,
  )
  const scopeLatest = withRegisteredScriptActivityLineage(
    k,
    c,
    signal,
    latest,
    () => endLatest.promise,
  )

  latest.close()
  expect(c.hasActiveLease(latest)).toBe(false)
  expect(registeredScriptActivityLease(k, c, signal)).toBe(earlier)

  endLatest.resolve()
  await scopeLatest
  expect(registeredScriptActivityLease(k, c, signal)).toBe(earlier)

  endEarlier.resolve()
  await scopeEarlier
  earlier.close()
  expect(registeredScriptActivityLease(k, c, signal)).toBeUndefined()
})

// KM-LIFE-L04 同 key/exactSignal 两个真实 coordinator:各自查询只回本域 lease,结一域不擦另一域。
test('L04 two coordinators each return only their own registered lease for the same key and signal', async () => {
  const c1 = new Coordinator()
  const c2 = new Coordinator()
  const k = key()
  const signal = signalOf()
  const lease1 = c1.beginActivity()
  const lease2 = c2.beginActivity()
  if (!lease1 || !lease2) throw new Error('expected two activity leases')
  const end1 = deferred()
  const end2 = deferred()
  const scope1 = withRegisteredScriptActivityLineage(k, c1, signal, lease1, () => end1.promise)
  const scope2 = withRegisteredScriptActivityLineage(k, c2, signal, lease2, () => end2.promise)
  expect(registeredScriptActivityLease(k, c1, signal)).toBe(lease1)
  expect(registeredScriptActivityLease(k, c2, signal)).toBe(lease2)

  end1.resolve()
  await scope1
  expect(registeredScriptActivityLease(k, c1, signal)).toBeUndefined()
  expect(registeredScriptActivityLease(k, c2, signal)).toBe(lease2)

  end2.resolve()
  await scope2
  expect(registeredScriptActivityLease(k, c2, signal)).toBeUndefined()
  lease1.close()
  lease2.close()
})

// KM-LIFE-L05 同 key/coordinator 两个真实 Signal:一方拒绝后另一域仍正确可借,最终各自清理。
test('L05 a rejected scope on one signal leaves the other signal lineage borrowable and cleanable', async () => {
  const c = new Coordinator()
  const k = key()
  const signalA = signalOf()
  const signalB = signalOf()
  const leaseA = c.beginActivity()
  const leaseB = c.beginActivity()
  if (!leaseA || !leaseB) throw new Error('expected two activity leases')
  const failure = new Error('scope A failed')
  const endB = deferred()
  const scopeA = withRegisteredScriptActivityLineage(k, c, signalA, leaseA, () => {
    throw failure
  })
  const scopeB = withRegisteredScriptActivityLineage(k, c, signalB, leaseB, () => endB.promise)

  await expect(scopeA).rejects.toBe(failure)
  expect(registeredScriptActivityLease(k, c, signalA)).toBeUndefined()
  expect(c.hasActiveLease(leaseA)).toBe(true)
  expect(registeredScriptActivityLease(k, c, signalB)).toBe(leaseB)

  endB.resolve()
  await scopeB
  expect(registeredScriptActivityLease(k, c, signalB)).toBeUndefined()
  leaseA.close()
  leaseB.close()
})

// KM-LIFE-L06 自有 transient 的 async body pending 时仍 live 且 barrier 未 ready;拒绝后同一 Error、全释放、barrier 可 ready。
test('L06 a pending async body keeps its own transient live and the barrier waiting; rejection releases both with the same reason', async () => {
  const c = new Coordinator()
  const k = key()
  const signal = signalOf()
  const gate = deferred()
  const failure = new Error('async body failed')
  const body = vi.fn(() => gate.promise)
  const pending = withScriptActivityLineage(k, c, signal, body)
  await flush()
  expect(body).toHaveBeenCalledTimes(1)
  const held = registeredScriptActivityLease(k, c, signal)
  expect(held).toBeDefined()

  const state = barrierReadyFlag(c)
  await flush()
  expect(state.ready).toBe(false)

  gate.reject(failure)
  await expect(pending).rejects.toBe(failure)
  expect(registeredScriptActivityLease(k, c, signal)).toBeUndefined()
  expect(c.hasActiveLease(held!)).toBe(false)
  await state.barrier.ready
  state.barrier.release()
})

// KM-LIFE-L07 自有 reason 沿公开 helper:预取消精确同一 reason;gate 等待取消为 coordinator 的 AbortError,body 零调用、释放无迟到。
test('L07 a pre-aborted signal surfaces its own exact reason and a gate-wait abort surfaces the coordinator reason with no late body', async () => {
  const c = new Coordinator()
  const k = key()
  const body = vi.fn()
  const ownReason = new Error('玩家终止')
  const preAborted = new AbortController()
  preAborted.abort(ownReason)
  await expect(withScriptActivityLineage(k, c, preAborted.signal, body)).rejects.toBe(ownReason)
  const lease = c.beginActivity()
  if (!lease) throw new Error('expected an activity lease')
  await expect(
    withRegisteredScriptActivityLineage(k, c, preAborted.signal, lease, body),
  ).rejects.toBe(ownReason)
  lease.close()

  const barrier = c.requestSaveBarrier()
  await barrier.ready
  const controller = new AbortController()
  const waiting = withScriptActivityLineage(k, c, controller.signal, body)
  const rejected = expect(waiting).rejects.toMatchObject({
    name: 'AbortError',
    message: 'script activation aborted',
  })
  controller.abort(new Error('等待中取消'))
  await rejected
  barrier.release()
  await flush()
  expect(body).not.toHaveBeenCalled()
})

// KM-LIFE-L08 同 key/exactSignal 失败释放后合法重入:第二 body 拿到新 live lease 而非旧闭 lease,最终全清。
test('L08 re-entering the same lineage after a failed scope borrows a fresh live lease, never the closed one', async () => {
  const c = new Coordinator()
  const k = key()
  const signal = signalOf()
  const failure = new Error('first scope failed')
  let first: FlowLease | undefined
  await expect(
    withScriptActivityLineage(k, c, signal, () => {
      first = registeredScriptActivityLease(k, c, signal)
      throw failure
    }),
  ).rejects.toBe(failure)
  expect(first).toBeDefined()
  expect(c.hasActiveLease(first!)).toBe(false)

  let second: FlowLease | undefined
  const result = await withScriptActivityLineage(k, c, signal, () => {
    second = registeredScriptActivityLease(k, c, signal)
    return 're-entered'
  })
  expect(result).toBe('re-entered')
  expect(second).toBeDefined()
  expect(second).not.toBe(first)
  expect(c.hasActiveLease(second!)).toBe(false)
  expect(registeredScriptActivityLease(k, c, signal)).toBeUndefined()

  const state = barrierReadyFlag(c)
  await state.barrier.ready
  state.barrier.release()
})
