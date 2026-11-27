import { scriptWorkWait } from './script-work-queue.js'

/** Host state changes recheck eligibility against the current activation and scene. */
export class ScriptWakeGate {
  private readonly pending = new Set<() => void>()

  wait(signal: AbortSignal, eligible: () => boolean): Promise<void> {
    signal.throwIfAborted()
    if (eligible()) return Promise.resolve()
    return scriptWorkWait<void>(signal, (resolve, reject) => {
      const cleanup = () => {
        this.pending.delete(check)
        signal.removeEventListener('abort', abort)
      }
      const abort = () => {
        cleanup()
        reject(new DOMException('script wake gate aborted', 'AbortError'))
      }
      const check = () => {
        try {
          signal.throwIfAborted()
          if (!eligible()) return
          cleanup()
          resolve()
        } catch (error) {
          cleanup()
          reject(error)
        }
      }
      this.pending.add(check)
      signal.addEventListener('abort', abort, { once: true })
      if (signal.aborted) abort()
    })
  }

  notify(): void {
    for (const check of [...this.pending]) check()
  }
}
