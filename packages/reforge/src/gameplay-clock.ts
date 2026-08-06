/**
 * 可暂停的游戏时钟。realNow 继续用于 UI 闪烁/音频；gameplayNow 只在未冻结时推进。
 * 冻结期间仍持续消费 real 时间，因此恢复时不会补算积压帧。
 */
export interface GameplayClockFrame {
  realDt: number
  gameplayDt: number
  gameplayNow: number
}

export class GameplayClock {
  private lastReal = 0
  private now = 0

  /**
   * 推进时钟。frozen=true 时 gameplay 时间不随 real 时间走(实时时间仍被消费,不积压);
   * stepMs>0 表示本帧手动单步:gameplay 时间精确推进 stepMs(与 frozen 组合用于调试帧步进)。
   */
  advance(realNow: number, frozen: boolean, stepMs = 0): GameplayClockFrame {
    const first = this.lastReal === 0
    const realDt = first ? 0 : Math.min(Math.max(0, realNow - this.lastReal), 100)
    this.lastReal = realNow
    if (first) this.now = realNow
    else if (stepMs > 0) this.now += stepMs
    else if (!frozen) this.now += realDt
    return {
      realDt,
      gameplayDt: stepMs > 0 ? stepMs : frozen ? 0 : realDt,
      gameplayNow: this.now,
    }
  }
}
