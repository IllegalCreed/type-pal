// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-UI-WAVE-1 U4a：SceneCanvas 残差。
 * 去重：SceneCanvas.test.tsx 已证空白清选择/阈值平移与四态光标——本文件只补当前公开入口
 * 仍未证明的业务交互：命中实体的点击选择回调实参、抓取实体的拖动提交精确目标格、
 * 放置模式下落的精确格子换算（fit 视图下的 screen→cell 合同）。
 */
import type { SceneDef } from '@type-pal/content'
import type { ProjectMap } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { SceneCanvas } from './SceneCanvas.js'

vi.mock('@type-pal/reforge', async (importOriginal) => {
  const original = await importOriginal<typeof import('@type-pal/reforge')>()
  return { ...original, renderSceneFrame: vi.fn() }
})

vi.mock('./scene-stage.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./scene-stage.js')>()
  const React = await import('react')
  return {
    ...original,
    drawGridBlocked: vi.fn(),
    drawTriggerHighlight: vi.fn(),
    mapBoxOf: vi.fn(() => ({ minX: 0, minY: 0, maxX: 100, maxY: 100 })),
    useStageSize: vi.fn(() => ({ w: 100, h: 100 })),
    useSceneAssets: (options: { mapId: string; projectMaps: Record<string, ProjectMap> }) => {
      const loadedRef = React.useRef({
        renderer: {} as never,
        map: options.projectMaps[options.mapId]!,
        spritesByAsset: new Map(),
      })
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

const projectMap: ProjectMap = {
  version: 4,
  width: 1,
  height: 1,
  tilesetRefs: ['tiles-a'],
  layers: [{ id: 'floor', name: '地板', tiles: [[0], [null]], sources: [[0], [null]] }],
  collision: [[0], [0]],
}

const scene = {
  id: 'scene-a',
  mapId: 'map-a',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [
    {
      id: 'zone-a',
      zone: true,
      pos: { col: 0, row: 0, height: 0 },
      facing: 'down',
      pages: [],
    },
  ],
} as unknown as SceneDef

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
    await act(async () =>
      root.render(
        <SceneCanvas
          scene={scene}
          sprites={[]}
          actorsById={{}}
          leaderSpriteId={undefined}
          assetBase={{} as never}
          assetCatalog={{ version: 1, assets: {} }}
          assetReader={{} as never}
          projectMaps={{ 'map-a': projectMap }}
          mapIndex={{ version: 1, maps: [] }}
          tilesets={[]}
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

  test('点击命中实体传出精确 onSelectEntity 实参；空白点击仍清选择', async () => {
    const canvas = await renderCanvas()
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
    await act(async () => {
      pointer(canvas, 'pointerdown', 60, 60)
      pointer(canvas, 'pointerup', 60, 60)
    })
    expect(onAddAt).toHaveBeenCalledTimes(1)
    expect(onAddAt).toHaveBeenCalledWith({ col: 6, row: 2 })
  })
})
