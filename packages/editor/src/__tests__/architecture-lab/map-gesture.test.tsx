/**
 * ARCH-REGRESSION-LAB-GLM-1 · G01 地图手势终结（正式回归）。
 * 验证轴：选择拖动/笔划手势分别以真实 pointercancel / lostpointercapture / window blur 结束后，
 * 迟到 move/up 不得再提交；同输入正常 pointerup 为正控。取消实现已存在（MapMode.tsx:2292-2310/
 * :3075-3079），本组证明其公开业务行为。
 * 去重：MapMode.test.tsx 72 项覆盖普通切换/选区/绘制合同；本组差异在「活跃手势 + 迟到事件」。
 * 平移轴：view 状态在 jsdom 无公开 DOM 可观测面（canvas 内绘），迟到 move 不改 view 的断言记
 * pending-contract；本组以「取消后组件仍可用（后续正控仍成功）」作平移轴存活见证。
 */
// @vitest-environment jsdom

import type { SceneDef, StampTemplate } from '@type-pal/content'
import type { ProjectMap } from '@type-pal/reforge'
import { buildBlankProjectMap } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../../core/edit-session.js'
import { EditSession } from '../../core/edit-session.js'
import { collectCurrentProjectReferenceIndex } from '../../core/project-reference-adapters.js'
import { MapMode } from '../../ui/MapMode.js'

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
        assetBase={{} as never}
        assetCatalog={{ version: 1, assets: {} }}
        assetReader={{} as never}
        projectMaps={renderSession.getState().maps}
        mapIndex={renderSession.getState().mapIndex}
        selectedMapId="map-a"
        onSelectMap={vi.fn()}
        referenceStatus="current"
        getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
        onOpenReference={vi.fn()}
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

  test('G01-05 选区拖动 pointercancel：无选区业务状态；正常提交后「删除」对 session 地图真实删瓦片', async () => {
    // 选区实际状态见证面 = 官方测试同款 .map-content-selection-preview（提交后持续存在）；
    // 选区业务能力面 = 选区右键菜单「删除」对 session 地图真实删除瓦片。
    // 定位策略：先以笔刷在同一屏幕点 (33,1) 落一瓦片，再用选择单击同一点选中同一格
    // （等距投影下同屏点 = 同一格），无需复刻投影数学即可保证选区含已画瓦片。
    const map = buildBlankProjectMap(3, 2, 'tiles')
    const { host, canvas, onWorkspaceNotice, session } = await mountLabMap({ map })
    const firstPainted = (): { row: number; col: number } | null => {
      const tiles = session.getState().maps['map-a']!.layers[0]!.tiles
      for (let row = 0; row < tiles.length; row++)
        for (let col = 0; col < tiles[row]!.length; col++)
          if (tiles[row]![col] !== null) return { row, col }
      return null
    }
    // ① 笔刷在 (33,1) 落一瓦片（业务对象真实写入，同 G01-01 正控）
    await act(async () => button(host, '笔刷').click())
    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 33, clientY: 1 })
      pointer(canvas, 'pointerup', { clientX: 33, clientY: 1 })
    })
    const paintedCell = firstPainted()
    expect(paintedCell).not.toBeNull() // 笔刷确实落瓦片
    // ② 取消路径：选择工具拖动中 pointercancel + 迟到 up —— 无选区提交
    await act(async () => button(host, '选择').click())
    const callsBefore = onWorkspaceNotice.mock.calls.length
    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 33, clientY: 1 })
      pointer(canvas, 'pointermove', { clientX: 300, clientY: 300 })
      pointer(canvas, 'pointercancel', { clientX: 300, clientY: 300 })
      pointer(canvas, 'pointerup', { clientX: 300, clientY: 300 })
    })
    expect(host.querySelector('.map-content-selection-preview')).toBeNull() // 无选区业务状态
    expect(onWorkspaceNotice.mock.calls.length).toBe(callsBefore) // set-selection 未派发
    expect(firstPainted()).toEqual(paintedCell) // 瓦片未被任何操作改动
    // ③ 正控：单击 (33,1) 提交单格选区（同屏点 = 同一格）
    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 33, clientY: 1 })
      pointer(canvas, 'pointerup', { clientX: 33, clientY: 1 })
    })
    expect(host.querySelector('.map-content-selection-preview')).not.toBeNull() // 选区已提交
    expect(onWorkspaceNotice.mock.calls.length).toBeGreaterThan(callsBefore)
    // ④ 选区业务能力：右键菜单「删除」可用且真实删除 session 地图选区内瓦片
    await act(async () => {
      canvas.dispatchEvent(
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
    expect(menu).not.toBeNull() // 提交选区后菜单真实出现
    const deleteItem = [...menu!.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes('删除'),
    )
    expect(deleteItem).not.toBeUndefined()
    expect(deleteItem!.disabled).toBe(false) // 选区使删除操作可用（选区是真实业务状态）
    await act(async () => deleteItem!.click())
    expect(firstPainted()).toBeNull() // 业务结果：选区内瓦片被真实删除
    expect(host.querySelector('.map-content-selection-preview')).toBeNull() // 删除后选区清空
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
