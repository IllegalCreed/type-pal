/**
 * TEST-GAME-HOST-BOUNDARIES-1 H03：audio-volume 显式 0 与键位（shell/audio-volume.ts）。
 * 既有 audio-volume.test 已覆盖 clamp/mute/storage 主干——不重复。本文件：stored '0' 不落
 * default、defaultVolume 0、三通道 keyVol 独立与共享 keyMute 精确 IO、静音中修改目标仍
 * apply 0 且 unmute 恢复新值。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { createAudioVolumeController } from './audio-volume.js'

afterEach(() => {
  localStorage.clear()
})

describe('H03 createAudioVolumeController 显式 0 与键位', () => {
  it("stored '0' 不落 default（|| 0 与缺省可区分）；defaultVolume 0 生效", () => {
    localStorage.setItem('tp-master-volume', '0')
    const applied: number[] = []
    const controller = createAudioVolumeController({ applyVolume: (v) => applied.push(v) })
    expect(controller.getVolume()).toBe(0) // 真存的 0
    expect(applied).toEqual([0])
    localStorage.clear()
    const zeroDefault = createAudioVolumeController({
      applyVolume: () => undefined,
      defaultVolume: 0,
    })
    expect(zeroDefault.getVolume()).toBe(0)
    const fallback = createAudioVolumeController({ applyVolume: () => undefined })
    expect(fallback.getVolume()).toBe(0.8) // 无存储 → 默认
  })
  it('三通道 keyVol 独立、keyMute 共享：精确 IO；静音中改目标仍 apply 0，unmute 恢复新值', () => {
    const applied: Array<{ ch: string; v: number }> = []
    const mk = (ch: string, keyVol: string) =>
      createAudioVolumeController({
        applyVolume: (v) => applied.push({ ch, v }),
        keyVol,
        keyMute: 'tp-muted', // 三通道共享
      })
    const music = mk('music', 'tp-master-volume')
    const sfx = mk('sfx', 'tp-sfx-volume')
    const video = mk('video', 'tp-video-volume')
    expect(applied.map((entry) => entry.v)).toEqual([0.8, 0.8, 0.8]) // 各自启动 apply
    // video 通道参与启动计数；其键独立断言见下（null = 未写）

    music.setVolume(0.3)
    sfx.setVolume(0.5)
    expect(localStorage.getItem('tp-master-volume')).toBe('0.3')
    expect(localStorage.getItem('tp-sfx-volume')).toBe('0.5') // 键独立
    expect(localStorage.getItem('tp-video-volume')).toBeNull()
    expect(video.getVolume()).toBe(0.8) // 第三通道读回默认（实例独立）

    music.setMuted(true)
    expect(localStorage.getItem('tp-muted')).toBe('1') // 共享静音键
    // 静音中修改目标：music 仍 apply 0；其它通道不受影响（无跨 controller 自动同步）
    applied.length = 0
    music.setVolume(0.9)
    expect(applied).toEqual([{ ch: 'music', v: 0 }])
    expect(music.getVolume()).toBe(0.9) // 目标保真
    music.setMuted(false)
    expect(applied.at(-1)).toEqual({ ch: 'music', v: 0.9 }) // unmute 恢复新值
    sfx.setMuted(true) // sfx 自身静音仍读共享键 → 1
    expect(localStorage.getItem('tp-muted')).toBe('1')
  })
})
