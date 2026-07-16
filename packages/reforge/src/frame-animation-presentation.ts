import type { FrameAnimationFrameSnapshot } from './frame-animation-player.js'

export type FrameAnimationPresentationMode = 'idle' | 'playing' | 'buffered' | 'dialogue'

/**
 * 帧动画在引擎呈现栈中的状态机：世界层在下、Cinematic Layer 居中、对话/UI 层在上。
 */
export class FrameAnimationPresentationState {
  #frame: FrameAnimationFrameSnapshot | undefined
  #mode: FrameAnimationPresentationMode = 'idle'
  #receivedCurrentFrame = false

  beginPlayback(fallback?: FrameAnimationFrameSnapshot): void {
    if (fallback) this.#frame = fallback
    this.#receivedCurrentFrame = false
    this.#mode = 'playing'
  }

  present(frame: FrameAnimationFrameSnapshot): void {
    this.#frame = frame
    this.#receivedCurrentFrame = true
  }

  finishPlayback(): void {
    if (this.#mode !== 'playing') return
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

  get mode(): FrameAnimationPresentationMode {
    return this.#mode
  }

  get hasBufferedFrame(): boolean {
    return this.#frame !== undefined
  }

  get visibleFrame(): FrameAnimationFrameSnapshot | undefined {
    return this.#mode === 'playing' || this.#mode === 'dialogue' ? this.#frame : undefined
  }
}
