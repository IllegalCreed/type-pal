/** A single in-flight item operation. Cancellation keeps the slot occupied until it settles. */
export class ItemUseSession {
  #pending = false
  #controller: AbortController | null = null

  get pending(): boolean {
    return this.#pending
  }

  cancel(): void {
    this.#controller?.abort()
    this.#controller = null
  }

  async run(operation: (signal: AbortSignal) => Promise<void>): Promise<void> {
    if (this.#pending) return
    this.#pending = true
    const controller = new AbortController()
    this.#controller = controller
    try {
      await operation(controller.signal)
    } finally {
      if (this.#controller === controller) this.#controller = null
      this.#pending = false
    }
  }
}
