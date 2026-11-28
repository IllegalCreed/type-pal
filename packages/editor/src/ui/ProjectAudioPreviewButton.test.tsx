// @vitest-environment jsdom

import { act, StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { SINGLE_NOTE_MIDI } from '../__tests__/audio-fixtures.js'
import { installReactActEnvironment } from '../__tests__/react-io-wait.js'
import { claimEditorAudioPreview, stopEditorAudioPreview } from '../core/audio-preview-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { blankProjectBase, seedMusic } from './__tests__/audio-workbench-harness.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import {
  ProjectAudioPreviewButton,
  type ProjectAudioPreviewTransport,
} from './ProjectAudioPreviewButton.js'

const ASSET = 'music.theme'
const CACHE_KEY = '04b065465eb567e3b39dc6e745e31dd5d900998be9d8b23d875d6ec6ff0b0263'
let root: Root
let host: HTMLDivElement
let reader: EditorAssetReader
let restoreAct: () => void

function transport(snapshot = () => ({ paused: false })) {
  return {
    load: vi.fn<ProjectAudioPreviewTransport['load']>().mockResolvedValue(undefined),
    play: vi.fn<ProjectAudioPreviewTransport['play']>().mockResolvedValue(undefined),
    stop: vi.fn(),
    snapshot: vi.fn(snapshot),
    dispose: vi.fn(),
  } satisfies ProjectAudioPreviewTransport
}

beforeEach(async () => {
  restoreAct = installReactActEnvironment()
  installBrowserHardwarePorts()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const base = await blankProjectBase('project-audio-button')
  await seedMusic(base, ASSET, '主题曲', SINGLE_NOTE_MIDI)
  reader = createEditorAssetReader(base.source, () => base.session.getState())
})

afterEach(async () => {
  try {
    await act(async () => {
      stopEditorAudioPreview()
      root.unmount()
    })
  } finally {
    host.remove()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    restoreAct()
  }
})

function view(current: ProjectAudioPreviewTransport) {
  return (
    <ProjectAudioPreviewButton
      asset={ASSET}
      label="主题曲"
      kind="music"
      cacheKey={CACHE_KEY}
      reader={reader}
      createTransport={() => current}
    />
  )
}

function previewButton(): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>('.project-audio-preview button')
  if (!button) throw new Error('Project audio preview button is missing')
  return button
}

describe('Project audio preview button', () => {
  test('StrictMode replays the effect without disposing the current transport', async () => {
    const current = transport()
    await act(async () => root.render(<StrictMode>{view(current)}</StrictMode>))
    expect(current.dispose).not.toHaveBeenCalled()
    await act(async () => previewButton().click())
    expect(current.load).toHaveBeenCalledWith(ASSET, CACHE_KEY)
    expect(current.play).toHaveBeenCalledOnce()
    expect(previewButton().getAttribute('aria-pressed')).toBe('true')
  })

  test('displays load failure and releases ownership without starting playback', async () => {
    const current = transport()
    current.load.mockRejectedValueOnce(new Error('资源读取失败'))
    await act(async () => root.render(view(current)))
    await act(async () => previewButton().click())
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('资源读取失败')
    expect(previewButton().getAttribute('aria-pressed')).toBe('false')
    expect(current.play).not.toHaveBeenCalled()

    const stops = current.stop.mock.calls.length
    await act(async () => claimEditorAudioPreview({ stop: vi.fn() }))
    expect(current.stop).toHaveBeenCalledTimes(stops)
  })

  test('shows pending, playing and stopped states in order', async () => {
    let resolveLoad!: (value: undefined) => void
    const load = new Promise<undefined>((resolve) => {
      resolveLoad = resolve
    })
    const current = transport()
    current.load.mockReturnValueOnce(load)
    await act(async () => root.render(view(current)))
    expect(previewButton().getAttribute('aria-pressed')).toBe('false')

    await act(async () => previewButton().click())
    expect(previewButton().getAttribute('aria-busy')).toBe('true')
    expect(previewButton().getAttribute('aria-pressed')).toBe('true')
    expect(current.play).not.toHaveBeenCalled()

    await act(async () => resolveLoad(undefined))
    expect(previewButton().getAttribute('aria-busy')).toBeNull()
    expect(previewButton().getAttribute('aria-pressed')).toBe('true')
    expect(current.play).toHaveBeenCalledOnce()

    await act(async () => previewButton().click())
    expect(previewButton().getAttribute('aria-pressed')).toBe('false')
  })

  test('natural completion releases playback ownership and allows replay', async () => {
    vi.useFakeTimers()
    let paused = false
    const current = transport(() => ({ paused }))
    await act(async () => root.render(view(current)))
    await act(async () => previewButton().click())
    expect(previewButton().getAttribute('aria-pressed')).toBe('true')

    paused = true
    await act(async () => vi.advanceTimersByTime(100))
    expect(previewButton().getAttribute('aria-pressed')).toBe('false')

    const stops = current.stop.mock.calls.length
    const foreign = { stop: vi.fn() }
    await act(async () => claimEditorAudioPreview(foreign))
    expect(current.stop).toHaveBeenCalledTimes(stops)
    paused = false
    await act(async () => previewButton().click())
    expect(foreign.stop).toHaveBeenCalledOnce()
    expect(current.play).toHaveBeenCalledTimes(2)
    expect(previewButton().getAttribute('aria-pressed')).toBe('true')
  })
})
