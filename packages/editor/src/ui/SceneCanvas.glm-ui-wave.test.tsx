// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-UI-WAVE-1 U4a：SceneCanvas 残差。
 * 去重：SceneCanvas.test.tsx 已证空白清选择/阈值平移与四态光标——本文件只补当前公开入口
 * 仍未证明的业务交互：命中实体的点击选择回调实参、抓取实体的拖动提交精确目标格、
 * 放置模式下落的精确格子换算（fit 视图下的 screen→cell 合同）。
 */

// @ts-expect-error Node test-host bridge only.
import { Blob as NodeBlob } from 'node:buffer'
import type { SceneDef } from '@type-pal/content'
import { validateAuthorScenes } from '@type-pal/content'
import type { ProjectMap } from '@type-pal/reforge'
import { validateProjectMap } from '@type-pal/reforge'
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { AddEntityCommand } from '../core/entity-commands.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { SceneCanvas } from './SceneCanvas.js'

vi.mock('@type-pal/reforge', async (importOriginal) => {
  const original = await importOriginal<typeof import('@type-pal/reforge')>()
  return { ...original, renderSceneFrame: vi.fn() }
})

vi.mock('./scene-stage.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./scene-stage.js')>()
  return {
    ...original,
    drawGridBlocked: vi.fn(),
    drawTriggerHighlight: vi.fn(),
    mapBoxOf: vi.fn(() => ({ minX: 0, minY: 0, maxX: 100, maxY: 100 })),
    useStageSize: vi.fn(() => ({ w: 100, h: 100 })),
    useViewZoomPan: (options: { initial: { zoom: number; panX: number; panY: number } }) => {
      const [view, setView] = React.useState(options.initial)
      const viewRef = React.useRef(view)
      viewRef.current = view
      return { view, viewRef, setView }
    },
  }
})

// U4a 闭包基座：正式 blank 项目（场景/地图索引/地图正文/瓦片集/目录互相闭合并过保存门），
// 经 AddEntityCommand 增加被编排的 zone 实体。stage 视图几何仍由 scene-stage mock 固定。
let scene: SceneDef
let projectMap: ProjectMap
let legalSession: EditSession
let legalReader: ReturnType<typeof createEditorAssetReader>
let legalAssetBase: import('@type-pal/reforge').AssetBase

// Node test-host bridge：blank seed 的 gzip 依赖 Node Blob.stream（jsdom Blob 缺该能力）。
vi.stubGlobal('Blob', NodeBlob)
afterAll(() => {
  vi.unstubAllGlobals()
})

beforeAll(async () => {
  const { source, state, assetBase } = await loadLegalUiProject('glm-ui-wave-scene-canvas')
  legalReader = createEditorAssetReader(source, () => state)
  legalAssetBase = assetBase
  const sceneId = state.scenes![0]!.id
  const mapId = (state.scenes![0] as { mapId: string }).mapId
  projectMap = state.maps![mapId]!
  validateProjectMap(projectMap)
  const withEntity = new AddEntityCommand(sceneId, {
    id: 'zone-a',
    zone: true,
    pos: { col: 0, row: 0, height: 0 },
    initialPage: 'p0',
    pages: [{ id: 'p0', label: '默认页' }],
  } as never).apply(state)
  assertProjectSaveValid(withEntity)
  legalSession = new EditSession(withEntity)
  scene = legalSession.getState().scenes!.find((entry) => entry.id === sceneId)!
  validateAuthorScenes([scene])
})

function pointer(
  target: HTMLCanvasElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel' | 'pointerleave',
  clientX: number,
  clientY: number,
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX,
    clientY,
  })
  Object.defineProperty(event, 'pointerId', { value: 7 })
  target.dispatchEvent(event)
}

describe('U4a SceneCanvas 残差', () => {
  let host: HTMLDivElement
  let root: Root
  const onSelectEntity = vi.fn()
  const onMoveEntity = vi.fn()
  const onSelectAnchor = vi.fn()
  const onMoveAnchor = vi.fn()
  const onAddAt = vi.fn()
  const onClearSelection = vi.fn()

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    vi.clearAllMocks()
    Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 100,
        bottom: 100,
        width: 100,
        height: 100,
        toJSON: () => ({}),
      }),
    })
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => ({}),
    })
    Object.defineProperty(HTMLCanvasElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    })
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    vi.restoreAllMocks()
  })

  const renderCanvas = async (placingEntity = false): Promise<HTMLCanvasElement> => {
    const current = legalSession.getState()
    await act(async () =>
      root.render(
        <SceneCanvas
          scene={current.scenes!.find((entry) => entry.id === scene!.id)!}
          sprites={current.sprites ?? []}
          actorsById={Object.fromEntries((current.actors ?? []).map((a) => [a.id, a]))}
          leaderSpriteId={undefined}
          assetBase={legalAssetBase}
          assetCatalog={current.assetCatalog}
          assetReader={legalReader}
          projectMaps={current.maps ?? {}}
          mapIndex={current.mapIndex}
          tilesets={current.tilesets ?? []}
          selectedEntityId="zone-a"
          selectedAnchor={null}
          placingEntity={placingEntity}
          layers={{
            base: true,
            cover: true,
            entities: true,
            grid: false,
            blocked: false,
            entries: false,
            ghosts: true,
          }}
          onSelectEntity={onSelectEntity}
          onMoveEntity={onMoveEntity}
          onSelectAnchor={onSelectAnchor}
          onMoveAnchor={onMoveAnchor}
          onAddAt={onAddAt}
          onClearSelection={onClearSelection}
        />,
      ),
    )
    return host.querySelector('canvas')!
  }

  // 真实 useSceneAssets 就绪等待：fit 完成后 view.zoom 落到 96%（fitStageView 0.96）。
  const waitReady = async (canvas: HTMLCanvasElement): Promise<void> => {
    await vi.waitFor(() => {
      expect(host.querySelector('.canvas-note')?.textContent ?? '').not.toContain('载入中')
    })
    void canvas
  }

  test('点击命中实体传出精确 onSelectEntity 实参；空白点击仍清选择', async () => {
    const canvas = await renderCanvas()
    await waitReady(canvas)
    await act(async () => {
      pointer(canvas, 'pointerdown', 5, 5)
      pointer(canvas, 'pointerup', 5, 5)
    })
    expect(onSelectEntity).toHaveBeenCalledTimes(1)
    expect(onSelectEntity).toHaveBeenCalledWith('zone-a')
    expect(onMoveEntity).not.toHaveBeenCalled()
    expect(onClearSelection).not.toHaveBeenCalled()
    await act(async () => {
      pointer(canvas, 'pointerdown', 80, 80)
      pointer(canvas, 'pointerup', 80, 80)
    })
    expect(onClearSelection).toHaveBeenCalledTimes(1)
  })

  test('抓取实体拖动提交 onMoveEntity 精确目标格', async () => {
    const canvas = await renderCanvas()
    await waitReady(canvas)
    await act(async () => {
      pointer(canvas, 'pointerdown', 0, 0)
    })
    await act(async () => {
      pointer(canvas, 'pointermove', 20, 20)
    })
    await act(async () => {
      pointer(canvas, 'pointerup', 20, 20)
    })
    expect(onMoveEntity).toHaveBeenCalledTimes(1)
    expect(onMoveEntity).toHaveBeenCalledWith('zone-a', { col: 2, row: 1 })
    expect(onClearSelection).not.toHaveBeenCalled()
  })

  test('放置模式落下传出 onAddAt 精确格子', async () => {
    const canvas = await renderCanvas(true)
    await waitReady(canvas)
    await act(async () => {
      pointer(canvas, 'pointerdown', 60, 60)
      pointer(canvas, 'pointerup', 60, 60)
    })
    expect(onAddAt).toHaveBeenCalledTimes(1)
    expect(onAddAt).toHaveBeenCalledWith({ col: 6, row: 2 })
  })
})
