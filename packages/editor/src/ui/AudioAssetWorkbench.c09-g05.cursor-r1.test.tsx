// @vitest-environment jsdom
/**
 * C09-G05：AudioAssetWorkbench 亚秒/搜索/播放器 DOM（排重 0:534 端点、A→B→A 迟到链）。
 */
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  mockSoundStrategy,
  mountAudioWorkbench,
} from '../__tests__/cursor-asset-r1/c09-audio-harness.js'
import { stubNodeTestHost, typeDraft } from '../__tests__/cursor-asset-r1/kit.js'
import type { AudioTimeline, AudioWorkbenchTransport } from './AudioAssetWorkbench.js'

function activity(duration: number): AudioTimeline {
  return { kind: 'note-activity', duration, buckets: [1], noteCount: 1 }
}

function transportOf(duration: number, current = 0): AudioWorkbenchTransport {
  return {
    load: vi.fn(async () => activity(duration)),
    play: vi.fn(async () => {}),
    pause: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    snapshot: vi.fn(() => ({ currentTime: current, duration, paused: true })),
    dispose: vi.fn(),
  }
}

let mounted: Awaited<ReturnType<typeof mountAudioWorkbench>> | undefined

beforeEach(async () => {
  await stubNodeTestHost()
})

afterEach(async () => {
  await mounted?.cleanup()
  mounted = undefined
  vi.restoreAllMocks()
})

describe('C09-G05 AudioAssetWorkbench 时间轴与目录', () => {
  test('C09-G05-01 0.312s 显示 0:00.31 亚秒端点', async () => {
    const duration = 0.312
    mounted = await mountAudioWorkbench(
      mockSoundStrategy(() => transportOf(duration, duration)),
      { focusObjectId: 'sound.hit' },
    )
    await vi.waitFor(() =>
      expect(mounted!.host.querySelector('.audio-player__state')?.textContent).toBe('就绪'),
    )
    expect(mounted!.host.querySelector('.audio-player__time')?.textContent).toContain(
      '0:00.31 / 0:00.31',
    )
  })

  test('C09-G05-02 整秒长音不显示百分秒', async () => {
    mounted = await mountAudioWorkbench(
      mockSoundStrategy(() => transportOf(2, 0)),
      {
        focusObjectId: 'sound.hit',
      },
    )
    await vi.waitFor(() =>
      expect(mounted!.host.querySelector('.audio-player__state')?.textContent).toBe('就绪'),
    )
    expect(mounted!.host.querySelector('.audio-player__time')?.textContent).toBe('0:00 / 0:02')
  })

  test('C09-G05-03 搜索过滤目录行', async () => {
    mounted = await mountAudioWorkbench(
      mockSoundStrategy(() => transportOf(1)),
      {
        focusObjectId: 'sound.hit',
      },
    )
    await vi.waitFor(() => expect(mounted!.host.querySelectorAll('.ds-catalog-row').length).toBe(2))
    const search = mounted!.host.querySelector<HTMLInputElement>('input[aria-label="搜索音效"]')!
    await typeDraft(search, '治疗')
    expect(mounted!.host.querySelectorAll('.ds-virtual-list__item').length).toBe(1)
  })

  test('C09-G05-04 工作区 aria-label 含策略标题', async () => {
    mounted = await mountAudioWorkbench(mockSoundStrategy(() => transportOf(1)))
    expect(mounted!.host.querySelector('.audio-workspace')?.getAttribute('aria-label')).toBe(
      '音效工作区',
    )
  })

  test('C09-G05-05 目录行无 leading glyph', async () => {
    mounted = await mountAudioWorkbench(mockSoundStrategy(() => transportOf(1)))
    await vi.waitFor(() => expect(mounted!.host.querySelectorAll('.ds-catalog-row').length).toBe(2))
    expect(
      [...mounted!.host.querySelectorAll<HTMLElement>('.ds-catalog-row')].every(
        (row) => row.dataset.leading === 'none',
      ),
    ).toBe(true)
  })

  test('C09-G05-06 播放后暂停调用 transport.pause', async () => {
    const transport = transportOf(1)
    mounted = await mountAudioWorkbench(mockSoundStrategy(() => transport))
    await vi.waitFor(() =>
      expect(mounted!.host.querySelector('.audio-player__state')?.textContent).toBe('就绪'),
    )
    await act(async () => {
      mounted!.host.querySelector<HTMLButtonElement>('[aria-label="播放"]')!.click()
      await Promise.resolve()
    })
    await act(async () => {
      mounted!.host.querySelector<HTMLButtonElement>('[aria-label="暂停"]')!.click()
    })
    expect(transport.pause).toHaveBeenCalled()
  })

  test('C09-G05-07 无匹配搜索显示「没有匹配的资源」', async () => {
    mounted = await mountAudioWorkbench(mockSoundStrategy(() => transportOf(1)))
    const search = mounted!.host.querySelector<HTMLInputElement>('input[aria-label="搜索音效"]')!
    await typeDraft(search, 'zzzz-not-found')
    expect(mounted!.host.textContent).toContain('没有匹配的资源')
  })

  test('C09-G05-08 切换目录行更新 hero 标题', async () => {
    mounted = await mountAudioWorkbench(
      mockSoundStrategy(() => transportOf(1)),
      {
        focusObjectId: 'sound.hit',
      },
    )
    await vi.waitFor(() =>
      expect(mounted!.host.querySelector('.ds-object-hero__title')?.textContent).toBe('命中音效'),
    )
    const heal = [...mounted!.host.querySelectorAll<HTMLButtonElement>('.ds-catalog-row')].find(
      (row) => row.querySelector('.ds-catalog-row__title')?.textContent === '治疗音效',
    )!
    await act(async () => heal.click())
    expect(mounted!.host.querySelector('.ds-object-hero__title')?.textContent).toBe('治疗音效')
  })

  test('C09-G05-09 时间轴滑杆 max 为 1', async () => {
    mounted = await mountAudioWorkbench(mockSoundStrategy(() => transportOf(0.312, 0.312)))
    await vi.waitFor(() =>
      expect(mounted!.host.querySelector('.audio-player__state')?.textContent).toBe('就绪'),
    )
    const range = mounted!.host.querySelector<HTMLInputElement>('.audio-timeline__range')!
    expect(range.max).toBe('1')
    expect(range.valueAsNumber).toBe(1)
  })

  test('C09-G05-10 读取中状态文案', async () => {
    let resolve!: (value: AudioTimeline) => void
    const pending = new Promise<AudioTimeline>((done) => {
      resolve = done
    })
    const transport: AudioWorkbenchTransport = {
      ...transportOf(1),
      load: vi.fn(() => pending),
    }
    mounted = await mountAudioWorkbench(mockSoundStrategy(() => transport))
    expect(mounted!.host.querySelector('.audio-player__state')?.textContent).toBe('正在读取…')
    await act(async () => resolve(activity(1)))
    await vi.waitFor(() =>
      expect(mounted!.host.querySelector('.audio-player__state')?.textContent).toBe('就绪'),
    )
  })
})
