import type { RngFrameSnapshot } from './rng-player.js'

export type RngPresentationMode = 'idle' | 'playing' | 'buffered' | 'dialogue'

/**
 * RNG 在引擎呈现栈中的状态机。
 *
 * - playing: Cinematic Layer 正在显示逐帧动画；
 * - buffered: 播放结束，保留末帧但暂不盖住 World Layer；
 * - dialogue: 对话出现，Cinematic Layer 恢复末帧，UI Layer 再画文字；
 * - idle: 切场景、读档或退出后无 RNG 画面。
 *
 * 这对应一阶段的 `rngFrameActive + dialogPlayingRNG + rngDialogBackup`，但把它明确收敛为
 * 一个呈现层状态机。清对话不会退出 dialogue；生命周期由场景/会话边界统一 reset。
 */
export class RngPresentationState {
  #frame: RngFrameSnapshot | undefined
  #mode: RngPresentationMode = 'idle'
  #receivedCurrentFrame = false

  beginPlayback(fallback?: RngFrameSnapshot): void {
    // 第一段可用当前完整输出作 loading hold；连续段则保留上一张 RNG，直到新首帧抵达。
    if (fallback) this.#frame = fallback
    this.#receivedCurrentFrame = false
    this.#mode = 'playing'
  }

  present(frame: RngFrameSnapshot): void {
    this.#frame = frame
    this.#receivedCurrentFrame = true
  }

  finishPlayback(): void {
    if (this.#mode !== 'playing') return
    // 新段连一帧都没显示（加载失败/立即跳过）时，旧备份不能冒充它的末帧。
    if (!this.#receivedCurrentFrame) this.#frame = undefined
    this.#mode = 'buffered'
  }

  enterDialogue(): void {
    if (this.#frame) this.#mode = 'dialogue'
  }

  reset(): void {
    this.#frame = undefined
    this.#receivedCurrentFrame = false
    this.#mode = 'idle'
  }

  get mode(): RngPresentationMode {
    return this.#mode
  }

  get hasBufferedFrame(): boolean {
    return this.#frame !== undefined
  }

  get visibleFrame(): RngFrameSnapshot | undefined {
    return this.#mode === 'playing' || this.#mode === 'dialogue' ? this.#frame : undefined
  }
}
