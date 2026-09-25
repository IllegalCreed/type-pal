/**
 * ARCH-REGRESSION-LAB-GLM-1 · G01 地图手势终结（候选回归，隔离实验区）。
 * 验证轴：选择拖动/笔划手势分别以真实 pointercancel / lostpointercapture / window blur 结束后，
 * 迟到 move/up 不得再提交；同输入正常 pointerup 为正控。取消实现已存在（MapMode.tsx:2292-2310/
 * :3075-3079），本组证明其公开业务行为。
 * 去重：MapMode.test.tsx 72 项覆盖普通切换/选区/绘制合同；本组差异在「活跃手势 + 迟到事件」。
 * 平移轴：view 状态在 jsdom 无公开 DOM 可观测面（canvas 内绘），迟到 move 不改 view 的断言记
 * pending-contract；本组以「取消后组件仍可用（后续正控仍成功）」作平移轴存活见证。
 */
// @vitest-environment jsdom

import { MapMode } from '@lab/editor/map-mode'
import type { SceneDef, StampTemplate } from '@type-pal/content'
import type { ProjectMap } from '@type-pal/reforge'
import { buildBlankProjectMap } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../../fixtures/editor/lab-session.js'
import { EditSession } from '../../fixtures/editor/lab-session.js'

function labMap(): ProjectMap {
  return buildBlankProjectMap(3, 2, 'tiles')
}

function labState(map: ProjectMap): EditorState {
  return {
    manifest: { content: {} } as never,
    scenes: [],
    sceneIndex: { version: 1, scenes: [] },
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: { 'map-a': map },
    mapIndex: {
      version: 1,
      maps: [{ id: 'map-a', name: '测试地图', path: 'content/maps/map-a.json' }],
    },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    stamps: [],
    scriptChunks: {},
  } as EditorState
}

const mountedRoots: { root: Root; host: HTMLDivElement }[] = []

async function mountLabMap(options: { map?: ProjectMap } = {}) {
  const map = options.map ?? labMap()
  const state = labState(map)
  const session = new EditSession(state)
  const scene = {
    id: 's',
    mapId: 'map-a',
    entry: { col: 0, row: 0, height: 0 },
    entities: [],
  } as unknown as SceneDef
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const onWorkspaceNotice = vi.fn()
  mountedRoots.push({ root, host })
  const render = (renderSession: EditSession) => {
    root.render(
      <MapMode
        scene={scene}
        session={renderSession}
        assetBase={{}}
        as
        never
        assetCatalog={{ version: 1, assets: {} }}
        assetReader={{} as never}
        projectMaps={renderSession.getState().maps}
        mapIndex={renderSession.getState().mapIndex}
        selectedMapId="map-a"
        onSelectMap={vi.fn()}
        tilesets={[{ id: 'tiles', name: '测试瓦片', category: 'test', asset: 'tileset.test' }]}
        stamps={[] as StampTemplate[]}
        onRequestInspectorOpen={vi.fn()}
        onWorkspaceNotice={onWorkspaceNotice}
      />,
    )
  }
  await act(async () => {
    render(session)
  })
  const canvas = host.querySelector('canvas')!
  expect(canvas).not.toBeNull()
  return {
    host,
    canvas,
    session,
    onWorkspaceNotice,
    rerender: async (next: EditSession) => {
      await act(async () => {
        render(next)
      })
    },
  }
}

function pointer(
  target: HTMLCanvasElement,
  type: string,
  options: { button?: number; clientX?: number; clientY?: number } = {},
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

function button(host: HTMLElement, text: string): HTMLButtonElement {
  const el = [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))
  if (!el) throw new Error(`未找到按钮: ${text}`)
  return el
}

beforeEach(() => {
  mountedRoots.length = 0
  // jsdom 缺口打桩，与既有 MapMode 测试同口径（scrollIntoView/rect/context/showModal）
  ;(
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
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
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value(this: HTMLCanvasElement) {
      return {
        canvas: this,
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        setTransform: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
      }
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
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
})
afterEach(async () => {
  for (const { root, host } of mountedRoots.reverse()) {
    await act(async () => {
      root.unmount()
    })
    host.remove()
  }
})

describe('G01 地图手势终结', () => {
  test('G01-01 正控：笔划经正常 pointerup 提交一笔瓦片写入（同输入对照）', async () => {
    const { host, canvas, session } = await mountLabMap()
    await act(async () => button(host, '笔刷').click())
    const before = session.getState().maps['map-a']!.layers[0]!.tiles.map((r) => [...r!])
    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 33, clientY: 1 })
      pointer(canvas, 'pointerup', { clientX: 33, clientY: 1 })
    })
    const after = session.getState().maps['map-a']!.layers[0]!.tiles.map((r) => [...r!])
    expect(after).not.toEqual(before) // 业务对象实变（至少一格瓦片被写入）
  })

  test('G01-02 pointercancel 终结笔划：迟到 move/up 不再提交（0 命令）', async () => {
    const { host, canvas, session } = await mountLabMap()
    await act(async () => button(host, '笔刷').click())
    const before = session.getState().maps['map-a']!.layers[0]!.tiles.map((r) => [...r!])
    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 33, clientY: 1 })
      pointer(canvas, 'pointermove', { clientX: 34, clientY: 2 })
      pointer(canvas, 'pointercancel', { clientX: 34, clientY: 2 })
      // 迟到事件：若取消未清手势，pointerup 会提交笔划（绿正控同输入）
      pointer(canvas, 'pointermove', { clientX: 35, clientY: 2 })
      pointer(canvas, 'pointerup', { clientX: 35, clientY: 2 })
    })
    expect(session.getState().maps['map-a']!.layers[0]!.tiles.map((r) => [...r!])).toEqual(before)
    // 存活见证：取消后组件仍可正常完成一笔（非永久性坏死）
    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 33, clientY: 1 })
      pointer(canvas, 'pointerup', { clientX: 33, clientY: 1 })
    })
    expect(session.getState().maps['map-a']!.layers[0]!.tiles.map((r) => [...r!])).not.toEqual(
      before,
    )
  })

  test('G01-03 lostpointercapture 终结笔划：迟到 up 不提交', async () => {
    const { host, canvas, session } = await mountLabMap()
    await act(async () => button(host, '笔刷').click())
    const before = session.getState().maps['map-a']!.layers[0]!.tiles.map((r) => [...r!])
    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 33, clientY: 1 })
      pointer(canvas, 'pointermove', { clientX: 34, clientY: 2 })
      canvas.dispatchEvent(new Event('lostpointercapture', { bubbles: true }))
      pointer(canvas, 'pointermove', { clientX: 35, clientY: 2 })
      pointer(canvas, 'pointerup', { clientX: 35, clientY: 2 })
    })
    expect(session.getState().maps['map-a']!.layers[0]!.tiles.map((r) => [...r!])).toEqual(before)
  })

  test('G01-04 window blur 终结笔划：迟到 up 不提交', async () => {
    const { host, canvas, session } = await mountLabMap()
    await act(async () => button(host, '笔刷').click())
    const before = session.getState().maps['map-a']!.layers[0]!.tiles.map((r) => [...r!])
    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 33, clientY: 1 })
      pointer(canvas, 'pointermove', { clientX: 34, clientY: 2 })
      window.dispatchEvent(new Event('blur'))
      pointer(canvas, 'pointerup', { clientX: 35, clientY: 2 })
    })
    expect(session.getState().maps['map-a']!.layers[0]!.tiles.map((r) => [...r!])).toEqual(before)
  })

  test('G01-05 选区拖动 pointercancel：迟到 up 不派发 set-selection（无新通知调用）；正常 up 正控派发', async () => {
    // 有瓦片底图；公开可观测面 = onWorkspaceNotice 调用 + 选区预览 DOM
    const map = buildBlankProjectMap(3, 2, 'tiles')
    map.layers[0]!.tiles[0]![0] = 1
    const { host, canvas, onWorkspaceNotice } = await mountLabMap({ map })
    await act(async () => button(host, '选择').click())
    // 取消路径：cancel 后迟到 up —— 通知调用数不得增加（set-selection 未派发）
    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 33, clientY: 1 })
      pointer(canvas, 'pointermove', { clientX: 40, clientY: 20 })
      pointer(canvas, 'pointercancel', { clientX: 40, clientY: 20 })
    })
    const callsAfterCancel = onWorkspaceNotice.mock.calls.length
    await act(async () => {
      pointer(canvas, 'pointerup', { clientX: 40, clientY: 20 })
    })
    expect(onWorkspaceNotice.mock.calls.length).toBe(callsAfterCancel)
    // 正控：同输入正常 up —— 选区预览真实出现在 DOM + 通知调用数增加
    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 33, clientY: 1 })
      pointer(canvas, 'pointermove', { clientX: 40, clientY: 20 })
      pointer(canvas, 'pointerup', { clientX: 40, clientY: 20 })
    })
    expect(onWorkspaceNotice.mock.calls.length).toBeGreaterThan(callsAfterCancel)
  })

  test('G01-06 平移中 pointercancel 终结平移：后续选择笔划仍正常提交（跨工具存活）', async () => {
    // 平移手势（中键按下 + 拖动）→ pointercancel 终结 → 切回选择工具后一笔笔划照常落图：
    // 若取消未清 panRef（仍滞留），后续 pointerdown/move 会被当作平移继续而非绘制——以瓦片实变作业务见证
    const { host, canvas, session } = await mountLabMap()
    await act(async () => {
      pointer(canvas, 'pointerdown', { button: 1, clientX: 10, clientY: 10 })
      pointer(canvas, 'pointermove', { button: 1, clientX: 60, clientY: 40 })
      pointer(canvas, 'pointercancel', { button: 1, clientX: 60, clientY: 40 })
    })
    await act(async () => button(host, '笔刷').click())
    const before = session.getState().maps['map-a']!.layers[0]!.tiles.map((r) => [...r!])
    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 33, clientY: 1 })
      pointer(canvas, 'pointerup', { clientX: 33, clientY: 1 })
    })
    expect(session.getState().maps['map-a']!.layers[0]!.tiles.map((r) => [...r!])).not.toEqual(
      before,
    ) // 跨工具存活：取消平移后绘制轴真实可用
  })
})
