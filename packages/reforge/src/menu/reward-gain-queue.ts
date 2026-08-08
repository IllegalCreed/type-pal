/** D14-3：每条 reward-gain 的无输入展示时长。 */
export const REWARD_GAIN_DURATION_MS = 1400

export interface RewardGainView {
  text: string
}

interface ActiveRewardGain extends RewardGainView {
  signal: AbortSignal
  resolve: () => void
  reject: (error: Error) => void
  abort: () => void
  timer?: ReturnType<typeof setTimeout>
  settled: boolean
}

function rewardGainAbortError(): DOMException {
  return new DOMException('reward-gain 所属用途已取消', 'AbortError')
}

/**
 * reward-gain 的单 owner 顺序呈现器。
 *
 * timeout、按键 advance 与 AbortSignal 竞争同一个 settle；advance 只兑现当前条，调用方的
 * `for` 序列随后才会激活下一条，因此不会一次按键清空整队，也不会留下旧 timer。
 */
export class RewardGainQueue {
  private request?: ActiveRewardGain

  get active(): boolean {
    return this.request !== undefined
  }

  get current(): RewardGainView | undefined {
    const request = this.request
    return request ? { text: request.text } : undefined
  }

  async present(texts: readonly string[], signal: AbortSignal): Promise<void> {
    if (this.request) throw new Error('reward-gain 已有活动序列')
    for (const text of texts) await this.presentOne(text, signal)
  }

  /** 提前完成当前条；没有活动项时为 no-op。 */
  advance(): boolean {
    const request = this.request
    if (!request) return false
    this.settle(request)
    return true
  }

  private presentOne(text: string, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return Promise.reject(rewardGainAbortError())
    return new Promise<void>((resolve, reject) => {
      const request: ActiveRewardGain = {
        text,
        signal,
        resolve,
        reject,
        abort: () => {},
        settled: false,
      }
      request.abort = () => this.settle(request, rewardGainAbortError())
      this.request = request
      signal.addEventListener('abort', request.abort, { once: true })
      if (signal.aborted) {
        request.abort()
        return
      }
      request.timer = setTimeout(() => this.settle(request), REWARD_GAIN_DURATION_MS)
    })
  }

  private settle(request: ActiveRewardGain, error?: Error): void {
    if (request.settled) return
    request.settled = true
    if (request.timer !== undefined) clearTimeout(request.timer)
    request.signal.removeEventListener('abort', request.abort)
    if (this.request === request) this.request = undefined
    if (error) request.reject(error)
    else request.resolve()
  }
}

const REWARD_GAIN_ADVANCE_KEYS = new Set(['Enter', ' '])

/**
 * 返回 true 表示 reward-gain 模态层已消费本帧输入，即使 advance 后 current 已同步清空，
 * 调用方也不得让同一按键继续落入刚恢复的菜单。
 */
export function handleRewardGainInput(
  queue: RewardGainQueue,
  pressed: ReadonlySet<string>,
): boolean {
  if (!queue.active) return false
  for (const key of pressed) {
    if (REWARD_GAIN_ADVANCE_KEYS.has(key)) {
      queue.advance()
      return true
    }
  }
  // Esc 保留给外层关闭 / 菜单语义，不能被 reward-gain 误当成推进键或吞掉。
  if (pressed.has('Escape')) return false
  return true
}
