export interface ScreenHoldHandle {
  readonly token: string
  readonly owner: object
}

/**
 * 黑屏持有只属于呈现层。脚本按 token 恢复画面，异步清理按 owner 判定，
 * 这样重用同一个 token 时，旧任务也不能取消刚接管的呈现。
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

/** 渲染异常先交给同步宿主收尾；收尾成功后原错误继续传播。 */
export function runWithPresentationFinalizer<T>(render: () => T, finalize: () => void): T {
  try {
    return render()
  } catch (error) {
    finalize()
    throw error
  }
}
