/**
 * TEST-GAME-HOST-BOUNDARIES-1 H02：input 宿主边界（shell/input.ts）。
 * 既有 input.test 已覆盖 held/pressed/多键/repeat/fade 主干——不重复。本文件：
 * detach 后真实事件不再入、两个 snapshot Set 防别名（改返回 Set 不污染内部）、
 * 未知 keyup 不清合法 held、fade 只抑制方向保留非方向。
 */
import { describe, expect, it, vi } from 'vitest'
import { KeyboardInputSource } from './input.js'

function fire(target: { dispatchEvent: (e: Event) => boolean }, code: string, repeat = false) {
  const event = new KeyboardEvent('keydown', { code, repeat })
  vi.spyOn(event, 'code' as never, 'get').mockReturnValue(code as never)
  target.dispatchEvent(event)
}
function fireUp(target: { dispatchEvent: (e: Event) => boolean }, code: string) {
  const event = new KeyboardEvent('keyup', { code })
  vi.spyOn(event, 'code' as never, 'get').mockReturnValue(code as never)
  target.dispatchEvent(event)
}

describe('H02 KeyboardInputSource 宿主边界', () => {
  it('真实 Window 事件驱动；两个 snapshot Set 防别名（改返回集合不动内部）', () => {
    const source = new KeyboardInputSource(window)
    try {
      fire(window, 'ArrowUp')
      fire(window, 'Space')
      const snap = source.nextSnapshot(1)
      expect([...snap.held]).toEqual(['Up', 'Confirm'])
      expect([...snap.pressed]).toEqual(['Up', 'Confirm'])
      // 防别名：改返回 Set 不影响内部
      ;(snap.held as Set<string>).add('Down')
      ;(snap.pressed as Set<string>).add('Down')
      const again = source.nextSnapshot(2)
      expect(again.held.has('Down')).toBe(false)
      expect(again.pressed.has('Down')).toBe(false)
      expect(again.held.has('Up')).toBe(true) // held 保持
      expect(again.pressed.has('Up')).toBe(false) // pressed 每帧清
    } finally {
      source.detach()
    }
  })
  it('未知 keyup 不清合法 held；fade 抑制只针对方向键且物理松开解除', () => {
    const source = new KeyboardInputSource(window)
    try {
      fire(window, 'ArrowLeft')
      fireUp(window, 'KeyZ') // 未知键 keyup
      expect(source.nextSnapshot(1).held.has('Left')).toBe(true)
      // fade：方向进抑制、非方向保留
      fire(window, 'KeyS') // Status 非方向
      source.suppressHeldForFade()
      const faded = source.nextSnapshot(2)
      expect(faded.held.has('Left')).toBe(false) // 方向被抑制
      expect(faded.held.has('Status')).toBe(true) // 非方向保留
      expect(faded.pressed.size).toBe(0) // fade 清 pressed
      // 物理松开解除
      fireUp(window, 'ArrowLeft')
      fire(window, 'ArrowLeft')
      expect(source.nextSnapshot(3).held.has('Left')).toBe(true)
    } finally {
      source.detach()
    }
  })
  it('detach 后真实事件不再进入', () => {
    const source = new KeyboardInputSource(window)
    fire(window, 'ArrowUp')
    source.detach()
    fire(window, 'ArrowDown')
    fireUp(window, 'ArrowUp')
    const snap = source.nextSnapshot(1)
    expect(snap.held.has('Down')).toBe(false)
    expect(snap.held.has('Up')).toBe(true) // detach 后 keyup 也不再处理
    expect(snap.pressed.has('Down')).toBe(false)
  })
})
