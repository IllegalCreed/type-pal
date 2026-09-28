// @vitest-environment jsdom
/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K07：AudioAssetWorkbench 两个真实 wrapper（MusicTab/SoundTab）
 * 的真实业务工作流补测（锚 AudioAssetWorkbench.tsx:371/837；调用方 MusicTab.tsx:83 / SoundTab.tsx:80）。
 *
 * 旧断言去重（只登记缺口，不复制）：
 * - AudioAssetWorkbench.test.tsx（transport/strategy 全 mock，reader 字面量）：
 *   - 'recovers when A→B→A reuses an inflight A that is then canceled' → 已证迟到加载代际守卫、
 *     abort 重试、切选不串台；不重复。
 *   - 'renders a fractional short sound at the exact visual and slider endpoint' → 已证亚秒格式化、
 *     滑杆端点、未命名回退、claimEditorAudioPreview 抢占会 stop 旧 owner/旧 transport；不重复。
 *   - 'rechecks live references after the asynchronous delete byte read' → 已证删除字节读取期间
 *     出现新引用时命令层 AssetInUseError 阻断且零提交；不重复。
 * - AudioAssetWorkbench.glm-ui-wave.test.tsx（合法项目 + 真实 authoredWaveRecord，但 strategy
 *   为测试内副本、transport 全 mock，未经过 SoundTab wrapper）：
 *   - 'WAV 导入真实提交' / '非法 WAV 失败零提交并显示错误' / '替换：同 id 提交并保留旧 label，
 *     undo 还原旧字节' → 已证导入/失败/替换成功链；缺口：真实 wrapper 策略接线、真实 transport
 *     解码链、替换失败侧保全。
 * - MusicTab.test.tsx：目录搜索/计数/选择不偷换（reader mock）→ 已证；缺口：MIDI 策略接线与
 *   真实 .mid 导入/解析链。SoundTab.test.ts：authoredWaveRecord/authoredSoundId/assertWave 纯函数
 *   与共享搜索 UI → 已证；assertMidi/nextMusicId/authoredMidiRecord 在旧测试中零覆盖。
 * - AssetInspectorTabs.test.tsx：MusicTab/SoundTab canonical Inspector 结构与引用行 → 已证；不重复。
 * - core/audio-preview.test.ts 与 reforge midi-preview.test.ts：transport 内部协议单测（fake
 *   runtime 直测）→ 已证 transport 内部；本文件只证组件 DOM/会话层后果。
 * - audio-preview-session.ts 4/4 分支已证（audio-preview-session.test.ts）；本文件只作真实依赖复用。
 *
 * 本组缺口（本文件断言）：
 * 1. 真实 MusicTab 策略接线（标题/单位/格式/导入入口/accept/空态）+ 真实 .mid 导入入库
 *    （sha256/record/blob/id/选择）+ spessasynth_core 真实解析出音符活动时间轴 + undo/redo。
 * 2. nextMusicId 同字节重复导入的 '-2' 后缀分配；assertMidi 扩展名/魔数拒绝零提交且选择保全。
 * 3. 真实 SoundTab + 真实 createWavPreviewTransport（AudioContext 硬件端口替身，decode 委托
 *    k07-fixtures 的真实 RIFF/WAVE PCM 解析器）：导入→真实 PCM 峰值时间轴；播放/时钟/seek/暂停/
 *    自然结束的协议后果与单一预览所有权；切选停旧源不销毁 transport；卸载 dispose 关闭端口。
 * 4. 替换非法文件失败：selection/catalog/blob/解码计数全保全、零提交。
 * 5. 删除生命周期：取消零提交、真实引用索引下确认禁用、解除引用后成功删除且选择前移、
 *    undo/redo 字节级还原。
 * 6. 删除在途磁盘读取失败（gatedFileSource 闸门）：错误身份透传、对话框保持开启、
 *    selection/catalog 保全、取消收尾。
 * 主动放弃：AudioAssetWorkbench.tsx:480-481 的 kind-mismatch 替换守卫经 UI 不可达
 * （替换目标恒为当前 kind 的选中行）；MIDI 播放链需 spessasynth worklet，jsdom 不可行，
 * 只证其失败错误面（产品既定降级路径）。
 *
 * 替身边界：AudioContext/rAF 为浏览器硬件端口替身（decode 用真实 parser，时钟手动推进），
 * 只证明协议级因果，不宣称音质/解码保真；gatedFileSource 只做磁盘 I/O 迟到/失败闸门。
 */
import type { AssetCatalogV1, AssetRecordV1 } from '@type-pal/content'
import {
  type FileSource,
  fsaSource,
  loadAllAuthorScenes,
  loadAllProjectMaps,
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from '../core/__tests__/author-save-fixture.js'
import { claimEditorAudioPreview, stopEditorAudioPreview } from '../core/audio-preview-session.js'
import { sha256Hex } from '../core/binary-signature.js'
import { UpdateManifestAssetRolesCommand, UpsertAssetCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { toEditorState } from '../core/project-io.js'
import type { ProjectReferenceEdge } from '../core/project-reference.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { buildBlankProject } from '../core/seed.js'
import {
  buttonByLabel,
  clickButton,
  deepSnapshot,
  inputByAriaLabel,
  loadFilesIntoInput,
  loadLegalUiProject,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import {
  type AudioContextPort,
  encodeWavPcm16,
  fileOfBytes,
  installAudioContextPort,
  installManualAnimationFrames,
  type ManualAnimationFrames,
  midiSmf0,
} from './__tests__/kimi-editor-workflows/k07-fixtures.js'
import {
  gatedFileSource,
  installBrowserHardwarePorts,
} from './__tests__/kimi-editor-workflows/kit.js'
import { MusicTab } from './MusicTab.js'
import { authoredWaveRecord, SoundTab } from './SoundTab.js'

/** 交替 ±0.5 的 0.5s 采样（8kHz 单声道）：每个峰值 bucket 恒为 max 0.5 / min -0.5。 */
const HIT_SAMPLES = Array.from({ length: 4000 }, (_, index) => (index % 2 === 0 ? 0.5 : -0.5))
/** 恒定 0.25 的 0.25s 采样：峰值 bucket 恒为 max=min=0.25。 */
const HEAL_SAMPLES = Array.from({ length: 2000 }, () => 0.25)
/** 两音符真实 SMF：0–0.25s vel127、0.5–1.0s vel32（96 tick/四分音符，默认速度总长 1.0s）。 */
const THEME_MIDI = midiSmf0([
  { tick: 0, length: 48, note: 60, velocity: 127 },
  { tick: 96, length: 96, note: 64, velocity: 32 },
])

interface ProjectBase {
  session: EditSession
  source: FileSource
}

interface Mounted extends ProjectBase {
  reader: EditorAssetReader
  focusLog: Array<string | undefined>
  openedReferences: ProjectReferenceEdge[]
}

function Harness(props: {
  tab: 'music' | 'sound'
  session: EditSession
  reader: EditorAssetReader
  initialFocus?: string
  focusLog: Array<string | undefined>
  openedReferences: ProjectReferenceEdge[]
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const [focus, setFocus] = useState<string | undefined>(props.initialFocus)
  const shared = {
    catalog: current.assetCatalog,
    reader: props.reader,
    session: props.session,
    focusObjectId: focus,
    onObjectFocus: (id: string | undefined) => {
      props.focusLog.push(id)
      setFocus(id)
    },
    assetDiagnostics: [],
    referenceIndex: collectCurrentProjectReferenceIndex(current),
    referenceStatus: 'current' as const,
    getCurrentReferenceIndex: (state: Parameters<typeof collectCurrentProjectReferenceIndex>[0]) =>
      collectCurrentProjectReferenceIndex(state),
    onOpenReference: (reference: ProjectReferenceEdge) => props.openedReferences.push(reference),
  }
  return props.tab === 'music' ? <MusicTab {...shared} /> : <SoundTab {...shared} />
}

let root: Root | undefined
let host: HTMLDivElement

beforeEach(() => {
  useActEnvironment()
  installBrowserHardwarePorts()
  stopEditorAudioPreview()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

async function unmountHost(): Promise<void> {
  const current = root
  root = undefined
  if (current) await act(async () => current.unmount())
  host.remove()
}

afterEach(async () => {
  await unmountHost()
  stopEditorAudioPreview()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function blankProjectBase(name: string): Promise<ProjectBase> {
  const legal = await loadLegalUiProject(name)
  return { session: new EditSession(legal.state), source: legal.source }
}

async function renderTab(
  tab: 'music' | 'sound',
  base: ProjectBase,
  focus?: string,
): Promise<Mounted> {
  const reader = createEditorAssetReader(base.source, () => base.session.getState())
  const focusLog: Array<string | undefined> = []
  const openedReferences: ProjectReferenceEdge[] = []
  const current = root
  expect(current, 'root 已初始化').toBeDefined()
  await act(async () => {
    current!.render(
      <Harness
        tab={tab}
        session={base.session}
        reader={reader}
        initialFocus={focus}
        focusLog={focusLog}
        openedReferences={openedReferences}
      />,
    )
    await Promise.resolve()
  })
  return { session: base.session, source: base.source, reader, focusLog, openedReferences }
}

/** 真实命令播种音效：真实 WAV 字节 → authoredWaveRecord → UpsertAssetCommand。 */
async function seedSound(
  base: ProjectBase,
  id: string,
  label: string,
  wav: Uint8Array,
): Promise<AssetRecordV1> {
  const prepared = await authoredWaveRecord(fileOfBytes(`${label}.wav`, 'audio/wav', wav), label)
  base.session.dispatch(new UpsertAssetCommand(id, prepared.record, prepared.bytes, undefined))
  return prepared.record
}

function catalogRow(id: string): HTMLElement {
  const row = [...host.querySelectorAll<HTMLElement>('.ds-catalog-row')].find(
    (candidate) => candidate.querySelector('.ds-catalog-row__meta')?.textContent === id,
  )
  expect(row, `目录行 ${id}`).toBeDefined()
  return row!
}

async function selectRow(id: string): Promise<void> {
  await act(async () => {
    catalogRow(id).click()
  })
}

/** 等播放器状态文本出现（反控下失败形态必须是 AssertionError 而非超时）。 */
async function waitPlayerState(text: string): Promise<void> {
  await vi.waitFor(() => {
    expect(host.querySelector('.audio-player__state')?.textContent).toBe(text)
  })
}

function playerTime(): string {
  return host.querySelector('.audio-player__time')?.textContent ?? ''
}

function deleteDialog(): HTMLDialogElement {
  const dialog = host.querySelector<HTMLDialogElement>('dialog[aria-label="删除音效"]')
  expect(dialog, '删除音效对话框').not.toBeNull()
  return dialog!
}

async function blobSha(session: EditSession, path: string): Promise<string> {
  const blob = session.getState().assetBlobs[path]
  expect(blob, `blob ${path}`).toBeDefined()
  return sha256Hex(blob!.slice(0))
}

/** PCM 峰值线（排除进度线）。 */
function peakLines(): NodeListOf<Element> {
  return host.querySelectorAll('.audio-timeline__graphic line:not(.audio-timeline__progress)')
}

describe('K07 MusicTab 真实 wrapper 策略连接', () => {
  test('空目录接线 + 真实 .mid 导入入库 + 真实解析时间轴 + undo/redo + 无硬件端口播放降级', async () => {
    const mounted = await renderTab('music', await blankProjectBase('kimi-k07-music-import'))

    // 策略接线：标题/单位/导入入口/accept/空态全部来自 MUSIC_STRATEGY。
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('0 首')
    expect(buttonByLabel(host, '导入 MIDI')).toBeDefined()
    const importInput = inputByAriaLabel<HTMLInputElement>(host, '导入音乐')
    expect(importInput.accept).toBe('.mid,audio/midi')
    expect(host.querySelector('.ds-object-workspace .insp-empty')?.textContent).toBe(
      '项目中还没有音乐资源。',
    )

    const sha = await sha256Hex(THEME_MIDI)
    const id = `music.authored.${sha.slice(0, 16)}`
    const historyBefore = mounted.session.getHistoryVersion()
    await loadFilesIntoInput(importInput, [fileOfBytes('主题.mid', 'audio/midi', THEME_MIDI)])
    await vi.waitFor(() => {
      expect(mounted.session.getState().assetCatalog.assets[id]).toBeDefined()
    })

    // 入库合同：record 全字段精确、pending blob 字节与 sha 一致、选择与 focus 见证。
    const record = mounted.session.getState().assetCatalog.assets[id]!
    expect(record).toEqual({
      kind: 'music',
      path: `assets/authored/${sha}.mid`,
      mediaType: 'audio/midi',
      bytes: THEME_MIDI.byteLength,
      sha256: sha,
      label: '主题',
      origin: { kind: 'authored', ref: '主题.mid' },
    })
    expect(await blobSha(mounted.session, record.path)).toBe(sha)
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore + 1)
    expect(mounted.focusLog).toEqual([id])
    expect(catalogRow(id).hasAttribute('data-selected')).toBe(true)
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('主题')
    expect(host.textContent).toContain('audio/midi')
    expect(host.textContent).toContain('项目创作')
    expect(host.textContent).toContain(`${THEME_MIDI.byteLength} B`)
    // 注意：blank 项目没有 soundfont 资源，音乐入库后保存门会要求 audio.midiSoundfont
    // 角色（项目级保存政策），与本卡的导入/预览工作流无关，这里不断言 save-valid。

    // 真实解析：spessasynth_core 读出 duration=1.0s、160 个音符活动 bucket；
    // vel127 段满幅、两音符之间为 0、vel32 段归一高度≈0.25197。
    await waitPlayerState('就绪')
    expect(host.textContent).toContain('音符活动')
    expect(host.textContent).toContain('时间轴显示 MIDI 音符活动，不代表 PCM 振幅。')
    const rects = host.querySelectorAll('.audio-timeline__graphic rect')
    expect(rects).toHaveLength(160)
    expect(rects[0]!.getAttribute('height')).toBe('56')
    expect(rects[0]!.getAttribute('y')).toBe('4')
    expect(rects[50]!.getAttribute('height')).toBe('0')
    expect(Number(rects[100]!.getAttribute('height'))).toBeCloseTo(14.11023622047244, 6)
    expect(playerTime()).toContain('0:00 / 0:01')
    expect(
      host.querySelector('input[aria-label="音乐试听进度"]')?.getAttribute('aria-valuetext'),
    ).toBe('0:00 / 0:01')

    // undo/redo 对称：catalog 与 pending blob 同进同退。
    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[id]).toBeUndefined()
    expect(mounted.session.getState().assetBlobs[record.path]).toBeUndefined()
    await act(async () => {
      expect(mounted.session.redo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[id]?.sha256).toBe(sha)
    expect(mounted.session.getState().assetBlobs[record.path]?.byteLength).toBe(
      THEME_MIDI.byteLength,
    )
    await vi.waitFor(() => {
      expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('主题')
    })
    await waitPlayerState('就绪')

    // 无 AudioContext 的 jsdom 下 MIDI 播放走产品既定降级：错误面可见且零提交。
    const historyAtReady = mounted.session.getHistoryVersion()
    await clickButton(host, '播放')
    await vi.waitFor(() => {
      expect(host.textContent).toContain('当前浏览器不支持 MIDI 试听。')
    })
    expect(mounted.session.getHistoryVersion()).toBe(historyAtReady)
    await waitPlayerState('就绪')
  })

  test('同字节重复导入分配 -2 后缀 id；非法扩展名与坏魔数零提交且选择保全', async () => {
    const mounted = await renderTab('music', await blankProjectBase('kimi-k07-music-duplicate'))
    const sha = await sha256Hex(THEME_MIDI)
    const firstId = `music.authored.${sha.slice(0, 16)}`
    const input = inputByAriaLabel<HTMLInputElement>(host, '导入音乐')

    await loadFilesIntoInput(input, [fileOfBytes('a.mid', 'audio/midi', THEME_MIDI)])
    await vi.waitFor(() => {
      expect(mounted.session.getState().assetCatalog.assets[firstId]).toBeDefined()
    })
    // nextMusicId 碰撞后缀：同字节第二次导入得到 '<base>-2'，两条记录共存同一路径。
    await loadFilesIntoInput(input, [fileOfBytes('副本.mid', 'audio/midi', THEME_MIDI)])
    const secondId = `${firstId}-2`
    await vi.waitFor(() => {
      expect(mounted.session.getState().assetCatalog.assets[secondId]).toBeDefined()
    })
    expect(mounted.session.getState().assetCatalog.assets[secondId]).toEqual({
      ...mounted.session.getState().assetCatalog.assets[firstId]!,
      label: '副本',
      origin: { kind: 'authored', ref: '副本.mid' },
    })
    expect(mounted.focusLog).toEqual([firstId, secondId])
    expect(catalogRow(secondId).hasAttribute('data-selected')).toBe(true)
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('副本')

    // 非法扩展名：真实 assertMidi 拒绝，零提交且选择/记录保全。
    const historyBefore = mounted.session.getHistoryVersion()
    await loadFilesIntoInput(input, [fileOfBytes('bad.dat', 'audio/midi', THEME_MIDI)])
    await vi.waitFor(() => {
      expect(host.textContent).toContain('只允许导入 .mid 文件')
    })
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore)
    // 坏魔数：.mid 命名但首 4 字节不是 MThd。
    await loadFilesIntoInput(input, [
      fileOfBytes('bad.mid', 'audio/midi', new TextEncoder().encode('NOPE')),
    ])
    await vi.waitFor(() => {
      expect(host.textContent).toContain('不是有效 MIDI 文件')
    })
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore)
    expect(
      Object.keys(mounted.session.getState().assetCatalog.assets).filter((entry) =>
        entry.startsWith('music.authored.'),
      ),
    ).toEqual([firstId, secondId])
    expect(catalogRow(secondId).hasAttribute('data-selected')).toBe(true)
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('副本')
    expect(mounted.focusLog).toEqual([firstId, secondId])
  })
})

describe('K07 SoundTab 真实 wrapper 与 WAV transport 所有权', () => {
  let audio: AudioContextPort
  let frames: ManualAnimationFrames

  beforeEach(() => {
    audio = installAudioContextPort()
    frames = installManualAnimationFrames()
  })

  async function pumpFrames(): Promise<void> {
    await act(async () => {
      frames.pump()
    })
  }

  test('真实 .wav 导入经硬件端口真实解码出 PCM 峰值；同字节再导入覆盖稳定 id', async () => {
    const mounted = await renderTab('sound', await blankProjectBase('kimi-k07-sound-import'))

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
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
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

  test('播放/时钟/seek/暂停/自然结束的协议后果与单一预览所有权转移', async () => {
    const base = await blankProjectBase('kimi-k07-sound-play')
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
    const base = await blankProjectBase('kimi-k07-sound-switch')
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
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
      expect(context.closeCalls).toBe(1)
    })
  })

  test('替换非法 WAV 失败：selection/catalog/blob/解码计数全保全且零提交', async () => {
    const base = await blankProjectBase('kimi-k07-sound-replace-fail')
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
    await vi.waitFor(() => {
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

  test('删除生命周期：取消零提交、引用阻断禁用、解除后成功删除并 undo/redo 字节级还原', async () => {
    const base = await blankProjectBase('kimi-k07-sound-delete')
    const seeded = await seedSound(base, 'sound.hit', '命中音效', encodeWavPcm16(HIT_SAMPLES))
    await seedSound(base, 'sound.heal', '治疗音效', encodeWavPcm16(HEAL_SAMPLES))
    const mounted = await renderTab('sound', base, 'sound.hit')
    await waitPlayerState('就绪')
    const recordBefore = deepSnapshot(mounted.session.getState().assetCatalog.assets['sound.hit']!)

    // 取消侧：对话框打开后取消，零提交。
    await clickButton(host, '删除')
    expect(deleteDialog().open).toBe(true)
    expect(deleteDialog().textContent).toContain('0 处')
    const historyBefore = mounted.session.getHistoryVersion()
    await clickButton(deleteDialog(), '取消')
    await vi.waitFor(() => {
      expect(deleteDialog().open).toBe(false)
    })
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore)
    expect(mounted.session.getState().assetCatalog.assets['sound.hit']).toBeDefined()

    // 真实引用索引下删除确认禁用（fail-closed）。
    await act(async () => {
      mounted.session.dispatch(
        new UpdateManifestAssetRolesCommand({ 'audio.battleItemUseSound': 'sound.hit' }),
      )
    })
    await vi.waitFor(() => {
      expect(buttonByLabel(host, '删除').title).toBe('查看 1 处阻断引用')
    })
    await clickButton(host, '删除')
    expect(deleteDialog().textContent).toContain('1 处')
    expect(buttonByLabel(deleteDialog(), '删除音效').disabled).toBe(true)
    await clickButton(deleteDialog(), '取消')
    await vi.waitFor(() => {
      expect(deleteDialog().open).toBe(false)
    })
    expect(mounted.session.getState().assetCatalog.assets['sound.hit']).toBeDefined()
    expect(mounted.session.getState().manifest.assets.roles['audio.battleItemUseSound']).toBe(
      'sound.hit',
    )

    // 解除引用后删除成功：记录/pending blob 移除、选择前移到下一项、focus 见证。
    await act(async () => {
      mounted.session.dispatch(
        new UpdateManifestAssetRolesCommand({ 'audio.battleItemUseSound': undefined }),
      )
    })
    await vi.waitFor(() => {
      expect(buttonByLabel(host, '删除').title).toBe('删除当前音效')
    })
    await clickButton(host, '删除')
    await clickButton(deleteDialog(), '删除音效')
    await vi.waitFor(() => {
      expect(mounted.session.getState().assetCatalog.assets['sound.hit']).toBeUndefined()
    })
    expect(mounted.session.getState().assetBlobs[seeded.path]).toBeUndefined()
    expect(deleteDialog().open).toBe(false)
    expect(mounted.focusLog.at(-1)).toBe('sound.heal')
    await vi.waitFor(() => {
      expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('治疗音效')
    })
    expect(catalogRow('sound.heal').hasAttribute('data-selected')).toBe(true)
    await waitPlayerState('就绪')

    // undo 字节级还原（删除前预读字节物化回 pending blob），redo 再删。
    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets['sound.hit']).toEqual(recordBefore)
    expect(await blobSha(mounted.session, seeded.path)).toBe(recordBefore.sha256)
    await act(async () => {
      expect(mounted.session.redo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets['sound.hit']).toBeUndefined()
    expect(mounted.session.getState().assetBlobs[seeded.path]).toBeUndefined()
  })

  test('删除在途磁盘读取失败：错误身份透传、对话框保持开启、选择/记录保全、取消收尾', async () => {
    // 磁盘-only 音效：字节不入会话 blob，删除前预读必然落到磁盘端口闸门。
    const wav = encodeWavPcm16(HIT_SAMPLES)
    const sha = await sha256Hex(wav)
    const path = `assets/authored/${sha}.wav`
    const blank = await buildBlankProject('kimi-k07-disk')
    const catalogValue = blank['assets/index.json']
    if (typeof catalogValue !== 'object' || catalogValue === null)
      throw new Error('blank 种子缺资源 catalog')
    const catalog = catalogValue as AssetCatalogV1
    catalog.assets['sound.disk'] = {
      kind: 'sound',
      path,
      mediaType: 'audio/wav',
      bytes: wav.byteLength,
      sha256: sha,
      label: '磁盘音效',
      origin: { kind: 'authored', ref: 'disk.wav' },
    }
    blank[path] = wav.slice().buffer
    const gated = gatedFileSource(fsaSource(memoryAuthorDirectory(blank).dir))
    const project = await loadCurrentProjectFrom(gated.source)
    const state = toEditorState(
      project,
      await loadAllAuthorScenes(project),
      await loadAllProjectMaps(project),
      {},
      [],
    )
    assertProjectSaveValid(state)
    const session = new EditSession(state)

    // 播放器读取先卡在闸门（进入见证），放行后真实解码到就绪（退出见证）。
    const playerGate = gated.gate(path)
    await renderTab('sound', { session, source: gated.source }, 'sound.disk')
    await vi.waitFor(() => {
      expect(gated.calls).toContain(path)
    })
    expect(gated.completed).not.toContain(path)
    await waitPlayerState('正在读取…')
    await act(async () => {
      playerGate.resolve()
    })
    await waitPlayerState('就绪')
    expect(gated.completed).toContain(path)

    // 删除确认后的字节预读卡在第二道闸门：busy 在途、读取已进入但未完成。
    const recordBefore = deepSnapshot(session.getState().assetCatalog.assets['sound.disk']!)
    const historyBefore = session.getHistoryVersion()
    const deleteGate = gated.gate(path)
    await clickButton(host, '删除')
    await act(async () => {
      buttonByLabel(deleteDialog(), '删除音效').click()
    })
    await vi.waitFor(() => {
      expect(gated.calls.filter((entry) => entry === path)).toHaveLength(2)
    })
    expect(gated.completed.filter((entry) => entry === path)).toHaveLength(1)
    // busy 中确认按钮文案换成「处理中」，按 aria-busy 定位。
    const busyConfirm = deleteDialog().querySelector('button[aria-busy="true"]')
    expect(busyConfirm, '删除确认按钮 busy 在途').not.toBeNull()
    expect(busyConfirm!.textContent).toBe('处理中')

    // 闸门拒绝：错误身份原样透出，零提交，对话框保持开启且 busy 复位。
    await act(async () => {
      deleteGate.reject(new Error('注入磁盘故障'))
    })
    await vi.waitFor(() => {
      expect(host.textContent).toContain('注入磁盘故障')
    })
    expect(session.getHistoryVersion()).toBe(historyBefore)
    expect(session.getState().assetCatalog.assets['sound.disk']).toEqual(recordBefore)
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('磁盘音效')
    expect(catalogRow('sound.disk').hasAttribute('data-selected')).toBe(true)
    expect(deleteDialog().open).toBe(true)
    expect(buttonByLabel(deleteDialog(), '删除音效').getAttribute('aria-busy')).toBeNull()
    expect(gated.completed.filter((entry) => entry === path)).toHaveLength(1)
    expect(audio.contexts[0]!.decodeCalls).toBe(1)

    // 取消收尾：对话框关闭，仍零提交。
    await clickButton(deleteDialog(), '取消')
    await vi.waitFor(() => {
      expect(deleteDialog().open).toBe(false)
    })
    expect(session.getHistoryVersion()).toBe(historyBefore)
    expect(session.getState().assetCatalog.assets['sound.disk']).toEqual(recordBefore)
  })
})
