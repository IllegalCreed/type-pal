// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { createBgmPlayer } from './bgm.js'
import {
  minimalMidi,
  restoreBrowserMidiFixture,
  riffBytes,
  spessa,
  stubAudioContext,
} from './browser-midi-fixture.js'

afterEach(restoreBrowserMidiFixture)

test('BGM disposal destroys the playing worklet before closing the browser context', async () => {
  stubAudioContext()
  const score = minimalMidi()
  const player = createBgmPlayer({
    readBytes: async () => score,
    readRoleBytes: async () => riffBytes(),
  })
  try {
    player.play('music.scene')
    await vi.waitFor(() =>
      expect(spessa.sequencers[0]?.loaded).toEqual([{ binary: score, fileName: 'music.scene' }]),
    )
    expect(spessa.worklets[0]?.destroyed).toBe(false)
    const disposing = player.dispose()
    expect(player.dispose()).toBe(disposing)
    await disposing
    expect(spessa.disposalEvents).toEqual(['destroy worklet', 'close context'])
  } finally {
    await player.dispose()
  }
})

test('BGM disposal releases a worklet still waiting for readiness and prevents late playback', async () => {
  stubAudioContext()
  let resolveReady: () => void = () => {}
  spessa.ready.pending = new Promise<void>((resolve) => {
    resolveReady = resolve
  })
  let workletWaiting = false
  spessa.ready.entered = () => {
    workletWaiting = true
  }
  const readScore = vi.fn(async () => minimalMidi())
  const player = createBgmPlayer({ readBytes: readScore, readRoleBytes: async () => riffBytes() })
  try {
    player.play('music.scene')
    await vi.waitFor(() => expect(workletWaiting).toBe(true))
    expect(spessa.worklets[0]?.destroyed).toBe(false)
    await player.dispose()
    expect(spessa.disposalEvents).toEqual(['destroy worklet', 'close context'])
    resolveReady()
    await vi.dynamicImportSettled()
    expect(spessa.worklets[0]?.controllerChanges).toEqual([])
    expect(spessa.sequencers).toHaveLength(0)
    expect(readScore).not.toHaveBeenCalled()
  } finally {
    resolveReady()
    await player.dispose()
  }
})
