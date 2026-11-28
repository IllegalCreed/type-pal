/** 试听分析最多保留最近访问的结果，播放缓冲区由各 transport 持有。 */
export class AudioPreviewCache<T> {
  readonly #limit: number
  readonly #values = new Map<string, T>()
  readonly #inflight = new Map<string, Promise<T>>()

  constructor(limit = 8) {
    this.#limit = Math.max(1, Math.floor(limit))
  }

  get size(): number {
    return this.#values.size
  }

  get(key: string): T | undefined {
    const value = this.#values.get(key)
    if (value === undefined) return undefined
    this.#values.delete(key)
    this.#values.set(key, value)
    return value
  }

  load(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = this.get(key)
    if (cached !== undefined) return Promise.resolve(cached)
    const running = this.#inflight.get(key)
    if (running) return running
    const promise = loader()
      .then((value) => {
        if (this.#inflight.get(key) !== promise) return value
        this.#values.set(key, value)
        while (this.#values.size > this.#limit) {
          const oldest = this.#values.keys().next().value
          if (oldest === undefined) break
          this.#values.delete(oldest)
        }
        return value
      })
      .finally(() => {
        if (this.#inflight.get(key) === promise) this.#inflight.delete(key)
      })
    this.#inflight.set(key, promise)
    return promise
  }

  clear(): void {
    this.#values.clear()
    this.#inflight.clear()
  }
}
