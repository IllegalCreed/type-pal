// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import {
  catalogControlsAssetCatalog,
  catalogControlsEditorState,
  catalogControlsReader,
} from './catalog-controls-test-utils.js'
import {
  AudioAssetWorkbench,
  type AudioAssetWorkbenchStrategy,
  type AudioTimeline,
  type AudioWorkbenchTransport,
} from './AudioAssetWorkbench.js'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (cause: unknown) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

function activity(duration: number, value: number): AudioTimeline {
  return {
    kind: 'note-activity',
    duration,
    buckets: [value],
    noteCount: 1,
  }
}

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('AudioAssetWorkbench async selection lifecycle', () => {
  test('recovers when A→B→A reuses an inflight A that is then canceled', async () => {
    const requests: Array<{
      asset: string
      pending: ReturnType<typeof deferred<AudioTimeline>>
    }> = []
    const transport: AudioWorkbenchTransport = {
      load: vi.fn(async (asset) => {
        const pending = deferred<AudioTimeline>()
        requests.push({ asset, pending })
        return pending.promise
      }),
      play: vi.fn(async () => {}),
      pause: vi.fn(),
      stop: vi.fn(),
      seek: vi.fn(),
      snapshot: vi.fn(() => ({ currentTime: 0, duration: 0, paused: true })),
      dispose: vi.fn(),
    }
    const strategy: AudioAssetWorkbenchStrategy = {
      kind: 'music',
      title: '音乐',
      unit: '首',
      formatLabel: 'MIDI',
      importLabel: '导入 MIDI',
      accept: '.mid,audio/midi',
      emptyLabel: '没有音乐。',
      prepareImport: vi.fn(),
      allocateId: () => 'music.authored.test',
      createTransport: () => transport,
      describeReference: (reference) => ({ title: reference.site, kind: '音乐引用' }),
    }

    await act(async () => {
      root.render(
        <AudioAssetWorkbench
          catalog={catalogControlsAssetCatalog}
          reader={catalogControlsReader}
          session={new EditSession(catalogControlsEditorState())}
          strategy={strategy}
          focusObjectId="music.opening"
        />,
      )
    })
    const workspace = host.querySelector('.audio-workspace.ds-object-workspace')!
    expect(workspace.getAttribute('aria-label')).toBe('音乐工作区')
    expect(workspace.querySelectorAll(':scope > .ds-object-hero')).toHaveLength(1)
    expect(
      workspace.querySelectorAll(
        ':scope > .audio-workspace__scroll.ds-object-workspace__content',
      ),
    ).toHaveLength(1)
    await vi.waitFor(() => expect(requests).toHaveLength(1))
    expect(requests[0]?.asset).toBe('music.opening')

    const row = (title: string): HTMLButtonElement => {
      const match = [...host.querySelectorAll<HTMLButtonElement>('.ds-catalog-row')].find(
        (candidate) => candidate.querySelector('.ds-catalog-row__title')?.textContent === title,
      )
      if (!match) throw new Error(`找不到目录行：${title}`)
      return match
    }

    await act(async () => row('终章音乐').click())
    await vi.waitFor(() => expect(requests).toHaveLength(2))
    expect(requests[1]?.asset).toBe('music.ending')

    await act(async () => row('开场音乐').click())
    expect(requests).toHaveLength(2)

    await act(async () => requests[0]!.pending.reject(new DOMException('选择已变化', 'AbortError')))
    await vi.waitFor(() => expect(requests).toHaveLength(3))
    expect(requests[2]?.asset).toBe('music.opening')

    await act(async () => requests[2]!.pending.resolve(activity(9, 1)))
    await vi.waitFor(() =>
      expect(host.querySelector('.audio-player__state')?.textContent).toBe('就绪'),
    )
    expect(host.querySelector('.audio-player__time')?.textContent).toContain('0:00 / 0:09')

    await act(async () => requests[1]!.pending.resolve(activity(4, 0.25)))
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('开场音乐')
    expect(host.querySelector('.audio-player__time')?.textContent).toContain('0:00 / 0:09')
  })
})

describe('AudioAssetWorkbench timeline completion', () => {
  test('renders a fractional short sound at the exact visual and slider endpoint', async () => {
    const duration = 0.534
    const transport: AudioWorkbenchTransport = {
      load: vi.fn(async () => activity(duration, 1)),
      play: vi.fn(async () => {}),
      pause: vi.fn(),
      stop: vi.fn(),
      seek: vi.fn(),
      snapshot: vi.fn(() => ({ currentTime: duration, duration, paused: true })),
      dispose: vi.fn(),
    }
    const strategy: AudioAssetWorkbenchStrategy = {
      kind: 'sound',
      title: '音效',
      unit: '项',
      formatLabel: 'WAV',
      importLabel: '导入 WAV',
      accept: '.wav,audio/wav',
      emptyLabel: '没有音效。',
      prepareImport: vi.fn(),
      allocateId: () => 'sound.authored.test',
      createTransport: () => transport,
      describeReference: (reference) => ({ title: reference.site, kind: '音效引用' }),
    }

    await act(async () => {
      root.render(
        <AudioAssetWorkbench
          catalog={catalogControlsAssetCatalog}
          reader={catalogControlsReader}
          session={new EditSession(catalogControlsEditorState())}
          strategy={strategy}
          focusObjectId="sound.hit"
        />,
      )
    })
    await vi.waitFor(() =>
      expect(host.querySelector('.audio-player__state')?.textContent).toBe('就绪'),
    )

    const range = host.querySelector<HTMLInputElement>('.audio-timeline__range')!
    expect(range.valueAsNumber).toBe(1)
    expect(range.max).toBe('1')
    expect(host.querySelector('.audio-player__time')?.textContent).toContain(
      '0:00.53 / 0:00.53',
    )
    expect(host.querySelector('.audio-timeline__progress')?.getAttribute('x1')).toBe('160')
  })
})
