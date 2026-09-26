import { type AnimFrame, AnimPlayer, type AnimSideEffects } from './battle-anim.js'

const ACTION_INTERVAL_MS = 240

export type BattlePlaybackAdvance = 'inactive' | 'playing' | 'finished'

/**
 * 行动节拍与时间线播放器的唯一 owner。时间线构建、core step 和视觉副作用仍由宿主窄回调负责。
 */
export class BattleActionPresentationScheduler {
  private actionElapsedMs = 0
  private player: AnimPlayer | null = null
  private scripted = false

  get active(): boolean {
    return this.player !== null
  }

  start(timeline: AnimFrame[], effects: AnimSideEffects, scripted = false): void {
    this.scripted = scripted
    this.player = new AnimPlayer(timeline, effects)
    // 保持旧采样点：start 同一调用栈立即进入首帧并派发副作用。
    this.player.tick(0)
  }

  resetActionCadence(): void {
    this.actionElapsedMs = 0
  }

  /** 达到门槛时同拍消费且归零；不携带超额时间，保持旧 actTimer 语义。 */
  consumeActionCadence(dtMs: number): boolean {
    this.actionElapsedMs += dtMs
    if (this.actionElapsedMs < ACTION_INTERVAL_MS) return false
    this.actionElapsedMs = 0
    return true
  }

  /** 脚本 pump 专用：完成时同时清 player 与 scripted 标志。 */
  advanceScript(dtMs: number): BattlePlaybackAdvance {
    if (!this.scripted) return 'inactive'
    if (this.player && !this.player.tick(dtMs)) return 'playing'
    this.player = null
    this.scripted = false
    return 'finished'
  }

  /** 普通行动/终态专用：只清 player，不暗改脚本标志。 */
  advancePlayback(dtMs: number): BattlePlaybackAdvance {
    if (!this.player) return 'inactive'
    if (!this.player.tick(dtMs)) return 'playing'
    this.player = null
    return 'finished'
  }
}
