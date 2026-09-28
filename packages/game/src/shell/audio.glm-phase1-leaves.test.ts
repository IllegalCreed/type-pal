/**
 * TEST-GLM-PHASE1-LEAVES-3 L24（audio.ts / audio-midi.ts）— 去重表：
 *  - audio.test（URL/选曲/胜利曲/pendingSounds/BGM backend/enable/sfxForBattleEvent/dedup/
 *    OGG 释放）→ 不重复
 *  - audio-midi 无既有测试（targets existingTestPointers 空）。
 *  - 新差异：setOggVolumeScale 对新建与正在播元素即时生效（0.6·scale）、
 *    audio-midi setBgmVolume 在合成器就绪前只暂存不抛、无 AudioContext → no-op backend。
 * 可替 WebAudio/第三方合成器端口（FakeAudio / 无 AudioContext），不 mock 本模块；不证听感。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOggMusicBackend, setOggVolumeScale } from './audio.js'
import { createSpessaSynthBackend, setBgmVolume } from './audio-midi.js'

class FakeAudio {
  static created: FakeAudio[] = []
  src: string
  loop = false
  volume = 1
  paused = false
  loaded = false
  constructor(s: string) {
    this.src = s
    FakeAudio.created.push(this)
  }
  play(): Promise<void> {
    return Promise.resolve()
  }
  pause(): void {
    this.paused = true
  }
  load(): void {
    this.loaded = true
  }
  removeAttribute(name: string): void {
    if (name === 'src') this.src = ''
  }
}

beforeEach(() => {
  FakeAudio.created = []
  setOggVolumeScale(1) // 复位模块级 scale
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('L24 setOggVolumeScale 即时刷新', () => {
  it('先调 scale 再 play：新元素 volume = 0.6·scale；播放中改 scale：当前元素即时跟随', () => {
    vi.stubGlobal('Audio', FakeAudio)
    setOggVolumeScale(0.5)
    const backend = createOggMusicBackend('/extracted')
    backend.play(1, true)
    expect(FakeAudio.created[0]!.volume).toBeCloseTo(0.3) // 0.6 * 0.5
    setOggVolumeScale(1)
    expect(FakeAudio.created[0]!.volume).toBeCloseTo(0.6) // 当前元素被即时刷新
  })
})

describe('L24 audio-midi 无 Web Audio 端口', () => {
  it('setBgmVolume 在合成器未就绪（masterGain 未建）时只暂存不抛', () => {
    expect(() => setBgmVolume(0.4)).not.toThrow()
  })

  it('无 AudioContext（SSR/测试）→ no-op backend，play/stop 安全空实现', () => {
    const backend = createSpessaSynthBackend({
      baseUrl: '/extracted',
      workletUrl: '/x.js',
      soundfontUrl: '/soundfont.sf3',
    })
    expect(() => {
      backend.play(26, true)
      backend.stop()
    }).not.toThrow()
  })
})
