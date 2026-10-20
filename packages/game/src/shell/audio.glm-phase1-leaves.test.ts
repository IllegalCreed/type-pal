/**
 * TEST-GLM-PHASE1-LEAVES-3 L24（audio.ts / audio-midi.ts）— 去重表：
 *  - audio.test（URL/选曲/胜利曲/pendingSounds/BGM backend/enable/sfxForBattleEvent/dedup/
 *    OGG 释放）→ 不重复
 *  - 新差异：setOggVolumeScale 对新建与正在播元素即时生效（0.6·scale）、
 *    audio-midi 无 AudioContext → no-op backend（实例音量/生命周期见audio-midi.test）。
 * 可替 WebAudio/第三方合成器端口（FakeAudio / 无 AudioContext），不 mock 本模块；不证听感。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAudioElementFixture } from './__tests__/audio-element-fixture.js'
import { createOggMusicBackend, setOggVolumeScale } from './audio.js'
import { createSpessaSynthBackend } from './audio-midi.js'

let fixture: ReturnType<typeof createAudioElementFixture>
let backend: ReturnType<typeof createOggMusicBackend> | undefined

beforeEach(() => {
  fixture = createAudioElementFixture()
  setOggVolumeScale(1) // 复位模块级 scale
})

afterEach(() => {
  backend?.stop()
  backend = undefined
  setOggVolumeScale(1)
  vi.unstubAllGlobals()
})

describe('L24 setOggVolumeScale 即时刷新', () => {
  it('先调 scale 再 play：新元素 volume = 0.6·scale；播放中改 scale：当前元素即时跟随', () => {
    vi.stubGlobal('Audio', fixture.Audio)
    setOggVolumeScale(0.5)
    backend = createOggMusicBackend('/extracted')
    backend.play(1, true)
    expect(fixture.created[0]!.volume).toBeCloseTo(0.3) // 0.6 * 0.5
    setOggVolumeScale(1)
    expect(fixture.created[0]!.volume).toBeCloseTo(0.6) // 当前元素被即时刷新
  })
})

describe('L24 audio-midi 无 Web Audio 端口', () => {
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
