/** Case-owned deferred inputs and returned boot promises; IO mocks belong to the caller. */
import { startBootstrapResourceLoad } from '../bootstrap-resources.js'

export function createBootstrapResourceOwner() {
  const pending: Promise<unknown>[] = []
  const release: Array<() => void> = []

  function deferred<T>(fallback: T) {
    let resolve!: (value: T) => void
    let reject!: (error: unknown) => void
    const promise = new Promise<T>((onResolve, onReject) => {
      resolve = onResolve
      reject = onReject
    })
    pending.push(promise)
    release.push(() => resolve(fallback))
    return { promise, resolve, reject }
  }

  function start(...args: Parameters<typeof startBootstrapResourceLoad>) {
    const load = startBootstrapResourceLoad(...args)
    pending.push(load.resourcesReady, load.soundfontData, load.soundfontSettled)
    return load
  }

  async function close(): Promise<void> {
    try {
      for (const resolve of release) resolve()
      // Preserve each original rejection for the case; teardown only waits for ownership to end.
      await Promise.allSettled(pending)
    } finally {
      release.length = 0
      pending.length = 0
    }
  }

  return { deferred, start, close }
}
