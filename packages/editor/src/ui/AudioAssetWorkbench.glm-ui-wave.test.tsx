// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-UI-WAVE-1 U3c：AudioAssetWorkbench 残差。
 * 去重：AudioAssetWorkbench.test.tsx 已证迟到加载代际守卫、播放预览占用与端点渲染、
 * 删除迟到引用阻断——本文件只补当前公开入口仍未证明的业务交互：
 * WAV 导入真实提交（真实 authoredWaveRecord 产品函数）、非法容器失败零提交、
 * 替换同 id 提交带 previousBytes 且 undo 还原旧字节。
 */

// @ts-expect-error Node test-host bridge only.
import { webcrypto } from 'node:crypto'
import type { AssetCatalogV1 } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { stopEditorAudioPreview } from '../core/audio-preview-session.js'
import { EditSession } from '../core/edit-session.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { clickButton, inputByAriaLabel, loadFilesIntoInput } from './__tests__/glm-ui-wave-kit.js'
import {
  AudioAssetWorkbench,
  type AudioAssetWorkbenchStrategy,
  type AudioTimeline,
  type AudioWorkbenchTransport,
} from './AudioAssetWorkbench.js'
import {
  catalogControlsAssetCatalog,
  catalogControlsEditorState,
  catalogControlsReader,
} from './catalog-controls-test-utils.js'
import { authoredSoundId, authoredWaveRecord } from './SoundTab.js'

const catalog: AssetCatalogV1 = structuredClone(catalogControlsAssetCatalog)

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

function Harness(props: {
  session: EditSession
  strategy: AudioAssetWorkbenchStrategy
  catalog?: AssetCatalogV1
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
      catalog={props.catalog ?? current.assetCatalog}
      reader={catalogControlsReader}
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

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('requestAnimationFrame', (callback: (time: number) => void) => {
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
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('U3c AudioAssetWorkbench 残差', () => {
  test('WAV 导入真实提交：sound.authored id/record/blob/选择与 onObjectFocus', async () => {
    const session = new EditSession(catalogControlsEditorState())
    const focused: Array<string | undefined> = []
    const strategy = soundStrategy(transportMock())
    await act(async () => {
      root.render(
        <Harness
          session={session}
          strategy={strategy}
          catalog={catalog}
          onObjectFocus={(id) => focused.push(id)}
        />,
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
      ).toHaveLength(1)
    })
    const id = Object.keys(session.getState().assetCatalog.assets).find((id) =>
      id.startsWith('sound.authored.'),
    )!
    const record = session.getState().assetCatalog.assets[id]!
    expect(record.kind).toBe('sound')
    expect(record.path).toMatch(/^assets\/authored\/[0-9a-f]{64}\.wav$/)
    expect(record.label).toBe('boom')
    expect(session.getState().assetBlobs[record.path]?.byteLength).toBe(32)
    expect(focused.at(-1)).toBe(id)
  })

  test('非法 WAV 失败零提交并显示错误', async () => {
    const session = new EditSession(catalogControlsEditorState())
    const strategy = soundStrategy(transportMock())
    await act(async () => {
      root.render(<Harness session={session} strategy={strategy} catalog={catalog} />)
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
    ).toHaveLength(0)
  })

  test('替换：同 id 提交并保留旧 label，undo 还原旧字节', async () => {
    const session = new EditSession(catalogControlsEditorState())
    const strategy = soundStrategy(transportMock())
    await act(async () => {
      root.render(
        <Harness
          session={session}
          strategy={strategy}
          catalog={catalog}
          focusObjectId="sound.hit"
        />,
      )
      await Promise.resolve()
    })
    const before = session.getHistoryVersion()
    const oldBytes = session.getState().assetBlobs[
      session.getState().assetCatalog.assets['sound.hit']!.path
    ] as ArrayBuffer | undefined
    await clickButton(host, '替换')
    const input = inputByAriaLabel<HTMLInputElement>(document, '替换音效')
    await loadFilesIntoInput(input, [wavFile('hit-new.wav', 40)])
    await vi.waitFor(() => {
      expect(session.getHistoryVersion()).toBe(before + 1)
    })
    const record = session.getState().assetCatalog.assets['sound.hit']!
    expect(record.label).toBe('命中音效')
    const newBlob = session.getState().assetBlobs[record.path] as ArrayBuffer | undefined
    expect(newBlob?.byteLength).toBe(40)
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    const restored = session.getState().assetCatalog.assets['sound.hit']!
    if (oldBytes) {
      expect(
        (session.getState().assetBlobs[restored.path] as ArrayBuffer | undefined)?.byteLength,
      ).toBe(oldBytes.byteLength)
    }
  })
})
