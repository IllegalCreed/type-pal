// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-UI-WAVE-1 U3a：CutsceneTab 残差。
 * 去重：CutsceneTab.test.tsx 已证目录/空态、live 引用阻断删除、迟到 oracle 零提交、
 * 脏守卫弃用弹窗、待导入帧本地重排——本文件只补当前公开入口仍未证明的业务交互：
 * 视频导入真实提交（record/path/blobs/选择与 onObjectFocus）、非法容器失败零提交、
 * 帧导入弹窗取消零提交。
 */

// @ts-expect-error Node test-host bridge only.
import { webcrypto } from 'node:crypto'
import type { AssetCatalogV1 } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import type { ProjectReferenceIndex } from '../core/project-reference.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { inputByAccept, loadFilesIntoInput } from './__tests__/glm-ui-wave-kit.js'
import { CutsceneTab } from './CutsceneTab.js'
import {
  catalogControlsAssetCatalog,
  catalogControlsEditorState,
  catalogControlsReader,
} from './catalog-controls-test-utils.js'

vi.mock('./FrameAnimationEditor.js', () => ({
  FrameAnimationEditor: () => <div data-testid="frame-editor" />,
}))

const catalog: AssetCatalogV1 = structuredClone(catalogControlsAssetCatalog)

function Harness(props: {
  session: EditSession
  catalog?: AssetCatalogV1
  onObjectFocus?: (id: string | undefined) => void
  referenceIndex?: ProjectReferenceIndex
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  return (
    <CutsceneTab
      assetBase={{} as never}
      catalog={props.catalog ?? current.assetCatalog}
      reader={catalogControlsReader as never}
      session={props.session}
      assetDiagnostics={[] as never}
      referenceIndex={
        props.referenceIndex ?? collectCurrentProjectReferenceIndex(props.session.getState())
      }
      referenceStatus="current"
      getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
      onObjectFocus={props.onObjectFocus}
    />
  )
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('crypto', webcrypto)
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function mp4File(name = 'clip.mp4', bytes = 32): File {
  const buffer = new Uint8Array(bytes)
  buffer.set([0x66, 0x74, 0x79, 0x70], 4)
  return new File([buffer], name, { type: 'video/mp4' })
}

describe('U3a CutsceneTab 残差', () => {
  test('视频导入真实提交：record/blobs/选择与 onObjectFocus', async () => {
    const session = new EditSession(catalogControlsEditorState())
    const focused: Array<string | undefined> = []
    await act(async () => {
      root.render(
        <Harness session={session} catalog={catalog} onObjectFocus={(id) => focused.push(id)} />,
      )
      await Promise.resolve()
    })
    const before = session.getHistoryVersion()
    const input = inputByAccept(host, 'video/mp4,video/webm')
    await loadFilesIntoInput(input, [mp4File()])
    await vi.waitFor(() => {
      expect(
        Object.keys(session.getState().assetCatalog.assets).filter((id) =>
          id.startsWith('video.authored.'),
        ),
      ).toHaveLength(1)
    })
    const assets = session.getState().assetCatalog.assets
    const ids = Object.keys(assets).filter((id) => id.startsWith('video.authored.'))
    expect(ids).toHaveLength(1)
    const record = assets[ids[0]!]!
    expect(record.kind).toBe('video')
    expect(record.path).toMatch(/^assets\/authored\/video\/[0-9a-f]{64}\.mp4$/)
    expect(record.bytes).toBe(32)
    expect(session.getState().assetBlobs[record.path]?.byteLength).toBe(32)
    expect(session.getHistoryVersion()).toBe(before + 1)
    expect(focused.at(-1)).toBe(ids[0])
  })

  test('非 MP4/WebM 内容失败零提交并显示错误', async () => {
    const session = new EditSession(catalogControlsEditorState())
    await act(async () => {
      root.render(<Harness session={session} catalog={catalog} />)
      await Promise.resolve()
    })
    const before = session.getHistoryVersion()
    const input = inputByAccept(host, 'video/mp4,video/webm')
    const bad = new File([new Uint8Array(24)], 'broken.mp4', { type: 'video/mp4' })
    await loadFilesIntoInput(input, [bad])
    await act(async () => {})
    await act(async () => {})
    expect(session.getHistoryVersion()).toBe(before)
    expect(host.textContent).toContain('只支持有效的 MP4 或 WebM')
    expect(
      Object.keys(session.getState().assetCatalog.assets).filter((id) =>
        id.startsWith('video.authored.'),
      ),
    ).toHaveLength(0)
  })

  test('帧导入弹窗取消 → 零提交', async () => {
    const session = new EditSession(catalogControlsEditorState())
    await act(async () => {
      root.render(<Harness session={session} catalog={catalog} />)
      await Promise.resolve()
    })
    const input = inputByAccept(host, 'image/png,image/jpeg,image/webp')
    await loadFilesIntoInput(input, [new File(['1'], 'frame-1.png', { type: 'image/png' })])
    await vi.waitFor(() => {
      expect(document.querySelectorAll('dialog[open]').length).toBeGreaterThan(0)
    })
    const before = session.getHistoryVersion()
    const cancel = [...document.querySelectorAll<HTMLButtonElement>('dialog[open] button')].find(
      (candidate) => candidate.textContent?.trim() === '取消',
    )
    expect(cancel, '取消 button').not.toBeNull()
    await act(async () => cancel!.click())
    await act(async () => {})
    expect(document.querySelectorAll('dialog[open]').length).toBe(0)
    expect(session.getHistoryVersion()).toBe(before)
  })
})
