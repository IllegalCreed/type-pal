// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-UI-WAVE-1 U3b：ImageTab 残差。
 * 去重：ImageTab.test.tsx 已证目录/Tab 语义、删除提交与 undo、扫描失败零 I/O、
 * 迟到 oracle 零提交——本文件只补当前公开入口仍未证明的业务交互：
 * 立绘 PNG 导入真实提交（record/path/blobs/label/选择）、非法文件失败零提交、
 * 删除弹窗用户取消零提交且不做 I/O。
 */

// @ts-expect-error Node test-host bridge only.
import { webcrypto } from 'node:crypto'
import type { AssetCatalogV1 } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { inputByAccept, loadFilesIntoInput } from './__tests__/glm-ui-wave-kit.js'
import {
  catalogControlsAssetCatalog,
  catalogControlsEditorState,
  catalogControlsReader,
} from './catalog-controls-test-utils.js'
import { ImageTab } from './ImageTab.js'

const catalog: AssetCatalogV1 = structuredClone(catalogControlsAssetCatalog)

function Harness(props: {
  session: EditSession
  catalog?: AssetCatalogV1
  onObjectFocus?: (id: string | undefined) => void
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  return (
    <ImageTab
      assetBase={{} as never}
      catalog={props.catalog ?? current.assetCatalog}
      reader={catalogControlsReader as never}
      session={props.session}
      assetDiagnostics={[] as never}
      referenceIndex={collectCurrentProjectReferenceIndex(props.session.getState())}
      referenceStatus="current"
      getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
      onObjectFocus={props.onObjectFocus}
    />
  )
}

let root: Root
let host: HTMLDivElement

function pngFile(name = 'hero.png', bytes = 24): File {
  const buffer = new Uint8Array(bytes)
  buffer.set([137, 80, 78, 71, 13, 10, 26, 10], 0)
  return new File([buffer], name, { type: 'image/png' })
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width: 2, height: 2, close: vi.fn() })),
  )
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

describe('U3b ImageTab 残差', () => {
  test('立绘 PNG 导入真实提交：record/path/blobs/label/选择与 onObjectFocus', async () => {
    const session = new EditSession(catalogControlsEditorState())
    const focused: Array<string | undefined> = []
    await act(async () => {
      root.render(
        <Harness session={session} catalog={catalog} onObjectFocus={(id) => focused.push(id)} />,
      )
      await Promise.resolve()
    })
    const input = inputByAccept(host, '.png,image/png')
    await loadFilesIntoInput(input, [pngFile('新立绘.png')])
    await vi.waitFor(() => {
      expect(
        Object.keys(session.getState().assetCatalog.assets).filter((id) =>
          id.startsWith('portrait.authored.'),
        ),
      ).toHaveLength(1)
    })
    const id = Object.keys(session.getState().assetCatalog.assets).find((id) =>
      id.startsWith('portrait.authored.'),
    )!
    const record = session.getState().assetCatalog.assets[id]!
    expect(record.kind).toBe('portrait')
    expect(record.path).toMatch(/^assets\/authored\/portrait\/[0-9a-f]{64}\.png$/)
    expect(record.label).toBe('新立绘')
    expect(session.getState().assetBlobs[record.path]?.byteLength).toBe(24)
    expect(focused.at(-1)).toBe(id)
  })

  test('非 PNG 内容失败零提交并显示错误', async () => {
    const session = new EditSession(catalogControlsEditorState())
    await act(async () => {
      root.render(<Harness session={session} catalog={catalog} />)
      await Promise.resolve()
    })
    const before = session.getHistoryVersion()
    const input = inputByAccept(host, '.png,image/png')
    await loadFilesIntoInput(input, [new File([new Uint8Array(16)], 'poster.txt')])
    await vi.waitFor(() => {
      expect(host.textContent).toContain('只允许导入 PNG 文件')
    })
    expect(session.getHistoryVersion()).toBe(before)
    expect(
      Object.keys(session.getState().assetCatalog.assets).filter((id) =>
        id.startsWith('portrait.authored.'),
      ),
    ).toHaveLength(0)
  })

  test('删除弹窗用户取消 → 零提交零 I/O', async () => {
    const session = new EditSession(catalogControlsEditorState())
    await act(async () => {
      root.render(<Harness session={session} catalog={catalog} />)
      await Promise.resolve()
    })
    await act(async () => {})
    const readSpy = vi.spyOn(catalogControlsReader, 'readBytes')
    await clickDelete(host)
    const cancel = [...document.querySelectorAll<HTMLButtonElement>('dialog[open] button')].find(
      (candidate) => candidate.textContent?.trim() === '取消',
    )
    expect(cancel, '取消 button').not.toBeNull()
    const before = session.getHistoryVersion()
    await act(async () => cancel!.click())
    expect(readSpy).not.toHaveBeenCalled()
    expect(session.getHistoryVersion()).toBe(before)
    expect(session.getState().assetCatalog.assets['portrait.primary']).toBeDefined()
  })
})

async function clickDelete(hostNode: HTMLElement): Promise<void> {
  const del = [...hostNode.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === '删除',
  )
  expect(del, '删除 button').not.toBeNull()
  await act(async () => del!.click())
  await vi.waitFor(() => {
    expect(document.querySelectorAll('dialog[open]').length).toBeGreaterThan(0)
  })
}
