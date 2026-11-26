import { expect, test, vi } from 'vitest'
import { deferred } from '../__tests__/deferred.js'
import { ItemUseSession } from './item-use-session.js'

test('item operation owns the pending slot through cancellation and consumes exactly the original promise', async () => {
  const session = new ItemUseSession(),
    gate = deferred<void>()
  let signal: AbortSignal | undefined
  const run = session.run(async (current) => {
    signal = current
    await gate.promise
    current.throwIfAborted()
  })
  const result = run.catch((error: unknown) => error)
  try {
    expect(session.pending).toBe(true)
    session.cancel()
    expect(signal?.aborted).toBe(true)
    expect(session.pending).toBe(true)
    const duplicate = vi.fn(async () => undefined)
    await session.run(duplicate)
    expect(duplicate).not.toHaveBeenCalled()
    gate.resolve()
    expect(await result).toMatchObject({ name: 'AbortError' })
    expect(session.pending).toBe(false)
    let next: AbortSignal | undefined
    await session.run(async (current) => {
      next = current
    })
    expect(next).not.toBe(signal)
    expect(next?.aborted).toBe(false)
  } finally {
    gate.resolve()
    await result
  }
})

test('item operation preserves original failure identity and releases the slot after rejection', async () => {
  const session = new ItemUseSession(),
    failure = new Error('executor failed')
  await expect(
    session.run(async () => {
      throw failure
    }),
  ).rejects.toBe(failure)
  expect(session.pending).toBe(false)
  const next = vi.fn(async () => undefined)
  await session.run(next)
  expect(next).toHaveBeenCalledOnce()
  session.cancel()
})

test('canceling one of two in-flight item operations leaves the other instance alone', async () => {
  const a = new ItemUseSession()
  const b = new ItemUseSession()
  const releaseA = deferred<void>()
  const releaseB = deferred<void>()
  let aSignal: AbortSignal | undefined
  let bSignal: AbortSignal | undefined
  const pendingA = a.run(async (signal) => {
    aSignal = signal
    await releaseA.promise
  })
  const pendingB = b.run(async (signal) => {
    bSignal = signal
    await releaseB.promise
  })

  try {
    expect(a.pending).toBe(true)
    expect(b.pending).toBe(true)
    expect(aSignal?.aborted).toBe(false)
    expect(bSignal?.aborted).toBe(false)

    a.cancel()
    expect(aSignal?.aborted).toBe(true)
    expect(bSignal?.aborted).toBe(false)
    expect(a.pending).toBe(true)
    expect(b.pending).toBe(true)

    releaseA.resolve()
    await pendingA
    expect(a.pending).toBe(false)
    expect(b.pending).toBe(true)
    expect(bSignal?.aborted).toBe(false)
  } finally {
    releaseA.resolve()
    releaseB.resolve()
    await Promise.all([pendingA, pendingB])
  }
})
