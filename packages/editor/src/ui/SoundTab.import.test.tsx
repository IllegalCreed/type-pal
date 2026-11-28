// @vitest-environment jsdom
import { act } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { encodeWavPcm16, fileOfBytes } from '../__tests__/audio-fixtures.js'
import { type AudioContextPort, installAudioContextPort } from '../__tests__/audio-ports.js'
import { waitForReact } from '../__tests__/react-io-wait.js'
import { deferred } from '../__tests__/test-promises.js'
import { sha256Hex } from '../core/binary-signature.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import {
  blankProjectBase,
  blobSha,
  installAudioWorkbenchTestHost,
  seedSound,
} from './__tests__/audio-workbench-harness.js'
import {
  buttonByLabel,
  clickButton,
  inputByAriaLabel,
  loadFilesIntoInput,
} from './__tests__/dom-gestures.js'
import { deepSnapshot } from './__tests__/glm-ui-wave-kit.js'

/** 交替 ±0.5 的 0.5s 采样（8kHz 单声道）：每个峰值 bucket 恒为 max 0.5 / min -0.5。 */
const HIT_SAMPLES = Array.from({ length: 4000 }, (_, index) => (index % 2 === 0 ? 0.5 : -0.5))
/** 恒定 0.25 的 0.25s 采样：峰值 bucket 恒为 max=min=0.25。 */
const HEAL_SAMPLES = Array.from({ length: 2000 }, () => 0.25)
const { host, renderTab, catalogRow, waitPlayerState, peakLines, playerTime } =
  installAudioWorkbenchTestHost()

describe('音效工作台导入与替换', () => {
  let audio: AudioContextPort
  beforeEach(() => {
    audio = installAudioContextPort()
  })

  test('真实 .wav 导入经硬件端口真实解码出 PCM 峰值；同字节再导入覆盖稳定 id', async () => {
    const mounted = await renderTab('sound', await blankProjectBase('sound-import'))

    // 策略接线：SOUND_STRATEGY 的标题/单位/导入入口/accept/空态。
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('0 项')
    expect(buttonByLabel(host, '导入 WAV')).toBeDefined()
    const importInput = inputByAriaLabel<HTMLInputElement>(host, '导入音效')
    expect(importInput.accept).toBe('.wav,audio/wav')
    expect(host.querySelector('.ds-object-workspace .insp-empty')?.textContent).toBe(
      '项目中还没有音效资源。',
    )

    const wav = encodeWavPcm16(HIT_SAMPLES)
    const sha = await sha256Hex(wav)
    const id = `sound.authored.${sha.slice(0, 16)}`
    const historyBefore = mounted.session.getHistoryVersion()
    await loadFilesIntoInput(importInput, [fileOfBytes('激光.wav', 'audio/wav', wav)])
    await waitForReact(() => {
      expect(mounted.session.getState().assetCatalog.assets[id]).toBeDefined()
    })

    const record = mounted.session.getState().assetCatalog.assets[id]!
    expect(record).toEqual({
      kind: 'sound',
      path: `assets/authored/${sha}.wav`,
      mediaType: 'audio/wav',
      bytes: wav.byteLength,
      sha256: sha,
      label: '激光',
      origin: { kind: 'authored', ref: '激光.wav' },
    })
    expect(await blobSha(mounted.session, record.path)).toBe(sha)
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore + 1)
    expect(mounted.focusLog).toEqual([id])
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('激光')
    expect(host.textContent).toContain('时间轴来自当前 WAV 解码后的真实 PCM 峰值。')
    assertProjectSaveValid(mounted.session.getState())

    // 真实 transport 经 AudioContext 硬件端口读取+真实解析：160 个 PCM 峰值 bucket，
    // ±0.5 采样 → 首 bucket y1=18/y2=46；时长 0.5s 走亚秒格式化。
    await waitPlayerState('就绪')
    expect(audio.contexts).toHaveLength(1)
    expect(audio.contexts[0]!.decodeCalls).toBe(1)
    expect(host.textContent).toContain('PCM 波形')
    const lines = peakLines()
    expect(lines).toHaveLength(160)
    expect(lines[0]!.getAttribute('y1')).toBe('18')
    expect(lines[0]!.getAttribute('y2')).toBe('46')
    expect(playerTime()).toContain('0:00.00 / 0:00.50')

    // authoredSoundId 稳定：同字节再导入覆盖同一 id（与 music 的 -2 后缀相对），label 更新。
    const duplicateBefore = mounted.session.getHistoryVersion()
    await loadFilesIntoInput(importInput, [fileOfBytes('激光副本.wav', 'audio/wav', wav)])
    await waitForReact(() => {
      expect(mounted.session.getState().assetCatalog.assets[id]?.label).toBe('激光副本')
    })
    expect(mounted.session.getHistoryVersion()).toBe(duplicateBefore + 1)
    expect(
      Object.keys(mounted.session.getState().assetCatalog.assets).filter((entry) =>
        entry.startsWith('sound.authored.'),
      ),
    ).toEqual([id])
    expect(mounted.session.getState().assetCatalog.assets[id]?.sha256).toBe(sha)
    expect(mounted.focusLog).toEqual([id, id])
    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[id]?.label).toBe('激光')
    await act(async () => {
      expect(mounted.session.redo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[id]?.label).toBe('激光副本')
    // sha 未变（identity 不变）→ 不重新解码。
    expect(audio.contexts[0]!.decodeCalls).toBe(1)
  })

  test('替换非法 WAV 失败：selection/catalog/blob/解码计数全保全且零提交', async () => {
    const base = await blankProjectBase('sound-replacement-read-error')
    const seeded = await seedSound(base, 'sound.hit', '命中音效', encodeWavPcm16(HIT_SAMPLES))
    const mounted = await renderTab('sound', base, 'sound.hit')
    await waitPlayerState('就绪')
    const context = audio.contexts[0]!
    expect(context.decodeCalls).toBe(1)

    const recordBefore = deepSnapshot(mounted.session.getState().assetCatalog.assets['sound.hit']!)
    const shaBefore = await blobSha(mounted.session, seeded.path)
    const historyBefore = mounted.session.getHistoryVersion()
    await clickButton(host, '替换')
    await loadFilesIntoInput(inputByAriaLabel<HTMLInputElement>(host, '替换音效'), [
      fileOfBytes('hit.wav', 'audio/wav', new Uint8Array(24)),
    ])
    await waitForReact(() => {
      expect(host.textContent).toContain('不是有效 WAV 文件')
    })

    expect(mounted.session.getHistoryVersion()).toBe(historyBefore)
    expect(mounted.session.getState().assetCatalog.assets['sound.hit']).toEqual(recordBefore)
    expect(await blobSha(mounted.session, seeded.path)).toBe(shaBefore)
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('命中音效')
    expect(catalogRow('sound.hit').hasAttribute('data-selected')).toBe(true)
    expect(context.decodeCalls).toBe(1)
    await waitPlayerState('就绪')
    expect(playerTime()).toContain('0:00.00 / 0:00.50')
    expect(mounted.focusLog).toEqual([])
    // 替换输入框已复位，可再次驱动。
    expect(inputByAriaLabel<HTMLInputElement>(host, '替换音效').value).toBe('')
  })

  test('替换音效保留 ID 与标签，撤销重新加载原始波形', async () => {
    const base = await blankProjectBase('sound-replacement')
    const original = encodeWavPcm16(HIT_SAMPLES)
    const originalRecord = await seedSound(base, 'sound.hit', '命中音效', original)
    const mounted = await renderTab('sound', base, 'sound.hit')
    await waitPlayerState('就绪')
    expect(playerTime()).toBe('0:00.00 / 0:00.50')

    await clickButton(host, '替换')
    const replacement = encodeWavPcm16(HEAL_SAMPLES)
    const replacementHash = await sha256Hex(replacement)
    await loadFilesIntoInput(inputByAriaLabel<HTMLInputElement>(host, '替换音效'), [
      fileOfBytes('softer.wav', 'audio/wav', replacement),
    ])
    await waitForReact(() =>
      expect(mounted.session.getState().assetCatalog.assets['sound.hit']?.sha256).toBe(
        replacementHash,
      ),
    )
    const record = mounted.session.getState().assetCatalog.assets['sound.hit']!
    expect(record.label).toBe('命中音效')
    expect(
      Object.keys(mounted.session.getState().assetCatalog.assets).filter((id) =>
        id.startsWith('sound.'),
      ),
    ).toEqual(['sound.hit'])
    expect(new Uint8Array(await mounted.reader.readBytes('sound.hit', 'sound'))).toEqual(
      replacement,
    )
    await waitPlayerState('就绪')
    expect(playerTime()).toBe('0:00.00 / 0:00.25')

    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets['sound.hit']).toEqual(originalRecord)
    expect(new Uint8Array(await mounted.reader.readBytes('sound.hit', 'sound'))).toEqual(original)
    await waitPlayerState('就绪')
    expect(playerTime()).toBe('0:00.00 / 0:00.50')
  })

  test('undo restores the WAV replaced by a slower in-flight import', async () => {
    const id = 'sound.hit'
    const base = await blankProjectBase('sound-overlapping-replacements')
    await seedSound(base, id, '命中音效', encodeWavPcm16(HIT_SAMPLES))
    const { session, reader } = await renderTab('sound', base, id)
    await waitPlayerState('就绪')
    const first = fileOfBytes('short.wav', 'audio/wav', encodeWavPcm16(HEAL_SAMPLES))
    const second = encodeWavPcm16([0.75, 0, -0.75])
    const firstBytes = await first.arrayBuffer()
    const firstRead = deferred<ArrayBuffer>()
    const entered = vi.spyOn(first, 'arrayBuffer').mockReturnValue(firstRead.promise)
    const input = inputByAriaLabel<HTMLInputElement>(host, '替换音效')
    const before = session.getHistoryVersion()
    const secondSha = await sha256Hex(second)
    async function replace(file: File) {
      await clickButton(host, '替换')
      await loadFilesIntoInput(input, [file])
    }
    try {
      await replace(first)
      await waitForReact(() => expect(entered).toHaveBeenCalledOnce())
      await replace(fileOfBytes('shorter.wav', 'audio/wav', second))
      await waitForReact(() => expect(session.getHistoryVersion()).toBe(before + 1))
    } finally {
      await act(async () => firstRead.resolve(firstBytes))
    }
    await waitForReact(() => expect(session.getHistoryVersion()).toBe(before + 2))
    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().assetCatalog.assets[id]?.sha256).toBe(secondSha)
    expect(new Uint8Array(await reader.readBytes(id, 'sound'))).toEqual(second)
    assertProjectSaveValid(session.getState())
  })

  test('非法 WAV 导入保留空目录与工程历史', async () => {
    const { session } = await renderTab('sound', await blankProjectBase('sound-invalid-import'))
    const before = session.getState()
    await loadFilesIntoInput(inputByAriaLabel<HTMLInputElement>(host, '导入音效'), [
      fileOfBytes('invalid.wav', 'audio/wav', new Uint8Array(8)),
    ])

    await waitForReact(() => expect(host.textContent).toContain('不是有效 WAV 文件'))
    expect(session.getState()).toBe(before)
    expect(session.getHistoryVersion()).toBe(0)
    expect(host.querySelector('.ds-object-workspace .insp-empty')?.textContent).toBe(
      '项目中还没有音效资源。',
    )
  })
})
