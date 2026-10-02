// @vitest-environment jsdom
/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K12（批C）：MapMode 真实地图变换工作流补测
 * （锚 MapMode.tsx:1327/1711/1901/2167/2619）。
 *
 * 与旧测试的本质差异：不 mock scene-stage/reforge —— useSceneAssets 真实磁盘+gzip+RLE 解码
 * starter 瓦片集，hitTestMapContent 走真实帧像素命中，会话为 loadLegalUiProject 的合法 blank
 * 项目 + 真实 EditSession + 活 EditorAssetReader + collectCurrentProjectReferenceIndex 活引用索引。
 *
 * 旧 file/title → 已证合同 → 本组缺口：
 * - MapMode.test.tsx（useSceneAssets/useViewZoomPan/drawGridBlocked 全 mock，editorState 字面量）：
 *   - '普通冲突在落点冻结后弹窗确认，移出画布不漂移，返回调整零写且覆盖可撤销' → 已证整组移动的
 *     冲突弹窗/返回调整/覆盖/undo（假瓦片假命中）；缺口：普通 cells 选区的粘贴预览 → 越界拒绝 →
 *     冲突弹窗（'覆盖并粘贴' 文案）→ 覆盖提交 → undo/redo（本文件 test 1，真实命中+真实剪贴板）。
 *   - '画布点击即冻结并放下移动目标，无冲突时不再要求去右栏二次提交' → 已证整组移动画布放下；
 *     缺口：cells 粘贴的画布放下与 '内容没有变化' 未变分支（test 1 / test 5）。
 *   - '切换 EditSession 会清掉旧项目正在进行的变换预览与剪贴板' → 已证会话切换清理；不重复。
 *   - '活动层锁定或隐藏后，笔刷与 Inspector 写操作禁用并显示原因' → 已证工具禁用态；缺口：变换
 *     预览**进行中**锁定/隐藏活动层 → Enter 提交被 permission 拒绝、地图/剪贴板完整保全、解锁后
 *     同一剪贴板可提交正控（test 2）。
 *   - '普通内容冲突随直接放置原子覆盖且可撤销，既有组合 ownership 仍阻止覆盖' 与 '跨层 ghost hover
 *     零写；有效点击一次原子放置' → 已证 commitStamp 覆盖与 undo（mock 资产）；缺口：commitStamp 在
 *     活动层锁定时的 plan 级 permission 拒绝（'整组不能放置'）零写 + 解锁正控（test 3，真实建组→
 *     真实放置）。
 *   - '整组移动把视觉、高度、碰撞和 placement ID 作为一步历史提交' → 已证整组移动成功链；缺口：
 *     预览期间地图被外部改写 → planStampGroupMove expectedMap 失配的「预览已过期」UI 拒绝、零写、
 *     剪贴板/选区保全与重做正控（test 4；dispatchAtMapRevision 的 revision 失配在 commitTransform
 *     每次渲染取新 mapRevision 后不可由 UI 触达，见回执）。
 *   - 'Ctrl/⌘ 可追加不规则瓦片选区、再次命中移除，并可直接提取组合' → 已证 ctrl 追加与建组入口；
 *     本文件 test 1/3 只把它当前置步骤。
 *   - '整组目标命中其他 placement 是硬冲突，不出现覆盖入口' → 已证；不重复。
 * - MapMode.catalog-coverage.test.tsx：目录增删改名（真实 blank 项目）→ 与画布变换正交，不重复。
 * - core/map-transform.test.ts + boundaries + background（Cursor 纯计划函数）：planMapPaste/Move/
 *   Delete 的 reject/overwrite/ownership/越界已全证 → 本文件只经真实 UI 触达，不直测计划函数。
 * - ui/map-transform-session.test.ts / map-pointer-gesture-session.test.tsx：reducer/手势会话纯态
 *   已证（含 cancel 清态）；缺口：画布 DOM pointercancel 中断选区拖框的零提交与后续干净态（test 5）。
 * - 键盘：旧测试只证组内 Ctrl+C/V 拒绝与 Esc 进出组内；缺口：Cmd+A 全选真实计数、Delete 删除 +
 *   undo/redo、Esc 清选区、粘贴不变分支（test 5）。
 *
 * jsdom 补齐（k12-fixtures.ts，观测范围以 fixture 头注释为准）：Path2D 记录型、pointer capture、
 * canvas 矩形、scrollIntoView。无产品 mock。
 */
import type { SceneDef } from '@type-pal/content'
import type { AssetBase, ProjectMap } from '@type-pal/reforge'
import { projectMapStampPlacements } from '@type-pal/reforge'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ApplyProjectMapPatchCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import type { ProjectReferenceIndex } from '../core/project-reference.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import {
  buttonByLabel,
  loadLegalUiProject,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import {
  installJsdomStageSemantics,
  keyOnCanvas,
  mapCellClient,
  mapModeFitView,
  pointerOn,
  type StageViewLike,
} from './__tests__/kimi-editor-workflows/k12-fixtures.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import { MapMode } from './MapMode.js'

const MAP_ID = 'start'

type Notices = Array<{ kind: 'info' | 'error'; message: string }>

let host: HTMLDivElement
let root: Root
let notices: Notices

beforeEach(() => {
  useActEnvironment()
  installBrowserHardwarePorts()
  installJsdomStageSemantics()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  notices = []
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function Harness(props: {
  session: EditSession
  reader: EditorAssetReader
  assetBase: AssetBase
  notices: Notices
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const state = props.session.getState()
  const [selectedMapId, setSelectedMapId] = useState(MAP_ID)
  const scene = state.scenes.find((candidate) => candidate.id === MAP_ID) as SceneDef
  const referenceIndex: ProjectReferenceIndex = collectCurrentProjectReferenceIndex(state)
  return (
    <MapMode
      scene={scene}
      session={props.session}
      assetBase={props.assetBase}
      assetCatalog={state.assetCatalog}
      assetReader={props.reader}
      projectMaps={state.maps}
      mapIndex={state.mapIndex}
      selectedMapId={selectedMapId}
      onSelectMap={(id) => setSelectedMapId(id ?? MAP_ID)}
      referenceIndex={referenceIndex}
      referenceStatus="current"
      getCurrentReferenceIndex={(current) => collectCurrentProjectReferenceIndex(current)}
      onOpenReference={() => undefined}
      tilesets={state.tilesets ?? []}
      stamps={state.stamps ?? []}
      onWorkspaceNotice={(notice) => {
        if (notice) props.notices.push(notice)
      }}
    />
  )
}

interface Mounted {
  session: EditSession
  notices: Notices
}

function canvas(): HTMLCanvasElement {
  const element = host.querySelector<HTMLCanvasElement>('[data-map-canvas="true"]')
  expect(element, '地图画布').not.toBeNull()
  return element!
}

/** 当前 fit 视图（画布 120×120 由 jsdom 零矩形 + useStageSize min=120 决定）。 */
function currentView(): StageViewLike {
  return mapModeFitView({ width: liveMap().width, height: liveMap().height }, { w: 120, h: 120 })
}

function zoomStatusText(): string {
  const text = host.querySelector('.map-viewport-status--zoom')?.textContent
  expect(text, '缩放状态').toBeTruthy()
  return text!
}

let currentSession: EditSession

/** 真实资产链路就绪见证：fit 后缩放读数精确等于独立复算的 fit 公式。 */
async function waitStageReady(): Promise<void> {
  const expected = `${Math.round(currentView().zoom * 100)}%`
  const deadline = Date.now() + 1000
  // 真实读取/解压跨过首次 render 的 act；每轮等待覆盖异步 ready、fit 与浮层布局更新，
  // 再在 act flush 后观察 DOM。把整个 DOM 轮询放进一个 act 会阻止待验的提交完成。
  while (zoomStatusText() !== expected && Date.now() < deadline) {
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 10))
    })
  }
  expect(zoomStatusText()).toBe(expected)
}

async function mount(): Promise<Mounted> {
  const legal = await loadLegalUiProject('kimi-k12-mapmode')
  const session = new EditSession(legal.state)
  const reader = createEditorAssetReader(legal.source, () => session.getState())
  currentSession = session
  await act(async () => {
    root.render(
      <Harness session={session} reader={reader} assetBase={legal.assetBase} notices={notices} />,
    )
  })
  await waitStageReady()
  return { session, notices }
}

function lastNotice(): { kind: 'info' | 'error'; message: string } {
  const notice = notices.at(-1)
  expect(notice, '工作区通知').toBeDefined()
  return notice!
}

/** 反控友好：先等目标通知出现，再断言精确文本与 kind（注入缺陷时是 AssertionError 而非超时）。 */
async function waitNotice(
  kind: 'info' | 'error',
  messagePart: string,
): Promise<{ kind: 'info' | 'error'; message: string }> {
  await vi.waitFor(() => {
    expect(
      notices.some((notice) => notice.kind === kind && notice.message.includes(messagePart)),
      `通知 ${kind} 含 ${messagePart}`,
    ).toBe(true)
  })
  const hit = [...notices]
    .reverse()
    .find((notice) => notice.kind === kind && notice.message.includes(messagePart))
  expect(hit, `通知 ${kind} 含 ${messagePart}`).toBeDefined()
  return hit!
}

function liveMap(): ProjectMap {
  const map = currentSession.getState().maps[MAP_ID]
  expect(map, 'live map').toBeDefined()
  return map!
}

async function clickCell(
  cell: { row: number; col: number },
  mods: { ctrlKey?: boolean } = {},
): Promise<void> {
  const at = mapCellClient(cell, currentView())
  await act(async () => {
    pointerOn(canvas(), 'pointerdown', { clientX: at.clientX, clientY: at.clientY, ...mods })
    pointerOn(canvas(), 'pointerup', { clientX: at.clientX, clientY: at.clientY, ...mods })
  })
}

async function hoverCell(cell: { row: number; col: number }): Promise<void> {
  const at = mapCellClient(cell, currentView())
  await act(async () => {
    pointerOn(canvas(), 'pointermove', { clientX: at.clientX, clientY: at.clientY })
  })
}

/** 变换预览的画布放下（onDown 即时冻结目标，无 pointerup 语义）。 */
async function dropAt(cell: { row: number; col: number }): Promise<void> {
  const at = mapCellClient(cell, currentView())
  await act(async () => {
    pointerOn(canvas(), 'pointerdown', { clientX: at.clientX, clientY: at.clientY })
  })
}

async function chooseTool(title: string): Promise<void> {
  await act(async () => buttonByLabel(host, title).click())
}

async function chooseToolOption(label: string, optionLabel: string): Promise<void> {
  const trigger = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
  expect(trigger, `工具选项 ${label}`).not.toBeNull()
  await act(async () => trigger!.click())
  const listbox = document.getElementById(trigger!.getAttribute('aria-controls')!)
  const option = [...listbox!.querySelectorAll<HTMLButtonElement>('[role="option"]')].find(
    (candidate) => candidate.getAttribute('aria-label') === optionLabel,
  )
  expect(option, `选项 ${optionLabel}`).toBeDefined()
  await act(async () => option!.click())
}

async function toggleLayerFlag(action: '锁定' | '可见'): Promise<void> {
  await act(async () => buttonByLabel(host, `图层${action}：地板`).click())
}

async function openSelectionMenu(): Promise<HTMLElement> {
  await act(async () => {
    canvas().dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 2,
        clientX: 24,
        clientY: 24,
      }),
    )
  })
  const menu = host.querySelector<HTMLElement>('[role="menu"][aria-label="地图选区操作"]')
  expect(menu, '地图选区右键菜单').not.toBeNull()
  return menu!
}

async function runSelectionCommand(label: string): Promise<void> {
  const menu = await openSelectionMenu()
  const item = [...menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find(
    (candidate) => candidate.textContent?.includes(label),
  )
  expect(item, `菜单项 ${label}`).toBeDefined()
  await act(async () => item!.click())
}

function transformBar(): HTMLElement {
  const bar = host.querySelector<HTMLElement>('.map-transform-bar')
  expect(bar, '变换预览条').not.toBeNull()
  return bar!
}

function overwriteDialog(): HTMLElement {
  const dialog = host.querySelector<HTMLElement>('[role="alertdialog"]')
  expect(dialog, '覆盖确认弹窗').not.toBeNull()
  return dialog!
}

describe('K12 MapMode 真实地图变换工作流', () => {
  test('cells 选区→复制→粘贴预览→越界拒绝→冲突弹窗返回调整→覆盖粘贴→undo/redo 全链', async () => {
    const mounted = await mount()
    // 前置真实编辑：笔刷 H3 写 (0,0)，碰撞标记 (0,0)，让剪贴板载荷与目标格可区分。
    await chooseTool('绘制选中瓦片')
    await chooseToolOption('绘制高度', 'H3')
    await clickCell({ row: 0, col: 0 })
    expect(liveMap().layers[0]!.heights?.[0]?.[0]).toBe(3)
    await chooseTool('绘制独立碰撞层')
    await clickCell({ row: 0, col: 0 })
    expect(liveMap().collision[0]![0]).toBe(1)
    const baseline = structuredClone(liveMap())
    expect(mounted.session.getMapRevision(MAP_ID)).toBe(2)

    // 真实像素命中选区：点选 (0,0)，Ctrl 追加 (0,1)；含碰撞开关进剪贴板。
    await chooseTool('选择已有内容')
    await act(async () => {
      const label = [...host.querySelectorAll<HTMLLabelElement>('.ds-check-label')].find(
        (candidate) => candidate.textContent?.includes('包含碰撞'),
      )
      expect(label, '包含碰撞开关').toBeDefined()
      label!.querySelector<HTMLInputElement>('input')!.click()
    })
    await clickCell({ row: 0, col: 0 })
    await clickCell({ row: 0, col: 1 }, { ctrlKey: true })
    expect(host.querySelector('.map-selection-head')?.textContent).toContain('2 个视觉实例')

    await act(async () => keyOnCanvas(canvas(), 'c', { ctrlKey: true }))
    await waitNotice('info', '已复制 2 个视觉实例和 2 个碰撞格点。')
    await act(async () => keyOnCanvas(canvas(), 'v', { ctrlKey: true }))
    await waitNotice('info', '粘贴预览：移动鼠标定位，在画布上单击放下。')
    expect(transformBar().textContent).toContain('粘贴预览')
    expect(transformBar().textContent).toContain('含碰撞')

    // 拒绝侧一：锚点 (0,11) 时第二格越界 → issues 锁定确认、点击放下只报错零写。
    await hoverCell({ row: 0, col: 11 })
    expect(transformBar().textContent).toContain('锚点 r0:c11')
    expect(transformBar().textContent).toContain('目标视觉槽越出地图边界')
    expect(buttonByLabel(transformBar(), '确认位置').disabled).toBe(true)
    await dropAt({ row: 0, col: 11 })
    await waitNotice('error', '目标视觉槽越出地图边界')
    expect(mounted.session.getMapRevision(MAP_ID)).toBe(2)
    expect(liveMap()).toEqual(baseline)
    expect(transformBar().textContent).toContain('单击画布放下')

    // 拒绝侧二：锚点 (0,9) 两格均被占用 → 冻结即弹窗，返回调整零写、预览仍在。
    await hoverCell({ row: 0, col: 9 })
    expect(transformBar().textContent).toContain('锚点 r0:c9')
    expect(transformBar().textContent).toContain('2 处覆盖冲突')
    await dropAt({ row: 0, col: 9 })
    expect(overwriteDialog().textContent).toContain('目标位置已有地图内容')
    expect(overwriteDialog().textContent).toContain('目标位置有 2 处内容冲突')
    expect(overwriteDialog().textContent).toContain('粘贴内容')
    expect(mounted.session.getMapRevision(MAP_ID)).toBe(2)
    await act(async () => buttonByLabel(overwriteDialog(), '返回调整').click())
    expect(host.querySelector('[role="alertdialog"]')).toBeNull()
    expect(liveMap()).toEqual(baseline)
    expect(transformBar().textContent).toContain('锚点 r0:c9')

    // 覆盖提交：视觉双通道 + 碰撞通道原子落账，选区跟随到目标。
    await dropAt({ row: 0, col: 9 })
    await act(async () => buttonByLabel(overwriteDialog(), '覆盖并粘贴').click())
    await waitNotice('info', '粘贴地图选区（含碰撞）；可撤销。')
    expect(mounted.session.getMapRevision(MAP_ID)).toBe(3)
    const floor = liveMap().layers[0]!
    expect(floor.tiles[0]![9]).toBe(0)
    expect(floor.heights?.[0]?.[9]).toBe(3)
    expect(floor.tiles[0]![10]).toBe(1)
    expect(floor.heights?.[0]?.[10]).toBe(0)
    expect(liveMap().collision[0]![9]).toBe(1)
    expect(liveMap().collision[0]![10]).toBe(0)
    // 源格不动（粘贴非剪切）。
    expect(floor.tiles[0]![0]).toBe(0)
    expect(floor.heights?.[0]?.[0]).toBe(3)
    expect(liveMap().collision[0]![0]).toBe(1)
    expect(host.querySelector('.map-selection-head')?.textContent).toContain('2 个视觉实例')

    await act(async () => expect(mounted.session.undo()).toBe(true))
    expect(liveMap()).toEqual(baseline)
    await act(async () => expect(mounted.session.redo()).toBe(true))
    expect(liveMap().layers[0]!.tiles[0]![9]).toBe(0)
    expect(liveMap().collision[0]![9]).toBe(1)

    // 剪贴板在整链后仍可用（正控）：再次进入粘贴预览。
    await act(async () => keyOnCanvas(canvas(), 'v', { ctrlKey: true }))
    await waitNotice('info', '粘贴预览：移动鼠标定位，在画布上单击放下。')
    expect(transformBar().textContent).toContain('粘贴预览')
    await act(async () => keyOnCanvas(canvas(), 'Escape'))
  })

  test('预览进行中锁定/隐藏活动层：Enter 提交被 permission 拒绝零写，剪贴板保全且解锁后可提交', async () => {
    const mounted = await mount()
    await chooseTool('选择已有内容')
    await clickCell({ row: 0, col: 0 })
    await act(async () => keyOnCanvas(canvas(), 'c', { ctrlKey: true }))
    await waitNotice('info', '已复制 1 个视觉实例。')
    await act(async () => keyOnCanvas(canvas(), 'v', { ctrlKey: true }))
    await waitNotice('info', '粘贴预览')
    const baseline = structuredClone(liveMap())
    const revisionAtPreview = mounted.session.getMapRevision(MAP_ID)
    const historyAtPreview = mounted.session.getHistoryVersion()

    // 锁定侧：预览条显示原因、确认禁用；Enter 走 requestTransformDrop 的 permission 拒绝。
    await toggleLayerFlag('锁定')
    expect(transformBar().textContent).toContain('当前活动层已锁定，不能提交变换。')
    expect(buttonByLabel(transformBar(), '确认位置').disabled).toBe(true)
    await act(async () => keyOnCanvas(canvas(), 'Enter'))
    await waitNotice('error', '当前活动层已锁定，不能提交变换。')
    expect(lastNotice()).toEqual({ kind: 'error', message: '当前活动层已锁定，不能提交变换。' })
    expect(mounted.session.getMapRevision(MAP_ID)).toBe(revisionAtPreview)
    expect(mounted.session.getHistoryVersion()).toBe(historyAtPreview)
    expect(liveMap()).toEqual(baseline)
    // 拒绝只解开目标冻结，预览与剪贴板都在。
    expect(transformBar().textContent).toContain('单击画布放下')

    // 隐藏侧：同一 permission 分支的 hidden 文案。
    await toggleLayerFlag('锁定')
    await toggleLayerFlag('可见')
    expect(transformBar().textContent).toContain('当前活动层已隐藏，不能提交变换。')
    await act(async () => keyOnCanvas(canvas(), 'Enter'))
    await waitNotice('error', '当前活动层已隐藏，不能提交变换。')
    expect(mounted.session.getMapRevision(MAP_ID)).toBe(revisionAtPreview)
    expect(liveMap()).toEqual(baseline)
    await toggleLayerFlag('可见')

    // 正控：取消后剪贴板仍在，重进预览并覆盖粘贴成功。
    await act(async () => keyOnCanvas(canvas(), 'Escape'))
    await waitNotice('info', '已取消地图变换预览。')
    await act(async () => keyOnCanvas(canvas(), 'v', { ctrlKey: true }))
    await waitNotice('info', '粘贴预览：移动鼠标定位，在画布上单击放下。')
    await dropAt({ row: 0, col: 9 })
    await act(async () => buttonByLabel(overwriteDialog(), '覆盖并粘贴').click())
    await waitNotice('info', '粘贴地图选区（仅视觉）；可撤销。')
    expect(liveMap().layers[0]!.tiles[0]![9]).toBe(0)
    expect(liveMap().layers[0]!.tiles[0]![0]).toBe(0)
    expect(mounted.session.getMapRevision(MAP_ID)).toBe(revisionAtPreview + 1)
    await act(async () => expect(mounted.session.undo()).toBe(true))
    expect(liveMap()).toEqual(baseline)
  })

  test('组合放置：活动层锁定时 commitStamp 整组拒绝零写，解锁后真实放置可撤销', async () => {
    const mounted = await mount()
    // 真实 UI 建组（选区 → 右键保存为组合 → 对话框创建）。
    await chooseTool('选择已有内容')
    await clickCell({ row: 0, col: 0 })
    await runSelectionCommand('保存为组合')
    const stampDialog = document.body.querySelector<HTMLElement>('.stamp-template-dialog')
    expect(stampDialog, '组合模板对话框').not.toBeNull()
    await act(async () => buttonByLabel(stampDialog!, '创建组合').click())
    expect(mounted.session.getState().stamps).toHaveLength(1)
    const stampId = mounted.session.getState().stamps[0]!.id

    // 锁定活动层后激活组合：ghost 计划即报 permission 问题，点击放置整组拒绝。
    await toggleLayerFlag('锁定')
    const drawTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (candidate) => candidate.textContent?.trim() === '绘制',
    )!
    await act(async () => drawTab.click())
    const card = host.querySelector<HTMLButtonElement>('.map-stamp-card')
    expect(card, '组合卡片').not.toBeNull()
    await act(async () => card!.click())
    await waitNotice('info', '锚点将跟随鼠标')

    const revisionBefore = mounted.session.getMapRevision(MAP_ID)
    const baseline = structuredClone(liveMap())
    await hoverCell({ row: 2, col: 3 })
    expect(host.querySelector('.map-viewport-status--context')?.textContent).toContain(
      '目标图层 "地板" 已锁定，整组不能放置。',
    )
    await act(async () => {
      const at = mapCellClient({ row: 2, col: 3 }, currentView())
      pointerOn(canvas(), 'pointerdown', { clientX: at.clientX, clientY: at.clientY })
      pointerOn(canvas(), 'pointerup', { clientX: at.clientX, clientY: at.clientY })
    })
    await waitNotice('error', '目标图层 "地板" 已锁定，整组不能放置。')
    expect(lastNotice()).toEqual({
      kind: 'error',
      message: '目标图层 "地板" 已锁定，整组不能放置。',
    })
    expect(mounted.session.getMapRevision(MAP_ID)).toBe(revisionBefore)
    expect(liveMap()).toEqual(baseline)
    expect(projectMapStampPlacements(liveMap())).toEqual([])

    // 解锁正控：同一锚点真实放置，瓦片/组身份一步撤销。
    await toggleLayerFlag('锁定')
    await hoverCell({ row: 2, col: 3 })
    await act(async () => {
      const at = mapCellClient({ row: 2, col: 3 }, currentView())
      pointerOn(canvas(), 'pointerdown', { clientX: at.clientX, clientY: at.clientY })
      pointerOn(canvas(), 'pointerup', { clientX: at.clientX, clientY: at.clientY })
    })
    await waitNotice('info', '已放置组合')
    expect(lastNotice().message).toContain('矩阵与组身份可一步撤销')
    expect(mounted.session.getMapRevision(MAP_ID)).toBe(revisionBefore + 1)
    const placed = liveMap()
    expect(placed.layers[0]!.tiles[2]![3]).toBe(0)
    const placements = projectMapStampPlacements(placed)
    expect(placements).toHaveLength(1)
    expect(placements[0]).toMatchObject({
      sourceStampId: stampId,
      anchor: { row: 2, col: 3 },
      visualSlots: [{ layerId: 'floor', row: 2, col: 3 }],
    })

    await act(async () => expect(mounted.session.undo()).toBe(true))
    expect(liveMap()).toEqual(baseline)
    expect(projectMapStampPlacements(liveMap())).toEqual([])
  })

  test('整组移动预览期间地图被外部改写：过期拒绝零写且选区保全，重做移动成功', async () => {
    const mounted = await mount()
    // 前置：真实建组并放置到 (2,3)。
    await chooseTool('选择已有内容')
    await clickCell({ row: 0, col: 0 })
    await runSelectionCommand('保存为组合')
    const stampDialog = document.body.querySelector<HTMLElement>('.stamp-template-dialog')
    await act(async () => buttonByLabel(stampDialog!, '创建组合').click())
    const drawTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (candidate) => candidate.textContent?.trim() === '绘制',
    )!
    await act(async () => drawTab.click())
    await act(async () => host.querySelector<HTMLButtonElement>('.map-stamp-card')!.click())
    await hoverCell({ row: 2, col: 3 })
    await act(async () => {
      const at = mapCellClient({ row: 2, col: 3 }, currentView())
      pointerOn(canvas(), 'pointerdown', { clientX: at.clientX, clientY: at.clientY })
      pointerOn(canvas(), 'pointerup', { clientX: at.clientX, clientY: at.clientY })
    })
    await waitNotice('info', '已放置组合')
    const placementId = projectMapStampPlacements(liveMap())[0]!.id

    // 选中整组并进入移动预览。
    await chooseTool('选择已有内容')
    await clickCell({ row: 2, col: 3 })
    expect(host.querySelector('.stamp-group-selection-head')?.textContent).toContain('1 组')
    await runSelectionCommand('移动')
    expect(transformBar().textContent).toContain('移动预览')
    expect(transformBar().textContent).toContain('锚点 r2:c3')
    const revisionAtPreview = mounted.session.getMapRevision(MAP_ID)

    // 外部并发编辑（真实公开 dispatch，模拟预览→提交之间的会话写入）：mapRevision 前进。
    await act(async () => {
      mounted.session.dispatch(
        new ApplyProjectMapPatchCommand(
          MAP_ID,
          {
            visual: [{ channel: 'height', ref: { layerId: 'floor', row: 5, col: 5 }, value: 2 }],
            collision: [],
          },
          { hiddenLayerIds: [], lockedLayerIds: [], requiredWritableLayerIds: ['floor'] },
          '外部并发编辑',
        ),
      )
    })
    expect(mounted.session.getMapRevision(MAP_ID)).toBe(revisionAtPreview + 1)
    const afterExternal = structuredClone(liveMap())

    // 过期形态：预览条显示原因、确认禁用；画布放下只报错零写。
    expect(transformBar().textContent).toContain(
      '组合移动预览已过期；地图内容变化后必须重新开始移动。',
    )
    expect(buttonByLabel(transformBar(), '确认位置').disabled).toBe(true)
    await dropAt({ row: 4, col: 5 })
    await waitNotice('error', '组合移动预览已过期')
    expect(lastNotice()).toEqual({
      kind: 'error',
      message: '组合移动预览已过期；地图内容变化后必须重新开始移动。',
    })
    expect(mounted.session.getMapRevision(MAP_ID)).toBe(revisionAtPreview + 1)
    expect(liveMap()).toEqual(afterExternal)
    expect(projectMapStampPlacements(liveMap())).toMatchObject([
      { id: placementId, anchor: { row: 2, col: 3 } },
    ])
    expect(host.querySelector('.stamp-group-selection-head')?.textContent).toContain('1 组')

    // 正控：取消预览 → 擦除目标格制造空位 → 重进移动 → 无冲突直接放下，undo 链对称。
    await act(async () => keyOnCanvas(canvas(), 'Escape'))
    await waitNotice('info', '已取消地图变换预览。')
    await chooseTool('擦除瓦片')
    await clickCell({ row: 4, col: 5 })
    expect(liveMap().layers[0]!.tiles[4]![5]).toBeNull()
    await chooseTool('选择已有内容')
    await runSelectionCommand('移动')
    expect(transformBar().textContent).toContain('移动预览')
    await dropAt({ row: 4, col: 5 })
    await waitNotice('info', '已移动 1 个完整放置组合')
    expect(host.querySelector('[role="alertdialog"]')).toBeNull()
    const moved = liveMap()
    expect(projectMapStampPlacements(moved)).toMatchObject([
      { id: placementId, anchor: { row: 4, col: 5 } },
    ])
    expect(moved.layers[0]!.tiles[2]![3]).toBeNull()
    expect(moved.layers[0]!.tiles[4]![5]).toBe(0)

    await act(async () => expect(mounted.session.undo()).toBe(true))
    expect(projectMapStampPlacements(liveMap())).toMatchObject([
      { id: placementId, anchor: { row: 2, col: 3 } },
    ])
    expect(liveMap().layers[0]!.tiles[4]![5]).toBeNull()
    await act(async () => expect(mounted.session.undo()).toBe(true))
    expect(liveMap().layers[0]!.tiles[4]![5]).toBe(1)
    await act(async () => expect(mounted.session.undo()).toBe(true))
    expect(liveMap().layers[0]!.heights?.[5]?.[5] ?? 0).toBe(0)
  })

  test('键盘全选/删除/不变粘贴与指针取消：计数真实、撤销对称、中断零提交', async () => {
    const mounted = await mount()
    await chooseTool('选择已有内容')

    // 指针取消：拖框在途 pointercancel → 零提交；后续点击立即恢复干净选择。
    const from = mapCellClient({ row: 5, col: 2 }, currentView())
    const to = mapCellClient({ row: 7, col: 4 }, currentView())
    await act(async () => {
      pointerOn(canvas(), 'pointerdown', { clientX: from.clientX, clientY: from.clientY })
      pointerOn(canvas(), 'pointermove', { clientX: to.clientX, clientY: to.clientY })
    })
    await act(async () => {
      pointerOn(canvas(), 'pointercancel', { clientX: to.clientX, clientY: to.clientY })
      pointerOn(canvas(), 'pointerup', { clientX: to.clientX, clientY: to.clientY })
    })
    expect(host.querySelector('.map-selection-head')).toBeNull()
    expect(mounted.notices.some((notice) => notice.message.includes('已选择'))).toBe(false)
    expect(mounted.session.getMapRevision(MAP_ID)).toBe(0)
    await clickCell({ row: 5, col: 2 })
    expect(host.querySelector('.map-selection-head')?.textContent).toContain('1 个视觉实例')
    await act(async () => keyOnCanvas(canvas(), 'Escape'))
    expect(host.querySelector('.map-selection-head')).toBeNull()

    // Cmd+A 全选：blank 地图 12×24=288 个非空视觉槽、零非零碰撞格的真实计数。
    await act(async () => keyOnCanvas(canvas(), 'a', { ctrlKey: true }))
    await waitNotice('info', '已全选当前作用域：288 个非空视觉槽、0 个非零碰撞格。')
    expect(host.querySelector('.map-selection-head')?.textContent).toContain('288 个视觉实例')

    // 不变分支：整图复制后原地粘贴，覆盖确认后内容没有变化、历史不前进、预览自闭合。
    const revisionBefore = mounted.session.getMapRevision(MAP_ID)
    const historyBefore = mounted.session.getHistoryVersion()
    const baseline = structuredClone(liveMap())
    await act(async () => keyOnCanvas(canvas(), 'c', { ctrlKey: true }))
    await waitNotice('info', '已复制 288 个视觉实例。')
    await act(async () => keyOnCanvas(canvas(), 'v', { ctrlKey: true }))
    await waitNotice('info', '粘贴预览')
    expect(transformBar().textContent).toContain('288 处覆盖冲突')
    await act(async () => buttonByLabel(transformBar(), '确认位置').click())
    await act(async () => buttonByLabel(overwriteDialog(), '覆盖并粘贴').click())
    await waitNotice('info', '粘贴地图选区（仅视觉）：内容没有变化。')
    expect(mounted.session.getMapRevision(MAP_ID)).toBe(revisionBefore)
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore)
    expect(liveMap()).toEqual(baseline)
    expect(host.querySelector('.map-transform-bar')).toBeNull()

    // Delete 删除整图选区：单层 288 槽全空，undo/redo 对称。
    await act(async () => keyOnCanvas(canvas(), 'Delete'))
    await waitNotice('info', '删除选区；可撤销。')
    expect(mounted.session.getMapRevision(MAP_ID)).toBe(revisionBefore + 1)
    expect(
      liveMap()
        .layers[0]!.tiles.flat()
        .every((tile) => tile === null),
    ).toBe(true)
    expect(host.querySelector('.map-selection-head')).toBeNull()
    await act(async () => expect(mounted.session.undo()).toBe(true))
    expect(liveMap()).toEqual(baseline)
    await act(async () => expect(mounted.session.redo()).toBe(true))
    expect(
      liveMap()
        .layers[0]!.tiles.flat()
        .every((tile) => tile === null),
    ).toBe(true)
  })
})
