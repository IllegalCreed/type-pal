// @vitest-environment jsdom

import type { SceneDef } from '@type-pal/content'
import type { ProjectMapV2 } from '@type-pal/reforge'
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
    useSceneAssets: (options: { mapId: string; projectMaps: Record<string, ProjectMapV2> }) => {
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

const projectMap: ProjectMapV2 = {
  version: 2,
  width: 1,
  height: 1,
  tilesetId: 'tiles-a',
  layers: [{ id: 'floor', name: '地板', depthMode: 'flat', tiles: [[0]] }],
  collision: [[0]],
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

describe('SceneCanvas direct manipulation', () => {
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

  test('空白 click 清选择一次，越过阈值的空白 drag 只平移', async () => {
    const canvas = await renderCanvas()

    await act(async () => {
      pointer(canvas, 'pointerdown', 80, 80)
      pointer(canvas, 'pointerup', 80, 80)
    })
    expect(onClearSelection).toHaveBeenCalledTimes(1)

    onClearSelection.mockClear()
    await act(async () => {
      pointer(canvas, 'pointerdown', 80, 80)
      pointer(canvas, 'pointermove', 90, 80)
      pointer(canvas, 'pointerup', 90, 80)
    })
    expect(onClearSelection).not.toHaveBeenCalled()
  })

  test('cursor 覆盖放置、空白、平移和实体命中四态，并在取消后复位', async () => {
    const canvas = await renderCanvas()
    expect(canvas.style.cursor).toBe('grab')

    await act(async () => pointer(canvas, 'pointermove', 0, 0))
    expect(canvas.style.cursor).toBe('move')

    await act(async () => pointer(canvas, 'pointerdown', 80, 80))
    expect(canvas.style.cursor).toBe('grabbing')
    await act(async () => pointer(canvas, 'pointercancel', 80, 80))
    expect(canvas.style.cursor).toBe('grab')

    await renderCanvas(true)
    expect(canvas.style.cursor).toBe('crosshair')
    await act(async () => {
      pointer(canvas, 'pointerdown', 60, 60)
      pointer(canvas, 'pointerup', 60, 60)
    })
    expect(onAddAt).toHaveBeenCalledTimes(1)

    await renderCanvas(false)
    await act(async () => pointer(canvas, 'pointerleave', 80, 80))
    expect(canvas.style.cursor).toBe('grab')
  })
})
