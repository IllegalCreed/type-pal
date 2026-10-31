/** The unavailable-WebAudio branch is independent of the active synthesizer IO fixture. */
import { describe, expect, it, vi } from 'vitest'
import { createSpessaSynthBackend } from './audio-midi.js'

describe('MIDI without a WebAudio port', () => {
  it('keeps play/stop safe and starts no IO when both context constructors are absent', () => {
    const fetch = vi.fn(async () => new Response())
    vi.stubGlobal('window', {})
    vi.stubGlobal('fetch', fetch)
    try {
      const backend = createSpessaSynthBackend({
        baseUrl: '/extracted',
        workletUrl: '/x.js',
        soundfontUrl: '/soundfont.sf3',
      })
      expect(() => {
        backend.play(26, true)
        backend.stop()
      }).not.toThrow()
      expect(fetch).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
