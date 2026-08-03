export interface ScreenHoldHandle {
  readonly token: string
  readonly owner: object
}

/**
 * 0x76 黑屏保持的纯表现事务。它不持有世界态；owner 只用于防止旧异步 cleanup
 * 清掉后来接管的事务。
 */
export class ScreenHoldTransaction {
  #active: ScreenHoldHandle | null = null

  get active(): Readonly<ScreenHoldHandle> | null {
    return this.#active
  }

  begin(token: string): ScreenHoldHandle {
    if (!token) throw new Error('黑屏保持 token 不能为空')
    const handle = { token, owner: {} }
    this.#active = handle
    return handle
  }

  /** reveal 必须精确消费当前 token；重复或跨 token reveal 一律 fail-loud。 */
  takeForReveal(token: string): ScreenHoldHandle {
    const active = this.#active
    if (!active || active.token !== token) throw new Error(`黑屏恢复 token 不匹配: ${token}`)
    this.#active = null
    return active
  }

  cancelOwned(handle: ScreenHoldHandle): void {
    if (this.#active?.owner === handle.owner) this.#active = null
  }

  cancel(): void {
    this.#active = null
  }
}

/** renderer/presentation 抛错必须先走同一个宿主 finalizer，再把原错误交回上层。 */
export function runWithPresentationFinalizer<T>(render: () => T, finalize: () => void): T {
  try {
    return render()
  } catch (error) {
    finalize()
    throw error
  }
}
