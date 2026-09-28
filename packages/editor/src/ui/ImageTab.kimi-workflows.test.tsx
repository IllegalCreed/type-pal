// @vitest-environment jsdom
/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K05：ImageTab 真实图像工作流补测（锚 ImageTab.tsx:209/233/378/502）。
 *
 * 旧断言去重（旧 file/title → 已证合同 → 本组缺口；已证族登记 existing-proof 不复制）：
 * - ImageTab.test.tsx（catalogControls 合成 catalog + 字面量假 reader + assetBase {} as never）：
 *   - 'preserves filtered count semantics and switches the image scope through shared tabs'
 *     → 已证筛选计数/kind Tab 切换/空态文案；existing-proof，不重复（本文件切 Tab 仅作战场背景前置步骤）。
 *   - 'keeps delete on the selected object hero and restores the record and bytes on undo'
 *     → 已证删除提交与 undo 还原 record/bytes（4 字节假字节、假 reader）；缺口：真实字节删除链——
 *     真实引用索引 0 处确认、选择回退到真实资源、undo 后字节可真实解码（本文件第 9 例）。
 *   - 'shows an unknown reference count and performs no I/O when reference scanning fails'
 *     → 已证扫描失败删除禁用 + 零 I/O；existing-proof，不重复。
 *   - 'does not commit deletion when the live oracle changes during the byte read'
 *     → 已证删除读取竞态 fail-closed（mock reader 闸门）；existing-proof，不重复。
 * - ImageTab.glm-ui-wave.test.tsx（合法 blank 项目 + 真实 reader，但 createImageBitmap 假 2×2、
 *   PNG 字节仅签名头、无真实解码）：
 *   - '立绘 PNG 导入真实提交：record/path/blobs/label/选择与 onObjectFocus'
 *     → 已证导入提交骨架；缺口：真实 PNG 解码 → 实际像素/尺寸/摘要入库、undo/redo 对称（第 1 例）。
 *   - '非 PNG 内容失败零提交并显示错误'、'删除弹窗用户取消 → 零提交零 I/O'
 *     → 已证（任务指定不重抄）；existing-proof。
 * - AssetInspectorTabs.test.tsx 'ImageTab 使用资源/引用 canonical Inspector' 与
 *   'Image 独立诊断页与 Sound 引用页诊断均随当前资源过滤'
 *   → 已证检查器 Tab 结构/引用行/诊断过滤；existing-proof，不重复。
 * - image-import.stages.test.ts / image-import.cleanup.test.ts（mock canvas host，假解码假 toBlob）
 *   → 已证 prepareAuthoredImage/nextAuthoredImageId 核心函数级守卫与产物；缺口：组件 DOM 真实入口
 *   下 node-canvas 真实像素链（第 1/3/4/5/6 例）。
 * - FrameAnimationEditor.test.ts 已单元覆盖 clampMediaPreviewZoom 含非有限值归一；existing-proof。
 * - MediaAssetLifecycle.test.tsx → MediaAssetNameField 单元合同已证；existing-proof，不重复。
 * - 命令层 asset-reference-commands.test.ts 已证 DeleteAssetCommand 引用阻断/竞态；existing-proof。
 *   ImageTab 替换入口（hero 替换 → 第二文件输入 → importFile targetId 分支）、BattleImportReview
 *   评审链（ImageTab.tsx:502 commitImport）、nextAuthoredImageId -2 派生的组件级见证、
 *   ImageWorkspacePreview（209 滚轮缩放/233 拖拽平移/键盘/迟到解码归属/错误面/色盘重映射）
 *   在任何旧测试中均未触达 —— 即本文件第 1–8 例。
 *
 * 本文件全部走真实组件 DOM → EditSession/commands/EditorAssetReader + 合法 blank 项目
 * （loadLegalUiProject）；PNG 经 kit 真实编码、node-canvas 真实解码（k05-fixtures 硬件端口），
 * jsdom 2d canvas 为真实像素。唯一替身：k05-fixtures 的浏览器硬件端口（真实 PNG 解码 +
 * 进入/完成/close 见证与解码闸门、jsdom 缺失的 pointer capture/scrollTo/object URL/布局视口）。
 */
import type { AssetRecordV1 } from '@type-pal/content'
import { type AssetBase, loadStandardPalette } from '@type-pal/reforge'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { sha256Hex } from '../core/binary-signature.js'
import { UpsertAssetCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import type { StaticImageKind } from '../core/static-image.js'
import {
  buttonByLabel,
  clickButton,
  loadFilesIntoInput,
  loadLegalUiProject,
  setInputValue,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import {
  type ImageDecodePort,
  type ImageDomPort,
  installImageDecodePort,
  installImageDomPorts,
  restoreImageDomPorts,
} from './__tests__/kimi-editor-workflows/k05-fixtures.js'
import {
  atlasColors,
  installBrowserHardwarePorts,
  pngFileOf,
  pngRgba,
} from './__tests__/kimi-editor-workflows/kit.js'
import { ImageTab } from './ImageTab.js'

const PNG_ACCEPT = '.png,image/png'

interface Mounted {
  session: EditSession
  assetBase: AssetBase
  reader: EditorAssetReader
  focusLog: Array<string | undefined>
}

function Harness(props: {
  session: EditSession
  assetBase: AssetBase
  reader: EditorAssetReader
  focusLog: Array<string | undefined>
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const [focus, setFocus] = useState<string | undefined>(undefined)
  return (
    <ImageTab
      assetBase={props.assetBase}
      catalog={current.assetCatalog}
      reader={props.reader}
      session={props.session}
      assetDiagnostics={[]}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
      focusObjectId={focus}
      onObjectFocus={(id) => {
        props.focusLog.push(id)
        setFocus(id)
      }}
    />
  )
}

let root: Root
let host: HTMLDivElement
let decodePort: ImageDecodePort
let domPort: ImageDomPort

beforeEach(() => {
  useActEnvironment()
  installBrowserHardwarePorts()
  decodePort = installImageDecodePort()
  domPort = installImageDomPorts()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  restoreImageDomPorts()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function mountTab(): Promise<Mounted> {
  const legal = await loadLegalUiProject('kimi-k05-image')
  const session = new EditSession(legal.state)
  const reader = createEditorAssetReader(legal.source, () => session.getState())
  const focusLog: Array<string | undefined> = []
  await act(async () => {
    root.render(
      <Harness session={session} assetBase={legal.assetBase} reader={reader} focusLog={focusLog} />,
    )
    await Promise.resolve()
  })
  return { session, assetBase: legal.assetBase, reader, focusLog }
}

/** 交替色真实像素块（解码/量化期望的独立计算输入）。 */
function patternedRgba(
  width: number,
  height: number,
  colors: readonly (readonly [number, number, number, number])[],
): Uint8Array {
  const rgba = new Uint8Array(width * height * 4)
  for (let pixel = 0; pixel < width * height; pixel += 1)
    rgba.set(colors[pixel % colors.length]!, pixel * 4)
  return rgba
}

/** 真实命令播种静态图像：record 的 bytes/sha256 与真实 PNG 字节自洽（guard 可接受）。 */
async function seedImage(
  mounted: Mounted,
  input: { id: string; kind: StaticImageKind; label: string; png: Uint8Array },
): Promise<{ record: AssetRecordV1; bytes: ArrayBuffer }> {
  const copy = input.png.slice()
  const bytes = copy.buffer as ArrayBuffer
  const sha256 = await sha256Hex(copy)
  const record: AssetRecordV1 = {
    kind: input.kind,
    path: `assets/authored/${input.kind}/${sha256}.png`,
    mediaType: 'image/png',
    bytes: bytes.byteLength,
    sha256,
    label: input.label,
    origin: { kind: 'authored', ref: `${input.label}.png` },
  }
  await act(async () => {
    mounted.session.dispatch(new UpsertAssetCommand(input.id, record, bytes.slice(0)))
  })
  return { record, bytes }
}

/** 独立真实解码 oracle：经同一硬件端口真实解码 PNG 字节并逐像素读回。 */
async function decodePngPixels(
  bytes: ArrayBuffer | Uint8Array,
): Promise<{ width: number; height: number; rgba: Uint8ClampedArray }> {
  const copy = bytes instanceof Uint8Array ? bytes.slice() : new Uint8Array(bytes.slice(0))
  const bitmap = await createImageBitmap(
    new Blob([copy.buffer as ArrayBuffer], { type: 'image/png' }),
  )
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  expect(context, '解码画布上下文').not.toBeNull()
  context!.drawImage(bitmap, 0, 0)
  bitmap.close()
  const image = context!.getImageData(0, 0, canvas.width, canvas.height)
  return { width: canvas.width, height: canvas.height, rgba: image.data }
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
  await vi.waitFor(() => {
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
  await vi.waitFor(() => {
    expect(host.querySelector('.image-library-outliner .cf-err')).not.toBeNull()
  })
  return host.querySelector('.image-library-outliner .cf-err')!.textContent!
}

function heroTitle(): string {
  const title = host.querySelector('.ds-object-hero__title')?.textContent
  expect(title, 'hero 标题').toBeTruthy()
  return title!
}

async function waitCatalogAsset(mounted: Mounted, id: string): Promise<AssetRecordV1> {
  await vi.waitFor(() => {
    expect(mounted.session.getState().assetCatalog.assets[id], `catalog 应有 ${id}`).toBeDefined()
  })
  return mounted.session.getState().assetCatalog.assets[id]!
}

describe('K05 ImageTab 真实图像工作流', () => {
  test('真实 PNG 导入：像素/尺寸/摘要落账，undo 停留缺失面板，redo 还原', async () => {
    const mounted = await mountTab()
    expect(host.textContent).toContain('此项目还没有立绘。')
    const colors = atlasColors(2)
    const rgba = patternedRgba(6, 4, colors)
    const png = pngRgba(6, 4, rgba)
    const sha = await sha256Hex(png)
    const id = `portrait.authored.${sha.slice(0, 16)}`
    const historyAtMount = mounted.session.getHistoryVersion()

    await importPng('英雄立绘.png', png)
    const record = await waitCatalogAsset(mounted, id)
    expect(record).toEqual({
      kind: 'portrait',
      path: `assets/authored/portrait/${sha}.png`,
      mediaType: 'image/png',
      bytes: png.byteLength,
      sha256: sha,
      label: '英雄立绘',
      origin: { kind: 'authored', ref: '英雄立绘.png' },
    } satisfies AssetRecordV1)
    const blob = mounted.session.getState().assetBlobs[record.path]
    expect(blob).toBeDefined()
    expect(blob!.byteLength).toBe(png.byteLength)
    expect(await sha256Hex(blob!)).toBe(sha)
    expect(new Uint8Array(blob!)).toEqual(png)
    expect(mounted.session.getHistoryVersion()).toBeGreaterThan(historyAtMount)
    expect(mounted.session.isDirty()).toBe(true)
    assertProjectSaveValid(mounted.session.getState())

    // 选中/焦点/hero/检查器摘要全部落在新资源上。
    expect(imageRow(id).getAttribute('aria-pressed')).toBe('true')
    expect(mounted.focusLog).toEqual([id])
    expect(heroTitle()).toBe('英雄立绘')
    expect(host.querySelector('.ds-object-hero__id')?.textContent).toBe(id)
    expect(host.querySelector('.ds-object-hero__meta')?.textContent).toContain('项目创作')
    const inspector = host.querySelector('.image-inspector')!
    expect(inspector.querySelector('[data-property-label="AssetId"] code')?.textContent).toBe(id)
    expect(inspector.querySelector('[data-property-label="文件"] code')?.textContent).toBe(
      record.path,
    )
    expect(
      inspector.querySelector('[data-property-label="来源"] .ds-property-row__value')?.textContent,
    ).toBe('项目创作')
    expect(
      inspector.querySelector('[data-property-label="大小"] .ds-property-row__value')?.textContent,
    ).toBe(`${png.byteLength} B`)

    // 预览真实解码：尺寸文案与画布像素逐字节等于输入 PNG。
    await waitPreviewSize('6 × 4')
    const shown = previewCanvasPixels()
    expect(shown.width).toBe(6)
    expect(shown.height).toBe(4)
    expect(Array.from(shown.rgba)).toEqual(Array.from(rgba))
    expect(decodePort.liveBitmaps()).toBe(0)

    // undo：catalog/blob 移除；harness 焦点钉在被撤销 id 上，组件停留在缺失面板而非跳走。
    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[id]).toBeUndefined()
    expect(mounted.session.getState().assetBlobs[record.path]).toBeUndefined()
    await expect(mounted.reader.readBytes(id, 'portrait')).rejects.toThrow('不在 catalog')
    const missing = host.querySelector('.image-missing-target')
    expect(missing, '缺失目标面板').not.toBeNull()
    expect(missing!.textContent).toContain(id)
    expect(missing!.textContent).toContain('不会跳到其他图片')

    // redo：record 精确还原，预览重新真实解码出原像素。
    await act(async () => {
      expect(mounted.session.redo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[id]).toEqual(record)
    expect(await sha256Hex(mounted.session.getState().assetBlobs[record.path]!)).toBe(sha)
    await waitPreviewSize('6 × 4')
    expect(Array.from(previewCanvasPixels().rgba)).toEqual(Array.from(rgba))
    assertProjectSaveValid(mounted.session.getState())
  })

  test('同字节再导入派生 -2 后缀 id；真实资源间选择切换零提交且预览互换真实像素', async () => {
    const mounted = await mountTab()
    const rgbaA = patternedRgba(6, 4, atlasColors(2))
    const pngA = pngRgba(6, 4, rgbaA)
    const shaA = await sha256Hex(pngA)
    const idA = `portrait.authored.${shaA.slice(0, 16)}`
    const rgbaC = patternedRgba(10, 5, atlasColors(16).slice(2, 4))
    const pngC = pngRgba(10, 5, rgbaC)
    const shaC = await sha256Hex(pngC)
    const idC = `portrait.authored.${shaC.slice(0, 16)}`

    await importPng('甲.png', pngA)
    await waitCatalogAsset(mounted, idA)
    // 同字节再导入：hash 相同 → base id 被占 → 派生 -2；label/origin 取自新文件名。
    await importPng('乙.png', pngA)
    const idB = `${idA}-2`
    const recordB = await waitCatalogAsset(mounted, idB)
    expect(recordB).toEqual({
      kind: 'portrait',
      path: `assets/authored/portrait/${shaA}.png`,
      mediaType: 'image/png',
      bytes: pngA.byteLength,
      sha256: shaA,
      label: '乙',
      origin: { kind: 'authored', ref: '乙.png' },
    } satisfies AssetRecordV1)
    await importPng('丙.png', pngC)
    await waitCatalogAsset(mounted, idC)
    const assets = mounted.session.getState().assetCatalog.assets
    expect(Object.keys(assets).filter((key) => key.startsWith('portrait.authored.'))).toHaveLength(
      3,
    )
    // 同字节两条 record 共享同一 blob 路径；丙独立路径。
    expect(
      Object.keys(mounted.session.getState().assetBlobs).filter((path) =>
        path.startsWith('assets/authored/portrait/'),
      ),
    ).toHaveLength(2)
    expect(mounted.focusLog).toEqual([idA, idB, idC])
    assertProjectSaveValid(mounted.session.getState())

    // 选择切换是纯浏览：预览按目标真实重载，历史版本不动。
    const historyAfterImports = mounted.session.getHistoryVersion()
    await clickImageRow(idA)
    await waitPreviewSize('6 × 4')
    expect(Array.from(previewCanvasPixels().rgba)).toEqual(Array.from(rgbaA))
    expect(heroTitle()).toBe('甲')
    await clickImageRow(idC)
    await waitPreviewSize('10 × 5')
    expect(Array.from(previewCanvasPixels().rgba)).toEqual(Array.from(rgbaC))
    expect(heroTitle()).toBe('丙')
    expect(imageRow(idC).getAttribute('aria-pressed')).toBe('true')
    await clickImageRow(idB)
    await waitPreviewSize('6 × 4')
    expect(heroTitle()).toBe('乙')
    expect(mounted.focusLog).toEqual([idA, idB, idC, idA, idC, idB])
    expect(mounted.session.getHistoryVersion()).toBe(historyAfterImports)
    expect(decodePort.liveBitmaps()).toBe(0)
  })

  test('替换链：保留 label 真实换字节、撤销物化旧字节可解码、预览按新 sha 重载', async () => {
    const mounted = await mountTab()
    const rgbaA = patternedRgba(6, 4, atlasColors(2))
    const pngA = pngRgba(6, 4, rgbaA)
    const shaA = await sha256Hex(pngA)
    const id = `portrait.authored.${shaA.slice(0, 16)}`
    await importPng('旧立绘.png', pngA)
    const recordA = await waitCatalogAsset(mounted, id)
    await waitPreviewSize('6 × 4')
    const historyAfterImport = mounted.session.getHistoryVersion()

    const rgbaB = patternedRgba(10, 5, atlasColors(16).slice(4, 6))
    const pngB = pngRgba(10, 5, rgbaB)
    const shaB = await sha256Hex(pngB)
    await replacePng('新立绘.png', pngB)
    await vi.waitFor(() => {
      expect(mounted.session.getState().assetCatalog.assets[id]?.sha256).toBe(shaB)
    })
    // AssetId 与 label 不动；path/bytes/sha/origin.ref 按新内容落账。
    const recordB = mounted.session.getState().assetCatalog.assets[id]!
    expect(recordB).toEqual({
      kind: 'portrait',
      path: `assets/authored/portrait/${shaB}.png`,
      mediaType: 'image/png',
      bytes: pngB.byteLength,
      sha256: shaB,
      label: '旧立绘',
      origin: { kind: 'authored', ref: '新立绘.png' },
    } satisfies AssetRecordV1)
    expect(mounted.session.getState().assetBlobs[recordA.path]).toBeUndefined()
    const blobB = mounted.session.getState().assetBlobs[recordB.path]
    expect(blobB).toBeDefined()
    expect(new Uint8Array(blobB!)).toEqual(pngB)
    expect(mounted.session.getHistoryVersion()).toBeGreaterThan(historyAfterImport)
    assertProjectSaveValid(mounted.session.getState())
    // 预览按新 sha key 重载：新尺寸新像素；摘要同步更新；选择停留原 id。
    await waitPreviewSize('10 × 5')
    expect(Array.from(previewCanvasPixels().rgba)).toEqual(Array.from(rgbaB))
    expect(heroTitle()).toBe('旧立绘')
    expect(imageRow(id).getAttribute('aria-pressed')).toBe('true')
    expect(mounted.focusLog.at(-1)).toBe(id)
    const inspector = host.querySelector('.image-inspector')!
    expect(inspector.querySelector('[data-property-label="文件"] code')?.textContent).toBe(
      recordB.path,
    )
    expect(
      inspector.querySelector('[data-property-label="大小"] .ds-property-row__value')?.textContent,
    ).toBe(`${pngB.byteLength} B`)

    // undo：record 精确还原，previousBytes 物化旧 blob，旧字节可真实解码出旧像素。
    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[id]).toEqual(recordA)
    expect(mounted.session.getState().assetBlobs[recordB.path]).toBeUndefined()
    const restored = mounted.session.getState().assetBlobs[recordA.path]
    expect(restored).toBeDefined()
    expect(await sha256Hex(restored!)).toBe(shaA)
    const decoded = await decodePngPixels(await mounted.reader.readBytes(id, 'portrait'))
    expect(decoded.width).toBe(6)
    expect(decoded.height).toBe(4)
    expect(Array.from(decoded.rgba)).toEqual(Array.from(rgbaA))
    await waitPreviewSize('6 × 4')
    expect(Array.from(previewCanvasPixels().rgba)).toEqual(Array.from(rgbaA))
    assertProjectSaveValid(mounted.session.getState())

    await act(async () => {
      expect(mounted.session.redo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[id]?.sha256).toBe(shaB)
    await waitPreviewSize('10 × 5')
  })

  test('失败不污染：损坏 PNG 替换保留原 record、战场背景尺寸守卫零提交', async () => {
    const mounted = await mountTab()
    const rgbaA = patternedRgba(6, 4, atlasColors(2))
    const pngA = pngRgba(6, 4, rgbaA)
    const shaA = await sha256Hex(pngA)
    const id = `portrait.authored.${shaA.slice(0, 16)}`
    await importPng('甲.png', pngA)
    const recordA = await waitCatalogAsset(mounted, id)
    await waitPreviewSize('6 × 4')
    const historyAfterImport = mounted.session.getHistoryVersion()

    // 损坏 PNG（真实字节截断，签名头仍在 → 过签名门后在真实解码处失败）。
    await replacePng('broken.png', pngA.slice(0, 40))
    expect(await waitOutlinerError()).toContain('broken.png: PNG 解码失败')
    expect(mounted.session.getState().assetCatalog.assets[id]).toEqual(recordA)
    expect(mounted.session.getHistoryVersion()).toBe(historyAfterImport)
    expect(heroTitle()).toBe('甲')
    expect(imageRow(id).getAttribute('aria-pressed')).toBe('true')
    expect(host.querySelector('.image-preview-size')?.textContent).toBe('6 × 4')

    // 战场背景尺寸守卫：真实可解码但非 320×200 → 零提交、不进评审、选择不污染。
    await switchKindTab('战场背景')
    expect(host.textContent).toContain('此项目还没有战场背景。')
    await importPng('小菜场.png', pngRgba(100, 100, patternedRgba(100, 100, atlasColors(1))))
    expect(await waitOutlinerError()).toBe('小菜场.png: 战场背景必须是 320×200，实际 100×100')
    expect(
      Object.keys(mounted.session.getState().assetCatalog.assets).filter((key) =>
        key.startsWith('battle-background'),
      ),
    ).toHaveLength(0)
    expect(host.querySelector('.image-import-review')).toBeNull()
    expect(mounted.session.getHistoryVersion()).toBe(historyAfterImport)
    expect(host.textContent).toContain('导入或选择一张战场背景。')
  })

  test('预览守卫：尺寸不符的战场背景资源显示错误面与缩略图徽标（守卫输入只证守卫）', async () => {
    const mounted = await mountTab()
    await switchKindTab('战场背景')
    // 真实命令播种尺寸不符但 catalog 自洽（bytes/sha 与真实字节一致）的资源；
    // 该输入唯一用途是触发预览/缩略图的防御守卫，不声称它是合法导入产物。
    const wrongDimsPng = pngRgba(100, 50, patternedRgba(100, 50, atlasColors(1)))
    await seedImage(mounted, {
      id: 'battle-background.k05-bad',
      kind: 'battle-background',
      label: '坏尺寸',
      png: wrongDimsPng,
    })
    await vi.waitFor(() => {
      expect(host.querySelector('.image-preview-error')).not.toBeNull()
    })
    expect(host.querySelector('.image-preview-error')?.textContent).toBe(
      '战场背景必须是 320×200，实际 100×50',
    )
    expect(host.querySelector('.image-preview-size')?.textContent).toBe('读取图片…')
    expect(host.querySelector('.image-preview-surface canvas.hidden')).not.toBeNull()
    // 缩略图同一守卫：有界错误徽标而非崩溃。
    await vi.waitFor(() => {
      expect(host.querySelector('.image-asset-thumb.error')).not.toBeNull()
    })
    expect(host.querySelector('.image-asset-thumb.error')?.getAttribute('title')).toBe(
      '战场背景必须是 320×200，实际 100×50',
    )
    expect(decodePort.liveBitmaps()).toBe(0)
  })

  test('战场背景评审链：取消零提交选择不动；确认入库索引图合同、色盘重映射与 undo/redo', async () => {
    const mounted = await mountTab()
    await switchKindTab('战场背景')
    const historyAtTab = mounted.session.getHistoryVersion()
    const palette = await loadStandardPalette(mounted.assetBase)
    const bandIndexOf = (x: number): number => (x < 107 ? 1 : x < 214 ? 7 : 10)
    const bandRgba = new Uint8Array(320 * 200 * 4)
    for (let y = 0; y < 200; y += 1)
      for (let x = 0; x < 320; x += 1) {
        const color = palette.colors[bandIndexOf(x)]!
        bandRgba.set([color[0], color[1], color[2], 255], (y * 320 + x) * 4)
      }
    const bandPng = pngRgba(320, 200, bandRgba)

    const openReview = async (): Promise<HTMLElement> => {
      await vi.waitFor(
        () => {
          const review = host.querySelector<HTMLElement>('section.image-import-review')
          expect(review, '评审面板').not.toBeNull()
          expect(
            review!.querySelector<HTMLImageElement>('img[alt="上传原图"]')?.getAttribute('src'),
          ).toMatch(/^blob:/)
          expect(
            review!.querySelector<HTMLImageElement>('img[alt="项目内效果"]')?.getAttribute('src'),
          ).toMatch(/^blob:/)
        },
        { timeout: 5000 },
      )
      return host.querySelector<HTMLElement>('section.image-import-review')!
    }

    // 取消侧：零提交、评审关闭、选择停留（空 kind 上仍是空态）、object URL 全部回收。
    await importPng('原野战场.png', bandPng)
    const review = await openReview()
    expect(review.textContent).toContain('保存的是右侧效果；运行时仍保留召唤换色能力。')
    const sourceUrl = review
      .querySelector<HTMLImageElement>('img[alt="上传原图"]')!
      .getAttribute('src')!
    const effectUrl = review
      .querySelector<HTMLImageElement>('img[alt="项目内效果"]')!
      .getAttribute('src')!
    // 评审双图真实内容：原图字节逐字节等于上传文件；效果图为色盘着色后的真实像素。
    const sourceBlob = domPort.objectUrlBlob(sourceUrl)
    expect(sourceBlob, '原图 object URL 持有 Blob').toBeDefined()
    expect(new Uint8Array(await sourceBlob!.arrayBuffer())).toEqual(bandPng)
    const effectBlob = domPort.objectUrlBlob(effectUrl)
    expect(effectBlob, '效果图 object URL 持有 Blob').toBeDefined()
    const effect = await decodePngPixels(await effectBlob!.arrayBuffer())
    expect(effect.width).toBe(320)
    expect(effect.height).toBe(200)
    expect(Array.from(effect.rgba.slice((100 * 320 + 50) * 4, (100 * 320 + 50) * 4 + 4))).toEqual([
      ...palette.colors[1]!,
      255,
    ])
    expect(Array.from(effect.rgba.slice((100 * 320 + 150) * 4, (100 * 320 + 150) * 4 + 4))).toEqual(
      [...palette.colors[7]!, 255],
    )
    expect(Array.from(effect.rgba.slice((100 * 320 + 300) * 4, (100 * 320 + 300) * 4 + 4))).toEqual(
      [...palette.colors[10]!, 255],
    )
    expect(domPort.liveObjectUrls()).toBe(2)
    expect(mounted.session.getHistoryVersion()).toBe(historyAtTab)

    await clickButton(review, '取消')
    await vi.waitFor(() => {
      expect(host.querySelector('.image-import-review')).toBeNull()
    })
    expect(mounted.session.getHistoryVersion()).toBe(historyAtTab)
    expect(
      Object.keys(mounted.session.getState().assetCatalog.assets).filter((key) =>
        key.startsWith('battle-background'),
      ),
    ).toHaveLength(0)
    expect(domPort.liveObjectUrls()).toBe(0)
    expect(host.textContent).toContain('导入或选择一张战场背景。')
    expect(host.querySelector('.image-library-outliner .cf-err')).toBeNull()

    // 确认侧：真实量化入库，record 与实际字节自洽，id 由实际 sha 派生。
    await importPng('原野战场.png', bandPng)
    const review2 = await openReview()
    await clickButton(review2, '使用适配结果')
    await vi.waitFor(() => {
      expect(
        Object.keys(mounted.session.getState().assetCatalog.assets).filter((key) =>
          key.startsWith('battle-background.authored.'),
        ),
      ).toHaveLength(1)
    })
    const id = Object.keys(mounted.session.getState().assetCatalog.assets).find((key) =>
      key.startsWith('battle-background.authored.'),
    )!
    const record = mounted.session.getState().assetCatalog.assets[id]!
    const blob = mounted.session.getState().assetBlobs[record.path]
    expect(blob).toBeDefined()
    const sha = await sha256Hex(blob!)
    expect(record).toEqual({
      kind: 'battle-background',
      path: `assets/authored/battle-background/${sha}.png`,
      mediaType: 'image/png',
      bytes: blob!.byteLength,
      sha256: sha,
      label: '原野战场',
      origin: { kind: 'authored', ref: '原野战场.png' },
    } satisfies AssetRecordV1)
    expect(id).toBe(`battle-background.authored.${sha.slice(0, 16)}`)
    expect(mounted.session.getHistoryVersion()).toBeGreaterThan(historyAtTab)
    assertProjectSaveValid(mounted.session.getState())
    expect(heroTitle()).toBe('原野战场')
    expect(imageRow(id).getAttribute('aria-pressed')).toBe('true')
    expect(mounted.focusLog.at(-1)).toBe(id)

    // 存储字节真实解码：逐像素满足索引灰度合同（R=G=B=色带索引，A=255）。
    const stored = await decodePngPixels(blob!)
    expect(stored.width).toBe(320)
    expect(stored.height).toBe(200)
    let badPixel = -1
    for (let y = 0; y < 200 && badPixel < 0; y += 1)
      for (let x = 0; x < 320; x += 1) {
        const at = (y * 320 + x) * 4
        const index = bandIndexOf(x)
        if (
          stored.rgba[at] !== index ||
          stored.rgba[at + 1] !== index ||
          stored.rgba[at + 2] !== index ||
          stored.rgba[at + 3] !== 255
        ) {
          badPixel = y * 320 + x
          break
        }
      }
    expect(badPixel, '存储图必须逐像素满足索引灰度合同').toBe(-1)

    // 预览按项目标准色彩重映射：画布像素是色盘颜色而非灰度索引。
    await waitPreviewSize('320 × 200')
    const canvas = previewCanvasPixels()
    const canvasPixel = (x: number, y: number): number[] =>
      Array.from(canvas.rgba.slice((y * 320 + x) * 4, (y * 320 + x) * 4 + 4))
    expect(canvasPixel(50, 100)).toEqual([...palette.colors[1]!, 255])
    expect(canvasPixel(150, 100)).toEqual([...palette.colors[7]!, 255])
    expect(canvasPixel(300, 100)).toEqual([...palette.colors[10]!, 255])
    expect(canvasPixel(50, 100)[0]).not.toBe(canvasPixel(50, 100)[1])
    // 战场背景缩略图经同一色盘链路上图（真实解码 + 重编码 + object URL）。
    await vi.waitFor(() => {
      expect(host.querySelector('.image-asset-thumb img')).not.toBeNull()
    })
    expect(domPort.liveObjectUrls()).toBe(1)
    expect(decodePort.liveBitmaps()).toBe(0)

    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[id]).toBeUndefined()
    expect(mounted.session.getState().assetBlobs[record.path]).toBeUndefined()
    await vi.waitFor(() => {
      expect(domPort.liveObjectUrls()).toBe(0)
    })
    await act(async () => {
      expect(mounted.session.redo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[id]).toEqual(record)
    expect(await sha256Hex(mounted.session.getState().assetBlobs[record.path]!)).toBe(sha)
    assertProjectSaveValid(mounted.session.getState())
  })

  test('预览 viewer：fit 几何、键盘/滚轮/工具条缩放与拖拽平移真实合同', async () => {
    const mounted = await mountTab()
    const png = pngRgba(64, 32, patternedRgba(64, 32, atlasColors(2)))
    const sha = await sha256Hex(png)
    const id = `portrait.authored.${sha.slice(0, 16)}`
    await importPng('视图甲.png', png)
    await waitCatalogAsset(mounted, id)
    await waitPreviewSize('64 × 32')
    const historyAfterImport = mounted.session.getHistoryVersion()

    // fit 几何：视口 560×208（k05 布局端口）对 64×32 → fitZoom=min(512/64,160/32)=5。
    expect(zoomOutput()).toBe('500%')
    expect(previewStage().classList.contains('fit')).toBe(true)
    expect(buttonByLabel(host, '适合').getAttribute('aria-pressed')).toBe('true')
    expect(
      host.querySelector<HTMLCanvasElement>('.image-preview-surface canvas')!.style.width,
    ).toBe('320px')
    // surface 的 max(100%, Npx) 声明超出 jsdom CSSOM 解析域（会被丢弃），不做样式断言；
    // 缩放合同由读数/类名/画布尺寸完整承载。
    // fit 态下拖拽不进入平移。
    await pointerOnStage('pointerdown', { button: 0, pointerId: 5, clientX: 100, clientY: 100 })
    expect(previewStage().classList.contains('panning')).toBe(false)
    expect(domPort.pointerCaptures).toEqual([])
    await pointerOnStage('pointerup', { pointerId: 5 })
    expect(domPort.pointerReleases).toEqual([])

    // 键盘缩放契约：+ 与 = 同义步进、- 回退、0 实际大小、F 适合，均 preventDefault；未知键不动。
    const plus = await pressOnStage('+')
    expect(plus.defaultPrevented).toBe(true)
    expect(zoomOutput()).toBe('625%')
    expect(previewStage().classList.contains('zoomed')).toBe(true)
    expect(buttonByLabel(host, '适合').getAttribute('aria-pressed')).toBe('false')
    await pressOnStage('=')
    expect(zoomOutput()).toBe('781%')
    await pressOnStage('0')
    expect(zoomOutput()).toBe('100%')
    expect(
      host.querySelector<HTMLCanvasElement>('.image-preview-surface canvas')!.style.width,
    ).toBe('64px')
    expect(buttonByLabel(host, '1:1').getAttribute('aria-pressed')).toBe('true')
    await pressOnStage('-')
    expect(zoomOutput()).toBe('80%')
    await pressOnStage('-')
    expect(zoomOutput()).toBe('64%')
    const unknown = await pressOnStage('x')
    expect(unknown.defaultPrevented).toBe(false)
    expect(zoomOutput()).toBe('64%')
    previewStage().scrollLeft = 33
    previewStage().scrollTop = 17
    await pressOnStage('f')
    expect(zoomOutput()).toBe('500%')
    expect(previewStage().classList.contains('fit')).toBe(true)
    await flushAnimationFrame()
    expect(domPort.scrollTos).toBe(1)
    expect(previewStage().scrollLeft).toBe(0)
    expect(previewStage().scrollTop).toBe(0)

    // 工具条：range 直给、放大/缩小步进、1:1 与适合按钮。
    await setInputValue(
      host.querySelector<HTMLInputElement>('input[aria-label="图片预览缩放比例"]')!,
      '300',
    )
    expect(zoomOutput()).toBe('300%')
    await act(async () => buttonByLabel(host, '放大').click())
    expect(zoomOutput()).toBe('375%')
    await act(async () => buttonByLabel(host, '缩小').click())
    expect(zoomOutput()).toBe('300%')
    await act(async () => buttonByLabel(host, '1:1').click())
    expect(zoomOutput()).toBe('100%')
    await act(async () => buttonByLabel(host, '适合').click())
    expect(zoomOutput()).toBe('500%')
    await flushAnimationFrame()
    expect(domPort.scrollTos).toBe(2)

    // 滚轮：以 fit 5 为基数按 exp 缩放；有限越界 delta 两端 clamp 到 [25%, 800%] 并禁用对应步进按钮。
    // （非有限值归一为 100% 的 clamp 合同已有 FrameAnimationEditor.test.ts 单元覆盖，不重复。）
    await wheelOnStage(-120)
    expect(zoomOutput()).toBe('599%')
    expect(previewStage().classList.contains('zoomed')).toBe(true)
    await wheelOnStage(-1200)
    expect(zoomOutput()).toBe('800%')
    expect(buttonByLabel(host, '放大').disabled).toBe(true)
    await wheelOnStage(-1200)
    expect(zoomOutput()).toBe('800%')
    await wheelOnStage(2400)
    expect(zoomOutput()).toBe('25%')
    expect(buttonByLabel(host, '缩小').disabled).toBe(true)

    // 拖拽平移：非 fit 态下主键抓取，scroll 按手势位移精确换算；异指/副键忽略；up/cancel 释放。
    await pressOnStage('0')
    expect(zoomOutput()).toBe('100%')
    await flushAnimationFrame()
    previewStage().scrollLeft = 120
    previewStage().scrollTop = 60
    await pointerOnStage('pointerdown', { button: 0, pointerId: 7, clientX: 200, clientY: 150 })
    expect(previewStage().classList.contains('panning')).toBe(true)
    expect(domPort.pointerCaptures).toEqual([7])
    await pointerOnStage('pointermove', { pointerId: 9, clientX: 0, clientY: 0 })
    expect(previewStage().scrollLeft).toBe(120)
    expect(previewStage().scrollTop).toBe(60)
    await pointerOnStage('pointermove', { pointerId: 7, clientX: 170, clientY: 110 })
    expect(previewStage().scrollLeft).toBe(150)
    expect(previewStage().scrollTop).toBe(100)
    await pointerOnStage('pointermove', { pointerId: 7, clientX: 210, clientY: 190 })
    expect(previewStage().scrollLeft).toBe(110)
    expect(previewStage().scrollTop).toBe(20)
    await pointerOnStage('pointerup', { pointerId: 7 })
    expect(previewStage().classList.contains('panning')).toBe(false)
    expect(domPort.pointerReleases).toEqual([7])
    await pointerOnStage('pointerdown', { button: 2, pointerId: 8, clientX: 200, clientY: 150 })
    expect(previewStage().classList.contains('panning')).toBe(false)
    expect(domPort.pointerCaptures).toEqual([7])
    await pointerOnStage('pointerdown', { button: 0, pointerId: 9, clientX: 300, clientY: 300 })
    expect(previewStage().classList.contains('panning')).toBe(true)
    await pointerOnStage('pointercancel', { pointerId: 9 })
    expect(previewStage().classList.contains('panning')).toBe(false)
    expect(domPort.pointerCaptures).toEqual([7, 9])
    expect(domPort.pointerReleases).toEqual([7, 9])
    await pressOnStage('f')
    await flushAnimationFrame()
    expect(zoomOutput()).toBe('500%')
    expect(previewStage().scrollLeft).toBe(0)
    expect(previewStage().scrollTop).toBe(0)

    // 全部 viewer 交互纯浏览：零提交、无错误、bitmap 无泄漏。
    expect(mounted.session.getHistoryVersion()).toBe(historyAfterImport)
    expect(host.querySelector('.image-library-outliner .cf-err')).toBeNull()
    expect(decodePort.liveBitmaps()).toBe(0)
  })

  test('预览资源生命周期：切选后迟到解码不盖新选择、bitmap 关闭与 object URL 零泄漏', async () => {
    const mounted = await mountTab()
    const rgbaA = patternedRgba(64, 32, atlasColors(2))
    const pngA = pngRgba(64, 32, rgbaA)
    const rgbaB = patternedRgba(10, 5, atlasColors(16).slice(6, 8))
    const pngB = pngRgba(10, 5, rgbaB)
    // 解码闸门先于播种安装：alpha 自动选中后的预览解码停在在途（未开始/在途/完成三态可区分）。
    const hold = decodePort.gate(pngA.byteLength)
    await seedImage(mounted, {
      id: 'portrait.k05-alpha',
      kind: 'portrait',
      label: '甲视图',
      png: pngA,
    })
    await seedImage(mounted, {
      id: 'portrait.k05-beta',
      kind: 'portrait',
      label: '乙视图',
      png: pngB,
    })
    const historyAfterSeeds = mounted.session.getHistoryVersion()
    try {
      await vi.waitFor(() => {
        expect(decodePort.entries).toEqual([pngA.byteLength])
      })
      expect(decodePort.completions).toEqual([])
      expect(host.querySelector('.image-preview-size')?.textContent).toBe('读取图片…')

      // 切到 beta：alpha 预览卸载（alive=false），beta 真实解码先行完成。
      await clickImageRow('portrait.k05-beta')
      await waitPreviewSize('10 × 5')
      expect(decodePort.entries).toEqual([pngA.byteLength, pngB.byteLength])
      expect(decodePort.completions).toEqual([pngB.byteLength])
      expect(Array.from(previewCanvasPixels().rgba)).toEqual(Array.from(rgbaB))
    } finally {
      hold.resolve()
    }
    // 迟到完成：alpha 位图按归属协议关闭且不落地，beta 画面/选择/错误面全部不动。
    await vi.waitFor(() => {
      expect(decodePort.completions).toEqual([pngB.byteLength, pngA.byteLength])
    })
    expect(host.querySelector('.image-preview-size')?.textContent).toBe('10 × 5')
    expect(Array.from(previewCanvasPixels().rgba)).toEqual(Array.from(rgbaB))
    expect(heroTitle()).toBe('乙视图')
    expect(imageRow('portrait.k05-beta').getAttribute('aria-pressed')).toBe('true')
    expect(host.querySelector('.image-preview-error')).toBeNull()
    expect(mounted.focusLog.at(-1)).toBe('portrait.k05-beta')
    expect(mounted.session.getHistoryVersion()).toBe(historyAfterSeeds)
    expect(decodePort.closes).toBe(2)
    expect(decodePort.liveBitmaps()).toBe(0)
    // 两行目录缩略图各持有一个 object URL，切选不新增不泄漏。
    expect(domPort.liveObjectUrls()).toBe(2)
  })

  test('删除真实资源：真实引用索引确认、选择回退与焦点、undo 字节级还原可真实解码', async () => {
    const mounted = await mountTab()
    const rgbaA = patternedRgba(6, 4, atlasColors(2))
    const pngA = pngRgba(6, 4, rgbaA)
    const shaA = await sha256Hex(pngA)
    const idA = `portrait.authored.${shaA.slice(0, 16)}`
    const rgbaC = patternedRgba(10, 5, atlasColors(16).slice(2, 4))
    const pngC = pngRgba(10, 5, rgbaC)
    const shaC = await sha256Hex(pngC)
    const idC = `portrait.authored.${shaC.slice(0, 16)}`
    await importPng('甲.png', pngA)
    await waitCatalogAsset(mounted, idA)
    await importPng('丙.png', pngC)
    await waitCatalogAsset(mounted, idC)
    await clickImageRow(idA)
    await waitPreviewSize('6 × 4')

    await clickButton(host, '删除')
    const dialog = document.querySelector<HTMLDialogElement>('dialog[aria-label="删除图片"]')
    expect(dialog, '删除确认弹窗').not.toBeNull()
    expect(dialog!.open).toBe(true)
    expect(dialog!.textContent).toContain('甲')
    expect(dialog!.textContent).toContain('0 处')
    const historyBeforeDelete = mounted.session.getHistoryVersion()
    await act(async () => {
      buttonByLabel(dialog!, '删除图片').click()
    })
    await vi.waitFor(() => {
      expect(mounted.session.getState().assetCatalog.assets[idA]).toBeUndefined()
    })
    expect(
      mounted.session.getState().assetBlobs[`assets/authored/portrait/${shaA}.png`],
    ).toBeUndefined()
    expect(mounted.session.getHistoryVersion()).toBeGreaterThan(historyBeforeDelete)
    await expect(mounted.reader.readBytes(idA, 'portrait')).rejects.toThrow('不在 catalog')
    // DsDialog 常驻 DOM，关闭语义由 open 属性承载。
    expect(
      document.querySelector<HTMLDialogElement>('dialog[aria-label="删除图片"]')?.open ?? false,
    ).toBe(false)
    // 选择回退到剩余真实资源并同步焦点；预览真实重载。
    await waitPreviewSize('10 × 5')
    expect(imageRow(idC).getAttribute('aria-pressed')).toBe('true')
    expect(heroTitle()).toBe('丙')
    expect(mounted.focusLog.at(-1)).toBe(idC)
    assertProjectSaveValid(mounted.session.getState())

    // undo：record/blob 字节级还原，真实解码出原像素；选择不回跳（丙仍在）。
    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    const record = mounted.session.getState().assetCatalog.assets[idA]
    expect(record).toBeDefined()
    expect(record).toEqual({
      kind: 'portrait',
      path: `assets/authored/portrait/${shaA}.png`,
      mediaType: 'image/png',
      bytes: pngA.byteLength,
      sha256: shaA,
      label: '甲',
      origin: { kind: 'authored', ref: '甲.png' },
    } satisfies AssetRecordV1)
    const restoredBlob = mounted.session.getState().assetBlobs[record!.path]
    expect(restoredBlob).toBeDefined()
    expect(await sha256Hex(restoredBlob!)).toBe(shaA)
    const decoded = await decodePngPixels(await mounted.reader.readBytes(idA, 'portrait'))
    expect(decoded.width).toBe(6)
    expect(decoded.height).toBe(4)
    expect(Array.from(decoded.rgba)).toEqual(Array.from(rgbaA))
    expect(heroTitle()).toBe('丙')
    assertProjectSaveValid(mounted.session.getState())
  })
})
