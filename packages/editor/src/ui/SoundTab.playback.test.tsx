// @vitest-environment jsdom
import { act } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { encodeWavPcm16 } from '../__tests__/audio-fixtures.js'
import {
  type AudioContextPort,
  installAudioContextPort,
  installManualAnimationFrames,
  type ManualAnimationFrames,
} from '../__tests__/audio-ports.js'
import { waitForReact } from '../__tests__/react-io-wait.js'
import { claimEditorAudioPreview } from '../core/audio-preview-session.js'
import {
  blankProjectBase,
  installAudioWorkbenchTestHost,
  seedSound,
} from './__tests__/audio-workbench-harness.js'
import { clickButton } from './__tests__/glm-ui-wave-kit.js'

/** 交替 ±0.5 的 0.5s 采样（8kHz 单声道）：每个峰值 bucket 恒为 max 0.5 / min -0.5。 */
const HIT_SAMPLES = Array.from({ length: 4000 }, (_, index) => (index % 2 === 0 ? 0.5 : -0.5))
/** 恒定 0.25 的 0.25s 采样：峰值 bucket 恒为 max=min=0.25。 */
const HEAL_SAMPLES = Array.from({ length: 2000 }, () => 0.25)
const {
  host,
  renderTab,
  unmountHost,
  selectRow,
  catalogRow,
  waitPlayerState,
  peakLines,
  playerTime,
} = installAudioWorkbenchTestHost()

describe('音效试听生命周期', () => {
  let audio: AudioContextPort
  let frames: ManualAnimationFrames

  beforeEach(() => {
    audio = installAudioContextPort()
    frames = installManualAnimationFrames()
  })

  async function pumpFrames(): Promise<void> {
    await act(async () => frames.pump())
  }

  test('播放/时钟/seek/暂停/自然结束的协议后果与单一预览所有权转移', async () => {
    const base = await blankProjectBase('sound-playback')
    await seedSound(base, 'sound.hit', '命中音效', encodeWavPcm16(HIT_SAMPLES))
    const mounted = await renderTab('sound', base, 'sound.hit')
    const historyAfterSeed = mounted.session.getHistoryVersion()
    await waitPlayerState('就绪')
    const context = audio.contexts[0]!
    expect(context.decodeCalls).toBe(1)

    // 播放抢占既有 owner（真实 audio-preview-session），suspended→resume 后启动源。
    const foreignA = { stop: vi.fn() }
    claimEditorAudioPreview(foreignA)
    await clickButton(host, '播放')
    expect(foreignA.stop).toHaveBeenCalledOnce()
    await waitPlayerState('正在播放')
    expect(context.resumeCalls).toBe(1)
    expect(context.sources).toHaveLength(1)
    expect(context.sources[0]!.starts).toEqual([0])

    // 硬件时钟前进（二进制可精确表示的 0.25 步进）+ rAF 节拍 → DOM 时钟同步。
    context.currentTime = 0.25
    await pumpFrames()
    expect(playerTime()).toContain('0:00.25 / 0:00.50')

    // seek：旧源 stop+disconnect，新源从 0.375 偏移启动，时钟立即反映。
    // 注意必须驱动与当前进度（0.5）不同的值，React 值跟踪器才派发 onChange。
    const range = host.querySelector<HTMLInputElement>('input[aria-label="音效试听进度"]')!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      setter.call(range, '0.75')
      range.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(context.sources[0]!.stopCalls).toBe(1)
    expect(context.sources[0]!.disconnectCalls).toBe(1)
    expect(context.sources[1]!.starts).toEqual([0.375])
    expect(playerTime()).toContain('0:00.38 / 0:00.50')

    // 所有权被外部抢走：组件 transport 真实 stop（源停止、时钟归零、回到就绪）。
    const foreignB = { stop: vi.fn() }
    await act(async () => {
      claimEditorAudioPreview(foreignB)
    })
    expect(context.sources[1]!.stopCalls).toBe(1)
    expect(context.sources[1]!.disconnectCalls).toBe(1)
    await waitPlayerState('就绪')
    expect(playerTime()).toContain('0:00.00 / 0:00.50')

    // 再播放反向抢占 foreignB。
    await clickButton(host, '播放')
    expect(foreignB.stop).toHaveBeenCalledOnce()
    await waitPlayerState('正在播放')
    expect(context.sources[2]!.starts).toEqual([0])

    // 暂停冻结位置并释放所有权；之后外部 claim 不再触碰组件 transport。
    context.currentTime = 0.5
    await pumpFrames()
    expect(playerTime()).toContain('0:00.25 / 0:00.50')
    await clickButton(host, '暂停')
    expect(context.sources[2]!.stopCalls).toBe(1)
    expect(context.sources[2]!.disconnectCalls).toBe(1)
    await waitPlayerState('就绪')
    expect(playerTime()).toContain('0:00.25 / 0:00.50')
    const foreignC = { stop: vi.fn() }
    await act(async () => {
      claimEditorAudioPreview(foreignC)
    })
    expect(context.sources).toHaveLength(3)

    // 从暂停位置 0.25 续播；state 已 running 不再 resume。
    await clickButton(host, '播放')
    expect(foreignC.stop).toHaveBeenCalledOnce()
    expect(context.resumeCalls).toBe(1)
    await waitPlayerState('正在播放')
    expect(context.sources[3]!.starts).toEqual([0.25])
    context.currentTime = 0.75
    await pumpFrames()
    expect(playerTime()).toContain('0:00.50 / 0:00.50')

    // 自然结束：onEnded 只 disconnect（不 stop），位置钉在时长端点，所有权释放。
    context.sources[3]!.fireEnded()
    await pumpFrames()
    await waitPlayerState('就绪')
    expect(context.sources[3]!.stopCalls).toBe(0)
    expect(context.sources[3]!.disconnectCalls).toBe(1)
    expect(playerTime()).toContain('0:00.50 / 0:00.50')
    expect(host.querySelector<HTMLInputElement>('input[aria-label="音效试听进度"]')!.value).toBe(
      '1',
    )
    expect(host.querySelector('.audio-timeline__progress')?.getAttribute('x1')).toBe('160')
    const foreignD = { stop: vi.fn() }
    await act(async () => {
      claimEditorAudioPreview(foreignD)
    })
    expect(context.sources).toHaveLength(4)

    // 全程零提交。
    expect(mounted.session.getHistoryVersion()).toBe(historyAfterSeed)
  })

  test('播放中切选停止旧源但不销毁 transport；卸载 dispose 关闭硬件端口', async () => {
    const base = await blankProjectBase('sound-playback-switch')
    await seedSound(base, 'sound.hit', '命中音效', encodeWavPcm16(HIT_SAMPLES))
    await seedSound(base, 'sound.heal', '治疗音效', encodeWavPcm16(HEAL_SAMPLES))
    const mounted = await renderTab('sound', base, 'sound.hit')
    await waitPlayerState('就绪')
    const context = audio.contexts[0]!

    await clickButton(host, '播放')
    await waitPlayerState('正在播放')
    expect(context.sources).toHaveLength(1)

    // 切选：同一 transport 实例 stop 旧源、释放所有权，加载新资源但不 dispose。
    await selectRow('sound.heal')
    expect(context.sources[0]!.stopCalls).toBe(1)
    expect(context.sources[0]!.disconnectCalls).toBe(1)
    await waitForReact(() => {
      expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('治疗音效')
    })
    await waitPlayerState('就绪')
    expect(context.decodeCalls).toBe(2)
    expect(playerTime()).toContain('0:00.00 / 0:00.25')
    const lines = peakLines()
    expect(lines).toHaveLength(160)
    expect(lines[0]!.getAttribute('y1')).toBe('25')
    expect(lines[0]!.getAttribute('y2')).toBe('25')
    expect(context.closeCalls).toBe(0)
    expect(mounted.focusLog.at(-1)).toBe('sound.heal')
    expect(catalogRow('sound.heal').hasAttribute('data-selected')).toBe(true)

    // 切选已释放所有权：外部 claim 不再触发组件 transport 任何源动作。
    const foreign = { stop: vi.fn() }
    await act(async () => {
      claimEditorAudioPreview(foreign)
    })
    expect(context.sources).toHaveLength(1)

    // 卸载：transport.dispose → 硬件端口 close（dispose 经 queueMicrotask 放行）。
    await unmountHost()
    await waitForReact(() => {
      expect(context.closeCalls).toBe(1)
    })
  })
})
