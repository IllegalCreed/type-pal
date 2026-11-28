import { describe, expect, test, vi } from 'vitest'
import { AudioPreviewCache } from './audio-preview-cache.js'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('Audio preview analysis cache', () => {
  test('deduplicates inflight analysis and evicts the least-recently-used entry', async () => {
    const cache = new AudioPreviewCache<number>(2)
    const pending = deferred<number>()
    const loader = vi.fn(() => pending.promise)
    const first = cache.load('a', loader)
    const duplicate = cache.load('a', loader)
    pending.resolve(1)

    await expect(first).resolves.toBe(1)
    await expect(duplicate).resolves.toBe(1)
    expect(loader).toHaveBeenCalledOnce()
    await cache.load('b', async () => 2)
    expect(cache.get('a')).toBe(1)
    await cache.load('c', async () => 3)
    expect(cache.get('b')).toBeUndefined()
    expect(cache.size).toBe(2)
  })

  test('a rejected pending analysis leaves room to retry the same key', async () => {
    const cache = new AudioPreviewCache<number>()
    const failure = new Error('read failed')
    await expect(
      cache.load('asset', async () => {
        throw failure
      }),
    ).rejects.toBe(failure)
    expect(cache.get('asset')).toBeUndefined()
    await expect(cache.load('asset', async () => 2)).resolves.toBe(2)
    expect(cache.get('asset')).toBe(2)
  })

  test('clearing a cache keeps older work from taking ownership of a new request', async () => {
    const cache = new AudioPreviewCache<number>()
    const old = deferred<number>()
    const current = deferred<number>()
    const pendingOld = cache.load('same-asset', () => old.promise)
    cache.clear()
    const pendingCurrent = cache.load('same-asset', () => current.promise)

    old.resolve(1)
    await expect(pendingOld).resolves.toBe(1)
    expect(cache.get('same-asset')).toBeUndefined()
    expect(cache.load('same-asset', async () => 3)).toBe(pendingCurrent)

    current.resolve(2)
    await expect(pendingCurrent).resolves.toBe(2)
    expect(cache.get('same-asset')).toBe(2)
  })
})
