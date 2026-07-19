function fadeAbortError(message: string): Error {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

/** 调用侧持有的视觉事务身份；只允许 owner 收口自己仍在活动的 fade。 */
export type FadeOwner = object

/**
 * tick 驱动的淡入淡出状态机。新请求会从当前亮度连续接管；被接管/取消的旧请求以
 * AbortError 收敛，调用它的 runner 不会把未完成 fade 当作成功继续提交世界副作用。
 */
export class SupersedingFadeDriver {
  /** effect 正常完成后仍保留最后一次呈现值的 owner，直到新请求接管或显式复位。 */
  private valueOwner: FadeOwner | undefined
  private effect:
    | {
        from: number
        to: number
        start: number
        ms: number
        resolve: () => void
        reject: (error: Error) => void
        owner: FadeOwner
        signal?: AbortSignal
        abort?: () => void
      }
    | undefined

  constructor(public value = 0) {}

  begin(
    to: number,
    start: number,
    ms: number,
    signal?: AbortSignal,
    owner: FadeOwner = {},
  ): Promise<void> {
    const previous = this.effect
    const from = this.value
    let resolveNext!: () => void
    let rejectNext!: (error: Error) => void
    const nextEffect: NonNullable<typeof this.effect> = {
      from,
      to: Math.max(0, Math.min(1, to)),
      start,
      ms: Math.max(0, ms),
      resolve: () => resolveNext(),
      reject: (error) => rejectNext(error),
      owner,
      signal,
    }
    const promise = new Promise<void>((resolve, reject) => {
      resolveNext = resolve
      rejectNext = reject
    })
    this.effect = nextEffect
    this.valueOwner = owner
    if (signal) {
      const abort = (): void => {
        if (this.effect === nextEffect) this.cancel(0, fadeAbortError('fade runner aborted'))
      }
      nextEffect.abort = abort
      signal.addEventListener('abort', abort, { once: true })
      if (signal.aborted) abort()
    }
    this.finish(previous, fadeAbortError('fade superseded'))
    return promise
  }

  advance(now: number): number {
    const effect = this.effect
    if (!effect) return this.value
    const progress = effect.ms <= 0 ? 1 : Math.max(0, Math.min(1, (now - effect.start) / effect.ms))
    this.value = effect.from + (effect.to - effect.from) * progress
    if (progress >= 1) {
      this.effect = undefined
      this.finish(effect)
    }
    return this.value
  }

  cancel(resetValue = this.value, error = fadeAbortError('fade cancelled')): void {
    const effect = this.effect
    this.effect = undefined
    this.valueOwner = undefined
    this.value = Math.max(0, Math.min(1, resetValue))
    this.finish(effect, error)
  }

  /**
   * 失败事务只能收口自己启动且仍未被接管的 fade。旧事务被新 owner supersede 后调用这里是 no-op，
   * 避免旧 cleanup 把新演出也取消。
   */
  cancelOwned(
    owner: FadeOwner,
    resetValue = this.value,
    error = fadeAbortError('fade cancelled'),
  ): boolean {
    if (this.valueOwner !== owner) return false
    this.cancel(resetValue, error)
    return true
  }

  get active(): boolean {
    return this.effect !== undefined
  }

  private finish(effect: typeof this.effect, error?: Error): void {
    if (!effect) return
    if (effect.signal && effect.abort) effect.signal.removeEventListener('abort', effect.abort)
    if (error) effect.reject(error)
    else effect.resolve()
  }
}
