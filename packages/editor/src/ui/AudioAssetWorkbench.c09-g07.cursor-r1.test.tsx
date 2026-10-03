// @vitest-environment jsdom
/**
 * C09-G07：真实 SoundTab/MusicTab wrapper 导入与 transport（排重 K07 长流，短轴见证）。
 */
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mountMusicTab, mountSoundTab } from '../__tests__/cursor-asset-r1/c09-audio-harness.js'
import {
  type AudioContextPort,
  C09_SHORT_WAV_SAMPLES,
  C09_THEME_MIDI,
  encodeWavPcm16,
  fileOfBytes,
  installAudioContextPort,
  installManualAnimationFrames,
} from '../__tests__/cursor-asset-r1/c09-fixtures.js'
import { loadFilesIntoInput, stubNodeTestHost } from '../__tests__/cursor-asset-r1/kit.js'
import { stopEditorAudioPreview } from '../core/audio-preview-session.js'
import { authoredSoundId } from './SoundTab.js'

let mounted: Awaited<ReturnType<typeof mountSoundTab>> | undefined
let audioPort: AudioContextPort

beforeEach(async () => {
  await stubNodeTestHost()
  audioPort = installAudioContextPort()
  installManualAnimationFrames()
  stopEditorAudioPreview()
})

afterEach(async () => {
  await mounted?.cleanup()
  mounted = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('C09-G07 真实 wrapper 导入与试听', () => {
  test('C09-G07-01 SoundTab 空项目显示音效空态文案', async () => {
    mounted = await mountSoundTab()
    expect(mounted.host.textContent).toContain('项目中还没有音效资源')
  })

  test('C09-G07-02 MusicTab 导入入口 accept 含 mid', async () => {
    mounted = await mountMusicTab()
    const input = mounted.host.querySelector<HTMLInputElement>('input[aria-label="导入音乐"]')!
    expect(input.accept).toContain('.mid')
  })

  test('C09-G07-03 真实 WAV 导入后 catalog 含 sound.authored id', async () => {
    mounted = await mountSoundTab()
    const wav = encodeWavPcm16(C09_SHORT_WAV_SAMPLES)
    const file = fileOfBytes('c09-hit.wav', 'audio/wav', wav)
    const input = mounted.host.querySelector<HTMLInputElement>('input[aria-label="导入音效"]')!
    await loadFilesIntoInput(input, [file])
    await vi.waitFor(() =>
      expect(
        Object.keys(mounted!.session.getState().assetCatalog.assets).some((id) =>
          id.startsWith('sound.authored.'),
        ),
      ).toBe(true),
    )
  })

  test('C09-G07-04 WAV 导入后时间轴显示 PCM 波形标签', async () => {
    mounted = await mountSoundTab()
    const wav = encodeWavPcm16(C09_SHORT_WAV_SAMPLES)
    await loadFilesIntoInput(mounted.host.querySelector('input[aria-label="导入音效"]')!, [
      fileOfBytes('c09-hit.wav', 'audio/wav', wav),
    ])
    await vi.waitFor(() => expect(mounted!.host.textContent).toContain('PCM 波形'))
  })

  test('C09-G07-05 同字节 WAV 再导入覆盖稳定 sound.authored id', async () => {
    mounted = await mountSoundTab()
    const wav = encodeWavPcm16(C09_SHORT_WAV_SAMPLES)
    const file = fileOfBytes('a.wav', 'audio/wav', wav)
    const input = mounted.host.querySelector<HTMLInputElement>('input[aria-label="导入音效"]')!
    await loadFilesIntoInput(input, [file])
    await vi.waitFor(() => expect(mounted!.session.getHistoryVersion()).toBeGreaterThan(0))
    const id = authoredSoundId(
      mounted.session.getState().assetCatalog.assets[
        Object.keys(mounted.session.getState().assetCatalog.assets).find((k) =>
          k.startsWith('sound.authored.'),
        )!
      ]!.sha256,
    )
    await loadFilesIntoInput(input, [fileOfBytes('b.wav', 'audio/wav', wav)])
    await vi.waitFor(() =>
      expect(mounted!.session.getState().assetCatalog.assets[id]).toBeDefined(),
    )
  })

  test('C09-G07-06 播放按钮触发 AudioContext resume', async () => {
    mounted = await mountSoundTab()
    const wav = encodeWavPcm16(C09_SHORT_WAV_SAMPLES)
    await loadFilesIntoInput(mounted.host.querySelector('input[aria-label="导入音效"]')!, [
      fileOfBytes('c09-play.wav', 'audio/wav', wav),
    ])
    await vi.waitFor(() => expect(mounted!.host.textContent).toContain('PCM 波形'))
    await act(async () => {
      mounted!.host.querySelector<HTMLButtonElement>('[aria-label="播放"]')!.click()
      await Promise.resolve()
    })
    await vi.waitFor(() => expect(audioPort.contexts[0]?.resumeCalls).toBeGreaterThan(0))
  })

  test('C09-G07-07 非法 WAV 导入零提交且显示错误', async () => {
    mounted = await mountSoundTab()
    const before = mounted.session.getHistoryVersion()
    await loadFilesIntoInput(mounted.host.querySelector('input[aria-label="导入音效"]')!, [
      fileOfBytes('bad.wav', 'audio/wav', new Uint8Array(8)),
    ])
    await vi.waitFor(() => expect(mounted!.host.textContent).toContain('不是有效 WAV'))
    expect(mounted!.session.getHistoryVersion()).toBe(before)
  })

  test('C09-G07-08 MusicTab 导入真实 MIDI 增加 music 资源', async () => {
    const musicMounted = await mountMusicTab()
    mounted = musicMounted
    await loadFilesIntoInput(musicMounted.host.querySelector('input[aria-label="导入音乐"]')!, [
      fileOfBytes('theme.mid', 'audio/midi', C09_THEME_MIDI),
    ])
    await vi.waitFor(() =>
      expect(
        Object.values(musicMounted.session.getState().assetCatalog.assets).some(
          (record) => record.kind === 'music',
        ),
      ).toBe(true),
    )
  })

  test('C09-G07-09 替换 WAV 走 Upsert 且保留同一 id', async () => {
    mounted = await mountSoundTab()
    const wav = encodeWavPcm16(C09_SHORT_WAV_SAMPLES)
    await loadFilesIntoInput(mounted.host.querySelector('input[aria-label="导入音效"]')!, [
      fileOfBytes('c09-base.wav', 'audio/wav', wav),
    ])
    await vi.waitFor(() => expect(mounted!.session.getHistoryVersion()).toBe(1))
    const id = Object.keys(mounted!.session.getState().assetCatalog.assets).find((k) =>
      k.startsWith('sound.authored.'),
    )!
    const replaceInput = mounted.host.querySelector<HTMLInputElement>(
      'input[aria-label="替换音效"]',
    )!
    const replaceBtn = [
      ...mounted.host.querySelectorAll<HTMLButtonElement>('.ds-object-hero button'),
    ].find((candidate) => candidate.textContent?.trim() === '替换')!
    await act(async () => replaceBtn.click())
    await loadFilesIntoInput(replaceInput, [
      fileOfBytes('new.wav', 'audio/wav', encodeWavPcm16([0.1, -0.1, 0.2])),
    ])
    await vi.waitFor(() => expect(mounted!.session.getHistoryVersion()).toBeGreaterThan(1))
    expect(mounted!.session.getState().assetCatalog.assets[id]).toBeDefined()
  })

  test('C09-G07-10 导入两条音效后切选写入 onObjectFocus', async () => {
    mounted = await mountSoundTab()
    const input = mounted.host.querySelector<HTMLInputElement>('input[aria-label="导入音效"]')!
    await loadFilesIntoInput(input, [
      fileOfBytes('a.wav', 'audio/wav', encodeWavPcm16([0.5, -0.5])),
    ])
    await loadFilesIntoInput(input, [
      fileOfBytes('b.wav', 'audio/wav', encodeWavPcm16([0.25, -0.25])),
    ])
    await vi.waitFor(() =>
      expect(mounted!.host.querySelectorAll('.ds-catalog-row').length).toBeGreaterThan(1),
    )
    const second = mounted!.host.querySelectorAll<HTMLButtonElement>('.ds-catalog-row')[1]!
    await act(async () => second.click())
    expect(mounted!.focusLog.at(-1)).toMatch(/^sound\.authored\./)
  })
})
