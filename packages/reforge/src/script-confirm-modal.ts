/**
 * 脚本二选一中央队列。它只管理 prompt 生命周期和输入选择，不承载系统菜单/商店业务。
 *
 * - FIFO、默认否、单次提交；
 * - prompt 至少实际呈现两帧后才兑现答案，保证问句 held-frame 不被同帧擦除；
 * - AbortSignal 取消时 reject，runner 不会把取消误当成 Yes/No 任一臂；
 * - 是否可激活由 main 的 modal arbiter 决定，已有 shop/system/save 可先完成。
 */

export interface ScriptConfirmModalView<TFrame> {
  token: number
  frame: TFrame
  selectedYes: boolean
  answerPending: boolean
  presentedFrames: number
}

interface ScriptConfirmRequest<TFrame> extends ScriptConfirmModalView<TFrame> {
  signal: AbortSignal
  resolve: (accepted: boolean) => void
  reject: (error: Error) => void
  answer?: boolean
  settled: boolean
  abort: () => void
}

function abortedError(message = '脚本确认框所属 runner 已取消'): DOMException {
  return new DOMException(message, 'AbortError')
}

export class ScriptConfirmModalQueue<TFrame> {
  private readonly queue: ScriptConfirmRequest<TFrame>[] = []
  private current?: ScriptConfirmRequest<TFrame>
  private nextToken = 1

  get active(): boolean {
    return this.current !== undefined
  }

  get pendingCount(): number {
    return this.queue.length + (this.current ? 1 : 0)
  }

  get view(): ScriptConfirmModalView<TFrame> | undefined {
    const request = this.current
    if (!request) return undefined
    return {
      token: request.token,
      frame: request.frame,
      selectedYes: request.selectedYes,
      answerPending: request.answer !== undefined,
      presentedFrames: request.presentedFrames,
    }
  }

  enqueue(frame: TFrame, signal: AbortSignal): Promise<boolean> {
    if (signal.aborted) return Promise.reject(abortedError())
    return new Promise<boolean>((resolve, reject) => {
      const request = {
        token: this.nextToken++,
        frame,
        selectedYes: false,
        answerPending: false,
        presentedFrames: 0,
        signal,
        resolve,
        reject,
        settled: false,
        abort: () => {},
      } satisfies ScriptConfirmRequest<TFrame>
      request.abort = () => this.abortRequest(request)
      this.queue.push(request)
      signal.addEventListener('abort', request.abort, { once: true })
      if (signal.aborted) request.abort()
    })
  }

  /** 已有宿主 modal 全部让出后，从 FIFO 头激活一项。 */
  activateIfPossible(canActivate: boolean, captureFrame?: () => TFrame): boolean {
    if (this.current || !canActivate) return false
    const request = this.queue.shift()
    if (!request) return false
    if (request.signal.aborted) {
      this.abortRequest(request)
      return this.activateIfPossible(canActivate, captureFrame)
    }
    if (captureFrame) request.frame = captureFrame()
    this.current = request
    return true
  }

  toggle(): void {
    const request = this.current
    if (!request || request.answer !== undefined) return
    request.selectedYes = !request.selectedYes
  }

  /** Enter/交互键按当前选择提交。 */
  submit(): void {
    const request = this.current
    if (!request || request.answer !== undefined) return
    request.answer = request.selectedYes
    this.finishIfPresented(request)
  }

  /** Esc/Menu 固定等价于 No，不受当前高亮影响。 */
  submitNo(): void {
    const request = this.current
    if (!request || request.answer !== undefined) return
    request.answer = false
    this.finishIfPresented(request)
  }

  /** draw 完整 held-frame + confirm box 后调用一次。 */
  presented(): void {
    const request = this.current
    if (!request) return
    request.presentedFrames += 1
    this.finishIfPresented(request)
  }

  cancelAll(message = '脚本确认框会话已替换'): void {
    const error = abortedError(message)
    const requests = [...(this.current ? [this.current] : []), ...this.queue]
    this.current = undefined
    this.queue.length = 0
    for (const request of requests) this.rejectRequest(request, error)
  }

  private finishIfPresented(request: ScriptConfirmRequest<TFrame>): void {
    if (this.current !== request || request.answer === undefined || request.presentedFrames < 2)
      return
    this.current = undefined
    this.resolveRequest(request, request.answer)
  }

  private abortRequest(request: ScriptConfirmRequest<TFrame>): void {
    if (this.current === request) this.current = undefined
    else {
      const index = this.queue.indexOf(request)
      if (index >= 0) this.queue.splice(index, 1)
    }
    this.rejectRequest(request, abortedError())
  }

  private resolveRequest(request: ScriptConfirmRequest<TFrame>, answer: boolean): void {
    if (request.settled) return
    request.settled = true
    request.signal.removeEventListener('abort', request.abort)
    request.resolve(answer)
  }

  private rejectRequest(request: ScriptConfirmRequest<TFrame>, error: Error): void {
    if (request.settled) return
    request.settled = true
    request.signal.removeEventListener('abort', request.abort)
    request.reject(error)
  }
}
