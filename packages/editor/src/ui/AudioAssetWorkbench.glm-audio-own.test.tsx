// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-AUDIO-OWNERSHIP-1 W 组：AudioAssetWorkbench（经真实 SoundTab wrapper）的
 * 停止按钮、非 abort 载入失败/恢复与播放中换工程清理合同。排重账见任务卡：
 * K07 已证暂停/外部抢占/自然结束/切选不销毁/卸载 dispose，本文件只补其未走的调用层。
 *
 * 输入真实性：正式 blank 项目（loadLegalUiProject，过保存门）+ 真实 UpsertAssetCommand 播种；
 * transport 一律真实（createWavPreviewTransport 经 SOUND_STRATEGY），AudioContext 为协议级
 * 硬件端口替身（decode 走 parseWavPcm16 真实解析），W2 的损坏 WAV 是通过 assertWave 导入
 * 校验但深层非 PCM 的合法 authored 输入（真实用户可构造），非注入式坏值。
 */
import type { FileSource } from '@type-pal/reforge'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { claimEditorAudioPreview, stopEditorAudioPreview } from '../core/audio-preview-session.js'
import { UpsertAssetCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { loadLegalUiProject, useActEnvironment } from './__tests__/glm-ui-wave-kit.js'
import {
  type AudioContextPort,
  encodeWavPcm16,
  fileOfBytes,
  installAudioContextPort,
  installManualAnimationFrames,
  type ManualAnimationFrames,
} from './__tests__/kimi-editor-workflows/k07-fixtures.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import { authoredWaveRecord, SoundTab } from './SoundTab.js'

/** 交替 ±0.5 的 0.5s 采样（8kHz 单声道）：0.5s 时长，与 HEAL 的 0.25s 可区分。 */
const HIT_SAMPLES = Array.from({ length: 4000 }, (_, index) => (index % 2 === 0 ? 0.5 : -0.5))
/** 恒定 0.25 的 0.25s 采样：与 HIT 时长不同，用作换工程后重新解码的判别值。 */
const HEAL_SAMPLES = Array.from({ length: 2000 }, () => 0.25)

interface ProjectBase {
  session: EditSession
  source: FileSource
  reader: EditorAssetReader
}

async function legalBase(name: string): Promise<ProjectBase> {
  const legal = await loadLegalUiProject(name)
  const session = new EditSession(legal.state)
  return {
    session,
    source: legal.source,
    reader: createEditorAssetReader(legal.source, () => session.getState()),
  }
}

async function seedSound(
  base: ProjectBase,
  id: string,
  label: string,
  wav: Uint8Array,
): Promise<void> {
  const prepared = await authoredWaveRecord(fileOfBytes(`${label}.wav`, 'audio/wav', wav), label)
  base.session.dispatch(new UpsertAssetCommand(id, prepared.record, prepared.bytes, undefined))
}

/** 播放中「停止」测试把 slot.base 换成另一工程（W4）；其余合同 slot 恒定。 */
function Harness(props: { base: ProjectBase; focus: string }) {
  useSyncExternalStore(
    (callback) => props.base.session.subscribe(callback),
    () => props.base.session.getVersion(),
  )
  const current = props.base.session.getState()
  return (
    <SoundTab
      catalog={current.assetCatalog}
      reader={props.base.reader}
      session={props.base.session}
      assetDiagnostics={[]}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
      focusObjectId={props.focus}
    />
  )
}

let root: Root | undefined
let host: HTMLDivElement
let audio: AudioContextPort
let frames: ManualAnimationFrames

beforeEach(() => {
  useActEnvironment()
  installBrowserHardwarePorts()
  audio = installAudioContextPort()
  frames = installManualAnimationFrames()
  stopEditorAudioPreview()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  // 先在 act 内卸载（卸载清理释放 owner 并停 transport），再全局 stop 兜底，
  // 避免全局 stop 在 act 外触发 owner.stop 的 setState。
  const current = root
  root = undefined
  if (current) await act(async () => current.unmount())
  stopEditorAudioPreview()
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function renderBase(base: ProjectBase, focus: string): Promise<void> {
  const current = root
  expect(current, 'root 已初始化').toBeDefined()
  await act(async () => {
    current!.render(<Harness base={base} focus={focus} />)
    await Promise.resolve()
  })
}

async function waitPlayerState(text: string): Promise<void> {
  await vi.waitFor(() => {
    expect(host.querySelector('.audio-player__state')?.textContent).toBe(text)
  })
}

function playerTime(): string {
  return host.querySelector('.audio-player__time')?.textContent ?? ''
}

function catalogRow(id: string): HTMLElement {
  const row = [...host.querySelectorAll<HTMLElement>('.ds-catalog-row')].find(
    (candidate) => candidate.querySelector('.ds-catalog-row__meta')?.textContent === id,
  )
  expect(row, `目录行 ${id}`).toBeDefined()
  return row!
}

async function pumpFrames(): Promise<void> {
  await act(async () => {
    frames.pump()
  })
}

/** WAV 载入链为纯微任务：在 act 内冲刷后可同步断言，避免针红落在 waitFor 超时。 */
async function flushAct(times = 20): Promise<void> {
  await act(async () => {
    for (let index = 0; index < times; index += 1) await Promise.resolve()
  })
}

/** 点击播放器按钮并冲刷 transport 异步链（resume→play→setState）后返回。 */
async function clickPlayerButton(label: string): Promise<void> {
  await act(async () => {
    host.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!.click()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('W 组：AudioAssetWorkbench 停止 / 失败 / 换工程清理', () => {
  test('W1 播放中点「停止」：真实源停止、时钟归零、释放所有权、不销毁，再播从 0 起', async () => {
    const base = await legalBase('glm-audio-own-stop')
    await seedSound(base, 'sound.hit', '命中音效', encodeWavPcm16(HIT_SAMPLES))
    const historyAfterSeed = base.session.getHistoryVersion()
    await renderBase(base, 'sound.hit')
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

  test('W2 合法导入但深层非 PCM 的 WAV 真实解码失败：「读取失败」+ 错误信息可见', async () => {
    const corrupt = encodeWavPcm16(HIT_SAMPLES)
    new DataView(corrupt.buffer).setUint16(20, 2, true) // fmt audioFormat=2：过 assertWave 魔数、被真实解析拒绝
    const base = await legalBase('glm-audio-own-load-fail')
    await seedSound(base, 'sound.broken', '损坏音效', corrupt)
    const historyAfterSeed = base.session.getHistoryVersion()
    await act(async () => {
      root!.render(<Harness base={base} focus="sound.broken" />)
    })
    await flushAct()
    expect(host.querySelector('.audio-player__state')?.textContent).toBe('读取失败')
    expect(host.textContent).toContain('仅支持 PCM 编码的 WAV')
    expect(audio.contexts[0]!.decodeCalls).toBe(1)
    expect(audio.contexts[0]!.closeCalls).toBe(0)
    expect(host.querySelector<HTMLButtonElement>('[aria-label="播放"]')!.disabled).toBe(true)
    expect(base.session.getHistoryVersion()).toBe(historyAfterSeed)
  })

  test('W3 载入失败后切选健康资源恢复就绪：错误清除且重新真实解码', async () => {
    const corrupt = encodeWavPcm16(HIT_SAMPLES)
    new DataView(corrupt.buffer).setUint16(20, 2, true)
    const base = await legalBase('glm-audio-own-recover')
    await seedSound(base, 'sound.broken', '损坏音效', corrupt)
    await seedSound(base, 'sound.heal', '治疗音效', encodeWavPcm16(HEAL_SAMPLES))
    await act(async () => {
      root!.render(<Harness base={base} focus="sound.broken" />)
    })
    await flushAct()
    expect(host.querySelector('.audio-player__state')?.textContent).toBe('读取失败')

    await act(async () => {
      catalogRow('sound.heal').click()
    })
    await flushAct()
    expect(host.querySelector('.audio-player__state')?.textContent).toBe('就绪')
    expect(playerTime()).toContain('0:00.00 / 0:00.25')
    expect(host.textContent).not.toContain('仅支持 PCM 编码的 WAV')
    expect(audio.contexts[0]!.decodeCalls).toBe(2)
    expect(audio.contexts[0]!.closeCalls).toBe(0)
    expect(host.querySelector<HTMLButtonElement>('[aria-label="播放"]')!.disabled).toBe(false)
  })

  test('W4 播放中换工程：旧源停止、旧 transport 即时销毁、同字节跨工程重新解码、零提交', async () => {
    const baseA = await legalBase('glm-audio-own-proj-a')
    const baseB = await legalBase('glm-audio-own-proj-b')
    await seedSound(baseA, 'sound.hit', '命中音效', encodeWavPcm16(HIT_SAMPLES))
    // 同 id 不同字节（0.25s）：换工程后时长文本是重新解码 B 字节的判别值。
    await seedSound(baseB, 'sound.hit', '命中音效', encodeWavPcm16(HEAL_SAMPLES))
    const historyA = baseA.session.getHistoryVersion()
    const historyB = baseB.session.getHistoryVersion()
    expect(baseA.reader.projectId).not.toBe(baseB.reader.projectId)

    let base = baseA
    await act(async () => {
      root!.render(<Harness base={base} focus="sound.hit" />)
      await Promise.resolve()
    })
    await waitPlayerState('就绪')
    const contextA = audio.contexts[0]!
    expect(playerTime()).toContain('0:00.00 / 0:00.50')
    await clickPlayerButton('播放')
    await waitPlayerState('正在播放')
    contextA.currentTime = 0.25
    await pumpFrames()
    expect(playerTime()).toContain('0:00.25 / 0:00.50')

    base = baseB
    await act(async () => {
      root!.render(<Harness base={base} focus="sound.hit" />)
      await Promise.resolve()
    })
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
