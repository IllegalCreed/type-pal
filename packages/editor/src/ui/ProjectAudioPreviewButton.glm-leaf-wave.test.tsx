// @vitest-environment jsdom

import type { FileSource } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { stopEditorAudioPreview } from '../core/audio-preview-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { loadLegalUiProject } from './__tests__/glm-leaf-workflows/legal-session.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
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

// 真实 EditorAssetReader 端口（transport 已注入，reader 不参与 I/O）。
let legal: Awaited<ReturnType<typeof loadLegalUiProject>>
const reader = createEditorAssetReader(
  {
    readBytes: async (rel) => {
      throw new DOMException(rel, 'NotFoundError')
    },
    readText: async (rel) => {
      throw new DOMException(rel, 'NotFoundError')
    },
    readJson: async (rel) => {
      throw new DOMException(rel, 'NotFoundError')
    },
    urlFor: async (rel) => `blob:${rel}`,
  } satisfies FileSource,
  () => legal.state,
)

beforeAll(async () => {
  await stubNodeTestHost()
  const legalProject = await loadLegalUiProject('glm-leaf-project-audio')
  legal = legalProject
})

function previewButton(createTransport: () => ProjectAudioPreviewTransport) {
  return (
    <ProjectAudioPreviewButton
      asset="music.lab.001"
      label="主题曲"
      kind="music"
      cacheKey="music.lab.001"
      reader={reader}
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
