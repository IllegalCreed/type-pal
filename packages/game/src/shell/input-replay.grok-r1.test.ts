/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G09-A。
 * 键序、回放游标和录制数组的归属。不重领键位表、repeat 和单源 detach。
 */
import type { InputSnapshot } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import {
  codeToAbstractKey,
  KeyboardInputSource,
  RecordingInputSource,
  ReplayInputSource,
} from './input.js'

function down(code: string, repeat = false): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, repeat }))
}

function up(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keyup', { code }))
}

function snap(frameNum: number, held: InputSnapshot['held'] = new Set()): InputSnapshot {
  return { held, pressed: new Set(), frameNum }
}

describe('G09-A 输入回放与按键归属', () => {
  it('G09-A01 未松开的 Up 再次 keydown 会把 Up 挪到 held 末位', () => {
    const src = new KeyboardInputSource(window)
    try {
      down('ArrowUp')
      src.nextSnapshot(1)
      down('ArrowDown')
      down('ArrowUp')
      expect([...src.nextSnapshot(2).held]).toEqual(['Down', 'Up'])
    } finally {
      src.detach()
    }
  })

  it('G09-A02 已经按住的 Up 再次 keydown 不再写入 pressed', () => {
    const src = new KeyboardInputSource(window)
    try {
      down('ArrowUp')
      src.nextSnapshot(1)
      down('ArrowDown')
      down('ArrowUp')
      expect([...src.nextSnapshot(2).pressed]).toEqual(['Down'])
    } finally {
      src.detach()
    }
  })

  it('G09-A03 未知键的 keydown 不改已按住的 Right', () => {
    const src = new KeyboardInputSource(window)
    try {
      down('ArrowRight')
      down('KeyZ')
      const shot = src.nextSnapshot(1)
      expect([...shot.held]).toEqual(['Right'])
      expect([...shot.pressed]).toEqual(['Right'])
    } finally {
      src.detach()
    }
  })

  it('G09-A04 ControlRight 不是确认键', () => {
    expect(codeToAbstractKey('ControlRight')).toBeNull()
  })

  it('G09-A05 拆掉一个键盘源后，另一个源仍接收后续按键', () => {
    const first = new KeyboardInputSource(window)
    const second = new KeyboardInputSource(window)
    try {
      down('ArrowUp')
      first.detach()
      down('ArrowDown')
      expect([...first.nextSnapshot(1).held]).toEqual(['Up'])
      expect([...second.nextSnapshot(1).held]).toEqual(['Up', 'Down'])
    } finally {
      first.detach()
      second.detach()
    }
  })

  it('G09-A06 clearPressed 不解除方向键的 fade 抑制', () => {
    const src = new KeyboardInputSource(window)
    try {
      down('ArrowLeft')
      down('Space')
      src.suppressHeldForFade()
      src.clearPressed()
      const shot = src.nextSnapshot(1)
      expect([...shot.held]).toEqual(['Confirm'])
      expect(shot.pressed.size).toBe(0)
    } finally {
      src.detach()
      up('ArrowLeft')
      up('Space')
    }
  })

  it('G09-A07 回放耗尽时，空快照的帧号等于本次入参', () => {
    const src = new ReplayInputSource([])
    const shot = src.nextSnapshot(8)
    expect(shot.frameNum).toBe(8)
    expect(shot.held.size).toBe(0)
    expect(shot.pressed.size).toBe(0)
  })

  it('G09-A08 回放游标越过末帧后，调用方再追加的快照不会被读到', () => {
    const first = snap(0, new Set(['Up']))
    const second = snap(1, new Set(['Down']))
    const shots: InputSnapshot[] = [first, second]
    const src = new ReplayInputSource(shots)
    expect(src.nextSnapshot(99)).toBe(first)
    const mid = src.nextSnapshot(99)
    expect(mid.frameNum).toBe(1)
    expect(mid).toBe(second)
    expect(src.nextSnapshot(9).frameNum).toBe(9)
    shots.push(snap(2, new Set(['Left'])))
    const after = src.nextSnapshot(11)
    expect(after.frameNum).toBe(11)
    expect(after.held.size).toBe(0)
  })

  it('G09-A09 录制源返回的就是内层那一个快照对象', () => {
    const shot = snap(4, new Set(['Menu']))
    const rec = new RecordingInputSource({ nextSnapshot: () => shot })
    expect(rec.nextSnapshot(4)).toBe(shot)
  })

  it('G09-A10 getRecording 一直是同一个数组，第二次快照追加在后面', () => {
    const first = snap(1, new Set(['Menu']))
    const second = snap(2, new Set(['Confirm']))
    const queued = [first, second]
    const rec = new RecordingInputSource({
      nextSnapshot: () => queued.shift() ?? snap(0),
    })
    rec.nextSnapshot(1)
    const log = rec.getRecording()
    expect(rec.getRecording()).toBe(log)
    expect(log[0]).toBe(first)
    rec.nextSnapshot(2)
    expect(log).toEqual([first, second])
  })

  it('G09-A11 键盘快照的帧号原样使用主循环传入的帧号', () => {
    const src = new KeyboardInputSource(window)
    try {
      down('Enter')
      expect(src.nextSnapshot(6).frameNum).toBe(6)
    } finally {
      src.detach()
    }
  })
})
