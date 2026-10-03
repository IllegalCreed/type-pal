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

    const owner = state.beginPlayback(previousOutput)
    expect(state.mode).toBe('playing')
    expect(state.visibleFrame).toBe(previousOutput)

    state.present(last, owner)
    expect(state.visibleFrame).toBe(last)

    state.finishPlayback(owner, { succeeded: true })
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

    const firstOwner = state.beginPlayback()
    state.present(first, firstOwner)
    state.finishPlayback(firstOwner, { succeeded: true })
    state.enterDialogue()

    const secondOwner = state.beginPlayback()
    expect(state.visibleFrame).toBe(first)
    state.present(second, secondOwner)
    expect(state.visibleFrame).toBe(second)
    state.finishPlayback(secondOwner, { succeeded: true })
    state.enterDialogue()
    expect(state.visibleFrame).toBe(second)

    state.reset()
    expect(state.mode).toBe('idle')
    expect(state.hasBufferedFrame).toBe(false)
    expect(state.visibleFrame).toBeUndefined()
  })

  it('新段没有显示任何帧时丢弃旧备份，不能让后续对话误用旧动画', () => {
    const state = new FrameAnimationPresentationState()
    const firstOwner = state.beginPlayback()
    state.present(frame(17), firstOwner)
    state.finishPlayback(firstOwner, { succeeded: true })
    state.enterDialogue()

    const secondOwner = state.beginPlayback()
    state.finishPlayback(secondOwner, { succeeded: true, holdLastFrame: true })
    state.enterDialogue()

    expect(state.mode).toBe('buffered')
    expect(state.hasBufferedFrame).toBe(false)
    expect(state.visibleFrame).toBeUndefined()
  })

  it('明确保持成功末帧，直到显式reset，旧owner不能复活已清层', () => {
    const state = new FrameAnimationPresentationState()
    const owner = state.beginPlayback()
    const last = frame(31)
    state.present(last, owner)
    state.finishPlayback(owner, { succeeded: true, holdLastFrame: true })
    expect(state.mode).toBe('held')
    expect(state.visibleFrame).toBe(last)
    state.reset()
    expect(state.present(last, owner)).toBe(false)
    state.finishPlayback(owner, { succeeded: true, holdLastFrame: true })
    expect(state.mode).toBe('idle')
    expect(state.visibleFrame).toBeUndefined()
  })

  it('旧decode和finally不能覆盖新播放，失败不能保持本次或旧fallback', () => {
    const state = new FrameAnimationPresentationState()
    const old = state.beginPlayback()
    state.present(frame(11), old)
    const next = state.beginPlayback()
    const current = frame(29)
    state.present(current, next)
    expect(state.present(frame(99), old)).toBe(false)
    state.finishPlayback(old, { succeeded: false })
    expect(state.mode).toBe('playing')
    expect(state.visibleFrame).toBe(current)
    state.finishPlayback(next, { succeeded: false, holdLastFrame: true })
    expect(state.visibleFrame).toBeUndefined()
    expect(state.hasBufferedFrame).toBe(false)
  })
})
