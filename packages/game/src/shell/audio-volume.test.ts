import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAudioVolumeController } from './audio-volume.js'

describe('audio-volume', () => {
  beforeEach(() => localStorage.clear())
  it('setVolume 钳制 0..1,调 applyVolume,写 localStorage', () => {
    const sink = vi.fn()
    const c = createAudioVolumeController({ applyVolume: sink })
    c.setVolume(1.5)
    expect(c.getVolume()).toBe(1)
    expect(sink).toHaveBeenLastCalledWith(1)
    c.setVolume(-1)
    expect(c.getVolume()).toBe(0)
    c.setVolume(0.5)
    expect(localStorage.getItem('tp-master-volume')).toBe('0.5')
  })
  it('静音:applyVolume 收 0,取消静音恢复音量值;持久 tp-muted', () => {
    const sink = vi.fn()
    const c = createAudioVolumeController({ applyVolume: sink })
    c.setVolume(0.8)
    c.setMuted(true)
    expect(c.isMuted()).toBe(true)
    expect(sink).toHaveBeenLastCalledWith(0)
    expect(localStorage.getItem('tp-muted')).toBe('1')
    c.setMuted(false)
    expect(sink).toHaveBeenLastCalledWith(0.8)
  })
  it('启动读回 localStorage(音量 + 静音)并即时应用', () => {
    localStorage.setItem('tp-master-volume', '0.3')
    localStorage.setItem('tp-muted', '1')
    const sink = vi.fn()
    const c = createAudioVolumeController({ applyVolume: sink })
    expect(c.getVolume()).toBe(0.3)
    expect(c.isMuted()).toBe(true)
    expect(sink).toHaveBeenLastCalledWith(0) // 静音 → 0
  })
})
