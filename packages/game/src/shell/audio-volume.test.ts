import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAudioVolumeController } from './audio-volume.js'

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

describe('audio-volume', () => {
  it('setVolume 钳制上下界与区间内值，同步目标、sink 和持久值', () => {
    const sink = vi.fn()
    const c = createAudioVolumeController({ applyVolume: sink })
    c.setVolume(1.5)
    expect(c.getVolume()).toBe(1)
    expect(localStorage.getItem('tp-master-volume')).toBe('1')
    c.setVolume(-1)
    expect(c.getVolume()).toBe(0)
    expect(localStorage.getItem('tp-master-volume')).toBe('0')
    c.setVolume(0.5)
    expect(c.getVolume()).toBe(0.5)
    expect(localStorage.getItem('tp-master-volume')).toBe('0.5')
    expect(sink.mock.calls).toEqual([[0.8], [1], [0], [0.5]])
  })

  it('静音只屏蔽输出，期间更新目标音量后取消静音恢复新值', () => {
    const sink = vi.fn()
    const c = createAudioVolumeController({ applyVolume: sink })
    c.setVolume(0.4)
    c.setMuted(true)
    expect(c.isMuted()).toBe(true)
    expect(localStorage.getItem('tp-muted')).toBe('1')
    expect(localStorage.getItem('tp-master-volume')).toBe('0.4')
    c.setVolume(0.9)
    expect(c.getVolume()).toBe(0.9)
    expect(localStorage.getItem('tp-master-volume')).toBe('0.9')
    c.setMuted(false)
    expect(c.isMuted()).toBe(false)
    expect(localStorage.getItem('tp-muted')).toBe('0')
    expect(sink.mock.calls).toEqual([[0.8], [0.4], [0], [0], [0.9]])
  })

  it('启动读回 localStorage(音量 + 静音)并即时应用', () => {
    localStorage.setItem('tp-master-volume', '0.3')
    localStorage.setItem('tp-muted', '1')
    const sink = vi.fn()
    const c = createAudioVolumeController({ applyVolume: sink })
    expect(c.getVolume()).toBe(0.3)
    expect(c.isMuted()).toBe(true)
    expect(sink.mock.calls).toEqual([[0]])
  })
})
