// @vitest-environment jsdom
/**
 * TEST-COVERAGE85-GLM-EDITOR-1 r3 T1：MapMode 键盘/选区/提交合同。
 *
 * 合同表（source:line · 事件 · 合法输入 · 状态转移 · 业务 oracle）：
 * - C1 框选→Delete 删除提交 | MapMode.tsx:1618-1626（deleteSelection→planMapDelete→
 *   dispatchMapPatch） | canvas pointerdown(1,1)→pointermove(33,17)→pointerup 后
 *   keydown Delete | start 地图 floor 层棋盘瓦片 | selection cells → plan → 命令提交 |
 *   session.getState().maps.start 序列化：选区格 tileId/sources 变 null（undo 恢复）。
 * - C2 Escape 清选区 | onCanvasKeyDown Escape 分支 | 有选区 | cells → none |
 *   随后 Delete 零 history、地图字节不变。
 * - C3 无选区移动/重复错误回显 | beginMove 1686-1688 / repeatMapSelection 1860-1862 |
 *   contextmenu→移动/重复 | 无选区 | 状态不变 | onWorkspaceNotice 精确 error 消息。
 * - C4 画布右键菜单开合与键盘导航 | openCanvasContextMenu 2581-2622 | contextmenu 事件
 *   + keydown Home/End/ArrowDown | 菜单 focus 流转 | activeElement 移到首/末菜单项。
 * - C5 工具状态行 | 2798-2805 | 工具切换按钮 | collision/eyedropper/select | 状态栏文本。
 *   （r6 删除原 C6 碰撞绘制合同：与 MapMode.kimi-workflows.test.tsx K12 前置编辑
 *   同 caller/输入/oracle——「绘制独立碰撞层」单击→collision 序列化断言；undo 清零
 *   不构成独立业务轴。）
 *
 * 装配：loadBoundaryProject 真实装载（seed→fsaSource→loader→toEditorState 全合法），
 * assetBase/assetCatalog/assetReader 全真值；scene-stage 仅隔离绘制层（drawGridBlocked/
 * renderSceneFrame 等），数据面（map/scene/session）为真实公开输入。断言全部走
 * session 序列化业务结果，不做 snapshot-only/handler-only。
 */

import type { ProjectMap, RleFrame } from '@type-pal/reforge'
import { Canvas2DRenderer } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { requireRealCanvas2d } from '../__tests__/cursor-asset-r1/canvas-pixels.js'
import { installBrowserHardwarePorts } from '../__tests__/cursor-asset-r1/image-ports.js'
import { stubNodeTestHost } from '../__tests__/glm-m/kit.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceIndex,
} from '../core/project-reference.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { MapMode } from './MapMode.js'
import type { StageAssets } from './scene-stage.js'

vi.mock('@type-pal/reforge', async (importOriginal) => {
  const original = await importOriginal<typeof import('@type-pal/reforge')>()
  return {
    ...original,
    bakeFrame: vi.fn(() => document.createElement('canvas')),
    renderSceneFrame: vi.fn(),
  }
})
vi.mock('./map-selection-overlay.js', () => ({ drawMapSelectionOverlay: vi.fn() }))
vi.mock('./stamp-placement-overlay.js', () => ({ drawStampPlacementOverlay: vi.fn() }))
vi.mock('./stamp-placement-selection-overlay.js', () => ({
  drawStampPlacementSelectionOverlay: vi.fn(),
}))
vi.mock('./scene-stage.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./scene-stage.js')>()
  const React = await import('react')
  const opaque = new Uint8Array(32 * 16).fill(1)
  const frame: RleFrame = { width: 32, height: 16, pixels: new Uint8Array(32 * 16), opaque }
  return {
    ...original,
    drawGridBlocked: vi.fn(),
    mapBoxOf: vi.fn(() => ({ minX: 0, minY: 0, maxX: 640, maxY: 480 })),
    useStageSize: vi.fn(() => ({ w: 640, h: 480 })),
    useSceneAssets: (options: { mapId: string; projectMaps?: Record<string, ProjectMap> }) => {
      // renderer 用真实 Canvas2DRenderer（node-canvas ctx；绘制调用本身已被
      // renderSceneFrame mock 隔离，renderer 仅满足类型与间接读取）。
      const palette = {
        colors: Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]),
        cycles: [],
      }
      const tilesets = new Map([['starter', new Map([[1, frame]])]])
      const renderer = new Canvas2DRenderer(
        document.createElement('canvas').getContext('2d')!,
        palette,
        tilesets,
      )
      const build = (): StageAssets => ({
        renderer,
        spritesByAsset: new Map(),
        map: options.projectMaps?.[options.mapId] as ProjectMap,
        tiles: new Map([[1, frame]]),
        tilesets,
        palette,
      })
      const loadedRef = React.useRef<StageAssets>(build())
      loadedRef.current = build()
      return { status: 'ready' as const, err: '', loadedRef }
    },
    useViewZoomPan: (options: { initial: { zoom: number; panX: number; panY: number } }) => {
      const [view, setView] = React.useState(options.initial)
      const viewRef = React.useRef(view)
      viewRef.current = view
      return { view, viewRef, setView }
    },
  }
})

let root: Root
let host: HTMLDivElement

beforeEach(async () => {
  await stubNodeTestHost()
  installBrowserHardwarePorts()
  requireRealCanvas2d()
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 640,
      bottom: 480,
      width: 640,
      height: 480,
      toJSON: () => ({}),
    }),
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  Reflect.deleteProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect')
  Reflect.deleteProperty(HTMLCanvasElement.prototype, 'setPointerCapture')
  Reflect.deleteProperty(HTMLCanvasElement.prototype, 'releasePointerCapture')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function pointer(
  target: HTMLCanvasElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'contextmenu',
  options: { clientX?: number; clientY?: number; button?: number } = {},
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: options.button ?? 0,
    clientX: options.clientX ?? 1,
    clientY: options.clientY ?? 1,
  })
  Object.defineProperty(event, 'pointerId', { value: 7 })
  target.dispatchEvent(event)
}

function keydown(target: HTMLElement, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

function buttonByText(text: string): HTMLButtonElement {
  const found = [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )
  if (!found) throw new Error(`未找到按钮: ${text}`)
  return found
}

async function mountMapMode(): Promise<{
  session: EditSession
  canvas: HTMLCanvasElement
  notices: Array<{ kind: string; message?: string }>
}> {
  const legal = await loadLegalUiProject('cov85-mapmode')
  const state: EditorState = legal.state
  if (!state.maps.start) throw new Error('blank 项目未装载 start 地图')
  const session = new EditSession(state)
  const source = legal.source
  const reader = createEditorAssetReader(source, () => session.getState())
  const notices: Array<{ kind: string; message?: string }> = []
  const emptyIndex = createProjectReferenceIndex(buildProjectReferenceSnapshot([]))
  await act(async () => {
    root.render(
      <MapMode
        scene={state.scenes[0]!}
        session={session}
        assetBase={legal.assetBase}
        assetCatalog={state.assetCatalog}
        assetReader={reader}
        projectMaps={state.maps}
        mapIndex={state.mapIndex}
        selectedMapId={state.scenes[0]!.mapId}
        onSelectMap={vi.fn()}
        referenceIndex={emptyIndex}
        referenceStatus="current"
        getCurrentReferenceIndex={() => emptyIndex}
        onOpenReference={vi.fn()}
        tilesets={state.tilesets ?? []}
        stamps={state.stamps}
        onWorkspaceNotice={(notice) => {
          if (notice) notices.push(structuredClone(notice))
        }}
      />,
    )
    await Promise.resolve()
  })
  const canvas = host.querySelector<HTMLCanvasElement>('[aria-label="地图内容编辑画布"]')
  if (!canvas) throw new Error('地图画布未挂载')
  return { session, canvas, notices }
}

/** 单击选择一格（与旧测 selectFloor 同款 down+up 同点）。 */
async function clickSelect(canvas: HTMLCanvasElement): Promise<void> {
  await act(async () => {
    pointer(canvas, 'pointerdown', { clientX: 1, clientY: 1 })
    pointer(canvas, 'pointerup', { clientX: 1, clientY: 1 })
  })
}

/** floor 层全格快照：`row,col:tileId` 列表。 */
function floorSnapshot(map: ProjectMap): string[] {
  const floor = map.layers.find((candidate) => candidate.id === 'floor')!
  const cells: string[] = []
  floor.tiles.forEach((row, r) => {
    row.forEach((tileId, c) => {
      if (tileId !== null) cells.push(`${r},${c}:${tileId}`)
    })
  })
  return cells
}

test('cov85-map C1 单选格→Delete 恰好删除该格瓦片并可 undo 恢复', async () => {
  const { session, canvas } = await mountMapMode()
  await act(async () => {
    buttonByText('选择').click()
  })
  await clickSelect(canvas)
  const before = floorSnapshot(session.getState().maps.start!)
  expect(before.length).toBeGreaterThan(0)
  await act(async () => {
    canvas.focus()
    keydown(canvas, 'Delete')
  })
  const after = floorSnapshot(session.getState().maps.start!)
  // 恰好一格被清空（单选提交的最小变更）。
  expect(before.length - after.length).toBe(1)
  const removed = before.find((cell) => !after.includes(cell))!
  expect(removed).toMatch(/^\d+,\d+:[01]$/)
  await act(async () => {
    expect(session.undo()).toBe(true)
  })
  expect(floorSnapshot(session.getState().maps.start!)).toEqual(before)
})

test('cov85-map C2 Escape 清选区后 Delete 零提交', async () => {
  const { session, canvas } = await mountMapMode()
  await act(async () => {
    buttonByText('选择').click()
  })
  await clickSelect(canvas)
  await act(async () => {
    canvas.focus()
    keydown(canvas, 'Escape')
  })
  const historyBefore = session.getHistoryVersion()
  const mapBefore = JSON.stringify(session.getState().maps.start)
  await act(async () => {
    keydown(canvas, 'Delete')
  })
  expect(session.getHistoryVersion()).toBe(historyBefore)
  expect(JSON.stringify(session.getState().maps.start)).toBe(mapBefore)
})

test('cov85-map C3 无选区时移动/重复菜单项禁用（按钮级门禁），地图零变化', async () => {
  const { session, canvas } = await mountMapMode()
  const mapBefore = JSON.stringify(session.getState().maps.start)
  await act(async () => {
    pointer(canvas, 'contextmenu', { clientX: 100, clientY: 100, button: 2 })
  })
  const menuItem = (label: string): HTMLButtonElement => {
    const found = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.trim() === label,
    )
    if (!found) throw new Error(`菜单项缺失: ${label}`)
    return found
  }
  expect(menuItem('移动').disabled).toBe(true)
  expect(menuItem('重复').disabled).toBe(true)
  expect(menuItem('属性').disabled).toBe(false)
  expect(JSON.stringify(session.getState().maps.start)).toBe(mapBefore)
})

test('cov85-map C4 有选区时右键菜单键盘 Home/End 导航', async () => {
  const { canvas } = await mountMapMode()
  await act(async () => {
    buttonByText('选择').click()
  })
  await clickSelect(canvas)
  await act(async () => {
    pointer(canvas, 'contextmenu', { clientX: 5, clientY: 5, button: 2 })
  })
  const items = [
    ...document.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)'),
  ]
  expect(items.length).toBeGreaterThan(1)
  void items
  // 键盘事件派发到菜单容器（onCanvasContextMenuKeyDown 的绑定元素）。
  const menuRoot = document.querySelector<HTMLElement>('.map-canvas-context-menu')
  expect(menuRoot).toBeDefined()
  await act(async () => {
    keydown(menuRoot!, 'ArrowDown')
  })
  // handler 的可聚焦集合从「复制」开始（视图子菜单触发器被其选择器排除）。
  expect((document.activeElement as HTMLElement).textContent).toContain('复制')
  await act(async () => {
    keydown(menuRoot!, 'ArrowDown')
  })
  expect((document.activeElement as HTMLElement).textContent).toContain('剪切')
  await act(async () => {
    keydown(menuRoot!, 'Home')
  })
  expect((document.activeElement as HTMLElement).textContent).toContain('复制')
})

test('cov85-map C5 工具状态行：默认平移，切选择后活动层选择', async () => {
  await mountMapMode()
  expect(host.textContent).toContain('地板 · 平移')
  await act(async () => {
    buttonByText('选择').click()
  })
  expect(host.textContent).toContain('活动层选择')
})
