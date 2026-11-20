const MAX_REAL_FRAME_MS = 100

export interface GameplayClockFrame {
  realDt: number
  gameplayDt: number
  gameplayNow: number
}

export class GameplayClock {
  private lastReal: number | undefined
  private now = 0

  /** 冻结仍消费真实时间，恢复时不会补算暂停帧。手动单步使用指定的毫秒数。 */
  advance(realNow: number, frozen: boolean, stepMs = 0): GameplayClockFrame {
    const first = this.lastReal === undefined
    const realDt = Math.min(Math.max(0, realNow - (this.lastReal ?? realNow)), MAX_REAL_FRAME_MS)
    const gameplayDt = stepMs > 0 ? stepMs : frozen ? 0 : realDt
    this.lastReal = realNow
    if (first) this.now = realNow
    else this.now += gameplayDt
    return {
      realDt,
      gameplayDt,
      gameplayNow: this.now,
    }
  }
}
