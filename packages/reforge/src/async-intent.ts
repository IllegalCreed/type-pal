/** 统一构造可被运行时边界识别的取消错误。 */
export function asyncIntentAbortError(message: string): Error {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

/**
 * 跨 await 的窄身份门。capture 用于“同一世界内提交”，begin 用于“最新启动胜出”；invalidate 令所有旧 token
 * 失效。调用方仍负责在每个有副作用的 await 后 assertCurrent。
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
