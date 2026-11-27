/** 统一构造可被运行时边界识别的取消错误。 */
export function asyncIntentAbortError(message: string): Error {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

/** AbortSignal reasons can come from a different window or from an intent guard. */
export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  )
}

/**
 * 跨 await 的窄身份门。capture 用于“同一世界内提交”，begin 用于“最新启动胜出”；invalidate 令所有旧 token
 * 失效。令牌只对签发它的 controller 有效；异步工作不会自动中止，调用方须在提交副作用前复查。
 */
export class AsyncIntentController {
  private serial = 0

  capture(): number {
    return this.serial
  }

  begin(): number {
    this.serial++
    return this.serial
  }

  invalidate(): void {
    this.serial++
  }

  isCurrent(token: number): boolean {
    return token === this.serial
  }

  assertCurrent(token: number, message: string): void {
    if (!this.isCurrent(token)) throw asyncIntentAbortError(message)
  }
}
