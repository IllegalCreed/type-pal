// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { stopEditorAudioPreview } from '../core/audio-preview-session.js'
import {
  ProjectAudioPreviewButton,
  type ProjectAudioPreviewTransport,
} from './ProjectAudioPreviewButton.js'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  stopEditorAudioPreview()
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

function transport(parts: {
  load?: ProjectAudioPreviewTransport['load']
  snapshot?: ProjectAudioPreviewTransport['snapshot']
}): ProjectAudioPreviewTransport {
  return {
    load: parts.load ?? vi.fn().mockResolvedValue(undefined),
    play: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    snapshot: parts.snapshot ?? vi.fn(() => ({ paused: false })),
    dispose: vi.fn(),
  }
}

function previewButton(createTransport: () => ProjectAudioPreviewTransport) {
  return (
    <ProjectAudioPreviewButton
      asset="music.lab.001"
      label="主题曲"
      kind="music"
      cacheKey="music.lab.001"
      reader={{} as never}
      createTransport={createTransport}
    />
  )
}

describe('ProjectAudioPreviewButton 三态剩余合同', () => {
  test('walks idle → loading → playing → stopped with visible button state each step', async () => {
    let resolveLoad: () => void = () => undefined
    const pending = new Promise<void>((resolve) => {
      resolveLoad = resolve
    })
    const current = transport({ load: vi.fn(() => pending) })
    await act(async () => root.render(previewButton(() => current)))
    const idle = host.querySelector<HTMLButtonElement>('[aria-label="试听 主题曲"]')!
    expect(idle.getAttribute('aria-pressed')).toBe('false')
    expect(idle.getAttribute('aria-busy')).toBeNull()

    await act(async () => idle.click())
    const loading = host.querySelector<HTMLButtonElement>('[aria-label="停止试听 主题曲"]')!
    expect(loading.getAttribute('aria-busy')).toBe('true')
    expect(loading.getAttribute('aria-pressed')).toBe('true')
    expect(current.load).toHaveBeenCalledWith('music.lab.001', 'music.lab.001')

    await act(async () => {
      resolveLoad()
      await Promise.resolve()
      await Promise.resolve()
    })
    const playing = host.querySelector<HTMLButtonElement>('[aria-label="停止试听 主题曲"]')!
    expect(playing.getAttribute('aria-busy')).toBeNull()
    expect(playing.getAttribute('aria-pressed')).toBe('true')
    expect(current.play).toHaveBeenCalledTimes(1)

    await act(async () => playing.click())
    expect(current.stop).toHaveBeenCalledTimes(2)
    expect(host.querySelector<HTMLButtonElement>('[aria-label="试听 主题曲"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="试听 主题曲"]')?.getAttribute('aria-pressed')).toBe(
      'false',
    )
  })

  test('replays from idle after the transport reports a paused snapshot', async () => {
    vi.useFakeTimers()
    let paused = false
    const current = transport({ snapshot: () => ({ paused }) })
    await act(async () => {
      vi.advanceTimersByTime(0)
      root.render(previewButton(() => current))
    })
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="试听 主题曲"]')!.click()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(host.querySelector('[aria-label="停止试听 主题曲"]')).not.toBeNull()

    await act(async () => {
      paused = true
      vi.advanceTimersByTime(250)
    })
    expect(host.querySelector('[aria-label="试听 主题曲"]')).not.toBeNull()

    paused = false
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="试听 主题曲"]')!.click()
      vi.advanceTimersByTime(50)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(current.load).toHaveBeenCalledTimes(2)
  })
})
