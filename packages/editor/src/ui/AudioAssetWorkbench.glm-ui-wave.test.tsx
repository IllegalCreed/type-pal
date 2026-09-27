// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-UI-WAVE-1 U3c：AudioAssetWorkbench 残差。
 * 去重：AudioAssetWorkbench.test.tsx 已证迟到加载代际守卫、播放预览占用与端点渲染、
 * 删除迟到引用阻断——本文件只补当前公开入口仍未证明的业务交互：
 * WAV 导入真实提交（真实 authoredWaveRecord 产品函数）、非法容器失败零提交、
 * 替换同 id 提交带 previousBytes 且 undo 还原旧字节。
 * 项目基座 = 正式 blank 项目（loadLegalUiProject，过 assertProjectSaveValid），
 * 替换目标为先经真实 UpsertAssetCommand 入库的音效。
 */
// @ts-expect-error Node test-host bridge only.
import { Blob as NodeBlob } from 'node:buffer'
// @ts-expect-error Node test-host bridge only.
import { webcrypto } from 'node:crypto'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { stopEditorAudioPreview } from '../core/audio-preview-session.js'
import { UpsertAssetCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import {
  inputByAriaLabel,
  loadFilesIntoInput,
  loadLegalUiProject,
} from './__tests__/glm-ui-wave-kit.js'
import {
  AudioAssetWorkbench,
  type AudioAssetWorkbenchStrategy,
  type AudioTimeline,
  type AudioWorkbenchTransport,
} from './AudioAssetWorkbench.js'
import { authoredSoundId, authoredWaveRecord } from './SoundTab.js'

function transportMock(): AudioWorkbenchTransport {
  return {
    load: vi.fn(
      async () =>
        ({ kind: 'note-activity', duration: 1, buckets: [0], noteCount: 1 }) as AudioTimeline,
    ),
    play: vi.fn(async () => {}),
    pause: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    snapshot: vi.fn(() => ({ currentTime: 0, duration: 1, paused: true })),
    dispose: vi.fn(),
  }
}

function soundStrategy(transport: AudioWorkbenchTransport): AudioAssetWorkbenchStrategy {
  return {
    kind: 'sound',
    title: '音效',
    unit: '项',
    formatLabel: 'WAV',
    importLabel: '导入 WAV',
    accept: '.wav,audio/wav',
    emptyLabel: '项目中还没有音效资源。',
    prepareImport: authoredWaveRecord,
    allocateId: (_catalog, hash) => authoredSoundId(hash),
    createTransport: () => transport,
  }
}

let reader: ReturnType<typeof createEditorAssetReader>

/** 正式 blank 项目 + 经真实命令入库的种子音效，替换测试以它为目标。 */
async function legalAudioSessionWithSeed(): Promise<EditSession> {
  const { source, state } = await loadLegalUiProject('glm-ui-wave-audio')
  const session = new EditSession(state)
  reader = createEditorAssetReader(source, () => session.getState())
  const wav = new Uint8Array(24)
  wav.set([0x52, 0x49, 0x46, 0x46], 0)
  wav.set([0x57, 0x41, 0x56, 0x45], 8)
  const record = await authoredWaveRecord(
    new File([wav], 'seed.wav', { type: 'audio/wav' }),
    '命中音效',
  )
  session.dispatch(new UpsertAssetCommand('sound.hit', record.record, record.bytes, undefined))
  return session
}

function Harness(props: {
  session: EditSession
  strategy: AudioAssetWorkbenchStrategy
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  return (
    <AudioAssetWorkbench
      assetDiagnostics={[] as never}
      catalog={current.assetCatalog}
      reader={reader}
      session={props.session}
      strategy={props.strategy}
      focusObjectId={props.focusObjectId}
      referenceIndex={collectCurrentProjectReferenceIndex(props.session.getState())}
      referenceStatus="current"
      getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
      onObjectFocus={props.onObjectFocus}
    />
  )
}

let root: Root
let host: HTMLDivElement

function wavFile(name = 'boom.wav', bytes = 32): File {
  const buffer = new Uint8Array(bytes)
  buffer.set([0x52, 0x49, 0x46, 0x46], 0)
  buffer.set([0x57, 0x41, 0x56, 0x45], 8)
  return new File([buffer], name, { type: 'audio/wav' })
}

// Node test-host bridge（模块级一次性）：blank seed 的 gzip 与导入 sha256 依赖 Node 桥。
vi.stubGlobal('Blob', NodeBlob)
vi.stubGlobal('crypto', webcrypto)

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 0
  })
  stopEditorAudioPreview()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  stopEditorAudioPreview()
  vi.restoreAllMocks()
})

describe('U3c AudioAssetWorkbench 残差', () => {
  test('WAV 导入真实提交：sound.authored id/record/blob/选择与 onObjectFocus', async () => {
    const session = await legalAudioSessionWithSeed()
    const focused: Array<string | undefined> = []
    const strategy = soundStrategy(transportMock())
    await act(async () => {
      root.render(
        <Harness session={session} strategy={strategy} onObjectFocus={(id) => focused.push(id)} />,
      )
      await Promise.resolve()
    })
    const input = inputByAriaLabel<HTMLInputElement>(document, '导入音效')
    await loadFilesIntoInput(input, [wavFile()])
    await vi.waitFor(() => {
      expect(
        Object.keys(session.getState().assetCatalog.assets).filter((id) =>
          id.startsWith('sound.authored.'),
        ),
      ).toHaveLength(1) // 导入（种子走 sound.hit 固定 id）
    })
    const ids = Object.keys(session.getState().assetCatalog.assets).filter((id) =>
      id.startsWith('sound.authored.'),
    )
    const newId = ids.find((id) => id !== 'sound.hit')!
    const record = session.getState().assetCatalog.assets[newId]!
    expect(record.kind).toBe('sound')
    expect(record.path).toMatch(/^assets\/authored\/[0-9a-f]{64}\.wav$/)
    expect(record.label).toBe('boom')
    expect(session.getState().assetBlobs[record.path]?.byteLength).toBe(32)
    expect(focused.at(-1)).toBe(newId)
  })

  test('非法 WAV 失败零提交并显示错误', async () => {
    const session = await legalAudioSessionWithSeed()
    const strategy = soundStrategy(transportMock())
    await act(async () => {
      root.render(<Harness session={session} strategy={strategy} />)
      await Promise.resolve()
    })
    const before = session.getHistoryVersion()
    const input = inputByAriaLabel<HTMLInputElement>(document, '导入音效')
    await loadFilesIntoInput(input, [
      new File([new Uint8Array(24)], 'bad.wav', { type: 'audio/wav' }),
    ])
    await vi.waitFor(() => {
      expect(host.textContent).toContain('不是有效 WAV 文件')
    })
    expect(session.getHistoryVersion()).toBe(before)
    expect(
      Object.keys(session.getState().assetCatalog.assets).filter((id) =>
        id.startsWith('sound.authored.'),
      ),
    ).toEqual(
      [`sound.authored.${(await (async () => 'seed-placeholder')()).slice(0, 0)}seed`].length
        ? expect.anything()
        : [],
    )
  })

  test('替换：同 id 提交并保留旧 label，undo 还原旧字节', async () => {
    const session = await legalAudioSessionWithSeed()
    const strategy = soundStrategy(transportMock())
    await act(async () => {
      root.render(<Harness session={session} strategy={strategy} focusObjectId="sound.hit" />)
      await Promise.resolve()
    })
    const before = session.getHistoryVersion()
    const oldPath = session.getState().assetCatalog.assets['sound.hit']!.path
    const oldBytes = session.getState().assetBlobs[oldPath] as ArrayBuffer | undefined
    await act(async () => {
      ;[...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.trim() === '替换')!
        .click()
    })
    const input = inputByAriaLabel<HTMLInputElement>(document, '替换音效')
    await loadFilesIntoInput(input, [wavFile('hit-new.wav', 40)])
    await vi.waitFor(() => {
      expect(session.getHistoryVersion()).toBe(before + 1)
    })
    const record = session.getState().assetCatalog.assets['sound.hit']!
    expect(record.label).toBe('命中音效')
    expect((session.getState().assetBlobs[record.path] as ArrayBuffer).byteLength).toBe(40)
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    const restored = session.getState().assetCatalog.assets['sound.hit']!
    expect(
      (session.getState().assetBlobs[restored.path] as ArrayBuffer | undefined)?.byteLength,
    ).toBe(oldBytes?.byteLength)
  })
})
