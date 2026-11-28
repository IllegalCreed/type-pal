// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { midiSmf0, SINGLE_NOTE_MIDI } from '../__tests__/audio-fixtures.js'
import { installReactActEnvironment, waitForReact } from '../__tests__/react-io-wait.js'
import { claimEditorAudioPreview, stopEditorAudioPreview } from '../core/audio-preview-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { disposeMusicPreview } from '../core/music-picker-preview.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { bindMusicRoles, blankProjectBase, seedMusic } from './__tests__/audio-workbench-harness.js'
import { buttonByLabel } from './__tests__/glm-ui-wave-kit.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import { MusicPicker } from './MusicPicker.js'

const contexts: PendingMusicContext[] = []
class PendingMusicContext {
  state: AudioContextState = 'running'
  destination = {}
  disconnect = vi.fn()
  // Delay only the browser worklet module while real BGM orchestration runs.
  audioWorklet = { addModule: vi.fn(() => new Promise<void>(() => {})) }

  constructor() {
    contexts.push(this)
  }

  createGain() {
    return { gain: { value: 1 }, connect() {}, disconnect: this.disconnect }
  }

  async close() {
    this.state = 'closed'
  }
}
let host: HTMLDivElement
let root: Root
let restoreAct: () => void

beforeEach(() => {
  restoreAct = installReactActEnvironment()
  installBrowserHardwarePorts()
  vi.stubGlobal('AudioContext', PendingMusicContext)
  contexts.length = 0
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  try {
    await act(async () => {
      stopEditorAudioPreview()
      root.unmount()
    })
    await disposeMusicPreview()
  } finally {
    host.remove()
    vi.unstubAllGlobals()
    restoreAct()
  }
})

test('the same AssetId in a different project replaces the old preview owner', async () => {
  const asset = 'music.shared'
  const first = await blankProjectBase('music-old-project')
  const next = await blankProjectBase('music-new-project')
  await seedMusic(first, asset, '旧项目曲目', SINGLE_NOTE_MIDI)
  await seedMusic(
    next,
    asset,
    '新项目曲目',
    midiSmf0([{ tick: 0, length: 48, note: 48, velocity: 100 }]),
  )
  async function show(base: typeof first) {
    await bindMusicRoles(base, asset)
    const state = base.session.getState()
    assertProjectSaveValid(state)
    const reader = createEditorAssetReader(base.source, () => base.session.getState())
    await act(async () =>
      root.render(
        <MusicPicker
          catalog={state.assetCatalog}
          resolver={reader}
          value={asset}
          onChange={() => {}}
        />,
      ),
    )
    return reader
  }

  const previousOwner = { stop: vi.fn() }
  claimEditorAudioPreview(previousOwner)
  const firstReader = await show(first)
  await act(async () => buttonByLabel(host, `试听 ${asset}`).click())
  await waitForReact(() => expect(contexts[0]?.audioWorklet.addModule).toHaveBeenCalledOnce())
  expect(contexts[0]?.state).toBe('running')
  expect(previousOwner.stop).toHaveBeenCalledOnce()
  const nextReader = await show(next)
  await act(async () => buttonByLabel(host, `试听 ${asset}`).click())
  await waitForReact(() => {
    expect(contexts[0]?.state).toBe('closed')
    expect(contexts[0]?.disconnect).toHaveBeenCalledOnce()
    expect(contexts[1]?.audioWorklet.addModule).toHaveBeenCalledOnce()
  })
  expect(buttonByLabel(host, `停止试听 ${asset}`).getAttribute('aria-pressed')).toBe('true')
  // The old project's teardown can run after the next reader already claims the preview.
  await act(async () => disposeMusicPreview(firstReader))
  expect(contexts[1]?.state).toBe('running')
  const nextOwner = { stop: vi.fn() }
  await act(async () => claimEditorAudioPreview(nextOwner))
  expect(buttonByLabel(host, `试听 ${asset}`).getAttribute('aria-pressed')).toBe('false')
  await act(async () => disposeMusicPreview(nextReader))
  expect(nextOwner.stop).not.toHaveBeenCalled()
  expect(contexts[1]?.state).toBe('closed')
  expect(contexts[1]?.disconnect).toHaveBeenCalledOnce()
  expect(buttonByLabel(host, `试听 ${asset}`).getAttribute('aria-pressed')).toBe('false')
})
