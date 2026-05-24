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

  it('WASD 别名', () => {
    expect(codeToAbstractKey('KeyW')).toBe('Up')
    expect(codeToAbstractKey('KeyA')).toBe('Left')
    expect(codeToAbstractKey('KeyS')).toBe('Down')
    expect(codeToAbstractKey('KeyD')).toBe('Right')
  })

  it('确认 / 取消 / 菜单', () => {
    expect(codeToAbstractKey('Space')).toBe('Confirm')
    expect(codeToAbstractKey('Enter')).toBe('Confirm')
    expect(codeToAbstractKey('Escape')).toBe('Cancel')
    expect(codeToAbstractKey('KeyM')).toBe('Menu')
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

    it('已 held 再 KeyDown(repeat 模拟)→ 推到末尾刷新 order', () => {
      const src = new KeyboardInputSource(window)
      try {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }))
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }))
        // repeat 按 Down(模拟 OS 按住自动 repeat)→ Down 推到末尾
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }))
        const arr = Array.from(src.nextSnapshot(0).held)
        expect(arr[arr.length - 1]).toBe('Down')
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
