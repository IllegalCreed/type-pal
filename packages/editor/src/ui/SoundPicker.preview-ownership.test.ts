// @vitest-environment jsdom

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { encodeWavPcm16 } from '../__tests__/audio-fixtures.js'
import { installAudioContextPort } from '../__tests__/audio-ports.js'
import { claimEditorAudioPreview, stopEditorAudioPreview } from '../core/audio-preview-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import {
  disposeSoundPreview,
  prepareSoundPreview,
  previewSound,
} from '../core/sound-picker-preview.js'
import { blankProjectBase, seedSound } from './__tests__/audio-workbench-harness.js'
import { deferred } from './__tests__/glm-ui-wave-kit.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'

beforeEach(installBrowserHardwarePorts)
afterEach(async () => {
  try {
    stopEditorAudioPreview()
    await disposeSoundPreview()
  } finally {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  }
})

async function soundProject(name: string, asset: string, sample: number) {
  const base = await blankProjectBase(name)
  await seedSound(base, asset, '测试音效', encodeWavPcm16([sample, -sample]))
  assertProjectSaveValid(base.session.getState())
  return createEditorAssetReader(base.source, () => base.session.getState())
}

test('a preparation waiting for disposal never decodes a different project’s WAV', async () => {
  const prior = await soundProject('first-sound-project', 'sound.first', 0.1)
  const pending = await soundProject('second-sound-project', 'sound.shared', 0.25)
  const latest = await soundProject('third-sound-project', 'sound.shared', 0.75)
  const hold = deferred<void>()
  const audio = installAudioContextPort({
    async beforeClose(context) {
      if (context === audio.contexts[0]) await hold.promise
    },
  })

  await prepareSoundPreview(prior, 'sound.first')
  const old = prepareSoundPreview(pending, 'sound.shared')
  const outcome = old.then(
    () => 'prepared',
    (cause: unknown) => cause,
  )
  try {
    expect(audio.contexts[0]?.closeCalls).toBe(1)
    const current = await prepareSoundPreview(latest, 'sound.shared')
    expect(current.play('sound.shared')).toBe(true)
  } finally {
    hold.resolve()
  }

  expect(await outcome).toMatchObject({ name: 'AbortError' })
  expect(audio.contexts[1]?.state).toBe('closed')
  expect(audio.contexts[2]?.decodeCalls).toBe(1)
  expect(audio.contexts[2]?.sources.map((source) => source.starts)).toEqual([[0]])
})

test('the active preview stops the previous owner and cannot be replaced by a late decode', async () => {
  const audio = installAudioContextPort()
  const prior = await soundProject('pending-sound', 'sound.first', 0.25)
  const next = await soundProject('active-sound', 'sound.next', 0.75)
  const previousOwner = { stop: vi.fn() }
  claimEditorAudioPreview(previousOwner)
  const hold = deferred<ArrayBuffer>()
  const read = vi.spyOn(prior, 'readBytes').mockReturnValueOnce(hold.promise)
  const first = previewSound(prior, 'sound.first')
  try {
    await vi.waitFor(() => expect(read).toHaveBeenCalledWith('sound.first', 'sound'))
    expect(previousOwner.stop).toHaveBeenCalledOnce()
    await previewSound(next, 'sound.next')
    expect(audio.contexts[0]?.state).toBe('closed')
    expect(audio.contexts[1]?.sources.map((source) => source.starts)).toEqual([[0]])
  } finally {
    hold.resolve(Uint8Array.from(encodeWavPcm16([0.25, -0.25])).buffer)
    await first
  }
  expect(audio.contexts[0]?.sources).toEqual([])
  expect(audio.contexts[1]?.state).toBe('running')
  const nextOwner = { stop: vi.fn() }
  claimEditorAudioPreview(nextOwner)
  await vi.waitFor(() => expect(audio.contexts[1]?.state).toBe('closed'))
  expect(audio.contexts[1]?.sources[0]?.stopCalls).toBe(1)
  expect(nextOwner.stop).not.toHaveBeenCalled()
})
