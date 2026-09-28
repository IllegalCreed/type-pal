// @vitest-environment jsdom
/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K04：TilesetTab 真实图集工作流补测（锚 TilesetTab.tsx:182/265/514）。
 *
 * 旧断言去重（只登记缺口，不复制）：
 * - TilesetTab.test.tsx（vi.mock 掉 loadStandardPalette/loadTilesetAsset，canvas getContext 全替身，
 *   assetReader 为字面量假读者，loadMap 为 mock）：
 *   - '搜索与分类覆盖各值、组合、空结果和清空恢复，且不偷换选择' → 已证筛选组合与不偷换选中；不重复。
 *   - '选中态使用共享资源/引用 Tab，上传工作流不虚构 Tab' → 已证检查器 Tab 结构；不重复。
 *   - '名称与分类失焦提交到会话并只使用全局保存' → 已证 commitMetadataField 失焦提交；不重复。
 *   - '进入替换流程但尚未选择文件时不伪报 0 帧越界' → 已证空 draft 不伪报；
 *     缺口：选文件后的真实越界面板内容与提交阻断（本文件 test 4）。
 *   - '同 AssetId/path 但 record sha 改变时重新载入工作台预览' → 已证 mock loader 调用次数；
 *     缺口：真实替换后预览按新 sha 真实解码出新帧（本文件 test 4/5 的 32×16 vs 32×15 帧形见证）。
 *   - '页面已挂载时地图 undo/redo 失效事实，只异步补当前变化地图并恢复精确计数' → 已证引用重扫计数；不重复。
 *   - '扫描未加载地图和组合模板，列出可跳转引用并保持删除禁用' → 已证合成地图上的列表与禁用；
 *     缺口：真实 blank 项目 start 地图事实（真实 scanner 产出的真实 edge）下 fail-closed 零提交（test 3）。
 *   - '完整零引用扫描后才出现确认移除，删除仍可一步撤销' → 已证按钮状态机与 tilesets 列表增删/undo
 *     （假字节假读者）；缺口：catalog record/pending blob 真实移除与 undo 字节级恢复、真实解码、
 *     选中回退与 focus 见证（test 3）。
 *   - '删除读取 bytes 期间资源变化时不提交旧许可或错配恢复字节' → 已证移除竞态；
 *     缺口：替换路径竞态守卫 TilesetTab.tsx:436-441（test 6）。
 * - TilesetTab.glm-ui-wave.test.tsx（同一 vi.mock 边界 + 合法项目）：
 *   - '重命名与分类只动元数据：id 与 asset 绑定稳定，undo 精确还原' → 已证（任务指定不重复）。
 *   - 'focusObjectId 深链直接选中目标瓦片集' → 已证（任务指定不重复）。
 * - 命令层 tileset-commands.residual/glm-boundaries/tileset-lifecycle/tileset-references 直测命令与
 *   proof，未经过组件 DOM → 真实 EditSession/EditorAssetReader 的工作流链；上传向导（pickFile 真实
 *   PNG 解码 → sliceAtlasGrid/quantizeToRleFrame 预览 → encodeSpriteChunk+compressGzip+sha256 →
 *   AddTilesetCommand）与 PagedFrameGrid 分页（FRAME_PAGE_SIZE=128 缩减夹回）在任何旧测试中均未触达。
 *
 * 本文件全部走真实组件 DOM → EditSession/commands/EditorAssetReader + 合法 blank 项目
 * （loadLegalUiProject）；PNG 经 kit 真实编码、node-canvas 真实解码（createImageBitmap 硬件端口），
 * jsdom 2d canvas 为真实像素。唯一替身：kit 浏览器硬件端口与 gatedFileSource 磁盘闸门（仅 test 6）。
 */
import type { AssetRecordV1 } from '@type-pal/content'
import {
  type AssetBase,
  compressGzip,
  encodeSpriteChunk,
  type FileSource,
  loadStandardPalette,
  loadTilesetAsset,
  quantizeToRleFrame,
  type RleFrame,
  type TilesetDef,
} from '@type-pal/reforge'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { sha256Hex } from '../core/binary-signature.js'
import { AddTilesetCommand, UpsertAssetCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import type { ProjectReferenceEdge } from '../core/project-reference.js'
import {
  buttonByLabel,
  clickButton,
  fieldControlByLabel,
  inputByAccept,
  loadFilesIntoInput,
  loadLegalUiProject,
  setInputValue,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import {
  atlasColors,
  gatedFileSource,
  installBrowserHardwarePorts,
  pngFileOf,
  solidAtlasPng,
  solidRgba,
} from './__tests__/kimi-editor-workflows/kit.js'
import { TilesetTab } from './TilesetTab.js'

const STARTER_ASSET = 'tileset.generated.starter'
const ATLAS_ACCEPT = 'image/png,image/webp,image/gif'

interface Mounted {
  session: EditSession
  source: FileSource
  assetBase: AssetBase
  reader: EditorAssetReader
  focusLog: Array<string | undefined>
  openedReferences: ProjectReferenceEdge[]
}

function Harness(props: {
  session: EditSession
  reader: EditorAssetReader
  assetBase: AssetBase
  focusLog: Array<string | undefined>
  openedReferences: ProjectReferenceEdge[]
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const [focus, setFocus] = useState<string | undefined>(undefined)
  return (
    <TilesetTab
      tilesets={current.tilesets ?? []}
      assetCatalog={current.assetCatalog}
      assetReader={props.reader}
      assetBase={props.assetBase}
      session={props.session}
      mapIndex={current.mapIndex}
      focusObjectId={focus}
      onObjectFocus={(id) => {
        props.focusLog.push(id)
        setFocus(id)
      }}
      onOpenReference={(reference) => props.openedReferences.push(reference)}
    />
  )
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  useActEnvironment()
  installBrowserHardwarePorts()
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

async function mountTab(options?: {
  wrapSource?: (source: FileSource) => FileSource
}): Promise<Mounted> {
  const legal = await loadLegalUiProject('kimi-k04-tileset')
  const source = options?.wrapSource?.(legal.source) ?? legal.source
  const session = new EditSession(legal.state)
  const reader = createEditorAssetReader(source, () => session.getState())
  const focusLog: Array<string | undefined> = []
  const openedReferences: ProjectReferenceEdge[] = []
  await act(async () => {
    root.render(
      <Harness
        session={session}
        reader={reader}
        assetBase={legal.assetBase}
        focusLog={focusLog}
        openedReferences={openedReferences}
      />,
    )
    await Promise.resolve()
  })
  // 真实链路就位见证：标准色盘载入 + starter 瓦片集磁盘字节真实解码出 4 帧网格。
  await vi.waitFor(() => {
    expect(previewRange()).toBe('1–4 / 4 块')
  })
  return { session, source, assetBase: legal.assetBase, reader, focusLog, openedReferences }
}

/** 量化期望的独立计算：与组件共用同一真实标准色盘，逐帧逐字节对拍。 */
async function expectedTilesetFrames(
  mounted: Mounted,
  tileW: number,
  tileH: number,
  colors: readonly (readonly [number, number, number, number])[],
): Promise<RleFrame[]> {
  const palette = await loadStandardPalette(mounted.assetBase)
  return colors.map((color) =>
    quantizeToRleFrame(solidRgba(tileW, tileH, color), tileW, tileH, palette),
  )
}

async function expectedAssetBytes(
  frames: readonly RleFrame[],
): Promise<{ bytes: ArrayBuffer; sha256: string }> {
  const gz = await compressGzip(encodeSpriteChunk(frames))
  const bytes = gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength) as ArrayBuffer
  return { bytes, sha256: await sha256Hex(bytes) }
}

/** 以当前 catalog/blob 真实解码（loadTilesetAsset 内含 mediaType/bytes/sha256/gzip 全校验）。 */
async function decodeCurrent(mounted: Mounted, asset: string): Promise<RleFrame[]> {
  expect(
    mounted.session.getState().assetCatalog.assets[asset],
    `catalog 应有 ${asset}`,
  ).toBeDefined()
  const map = await loadTilesetAsset(mounted.reader, asset)
  return [...map.values()]
}

function tilesetRow(id: string): HTMLButtonElement {
  const row = [...host.querySelectorAll<HTMLButtonElement>('.tileset-library-row')].find(
    (candidate) => candidate.querySelector('.mono')?.textContent === id,
  )
  expect(row, `瓦片集行 ${id}`).toBeDefined()
  return row!
}

async function selectTilesetRow(id: string): Promise<void> {
  await act(async () => tilesetRow(id).click())
}

async function openUploadWizard(): Promise<void> {
  await clickButton(host, '上传 PNG、WebP 或 GIF 图集')
}

/** 驱动真实文件输入：PNG 字节经 createImageBitmap(node-canvas) 真实解码进 draft。 */
async function pickAtlas(
  name: string,
  bytes: Uint8Array,
  imgW: number,
  imgH: number,
): Promise<void> {
  await loadFilesIntoInput(inputByAccept(host, ATLAS_ACCEPT), [pngFileOf(name, bytes)])
  await vi.waitFor(() => {
    expect(host.querySelector('.tileset-atlas-card')?.textContent ?? '').toContain(
      `${imgW}×${imgH}`,
    )
  })
}

/** 切片汇总文本出现即代表 draft+palette+参数全部就位（量化预览同一渲染拍）。 */
async function waitCutSummary(frames: number): Promise<void> {
  await vi.waitFor(() => {
    expect(host.querySelector('.tileset-cut-summary')?.textContent).toBe(`将切出 ${frames} 块瓦片`)
  })
}

function previewPanel(): HTMLElement {
  const panel = host.querySelector<HTMLElement>('section[aria-label="瓦片预览"]')
  expect(panel, '瓦片预览面板').not.toBeNull()
  return panel!
}

function previewRange(): string {
  const range = previewPanel().querySelector('.tileset-preview-range')?.textContent
  expect(range, '预览范围文本').toBeTruthy()
  return range!
}

function frameCellTitles(): string[] {
  return [...previewPanel().querySelectorAll<HTMLElement>('li.tileset-frame')].map(
    (cell) => cell.title,
  )
}

/** 移除按钮真实状态机等待（扫描完成后的确定文案）。 */
async function waitRemovalButton(label: string): Promise<void> {
  await vi.waitFor(() => {
    expect(
      [...host.querySelectorAll('button')].some(
        (candidate) => candidate.textContent?.trim() === label,
      ),
    ).toBe(true)
  })
}

/** 真实命令播种未引用瓦片集：独立编码合法帧 → gzip → AddTilesetCommand（bytes/sha 自洽）。 */
async function seedTileset(
  mounted: Mounted,
  input: { id: string; name: string; category: string },
): Promise<{ record: AssetRecordV1; bytes: ArrayBuffer; frames: RleFrame[] }> {
  const frames = await expectedTilesetFrames(mounted, 16, 16, atlasColors(4))
  const { bytes, sha256 } = await expectedAssetBytes(frames)
  const record: AssetRecordV1 = {
    kind: 'tileset',
    path: `assets/authored/tilesets/${sha256}.rle`,
    mediaType: 'application/vnd.type-pal.rle',
    bytes: bytes.byteLength,
    sha256,
    label: `瓦片集 ${input.id}`,
    origin: { kind: 'authored' },
  }
  const definition: TilesetDef = {
    id: input.id,
    name: input.name,
    category: input.category,
    asset: `tileset.${input.id}`,
  }
  await act(async () => {
    mounted.session.dispatch(new AddTilesetCommand(definition, record, bytes))
  })
  return { record, bytes, frames }
}

describe('K04 TilesetTab 真实图集工作流', () => {
  test('真实 PNG 切格入库：量化/编码/字节链精确落账且 undo/redo 对称', async () => {
    const mounted = await mountTab()
    const colors = atlasColors(6)
    const atlas = solidAtlasPng(16, 16, colors)
    const expectedFrames = await expectedTilesetFrames(mounted, 16, 16, colors)
    const expected = await expectedAssetBytes(expectedFrames)
    const historyAtMount = mounted.session.getHistoryVersion()

    await openUploadWizard()
    await pickAtlas('forest-kit.png', atlas.bytes, 96, 16)
    // 文件名推导 ID 的真实见证；名称/分类走真实表单提交。
    expect(fieldControlByLabel<HTMLInputElement>(host, 'ID').value).toBe('forest-kit')
    await setInputValue(fieldControlByLabel(host, '瓦宽'), '16')
    await setInputValue(fieldControlByLabel(host, '瓦高'), '16')
    await setInputValue(fieldControlByLabel<HTMLInputElement>(host, '名称'), '森林套件')
    await setInputValue(fieldControlByLabel<HTMLInputElement>(host, '分类'), 'dungeon')
    await waitCutSummary(6)
    expect(previewRange()).toBe('1–6 / 6 块')
    expect(frameCellTitles()).toEqual(Array.from({ length: 6 }, (_, index) => `#${index} · 16×16`))

    await clickButton(host, '入库瓦片集')
    const asset = 'tileset.forest-kit'
    await vi.waitFor(() => {
      expect(mounted.session.getState().assetCatalog.assets[asset]).toBeDefined()
    })
    const record = mounted.session.getState().assetCatalog.assets[asset]!
    expect(record).toEqual({
      kind: 'tileset',
      path: `assets/authored/tilesets/${expected.sha256}.rle`,
      mediaType: 'application/vnd.type-pal.rle',
      bytes: expected.bytes.byteLength,
      sha256: expected.sha256,
      label: '瓦片集 forest-kit',
      origin: { kind: 'authored' },
    } satisfies AssetRecordV1)
    const blob = mounted.session.getState().assetBlobs[record.path]
    expect(blob).toBeDefined()
    expect(await sha256Hex(blob!.slice(0))).toBe(expected.sha256)
    expect(mounted.session.getState().tilesets).toEqual([
      { id: 'starter', name: '起始地形', category: 'outdoor', asset: STARTER_ASSET },
      { id: 'forest-kit', name: '森林套件', category: 'dungeon', asset },
    ])
    expect(await decodeCurrent(mounted, asset)).toEqual(expectedFrames)
    assertProjectSaveValid(mounted.session.getState())
    expect(mounted.session.getHistoryVersion()).toBeGreaterThan(historyAtMount)
    expect(mounted.session.isDirty()).toBe(true)
    // 选中保持在新条目：列表选中态、hero、focus 同步与 pending blob 真实预览。
    await vi.waitFor(() => expect(previewRange()).toBe('1–6 / 6 块'))
    expect(tilesetRow('forest-kit').getAttribute('aria-pressed')).toBe('true')
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('森林套件')
    expect(mounted.focusLog.at(-1)).toBe('forest-kit')

    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[asset]).toBeUndefined()
    expect(mounted.session.getState().assetBlobs[record.path]).toBeUndefined()
    expect(mounted.session.getState().tilesets?.some((entry) => entry.id === 'forest-kit')).toBe(
      false,
    )
    await expect(loadTilesetAsset(mounted.reader, asset)).rejects.toThrow('不在 catalog')
    // 选中回退到首个瓦片集并同步 focus。
    await vi.waitFor(() => {
      expect(tilesetRow('starter').getAttribute('aria-pressed')).toBe('true')
    })
    expect(mounted.focusLog.at(-1)).toBe('starter')

    await act(async () => {
      expect(mounted.session.redo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[asset]?.sha256).toBe(expected.sha256)
    expect(await decodeCurrent(mounted, asset)).toEqual(expectedFrames)
  })

  test('向导分页：超页帧数导航、改瓦宽缩减夹回首页，取消上传零提交且选中保持', async () => {
    const mounted = await mountTab()
    const historyAtMount = mounted.session.getHistoryVersion()
    const colors = Array.from({ length: 130 }, (_, index) => atlasColors(16)[index % 16]!)
    const atlas = solidAtlasPng(16, 16, colors)
    expect(atlas.width).toBe(2080)

    await openUploadWizard()
    await pickAtlas('mega-atlas.png', atlas.bytes, 2080, 16)
    await setInputValue(fieldControlByLabel(host, '瓦宽'), '16')
    await waitCutSummary(130)
    // 第 1 页：128 块整页，上一页不可用。
    expect(previewRange()).toBe('1–128 / 130 块')
    expect(frameCellTitles()).toHaveLength(128)
    expect(frameCellTitles()[0]).toBe('#0 · 16×16')
    expect(frameCellTitles()[127]).toBe('#127 · 16×16')
    expect(buttonByLabel(host, '上一页瓦片').disabled).toBe(true)
    expect(buttonByLabel(host, '下一页瓦片').disabled).toBe(false)

    await act(async () => buttonByLabel(host, '下一页瓦片').click())
    expect(previewRange()).toBe('129–130 / 130 块')
    expect(frameCellTitles()).toEqual(['#128 · 16×16', '#129 · 16×16'])
    expect(previewPanel().querySelector('.tileset-page-actions .mono')?.textContent).toBe('2/2')
    expect(buttonByLabel(host, '下一页瓦片').disabled).toBe(true)
    expect(buttonByLabel(host, '上一页瓦片').disabled).toBe(false)

    // 缩减：瓦宽 16→32 只剩 65 块 1 页，页码夹回首页（未夹住会显示 129–65）。
    await setInputValue(fieldControlByLabel(host, '瓦宽'), '32')
    await waitCutSummary(65)
    expect(previewRange()).toBe('1–65 / 65 块')
    expect(previewPanel().querySelector('[aria-label="瓦片预览分页"]')).toBeNull()
    expect(frameCellTitles()).toHaveLength(65)
    expect(frameCellTitles()[0]).toBe('#0 · 32×16')
    expect(frameCellTitles()[64]).toBe('#64 · 32×16')

    // 取消侧：零提交、零登记、选中保持 starter。
    await clickButton(host, '取消上传')
    await vi.waitFor(() => expect(previewRange()).toBe('1–4 / 4 块'))
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount)
    expect(mounted.session.getState().tilesets?.map((entry) => entry.id)).toEqual(['starter'])
    expect(mounted.session.getState().assetCatalog.assets['tileset.mega-atlas']).toBeUndefined()
    expect(tilesetRow('starter').getAttribute('aria-pressed')).toBe('true')
    expect(host.querySelector('.tileset-error')).toBeNull()
  })

  test('移除：真实引用扫描下被引用瓦片集 fail-closed；未引用新集移除正控与撤销还原', async () => {
    const mounted = await mountTab()
    // 真实 scanner：blank 项目 start 地图真实事实（tilesetRefs starter，最高用 #1）。
    await waitRemovalButton('查看 1 处阻断引用')
    const historyBeforeBlock = mounted.session.getHistoryVersion()
    await clickButton(host, '查看 1 处阻断引用')
    const panel = host.querySelector('.ds-reference-panel')
    expect(panel, '引用面板').not.toBeNull()
    expect(panel!.textContent).toContain('先处理地图和组合模板中的引用，再重新检查。')
    expect(panel!.textContent).toContain('地图 起始地图')
    expect(panel!.textContent).toContain('最高使用 #1')
    // fail-closed：零提交、定义与 catalog 原样、无错误残留。
    expect(mounted.session.getHistoryVersion()).toBe(historyBeforeBlock)
    expect(mounted.session.getState().tilesets?.map((entry) => entry.id)).toEqual(['starter'])
    expect(mounted.session.getState().assetCatalog.assets[STARTER_ASSET]).toBeDefined()
    expect(host.querySelector('.tileset-error')).toBeNull()
    // 阻断引用行深链交出真实 edge（真实 referenceIndex 产物，完整关键字段）。
    await clickButton(host, '打开地图 起始地图')
    expect(mounted.openedReferences).toHaveLength(1)
    expect(mounted.openedReferences[0]).toMatchObject({
      target: { kind: 'tileset', id: 'starter' },
      source: { owner: { kind: 'map', id: 'start' }, label: '地图 起始地图' },
      relation: { kind: 'tileset-use', use: 'map' },
      where: 'maps.start.tilesetRefs.starter',
      detail: '最高使用 #1',
      locator: { kind: 'object', object: { kind: 'map', id: 'start' } },
      deletePolicy: 'replace-suggest',
    })

    // 正控：真实命令播种的未引用新集走「确认移除」真实移除。
    const seeded = await seedTileset(mounted, {
      id: 'k04-extra',
      name: '外挂地形',
      category: 'dungeon',
    })
    await selectTilesetRow('k04-extra')
    await waitRemovalButton('确认移除')
    const historyBeforeRemove = mounted.session.getHistoryVersion()
    await clickButton(host, '确认移除')
    await vi.waitFor(() => {
      expect(mounted.session.getState().tilesets?.map((entry) => entry.id)).toEqual(['starter'])
    })
    expect(mounted.session.getState().assetCatalog.assets['tileset.k04-extra']).toBeUndefined()
    expect(mounted.session.getState().assetBlobs[seeded.record.path]).toBeUndefined()
    await expect(loadTilesetAsset(mounted.reader, 'tileset.k04-extra')).rejects.toThrow(
      '不在 catalog',
    )
    expect(mounted.session.getHistoryVersion()).toBeGreaterThan(historyBeforeRemove)
    expect(host.querySelector('.tileset-error')).toBeNull()
    // 选中回退到 starter 并同步 focus。
    await vi.waitFor(() => expect(tilesetRow('starter').getAttribute('aria-pressed')).toBe('true'))
    expect(mounted.focusLog.at(-1)).toBe('starter')

    // undo：定义/catalog/pending 字节全还原，真实解码逐帧一致；redo 再移除。
    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().tilesets?.map((entry) => entry.id)).toEqual([
      'starter',
      'k04-extra',
    ])
    expect(mounted.session.getState().assetCatalog.assets['tileset.k04-extra']).toEqual(
      seeded.record,
    )
    const restoredBlob = mounted.session.getState().assetBlobs[seeded.record.path]
    expect(restoredBlob).toBeDefined()
    expect(await sha256Hex(restoredBlob!.slice(0))).toBe(seeded.record.sha256)
    expect(await decodeCurrent(mounted, 'tileset.k04-extra')).toEqual(seeded.frames)
    assertProjectSaveValid(mounted.session.getState())
    await act(async () => {
      expect(mounted.session.redo()).toBe(true)
    })
    expect(mounted.session.getState().tilesets?.map((entry) => entry.id)).toEqual(['starter'])
    expect(mounted.session.getState().assetCatalog.assets['tileset.k04-extra']).toBeUndefined()
  })

  test('替换：越界缩帧面板与提交双重 fail-closed；增帧正控真实换字节可撤销', async () => {
    const mounted = await mountTab()
    const originalRecord = mounted.session.getState().assetCatalog.assets[STARTER_ASSET]!
    const originalFrames = await decodeCurrent(mounted, STARTER_ASSET)
    expect(originalFrames).toHaveLength(4)
    expect(originalFrames[0]!.width).toBe(32)
    expect(originalFrames[0]!.height).toBe(15)
    const confirm = vi.spyOn(window, 'confirm')
    await waitRemovalButton('查看 1 处阻断引用')

    await clickButton(host, '替换图像')
    // 单定义替换入口不弹共享确认。
    expect(confirm).not.toHaveBeenCalled()
    expect(buttonByLabel(host, '替换瓦片集图像').disabled).toBe(true)

    // 缩帧侧：1 帧 ≤ start 地图最高用 #1 → 面板与提交双重阻断，零提交且草稿保留。
    await pickAtlas('shrunk.png', solidAtlasPng(32, 16, [atlasColors(16)[5]!]).bytes, 32, 16)
    await waitCutSummary(1)
    const outOfRange = host.querySelector('section[aria-label="替换越界引用"]')
    expect(outOfRange, '越界面板').not.toBeNull()
    expect(outOfRange!.textContent).toContain('无法缩减帧数')
    expect(outOfRange!.querySelector('.tileset-removal-warning')?.textContent).toBe(
      '新图集只有 1 帧。以下对象仍引用更大的瓦片编号，请先修正后重试。',
    )
    expect(outOfRange!.textContent).toContain('引用地图')
    expect(outOfRange!.textContent).toContain('起始地图')
    expect(outOfRange!.textContent).toContain('start · #1')
    const historyBeforeBlock = mounted.session.getHistoryVersion()
    await clickButton(host, '替换瓦片集图像')
    await vi.waitFor(() => {
      expect(host.querySelector('.tileset-error')).not.toBeNull()
    })
    expect(host.querySelector('.tileset-error')?.textContent).toBe(
      '新瓦片集仅 1 帧，越界引用：地图“start” #1',
    )
    expect(mounted.session.getHistoryVersion()).toBe(historyBeforeBlock)
    expect(mounted.session.getState().assetCatalog.assets[STARTER_ASSET]?.sha256).toBe(
      originalRecord.sha256,
    )
    expect(host.querySelector('.tileset-cut-summary')?.textContent).toBe('将切出 1 块瓦片')

    // 增帧正控：4 帧 > 最高用 #1 → 真实编码替换入库，定义与 AssetId 不动。
    const colors = atlasColors(4)
    const expectedFrames = await expectedTilesetFrames(mounted, 32, 16, colors)
    const expected = await expectedAssetBytes(expectedFrames)
    await pickAtlas('forest-four.png', solidAtlasPng(32, 16, colors).bytes, 128, 16)
    await waitCutSummary(4)
    expect(host.querySelector('section[aria-label="替换越界引用"]')).toBeNull()
    await clickButton(host, '替换瓦片集图像')
    await vi.waitFor(() => {
      expect(mounted.session.getState().assetCatalog.assets[STARTER_ASSET]?.sha256).toBe(
        expected.sha256,
      )
    })
    const record = mounted.session.getState().assetCatalog.assets[STARTER_ASSET]!
    expect(record).toEqual({
      ...originalRecord,
      path: `assets/authored/tilesets/${expected.sha256}.rle`,
      bytes: expected.bytes.byteLength,
      sha256: expected.sha256,
      origin: { kind: 'authored' },
    } satisfies AssetRecordV1)
    expect(mounted.session.getState().tilesets).toEqual([
      { id: 'starter', name: '起始地形', category: 'outdoor', asset: STARTER_ASSET },
    ])
    const blob = mounted.session.getState().assetBlobs[record.path]
    expect(blob).toBeDefined()
    expect(await sha256Hex(blob!.slice(0))).toBe(expected.sha256)
    expect(await decodeCurrent(mounted, STARTER_ASSET)).toEqual(expectedFrames)
    assertProjectSaveValid(mounted.session.getState())
    // 预览按新 sha 真实重载：新帧形 32×16（旧帧 32×15）。
    await vi.waitFor(() => expect(frameCellTitles()[0]).toBe('#0 · 32×16'))
    expect(previewRange()).toBe('1–4 / 4 块')
    expect(confirm).not.toHaveBeenCalled()

    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[STARTER_ASSET]?.sha256).toBe(
      originalRecord.sha256,
    )
    expect(mounted.session.getState().assetBlobs[record.path]).toBeUndefined()
    expect(await decodeCurrent(mounted, STARTER_ASSET)).toEqual(originalFrames)
    await vi.waitFor(() => expect(frameCellTitles()[0]).toBe('#0 · 32×15'))
    await act(async () => {
      expect(mounted.session.redo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[STARTER_ASSET]?.sha256).toBe(
      expected.sha256,
    )
    expect(await decodeCurrent(mounted, STARTER_ASSET)).toEqual(expectedFrames)
  })

  test('共享定义替换：confirm 取消零进入、放行后双定义保全且可撤销', async () => {
    const mounted = await mountTab()
    await waitRemovalButton('查看 1 处阻断引用')
    // 第二定义共享同一 AssetId：真实 AddTilesetCommand（record/bytes 与磁盘真值一致）。
    const originalRecord = mounted.session.getState().assetCatalog.assets[STARTER_ASSET]!
    const starterBytes = await mounted.source.readBytes(originalRecord.path)
    const originalFrames = await decodeCurrent(mounted, STARTER_ASSET)
    await act(async () => {
      mounted.session.dispatch(
        new AddTilesetCommand(
          { id: 'starter-alias', name: '起始地形副本', category: 'outdoor', asset: STARTER_ASSET },
          structuredClone(originalRecord),
          starterBytes.slice(0),
        ),
      )
    })
    const tilesetsBefore = mounted.session.getState().tilesets?.map((entry) => ({ ...entry }))
    expect(tilesetsBefore).toEqual([
      { id: 'starter', name: '起始地形', category: 'outdoor', asset: STARTER_ASSET },
      { id: 'starter-alias', name: '起始地形副本', category: 'outdoor', asset: STARTER_ASSET },
    ])

    // 取消侧：confirm=false → 不进入向导、零提交。
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const historyAtBlock = mounted.session.getHistoryVersion()
    await clickButton(host, '替换图像')
    expect(confirm).toHaveBeenCalledWith(
      '这份图像由 起始地形、起始地形副本 共同使用。替换会同时更新全部定义，是否继续？',
    )
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('起始地形')
    expect(
      [...host.querySelectorAll('button')].some(
        (candidate) => candidate.textContent?.trim() === '替换瓦片集图像',
      ),
    ).toBe(false)
    expect(mounted.session.getHistoryVersion()).toBe(historyAtBlock)

    // 放行侧：进入向导真实替换，双定义原样保全。
    confirm.mockReturnValue(true)
    await clickButton(host, '替换图像')
    expect(buttonByLabel(host, '替换瓦片集图像').disabled).toBe(true)
    const colors = atlasColors(2)
    const expectedFrames = await expectedTilesetFrames(mounted, 32, 16, colors)
    const expected = await expectedAssetBytes(expectedFrames)
    await pickAtlas('duo.png', solidAtlasPng(32, 16, colors).bytes, 64, 16)
    await waitCutSummary(2)
    await clickButton(host, '替换瓦片集图像')
    await vi.waitFor(() => {
      expect(mounted.session.getState().assetCatalog.assets[STARTER_ASSET]?.sha256).toBe(
        expected.sha256,
      )
    })
    expect(mounted.session.getState().tilesets).toEqual(tilesetsBefore)
    expect(await decodeCurrent(mounted, STARTER_ASSET)).toEqual(expectedFrames)
    assertProjectSaveValid(mounted.session.getState())
    await vi.waitFor(() => expect(previewRange()).toBe('1–2 / 2 块'))

    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[STARTER_ASSET]?.sha256).toBe(
      originalRecord.sha256,
    )
    expect(await decodeCurrent(mounted, STARTER_ASSET)).toEqual(originalFrames)
    expect(mounted.session.getState().tilesets).toEqual(tilesetsBefore)
  })

  test('替换竞态：读取在途时源资源被改写则 fail-closed 保留草稿，重试正控成功', async () => {
    let gate!: ReturnType<typeof gatedFileSource>
    const mounted = await mountTab({
      wrapSource: (source) => {
        gate = gatedFileSource(source)
        return gate.source
      },
    })
    const originalRecord = mounted.session.getState().assetCatalog.assets[STARTER_ASSET]!
    const originalBytes = await mounted.source.readBytes(originalRecord.path)
    await waitRemovalButton('查看 1 处阻断引用')
    await clickButton(host, '替换图像')
    const colors = atlasColors(2)
    const expectedFrames = await expectedTilesetFrames(mounted, 32, 16, colors)
    const expected = await expectedAssetBytes(expectedFrames)
    await pickAtlas('duo.png', solidAtlasPng(32, 16, colors).bytes, 64, 16)
    await waitCutSummary(2)

    // 闸门只拦磁盘端口：submit 的 readBytes 进入后在途（未开始/在途/完成三态可区分），
    // 另一编辑动作经真实 UpsertAssetCommand 改写 catalog。
    const callsBefore = gate.calls.length
    const completedBefore = gate.completed.length
    const hold = gate.gate(originalRecord.path)
    await act(async () => buttonByLabel(host, '替换瓦片集图像').click())
    await vi.waitFor(() => expect(gate.calls.length).toBeGreaterThan(callsBefore))
    expect(gate.calls.at(-1)).toBe(originalRecord.path)
    expect(gate.completed.length).toBe(completedBefore)

    const raceFrames = await expectedTilesetFrames(mounted, 32, 16, [atlasColors(16)[9]!])
    const race = await expectedAssetBytes(raceFrames)
    const raceRecord: AssetRecordV1 = {
      ...originalRecord,
      path: 'assets/authored/tilesets/k04-race.rle',
      bytes: race.bytes.byteLength,
      sha256: race.sha256,
    }
    try {
      await act(async () => {
        mounted.session.dispatch(
          new UpsertAssetCommand(STARTER_ASSET, raceRecord, race.bytes, originalBytes),
        )
      })
      const historyAfterUpsert = mounted.session.getHistoryVersion()
      hold.resolve()
      // 中性等待：报错或提交都能退出在途，随后业务断言分胜负（反控下必须是 AssertionError）。
      await vi.waitFor(() => {
        expect(
          host.querySelector('.tileset-error') !== null ||
            mounted.session.getHistoryVersion() !== historyAfterUpsert,
        ).toBe(true)
      })
      expect(gate.completed.length).toBe(completedBefore + 1)
      expect(gate.completed.at(-1)).toBe(originalRecord.path)
      expect(host.querySelector('.tileset-error')?.textContent).toBe(
        '待替换瓦片集或源资源已变化；请重新选择文件。',
      )
      expect(mounted.session.getHistoryVersion()).toBe(historyAfterUpsert)
      expect(mounted.session.getState().assetCatalog.assets[STARTER_ASSET]?.path).toBe(
        'assets/authored/tilesets/k04-race.rle',
      )
      expect(mounted.session.getState().tilesets?.map((entry) => entry.id)).toEqual(['starter'])
      // 草稿保留：用户可直接重试。
      expect(host.querySelector('.tileset-cut-summary')?.textContent).toBe('将切出 2 块瓦片')
    } finally {
      hold.resolve()
    }

    // 重试正控：新 record 字节已在 pending blob，不再碰磁盘闸门，真实替换成功。
    await clickButton(host, '替换瓦片集图像')
    await vi.waitFor(() => {
      expect(mounted.session.getState().assetCatalog.assets[STARTER_ASSET]?.sha256).toBe(
        expected.sha256,
      )
    })
    expect(await decodeCurrent(mounted, STARTER_ASSET)).toEqual(expectedFrames)
    assertProjectSaveValid(mounted.session.getState())
    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[STARTER_ASSET]?.sha256).toBe(race.sha256)
  })
})
