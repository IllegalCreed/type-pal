import { AsyncIntentController } from './async-intent.js'
import type { FrameAnimationFrameSnapshot } from './frame-animation-player.js'

export type FrameAnimationPresentationMode = 'idle' | 'playing' | 'buffered' | 'held' | 'dialogue'

/**
 * 帧动画在引擎呈现栈中的状态机：世界层在下、Cinematic Layer 居中、对话/UI 层在上。
 */
export class FrameAnimationPresentationState {
  #frame: FrameAnimationFrameSnapshot | undefined
  #mode: FrameAnimationPresentationMode = 'idle'
  #receivedCurrentFrame = false
  readonly #intent = new AsyncIntentController()
  #owner: number | undefined
  #playing = false

  beginPlayback(fallback?: FrameAnimationFrameSnapshot): number {
    const owner = this.#intent.begin()
    this.#owner = owner
    this.#playing = true
    if (fallback) this.#frame = fallback
    this.#receivedCurrentFrame = false
    this.#mode = 'playing'
    return owner
  }

  isCurrent(owner: number): boolean {
    return this.#owner === owner && this.#intent.isCurrent(owner)
  }

  present(frame: FrameAnimationFrameSnapshot, owner: number): boolean {
    if (!this.isCurrent(owner) || !this.#playing) return false
    this.#frame = frame
    this.#receivedCurrentFrame = true
    return true
  }

  finishPlayback(owner: number, options: { succeeded: boolean; holdLastFrame?: boolean }): void {
    if (!this.isCurrent(owner) || !this.#playing) return
    this.#playing = false
    if (!options.succeeded) {
      this.reset()
      return
    }
    if (!this.#receivedCurrentFrame) this.#frame = undefined
    if (this.#mode !== 'dialogue')
      this.#mode = options.holdLastFrame && this.#receivedCurrentFrame ? 'held' : 'buffered'
  }

  enterDialogue(): void {
    if (this.#frame) this.#mode = 'dialogue'
  }

  reset(): void {
    this.#intent.invalidate()
    this.#owner = undefined
    this.#playing = false
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
    return this.#mode === 'playing' || this.#mode === 'dialogue' || this.#mode === 'held'
      ? this.#frame
      : undefined
  }
}
