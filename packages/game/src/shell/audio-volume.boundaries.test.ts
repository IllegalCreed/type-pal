/**
 * 主测试拥有 clamp、静音期间改目标及恢复合同。本文件只核 NaN、stored 0、
 * default 0，以及多通道独立音量键/共享静音键的持久化与新实例恢复。
 * 共享存储键不自动同步存活实例；工具面板显式向三路广播 setMuted。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createAudioVolumeController } from './audio-volume.js'

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

describe('H03 createAudioVolumeController 显式 0 与键位', () => {
  it('NaN 音量不进入 sink 或 localStorage，按 0 处理', () => {
    const applied: number[] = []
    const controller = createAudioVolumeController({ applyVolume: (v) => applied.push(v) })
    controller.setVolume(Number.NaN)
    expect(controller.getVolume()).toBe(0)
    expect(applied).toEqual([0.8, 0])
    expect(localStorage.getItem('tp-master-volume')).toBe('0')
  })

  it("stored '0' 优先于非零 defaultVolume", () => {
    localStorage.setItem('tp-master-volume', '0')
    const applied: number[] = []
    const controller = createAudioVolumeController({
      applyVolume: (v) => applied.push(v),
      defaultVolume: 0.7,
    })
    expect(controller.getVolume()).toBe(0)
    expect(applied).toEqual([0])
  })

  it('缺存储时 defaultVolume 0 生效，未指定则使用 0.8', () => {
    const applied: number[] = []
    const zeroDefault = createAudioVolumeController({
      applyVolume: (v) => applied.push(v),
      defaultVolume: 0,
    })
    const fallback = createAudioVolumeController({ applyVolume: (v) => applied.push(v) })
    expect(zeroDefault.getVolume()).toBe(0)
    expect(fallback.getVolume()).toBe(0.8)
    expect(applied).toEqual([0, 0.8])
    expect(localStorage.getItem('tp-master-volume')).toBeNull()
  })

  it('三通道 keyVol 各自持久化，不覆盖其它通道', () => {
    const applied: Array<{ ch: string; v: number }> = []
    const mk = (ch: string, keyVol: string) =>
      createAudioVolumeController({ applyVolume: (v) => applied.push({ ch, v }), keyVol })
    const music = mk('music', 'tp-master-volume')
    const sfx = mk('sfx', 'tp-sfx-volume')
    const video = mk('video', 'tp-video-volume')
    music.setVolume(0.3)
    sfx.setVolume(0.5)
    expect(localStorage.getItem('tp-video-volume')).toBeNull()
    expect(video.getVolume()).toBe(0.8)
    video.setVolume(0.7)
    expect(localStorage.getItem('tp-master-volume')).toBe('0.3')
    expect(localStorage.getItem('tp-sfx-volume')).toBe('0.5')
    expect(localStorage.getItem('tp-video-volume')).toBe('0.7')
    expect([music.getVolume(), sfx.getVolume(), video.getVolume()]).toEqual([0.3, 0.5, 0.7])
    expect(applied).toEqual([
      { ch: 'music', v: 0.8 },
      { ch: 'sfx', v: 0.8 },
      { ch: 'video', v: 0.8 },
      { ch: 'music', v: 0.3 },
      { ch: 'sfx', v: 0.5 },
      { ch: 'video', v: 0.7 },
    ])
  })

  it('三通道共享自定义 keyMute，新实例恢复而存活实例不自动同步', () => {
    localStorage.setItem('tp-video-volume', '0.7')
    const applied: Array<{ ch: string; v: number }> = []
    const muteKey = 'test-shared-muted'
    const mk = (ch: string, keyVol: string) =>
      createAudioVolumeController({
        applyVolume: (v) => applied.push({ ch, v }),
        keyVol,
        keyMute: muteKey,
      })
    const music = mk('music', 'tp-master-volume')
    const sfx = mk('sfx', 'tp-sfx-volume')
    const video = mk('video', 'tp-video-volume')
    music.setMuted(true)
    expect(localStorage.getItem(muteKey)).toBe('1')
    expect(localStorage.getItem('tp-muted')).toBeNull()
    expect([music.isMuted(), sfx.isMuted(), video.isMuted()]).toEqual([true, false, false])
    const restoredVideo = mk('restored-video', 'tp-video-volume')
    expect(restoredVideo.getVolume()).toBe(0.7)
    expect(restoredVideo.isMuted()).toBe(true)
    expect(applied).toEqual([
      { ch: 'music', v: 0.8 },
      { ch: 'sfx', v: 0.8 },
      { ch: 'video', v: 0.7 },
      { ch: 'music', v: 0 },
      { ch: 'restored-video', v: 0 },
    ])
  })
})
