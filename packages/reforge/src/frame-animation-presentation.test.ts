import { describe, expect, it } from 'vitest'
import type { FrameAnimationFrameSnapshot } from './frame-animation-player.js'
import { FrameAnimationPresentationState } from './frame-animation-presentation.js'

function frame(value: number): FrameAnimationFrameSnapshot {
  return { width: 1, height: 1, rgba: new Uint8Array([value, 0, 0, 255]) }
}

describe('FrameAnimationPresentationState', () => {
  it('播放帧走 Cinematic Layer，播完只缓存，对话时重新显示在 World Layer 上方', () => {
    const state = new FrameAnimationPresentationState()
    const previousOutput = frame(11)
    const last = frame(17)

    state.beginPlayback(previousOutput)
    expect(state.mode).toBe('playing')
    expect(state.visibleFrame).toBe(previousOutput)

    state.present(last)
    expect(state.visibleFrame).toBe(last)

    state.finishPlayback()
    expect(state.mode).toBe('buffered')
    expect(state.hasBufferedFrame).toBe(true)
    expect(state.visibleFrame).toBeUndefined()

    state.enterDialogue()
    expect(state.mode).toBe('dialogue')
    expect(state.visibleFrame).toBe(last)
  })

  it('连续动画在新首帧前保持旧画面，新帧替换后由场景边界统一清除', () => {
    const state = new FrameAnimationPresentationState()
    const first = frame(17)
    const second = frame(29)

    state.beginPlayback()
    state.present(first)
    state.finishPlayback()
    state.enterDialogue()

    state.beginPlayback()
    expect(state.visibleFrame).toBe(first)
    state.present(second)
    expect(state.visibleFrame).toBe(second)
    state.finishPlayback()
    state.enterDialogue()
    expect(state.visibleFrame).toBe(second)

    state.reset()
    expect(state.mode).toBe('idle')
    expect(state.hasBufferedFrame).toBe(false)
    expect(state.visibleFrame).toBeUndefined()
  })

  it('新段没有显示任何帧时丢弃旧备份，不能让后续对话误用旧动画', () => {
    const state = new FrameAnimationPresentationState()
    state.beginPlayback()
    state.present(frame(17))
    state.finishPlayback()
    state.enterDialogue()

    state.beginPlayback()
    state.finishPlayback()
    state.enterDialogue()

    expect(state.mode).toBe('buffered')
    expect(state.hasBufferedFrame).toBe(false)
    expect(state.visibleFrame).toBeUndefined()
  })
})
