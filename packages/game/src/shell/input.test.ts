import { describe, it, expect } from 'vitest'
import {
  KeyboardInputSource,
  ReplayInputSource,
  RecordingInputSource,
  codeToAbstractKey,
} from './input.js'

describe('codeToAbstractKey', () => {
  it('方向键映射', () => {
    expect(codeToAbstractKey('ArrowUp')).toBe('Up')
    expect(codeToAbstractKey('ArrowDown')).toBe('Down')
    expect(codeToAbstractKey('ArrowLeft')).toBe('Left')
    expect(codeToAbstractKey('ArrowRight')).toBe('Right')
  })

  // user 2026-05-31 决策"以原版为准":WASD 还原 sdlpal input.c:84-90 原义,**不再**当方向键。
  it('WASD = sdlpal 原义(input.c:84-90),不是方向', () => {
    expect(codeToAbstractKey('KeyW')).toBe('ThrowItem') // input.c:87
    expect(codeToAbstractKey('KeyA')).toBe('Auto')      // input.c:84
    expect(codeToAbstractKey('KeyS')).toBe('Status')    // input.c:90
    expect(codeToAbstractKey('KeyD')).toBe('Defend')    // input.c:85
  })

  it('确认 / 菜单(sdlpal input.c:66-74 真值)', () => {
    expect(codeToAbstractKey('Space')).toBe('Confirm')
    expect(codeToAbstractKey('Enter')).toBe('Confirm')
    expect(codeToAbstractKey('NumpadEnter')).toBe('Confirm')
    expect(codeToAbstractKey('ControlLeft')).toBe('Confirm')
    expect(codeToAbstractKey('Escape')).toBe('Menu')
    expect(codeToAbstractKey('AltLeft')).toBe('Menu')
    expect(codeToAbstractKey('AltRight')).toBe('Menu')
    expect(codeToAbstractKey('Insert')).toBe('Menu')
    expect(codeToAbstractKey('Numpad0')).toBe('Menu')
    expect(codeToAbstractKey('KeyM')).toBe('Menu')
  })

  it('Numpad 方向键(sdlpal input.c:58-65)', () => {
    expect(codeToAbstractKey('Numpad8')).toBe('Up')
    expect(codeToAbstractKey('Numpad2')).toBe('Down')
    expect(codeToAbstractKey('Numpad4')).toBe('Left')
    expect(codeToAbstractKey('Numpad6')).toBe('Right')
  })

  it('翻页 / Home/End(sdlpal input.c:75-82)', () => {
    expect(codeToAbstractKey('PageUp')).toBe('PgUp')
    expect(codeToAbstractKey('Numpad9')).toBe('PgUp')
    expect(codeToAbstractKey('PageDown')).toBe('PgDn')
    expect(codeToAbstractKey('Numpad3')).toBe('PgDn')
    expect(codeToAbstractKey('Home')).toBe('Home')
    expect(codeToAbstractKey('Numpad7')).toBe('Home')
    expect(codeToAbstractKey('End')).toBe('End')
    expect(codeToAbstractKey('Numpad1')).toBe('End')
  })

  it('战斗 / 大世界专用键(sdlpal input.c:83-90)', () => {
    expect(codeToAbstractKey('KeyR')).toBe('Repeat')   // input.c:83
    expect(codeToAbstractKey('KeyA')).toBe('Auto')     // input.c:84
    expect(codeToAbstractKey('KeyD')).toBe('Defend')   // input.c:85
    expect(codeToAbstractKey('KeyE')).toBe('UseItem')  // input.c:86
    expect(codeToAbstractKey('KeyW')).toBe('ThrowItem')// input.c:87
    expect(codeToAbstractKey('KeyQ')).toBe('Flee')     // input.c:88
    expect(codeToAbstractKey('KeyF')).toBe('Force')    // input.c:89
    expect(codeToAbstractKey('KeyS')).toBe('Status')   // input.c:90
  })

  it('未知键 → null', () => {
    expect(codeToAbstractKey('KeyZ')).toBeNull()
  })
})

describe('KeyboardInputSource', () => {
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
      expect(s.held.has('Confirm')).toBe(true)      // held(物理按住态)保留,由 keyup 自然配对
    } finally {
      src.detach()
    }
  })

  // sdlpal input.c:180-189 PAL_GetCurrDirection — "最后按的方向键优先"。
  describe('last-press priority (sdlpal input.c:180-189)', () => {
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
  })
})

describe('ReplayInputSource', () => {
  it('按帧顺序回放', () => {
    const snaps = [
      { held: new Set<'Confirm'>(), pressed: new Set<'Confirm'>(['Confirm']), frameNum: 0 },
      { held: new Set<'Right'>(['Right']), pressed: new Set<'Right'>(), frameNum: 1 },
    ]
    const src = new ReplayInputSource(snaps)
    expect(src.nextSnapshot(0).pressed.has('Confirm')).toBe(true)
    expect(src.nextSnapshot(1).held.has('Right')).toBe(true)
  })

  it('超出序列 → 空快照', () => {
    const src = new ReplayInputSource([])
    const s = src.nextSnapshot(0)
    expect(s.held.size).toBe(0)
    expect(s.pressed.size).toBe(0)
  })
})

describe('RecordingInputSource', () => {
  it('装饰任意 source,把每帧 snapshot 留档', () => {
    const inner = new ReplayInputSource([
      { held: new Set<'Right'>(['Right']), pressed: new Set<'Right'>(), frameNum: 0 },
    ])
    const rec = new RecordingInputSource(inner)
    rec.nextSnapshot(0)
    expect(rec.getRecording()).toHaveLength(1)
    expect(rec.getRecording()[0]?.held.has('Right')).toBe(true)
  })
})

describe('DM30:fade 抑制按住的方向键(palette.c:313-316)', () => {
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
})
