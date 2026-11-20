import { expect, test } from 'vitest'
import type { AudioAssetReader } from './bgm.js'
import { createBrowserMidiPreviewRuntime } from './midi-preview.js'

test('without a browser window the MIDI preview runtime is unavailable', () => {
  const reader: AudioAssetReader = {
    async readBytes() {
      throw new Error('missing browser runtime must not read assets')
    },
    async readRoleBytes() {
      throw new Error('missing browser runtime must not read the soundfont')
    },
  }
  expect(typeof window).toBe('undefined')
  expect(createBrowserMidiPreviewRuntime(reader)).toBeUndefined()
})
