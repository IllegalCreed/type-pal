import { act } from 'react'

/** Restore only this flag; other IO ports may belong to a file-wide browser host. */
export function installReactActEnvironment(): () => void {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT')
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
    configurable: true,
    enumerable: original?.enumerable ?? true,
    writable: true,
    value: true,
  })
  return () => {
    if (original) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', original)
    else Reflect.deleteProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT')
  }
}

/**
 * Retry a synchronous DOM/session assertion, keeping intervening browser IO inside act.
 * Check after act flushes; polling the DOM inside one long act would wait on its own flush.
 * Uses real timers, as required by the current IO callers, with vi.waitFor's default timing.
 * No console or environment suppression.
 */
export async function waitForReact(
  check: () => void,
  options: number | { timeout?: number; interval?: number } = {},
): Promise<void> {
  const { timeout = 1000, interval = 50 } =
    typeof options === 'number' ? { timeout: options } : options
  if (!Number.isFinite(timeout) || timeout < 0 || !Number.isFinite(interval) || interval <= 0)
    throw new RangeError('React wait requires timeout >= 0 and interval > 0')
  const deadline = performance.now() + timeout
  for (;;) {
    let failure: unknown
    try {
      check()
      return
    } catch (error) {
      failure = error
    }
    const remaining = deadline - performance.now()
    if (remaining <= 0) throw failure
    const delay = Math.min(interval, remaining)
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, delay))
    })
  }
}
