import { type AnimFrame, AnimPlayer, type AnimSideEffects, BATTLE_FRAME_MS } from './battle-anim.js'

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

  /** 首个战斗帧包含全员交招后启动音效准备的一拍，挂起期间的时间不计入。 */
  resetActionCadence(preparationFrameMs = 0): void {
    this.actionElapsedMs = preparationFrameMs
  }

  /** 上一步演出的停顿已满足行动间隔，下一次消费立即放行。 */
  satisfyActionCadence(): void {
    this.actionElapsedMs = BATTLE_FRAME_MS
  }

  /** CLASSIC 每战斗帧一步（battle.c:782-797，fight.c:1710-1768）。余量不跨动作累计。 */
  consumeActionCadence(dtMs: number): boolean {
    if (dtMs <= 0) return false
    this.actionElapsedMs += dtMs
    if (this.actionElapsedMs < BATTLE_FRAME_MS) return false
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
