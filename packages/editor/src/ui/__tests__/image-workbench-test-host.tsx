import type { AssetRecordV1 } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, vi } from 'vitest'
import { installBrowserHardwarePorts } from '../../__tests__/bitmap-test-port.js'
import { pngFileOf } from '../../__tests__/png-fixtures.js'
import { installReactActEnvironment, waitForReact } from '../../__tests__/react-io-wait.js'
import { EditSession } from '../../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../../core/editor-asset-reader.js'
import type { EditorDerivedStatus } from '../../core/editor-derived-contract.js'
import { assertProjectSaveValid } from '../../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../../core/project-reference-adapters.js'
import { ImageTab } from '../ImageTab.js'
import { loadLegalUiProject } from './authoring-project-fixture.js'
import { clickButton, loadFilesIntoInput } from './dom-gestures.js'
import {
  type ImageDecodePort,
  type ImageDomPort,
  installImageDecodePort,
  installImageDomPorts,
  restoreImageDomPorts,
} from './image-preview-ports.js'

const PNG_ACCEPT = '.png,image/png'

interface MountedImageWorkbench {
  session: EditSession
  assetBase: AssetBase
  reader: EditorAssetReader
  focusLog: Array<string | undefined>
}

function ImageWorkbenchHost(props: {
  session: EditSession
  assetBase: AssetBase
  reader: EditorAssetReader
  focusLog: Array<string | undefined>
  initialFocus?: string
  referenceStatus: EditorDerivedStatus
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const [focus, setFocus] = useState(props.initialFocus)
  return (
    <ImageTab
      assetBase={props.assetBase}
      catalog={current.assetCatalog}
      reader={props.reader}
      session={props.session}
      assetDiagnostics={[]}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus={props.referenceStatus}
      getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
      focusObjectId={focus}
      onObjectFocus={(id) => {
        props.focusLog.push(id)
        setFocus(id)
      }}
    />
  )
}

export function installImageWorkbenchTestHost() {
  const host = document.createElement('div')
  let root: Root | undefined
  let restoreAct: () => void
  let decodePort: ImageDecodePort
  let domPort: ImageDomPort

  beforeEach(() => {
    restoreAct = installReactActEnvironment()
    installBrowserHardwarePorts()
    decodePort = installImageDecodePort()
    domPort = installImageDomPorts()
    document.body.append(host)
    root = createRoot(host)
  })

  async function unmount() {
    const current = root
    root = undefined
    if (current) await act(async () => current.unmount())
  }

  afterEach(async () => {
    try {
      await unmount()
    } finally {
      host.remove()
      restoreImageDomPorts()
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
      restoreAct()
    }
  })

  async function mountTab(
    options: {
      focus?: string
      referenceStatus?: EditorDerivedStatus
      prepare?: (mounted: MountedImageWorkbench) => Promise<void>
    } = {},
  ): Promise<MountedImageWorkbench> {
    const legal = await loadLegalUiProject('image-workbench')
    const session = new EditSession(legal.state)
    const reader = createEditorAssetReader(legal.source, () => session.getState())
    const focusLog: Array<string | undefined> = []
    const mounted = { session, assetBase: legal.assetBase, reader, focusLog }
    await options.prepare?.(mounted)
    assertProjectSaveValid(session.getState())
    const current = root
    if (!current) throw new Error('Image workbench host is not mounted')
    await act(async () => {
      current.render(
        <ImageWorkbenchHost
          session={session}
          assetBase={legal.assetBase}
          reader={reader}
          focusLog={focusLog}
          initialFocus={options.focus}
          referenceStatus={options.referenceStatus ?? 'current'}
        />,
      )
      await Promise.resolve()
    })
    return mounted
  }

  /** 两个隐藏文件输入按 JSX 顺序固定：importInputRef 在前，replaceInputRef 在后。 */
  function fileInputAt(index: number): HTMLInputElement {
    const inputs = host.querySelectorAll<HTMLInputElement>(
      `input[type="file"][accept="${PNG_ACCEPT}"]`,
    )
    expect(inputs, '导入/替换两个隐藏文件输入').toHaveLength(2)
    return inputs[index]!
  }

  async function importPng(name: string, png: Uint8Array): Promise<void> {
    await loadFilesIntoInput(fileInputAt(0), [pngFileOf(name, png)])
  }

  async function replacePng(name: string, png: Uint8Array): Promise<void> {
    await clickButton(host, '替换')
    await loadFilesIntoInput(fileInputAt(1), [pngFileOf(name, png)])
  }

  async function switchKindTab(label: string): Promise<void> {
    const tab = [
      ...host.querySelectorAll<HTMLButtonElement>(
        '[role="tablist"][aria-label="图像类型"] [role="tab"]',
      ),
    ].find((candidate) => candidate.textContent?.trim() === label)
    expect(tab, `图像类型 Tab ${label}`).toBeDefined()
    await act(async () => tab!.click())
  }

  function imageRow(id: string): HTMLButtonElement {
    const row = [
      ...host.querySelectorAll<HTMLButtonElement>('.image-asset-list .ds-catalog-row'),
    ].find((candidate) => candidate.querySelector('.ds-catalog-row__meta')?.textContent === id)
    expect(row, `图像行 ${id}`).toBeDefined()
    return row!
  }

  async function clickImageRow(id: string): Promise<void> {
    await act(async () => imageRow(id).click())
  }

  function previewStage(): HTMLElement {
    const stage = host.querySelector<HTMLElement>('section[aria-label*="图片预览"]')
    expect(stage, '图片预览舞台').not.toBeNull()
    return stage!
  }

  async function waitPreviewSize(text: string): Promise<void> {
    await waitForReact(() => {
      expect(host.querySelector('.image-preview-size')?.textContent).toBe(text)
    })
  }

  /** 读组件预览画布的真实像素（node-canvas 2d 后端真实读回）。 */
  function previewCanvasPixels(): { width: number; height: number; rgba: Uint8ClampedArray } {
    const canvas = host.querySelector<HTMLCanvasElement>('.image-preview-surface canvas')
    expect(canvas, '预览画布').not.toBeNull()
    const context = canvas!.getContext('2d', { willReadFrequently: true })
    expect(context, '预览画布上下文').not.toBeNull()
    return {
      width: canvas!.width,
      height: canvas!.height,
      rgba: context!.getImageData(0, 0, canvas!.width, canvas!.height).data,
    }
  }

  function zoomOutput(): string {
    const output = host.querySelector('.ds-zoom-toolbar__value')?.textContent
    expect(output, '缩放读数').toBeTruthy()
    return output!
  }

  async function pressOnStage(key: string): Promise<KeyboardEvent> {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    await act(async () => {
      previewStage().dispatchEvent(event)
    })
    return event
  }

  async function wheelOnStage(deltaY: number): Promise<void> {
    await act(async () => {
      previewStage().dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY,
          clientX: 10,
          clientY: 10,
        }),
      )
    })
  }

  async function pointerOnStage(
    type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
    init: PointerEventInit,
  ): Promise<void> {
    await act(async () => {
      previewStage().dispatchEvent(
        new PointerEvent(type, { bubbles: true, cancelable: true, ...init }),
      )
    })
  }

  /** jsdom pretendToBeVisual 的真实 rAF 冲刷（applyZoom/fitPreview 的滚动调整在其回调内）。 */
  async function flushAnimationFrame(): Promise<void> {
    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    })
  }

  async function waitOutlinerError(): Promise<string> {
    await waitForReact(() => {
      expect(host.querySelector('.image-library-outliner .cf-err')).not.toBeNull()
    })
    return host.querySelector('.image-library-outliner .cf-err')!.textContent!
  }

  function heroTitle(): string {
    const title = host.querySelector('.ds-object-hero__title')?.textContent
    expect(title, 'hero 标题').toBeTruthy()
    return title!
  }

  async function waitCatalogAsset(
    mounted: MountedImageWorkbench,
    id: string,
  ): Promise<AssetRecordV1> {
    await waitForReact(() => {
      expect(mounted.session.getState().assetCatalog.assets[id], `catalog 应有 ${id}`).toBeDefined()
    })
    return mounted.session.getState().assetCatalog.assets[id]!
  }

  return {
    host,
    mountTab,
    unmount,
    fileInputAt,
    importPng,
    replacePng,
    switchKindTab,
    imageRow,
    clickImageRow,
    previewStage,
    waitPreviewSize,
    previewCanvasPixels,
    zoomOutput,
    pressOnStage,
    wheelOnStage,
    pointerOnStage,
    flushAnimationFrame,
    waitOutlinerError,
    heroTitle,
    waitCatalogAsset,
    bitmaps: () => decodePort,
    dom: () => domPort,
  }
}
