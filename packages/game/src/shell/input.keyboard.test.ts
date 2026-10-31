import { describe, expect, it } from 'vitest'
import { keyDown, keyUp } from './__tests__/keyboard-events.js'
import { KeyboardInputSource } from './input.js'

describe('keyboard edges, order and scene-fade', () => {
  it('keydown/keyup 维护 held;snapshot 后 pressed 清空', () => {
    const src = new KeyboardInputSource(window)
    try {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }))
      const s1 = src.nextSnapshot(0)
      expect(s1.held.has('Right')).toBe(true)
      expect(s1.pressed.has('Right')).toBe(true)

      const s2 = src.nextSnapshot(1)
      expect(s2.held.has('Right')).toBe(true)
      expect(s2.pressed.has('Right')).toBe(false)

      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' }))
      const s3 = src.nextSnapshot(2)
      expect(s3.held.has('Right')).toBe(false)
    } finally {
      src.detach()
    }
  })

  // BUG fix(2026-06-02):跳过开场 AVI 的残留 Space 泄漏进 OpeningMenu 被误确认开新游戏。
  //   clearPressed = sdlpal PAL_ClearKeyState()(input.c:1206),进 menu 前清残留初次按下键。
  it('clearPressed 清掉未消费的 pressed(等价 sdlpal PAL_ClearKeyState),held 保留', () => {
    const src = new KeyboardInputSource(window)
    try {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
      src.clearPressed()
      const s = src.nextSnapshot(0)
      expect(s.pressed.has('Confirm')).toBe(false) // 残留 Space 被清 → 菜单首帧不会误确认
      expect(s.held.has('Confirm')).toBe(true) // held(物理按住态)保留,由 keyup 自然配对
    } finally {
      src.detach()
    }
  })

  it('Up 然后 Down → held Set 末位 = Down', () => {
    const src = new KeyboardInputSource(window)
    try {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }))
      const arr = Array.from(src.nextSnapshot(0).held)
      expect(arr).toContain('Up')
      expect(arr).toContain('Down')
      expect(arr[arr.length - 1]).toBe('Down')
    } finally {
      src.detach()
    }
  })

  it('Up,keyup Up,再按 Up → 末位还是 Up(delete-then-add 刷新顺序)', () => {
    const src = new KeyboardInputSource(window)
    try {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }))
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }))
      const arr = Array.from(src.nextSnapshot(0).held)
      expect(arr[arr.length - 1]).toBe('Up')
    } finally {
      src.detach()
    }
  })

  it('e.repeat=true 不刷新 held order(sdlpal input.c:213)', () => {
    // hold key 时 browser 自动重复触发 keydown(e.repeat=true);
    // 若不过滤,被 hold 的键持续推到末尾,挤掉后按的键 → "后按优先" 失效。
    const src = new KeyboardInputSource(window)
    try {
      // 初按 Up + 初按 Down → held = [Up, Down]
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }))
      // Up repeat 触发(模拟 OS 自动重复)→ 不应刷新 order
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', repeat: true }))
      const arr = Array.from(src.nextSnapshot(0).held)
      expect(arr[arr.length - 1]).toBe('Down') // Down 仍在末尾,Up repeat 无效
    } finally {
      src.detach()
    }
  })

  it('repeat 也不污染 pressed(只在初次按下时 add pressed)', () => {
    const src = new KeyboardInputSource(window)
    try {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }))
      const s1 = src.nextSnapshot(0)
      expect(s1.pressed.has('Up')).toBe(true)
      // repeat 触发 → 不应再加 pressed(已 held)
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', repeat: true }))
      const s2 = src.nextSnapshot(1)
      expect(s2.pressed.has('Up')).toBe(false) // pressed 是 edge,repeat 不触发
    } finally {
      src.detach()
    }
  })

  it('suppressHeldForFade 后按住的方向键不进 held,keyup 重按恢复;pressed 被清', () => {
    const src = new KeyboardInputSource(window)
    try {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
      src.suppressHeldForFade()
      let snap = src.nextSnapshot(0)
      expect(snap.held.has('Up')).toBe(false) // 抑制中(按住穿 fade 不续走)
      expect(snap.pressed.size).toBe(0) // PAL_ClearKeyState
      snap = src.nextSnapshot(1)
      expect(snap.held.has('Up')).toBe(false) // fade 后仍按住 → 不恢复
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }))
      snap = src.nextSnapshot(2)
      expect(snap.held.has('Up')).toBe(true) // 物理松开重按 → 恢复
    } finally {
      src.detach()
    }
  })

  it('松开后按的方向时，恢复仍按住的另一个方向，不制造 pressed', () => {
    const source = new KeyboardInputSource(window)
    try {
      keyDown(window, 'ArrowLeft')
      keyDown(window, 'ArrowRight')
      source.suppressHeldForFade()
      expect([...source.nextSnapshot(0).held]).toEqual([])

      keyUp(window, 'ArrowRight')
      const resumed = source.nextSnapshot(1)
      expect([...resumed.held]).toEqual(['Left'])
      expect([...resumed.pressed]).toEqual([])
    } finally {
      source.detach()
    }
  })

  it('非重复方向按下恢复原有方向，保留后按优先和真实新按下边沿', () => {
    const source = new KeyboardInputSource(window)
    try {
      keyDown(window, 'ArrowLeft')
      keyDown(window, 'ArrowRight')
      source.suppressHeldForFade()

      keyDown(window, 'ArrowUp')
      const resumed = source.nextSnapshot(1)
      expect([...resumed.held]).toEqual(['Left', 'Right', 'Up'])
      expect([...resumed.pressed]).toEqual(['Up'])
    } finally {
      source.detach()
    }
  })

  it('repeat、非方向和未知事件不解除抑制；未按住方向的 keyup 仍重算', () => {
    const source = new KeyboardInputSource(window)
    try {
      keyDown(window, 'ArrowLeft')
      keyDown(window, 'ArrowRight')
      source.suppressHeldForFade()
      keyDown(window, 'ArrowLeft', true)
      keyDown(window, 'Space')
      const nonDirection = source.nextSnapshot(1)
      expect([...nonDirection.held]).toEqual(['Confirm'])
      expect([...nonDirection.pressed]).toEqual(['Confirm'])

      keyUp(window, 'Space')
      keyUp(window, 'KeyZ')
      const stillSuppressed = source.nextSnapshot(2)
      expect([...stillSuppressed.held]).toEqual([])
      expect([...stillSuppressed.pressed]).toEqual([])

      keyUp(window, 'ArrowUp')
      const resumed = source.nextSnapshot(3)
      expect([...resumed.held]).toEqual(['Left', 'Right'])
      expect([...resumed.pressed]).toEqual([])
    } finally {
      source.detach()
    }
  })
})

describe('keyboard snapshot and listener boundaries', () => {
  it('真实 Window 事件驱动；两个 snapshot Set 防别名（改返回集合不动内部）', () => {
    const source = new KeyboardInputSource(window)
    try {
      keyDown(window, 'ArrowUp')
      keyDown(window, 'Space')
      const snap = source.nextSnapshot(1)
      expect([...snap.held]).toEqual(['Up', 'Confirm'])
      expect([...snap.pressed]).toEqual(['Up', 'Confirm'])
      // 防别名：改返回 Set 不影响内部
      if (!(snap.held instanceof Set) || !(snap.pressed instanceof Set))
        throw new Error('Alias-isolation requires actual Set snapshots')
      snap.held.add('Down')
      snap.pressed.add('Down')
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
      keyDown(window, 'ArrowLeft')
      keyUp(window, 'KeyZ') // 未知键 keyup
      expect(source.nextSnapshot(1).held.has('Left')).toBe(true)
      // fade：方向进抑制、非方向保留
      keyDown(window, 'KeyS') // Status 非方向
      source.suppressHeldForFade()
      const faded = source.nextSnapshot(2)
      expect(faded.held.has('Left')).toBe(false) // 方向被抑制
      expect(faded.held.has('Status')).toBe(true) // 非方向保留
      expect(faded.pressed.size).toBe(0) // fade 清 pressed
      // 物理松开解除
      keyUp(window, 'ArrowLeft')
      keyDown(window, 'ArrowLeft')
      expect(source.nextSnapshot(3).held.has('Left')).toBe(true)
    } finally {
      source.detach()
    }
  })

  it('detach 后真实事件不再进入', () => {
    const source = new KeyboardInputSource(window)
    keyDown(window, 'ArrowUp')
    source.detach()
    keyDown(window, 'ArrowDown')
    keyUp(window, 'ArrowUp')
    const snap = source.nextSnapshot(1)
    expect(snap.held.has('Down')).toBe(false)
    expect(snap.held.has('Up')).toBe(true) // detach 后 keyup 也不再处理
    expect(snap.pressed.has('Down')).toBe(false)
  })
})

describe('keyboard contact ordering and ownership', () => {
  it('未松开的 Up 再次 keydown 会把 Up 挪到 held 末位', () => {
    const src = new KeyboardInputSource(window)
    try {
      keyDown(window, 'ArrowUp')
      src.nextSnapshot(1)
      keyDown(window, 'ArrowDown')
      keyDown(window, 'ArrowUp')
      expect([...src.nextSnapshot(2).held]).toEqual(['Down', 'Up'])
    } finally {
      src.detach()
    }
  })

  it('已经按住的 Up 再次 keydown 不再写入 pressed', () => {
    const src = new KeyboardInputSource(window)
    try {
      keyDown(window, 'ArrowUp')
      src.nextSnapshot(1)
      keyDown(window, 'ArrowDown')
      keyDown(window, 'ArrowUp')
      expect([...src.nextSnapshot(2).pressed]).toEqual(['Down'])
    } finally {
      src.detach()
    }
  })

  it('未知键的 keydown 不改已按住的 Right', () => {
    const src = new KeyboardInputSource(window)
    try {
      keyDown(window, 'ArrowRight')
      keyDown(window, 'KeyZ')
      const shot = src.nextSnapshot(1)
      expect([...shot.held]).toEqual(['Right'])
      expect([...shot.pressed]).toEqual(['Right'])
    } finally {
      src.detach()
    }
  })

  it('拆掉一个键盘源后，另一个源仍接收后续按键', () => {
    const first = new KeyboardInputSource(window)
    const second = new KeyboardInputSource(window)
    try {
      keyDown(window, 'ArrowUp')
      first.detach()
      keyDown(window, 'ArrowDown')
      expect([...first.nextSnapshot(1).held]).toEqual(['Up'])
      expect([...second.nextSnapshot(1).held]).toEqual(['Up', 'Down'])
    } finally {
      first.detach()
      second.detach()
    }
  })

  it('clearPressed 不解除方向键的 fade 抑制', () => {
    const src = new KeyboardInputSource(window)
    try {
      keyDown(window, 'ArrowLeft')
      keyDown(window, 'Space')
      src.suppressHeldForFade()
      src.clearPressed()
      const shot = src.nextSnapshot(1)
      expect([...shot.held]).toEqual(['Confirm'])
      expect(shot.pressed.size).toBe(0)
    } finally {
      src.detach()
      keyUp(window, 'ArrowLeft')
      keyUp(window, 'Space')
    }
  })

  it('键盘快照的帧号原样使用主循环传入的帧号', () => {
    const src = new KeyboardInputSource(window)
    try {
      keyDown(window, 'Enter')
      expect(src.nextSnapshot(6).frameNum).toBe(6)
    } finally {
      src.detach()
    }
  })
})
