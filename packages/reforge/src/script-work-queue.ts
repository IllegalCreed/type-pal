interface Execution {
  queue: ScriptWorkQueue
  references: number
  waits: number
}

const executions = new WeakMap<AbortSignal, Execution>()

/** Internal execution receipts, not another clock or an authored script capability. */
export class ScriptWorkQueue {
  private readonly active = new Set<Execution>()
  private readonly observers = new Set<() => void>()

  begin(signal: AbortSignal): () => void {
    let execution = executions.get(signal)
    if (execution && execution.queue !== this)
      throw new Error('script signal belongs to another world')
    if (!execution) {
      execution = { queue: this, references: 0, waits: 0 }
      executions.set(signal, execution)
    }
    const current = execution
    current.references++
    this.active.add(current)
    let ended = false
    return () => {
      if (ended) return
      ended = true
      if (--current.references === 0) {
        this.active.delete(current)
        executions.delete(signal)
      }
      this.changed()
    }
  }

  private get ready(): boolean {
    return [...this.active].some((execution) => execution.references > 0 && execution.waits === 0)
  }

  async drain(): Promise<void> {
    while (this.ready) await new Promise<void>((resolve) => this.observers.add(resolve))
  }

  async whenIdle(action: () => void): Promise<void> {
    do {
      await this.drain()
    } while (this.ready)
    // No await may separate the final readiness check from the frame mutation/draw.
    action()
  }

  changed(): void {
    for (const notify of this.observers) notify()
    this.observers.clear()
  }
}

/** A child cancellation scope executes the same sequential script continuation. */
export function inheritScriptWork(parent: AbortSignal, child: AbortSignal): () => void {
  const execution = executions.get(parent)
  if (execution) executions.set(child, execution)
  return () => executions.delete(child)
}

function park(execution: Execution | undefined): () => void {
  if (!execution) return () => {}
  execution.waits++
  execution.queue.changed()
  let resumed = false
  return () => {
    if (resumed) return
    resumed = true
    execution.waits--
    execution.queue.changed()
  }
}

/** Register only a genuine future-event wait; wake before exposing its Promise settlement. */
export function scriptWorkWait<T>(
  signal: AbortSignal | undefined,
  register: (resolve: (value: T) => void, reject: (reason: unknown) => void) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false
    let wake = () => {}
    const finish = (settle: () => void) => {
      if (settled) return
      settled = true
      wake()
      settle()
    }
    try {
      register(
        (value) => finish(() => resolve(value)),
        (reason) => finish(() => reject(reason)),
      )
      if (!settled) wake = park(signal ? executions.get(signal) : undefined)
    } catch (error) {
      finish(() => reject(error))
    }
  })
}

/**
 * Cached IO may resolve through arbitrarily many microtasks. Only an IO request still pending
 * at the next task boundary yields the world; execution-budget yields must not use this helper.
 */
export function scriptWorkIO<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  const execution = signal && executions.get(signal)
  if (!execution || !signal) return promise
  return new Promise<T>((resolve, reject) => {
    let wake = () => {}
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) wake = park(execution)
    }, 0)
    const finish = (settle: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      wake()
      settle()
    }
    const abort = () => finish(() => reject(new DOMException('script IO aborted', 'AbortError')))
    signal.addEventListener('abort', abort, { once: true })
    void promise.then(
      (value) => finish(() => resolve(value)),
      (error: unknown) => finish(() => reject(error)),
    )
    if (signal.aborted) abort()
  })
}
