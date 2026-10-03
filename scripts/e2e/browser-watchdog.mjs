/** A transport can hang without producing a Playwright timeout or another health poll. */
export class JourneyDeadlineError extends Error {
  constructor(label, timeoutMs) {
    super(`timeout: ${label} (${timeoutMs}ms); browser transport or journey did not settle`)
    this.name = 'JourneyDeadlineError'
  }
}

export async function withDeadline(label, operation, timeoutMs, { onTimeout, onLate } = {}) {
  const failure = () => {
    const error = new JourneyDeadlineError(label, Math.max(0, timeoutMs))
    try {
      onTimeout?.()
    } catch (cause) {
      error.cause = cause
    }
    return error
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw failure()
  let timer
  let timedOut = false
  const pending = Promise.resolve().then(operation)
  // Consume late failures; only an actually acquired late resource needs disposal.
  pending
    .then((value) => {
      if (timedOut) onLate?.(value)
    })
    .catch(() => {}) // The original rejection is preserved by the race below.
  try {
    return await Promise.race([
      pending,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true
          reject(failure())
        }, timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

/** Kill only the ChildProcess supplied by the browser server created by this journey. */
export function killOwnedBrowser(browserServer) {
  const child = browserServer?.process()
  if (!child || child.exitCode !== null || child.signalCode !== null) return false
  if (!Number.isInteger(child.pid) || child.pid <= 0 || child.pid === process.pid)
    throw new Error('owned browser has no valid child identity')
  return child.kill('SIGKILL')
}

export function createJourneyWatchdog({ deadline, terminate, now = Date.now }) {
  return {
    run(label, operation, limitMs = 30_000, options = {}) {
      return withDeadline(label, operation, Math.min(limitMs, deadline - now()), {
        ...options,
        onTimeout: terminate,
      })
    },
  }
}
