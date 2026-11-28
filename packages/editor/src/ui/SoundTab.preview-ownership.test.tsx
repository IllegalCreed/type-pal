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
import { claimEditorAudioPreview, stopEditorAudioPreview } from '../core/audio-preview-session.js'
import {
  blankProjectBase,
  installAudioWorkbenchTestHost,
  seedSound,
} from './__tests__/audio-workbench-harness.js'
import { clickButton } from './__tests__/glm-ui-wave-kit.js'

const HIT_SAMPLES = Array.from({ length: 4000 }, (_, i) => (i % 2 === 0 ? 0.5 : -0.5))
const HEAL_SAMPLES = Array.from({ length: 2000 }, () => 0.25)
const { host, renderTab, selectRow, waitPlayerState, playerTime } = installAudioWorkbenchTestHost()

let audio: AudioContextPort
let frames: ManualAnimationFrames
beforeEach(() => {
  audio = installAudioContextPort()
  frames = installManualAnimationFrames()
})

async function pumpFrames(): Promise<void> {
  await act(async () => frames.pump())
}

async function clickPlayerButton(label: string): Promise<void> {
  await clickButton(host, label)
}

describe('音效试听的释放与恢复', () => {
  test('停止试听归零并释放所有权，再播从 0 起', async () => {
    const base = await blankProjectBase('sound-stop')
    await seedSound(base, 'sound.hit', '命中音效', encodeWavPcm16(HIT_SAMPLES))
    const historyAfterSeed = base.session.getHistoryVersion()
    await renderTab('sound', base, 'sound.hit')
    await waitPlayerState('就绪')
    const context = audio.contexts[0]!
    expect(context.decodeCalls).toBe(1)

    await clickPlayerButton('播放')
    await waitPlayerState('正在播放')
    expect(context.sources).toHaveLength(1)
    context.currentTime = 0.25
    await pumpFrames()
    expect(playerTime()).toContain('0:00.25 / 0:00.50')

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="停止"]')!.click()
    })
    const source = context.sources[0]!
    expect(source.stopCalls).toBe(1)
    expect(source.disconnectCalls).toBe(1)
    await waitPlayerState('就绪')
    expect(playerTime()).toContain('0:00.00 / 0:00.50')
    expect(context.closeCalls).toBe(0)

    // 所有权已随停止释放：外部接管时无旧 owner 可停、组件源不再被触碰。
    const foreign = { stop: vi.fn() }
    await act(async () => {
      claimEditorAudioPreview(foreign)
    })
    expect(foreign.stop).not.toHaveBeenCalled()
    expect(source.stopCalls).toBe(1)
    expect(context.sources).toHaveLength(1)

    // 重复试听：清除 foreign 后再播，从偏移 0 重新启动新源。
    stopEditorAudioPreview()
    await clickPlayerButton('播放')
    await waitPlayerState('正在播放')
    expect(context.sources[1]!.starts).toEqual([0])
    expect(base.session.getHistoryVersion()).toBe(historyAfterSeed)
  })

  test('解码失败保持不可播放，切换健康素材后恢复', async () => {
    const corrupt = encodeWavPcm16(HIT_SAMPLES)
    new DataView(corrupt.buffer).setUint16(20, 2, true)
    const base = await blankProjectBase('sound-recover')
    await seedSound(base, 'sound.broken', '损坏音效', corrupt)
    await seedSound(base, 'sound.heal', '治疗音效', encodeWavPcm16(HEAL_SAMPLES))
    await renderTab('sound', base, 'sound.broken')
    const history = base.session.getHistoryVersion()
    await waitPlayerState('读取失败')
    expect(host.textContent).toContain('仅支持 PCM 编码的 WAV')
    expect(host.querySelector<HTMLButtonElement>('[aria-label="播放"]')!.disabled).toBe(true)
    expect(audio.contexts[0]!.decodeCalls).toBe(1)

    await selectRow('sound.heal')
    await waitPlayerState('就绪')
    expect(playerTime()).toContain('0:00.00 / 0:00.25')
    expect(host.textContent).not.toContain('仅支持 PCM 编码的 WAV')
    expect(audio.contexts[0]!.decodeCalls).toBe(2)
    expect(audio.contexts[0]!.closeCalls).toBe(0)
    expect(host.querySelector<HTMLButtonElement>('[aria-label="播放"]')!.disabled).toBe(false)
    expect(base.session.getHistoryVersion()).toBe(history)
  })

  test('播放中换工程时释放旧源，并读取相同 ID 的新字节', async () => {
    const baseA = await blankProjectBase('sound-proj-a')
    const baseB = await blankProjectBase('sound-proj-b')
    await seedSound(baseA, 'sound.hit', '命中音效', encodeWavPcm16(HIT_SAMPLES))
    // 同 id 不同字节（0.25s）：换工程后时长文本是重新解码 B 字节的判别值。
    await seedSound(baseB, 'sound.hit', '命中音效', encodeWavPcm16(HEAL_SAMPLES))
    const historyA = baseA.session.getHistoryVersion()
    const historyB = baseB.session.getHistoryVersion()
    expect(baseA.session.getState().manifest.id).not.toBe(baseB.session.getState().manifest.id)

    await renderTab('sound', baseA, 'sound.hit')
    await waitPlayerState('就绪')
    const contextA = audio.contexts[0]!
    expect(playerTime()).toContain('0:00.00 / 0:00.50')
    await clickPlayerButton('播放')
    await waitPlayerState('正在播放')
    contextA.currentTime = 0.25
    await pumpFrames()
    expect(playerTime()).toContain('0:00.25 / 0:00.50')

    await renderTab('sound', baseB, 'sound.hit')
    expect(contextA.sources[0]!.stopCalls).toBe(1)
    expect(contextA.sources[0]!.disconnectCalls).toBe(1)
    expect(contextA.closeCalls).toBe(1)
    await waitPlayerState('就绪')
    expect(audio.contexts).toHaveLength(2)
    const contextB = audio.contexts[1]!
    expect(contextB.decodeCalls).toBe(1)
    expect(playerTime()).toContain('0:00.00 / 0:00.25')
    expect(host.querySelector('.audio-player__state')?.textContent).toBe('就绪')

    // 换工程已释放所有权：外部接管不触发任何源动作。
    const foreign = { stop: vi.fn() }
    await act(async () => {
      claimEditorAudioPreview(foreign)
    })
    expect(foreign.stop).not.toHaveBeenCalled()
    expect(contextB.sources).toHaveLength(0)
    expect(baseA.session.getHistoryVersion()).toBe(historyA)
    expect(baseB.session.getHistoryVersion()).toBe(historyB)
  })
})
