/** Legacy OGG tests retired; retain the actual no-WebAudio MIDI boundary contract. */
import { describe, expect, it } from 'vitest'
import { createSpessaSynthBackend } from './audio-midi.js'

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
