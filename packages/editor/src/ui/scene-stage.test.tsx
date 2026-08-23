// @vitest-environment jsdom
import { loadProjectMap, loadTilesetAsset } from '@type-pal/reforge'
import { act, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  drawGridBlocked,
  drawTriggerHighlight,
  fitStageView,
  isCollisionOverlayMarked,
  useSceneAssets,
} from './scene-stage.js'

test('共享适应画布公式居中内容并保留统一边距', () => {
  const view = fitStageView({ minX: 10, minY: 20, maxX: 110, maxY: 70 }, { w: 400, h: 300 })
  expect(view.zoom).toBeCloseTo(3.68)
  expect(view.panX).toBeCloseTo(5.652173913)
  expect(view.panY).toBeCloseTo(4.239130435)
})

vi.mock('@type-pal/reforge', async (importOriginal) => {
  const original = await importOriginal<typeof import('@type-pal/reforge')>()
  return {
    ...original,
    Canvas2DRenderer: class {},
    loadStandardPalette: vi.fn(async () => ({
      colors: Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]),
      cycles: [],
    })),
    loadProjectMap: vi.fn(async () => projectMap),
    loadTilesetAsset: vi.fn(async () => new Map()),
  }
})

const projectMap = {
  version: 4 as const,
  width: 1,
  height: 1,
  tilesetRefs: ['tiles-a'],
  layers: [{ id: 'floor', name: '地板', tiles: [[0], [null]], sources: [[0], [null]] }],
  collision: [[0], [0]],
}
const projectMapB = { ...projectMap, width: 2 }
const tilesets = [{ id: 'tiles-a', name: 'A', category: 'test', asset: 'tileset.a' }]
const assetBase = {} as never
const assetReader = {} as never

function Harness(props: { sha256: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useSceneAssets({
    canvasRef,
    assetBase,
    mapId: 'map-a',
    spriteAssets: [],
    projectMaps: { 'map-a': projectMap },
    tilesets,
    assetCatalog: {
      version: 1,
      assets: {
        'tileset.a': {
          kind: 'tileset',
          path: 'assets/authored/tilesets/a.rle',
          mediaType: 'application/vnd.type-pal.rle',
          bytes: 1,
          sha256: props.sha256,
          origin: { kind: 'authored' },
        },
      },
    },
    assetReader,
  })
  return <canvas ref={canvasRef} />
}

function DiskMapHarness() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useSceneAssets({
    canvasRef,
    assetBase,
    mapId: 'map-a',
    spriteAssets: [],
    projectMaps: {},
    mapIndex: {
      version: 1,
      maps: [{ id: 'map-a', name: '测试地图', path: 'content/maps/map-a.json' }],
    },
    tilesets,
    assetCatalog: {
      version: 1,
      assets: {
        'tileset.a': {
          kind: 'tileset',
          path: 'assets/authored/tilesets/a.rle',
          mediaType: 'application/vnd.type-pal.rle',
          bytes: 1,
          sha256: 'a'.repeat(64),
          origin: { kind: 'authored' },
        },
      },
    },
    assetReader,
  })
  return <canvas ref={canvasRef} />
}

function DeferredMapHarness(props: {
  mapId: string
  sourceKey: string
  onReady: (map: unknown) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const result = useSceneAssets({
    canvasRef,
    assetBase,
    mapId: props.mapId,
    sourceKey: props.sourceKey,
    spriteAssets: [],
    projectMaps: {},
    mapIndex: {
      version: 1,
      maps: [
        { id: 'map-a', name: '地图 A', path: 'content/maps/map-a.json' },
        { id: 'map-b', name: '地图 B', path: 'content/maps/map-b.json' },
      ],
    },
    tilesets,
    assetCatalog: {
      version: 1,
      assets: {
        'tileset.a': {
          kind: 'tileset',
          path: 'assets/authored/tilesets/a.rle',
          mediaType: 'application/vnd.type-pal.rle',
          bytes: 1,
          sha256: 'a'.repeat(64),
          origin: { kind: 'authored' },
        },
      },
    },
    assetReader,
  })
  useEffect(() => {
    if (result.status === 'ready') props.onReady(result.loadedRef.current?.map)
  }, [props, result.loadedRef, result.status])
  return <canvas ref={canvasRef} data-status={result.status} />
}

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>

beforeEach(() => {
  vi.clearAllMocks()
  ;(
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => ({}),
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
  host.remove()
})

test('地图/场景舞台以 record sha 为失效键，同路径同长度替换仍重载', async () => {
  const render = async (sha256: string): Promise<void> => {
    await act(async () => {
      root.render(<Harness sha256={sha256} />)
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
  }
  await render('a'.repeat(64))
  expect(vi.mocked(loadTilesetAsset)).toHaveBeenCalledTimes(1)
  await render('b'.repeat(64))
  expect(vi.mocked(loadTilesetAsset)).toHaveBeenCalledTimes(2)
})

test('磁盘回退地图按读取后的 tilesetRefs 加载瓦片集，不能 ready 后黑屏', async () => {
  await act(async () => {
    root.render(<DiskMapHarness />)
    await new Promise((resolve) => window.setTimeout(resolve, 0))
  })

  expect(vi.mocked(loadProjectMap)).toHaveBeenCalledTimes(1)
  expect(vi.mocked(loadTilesetAsset)).toHaveBeenCalledTimes(1)
  expect(vi.mocked(loadTilesetAsset)).toHaveBeenCalledWith(assetReader, 'tileset.a')
})

test.each([
  {
    label: '场景切换改变 mapId',
    first: { mapId: 'map-a', sourceKey: 'project-a\0scene-a\0map-a' },
    second: { mapId: 'map-b', sourceKey: 'project-a\0scene-b\0map-b' },
  },
  {
    label: '工程切换仅改变 sourceKey',
    first: { mapId: 'map-a', sourceKey: 'project-a\0scene-a\0map-a' },
    second: { mapId: 'map-a', sourceKey: 'project-b\0scene-a\0map-a' },
  },
])('$label 时丢弃迟到的旧地图结果', async ({ first, second }) => {
  const oldLoad = deferred<typeof projectMap>()
  const currentLoad = deferred<typeof projectMapB>()
  vi.mocked(loadProjectMap)
    .mockImplementationOnce(async () => oldLoad.promise)
    .mockImplementationOnce(async () => currentLoad.promise)
  const readyMaps: unknown[] = []
  const onReady = (map: unknown): void => {
    readyMaps.push(map)
  }

  await act(async () => {
    root.render(<DeferredMapHarness {...first} onReady={onReady} />)
    await Promise.resolve()
  })
  await act(async () => {
    root.render(<DeferredMapHarness {...second} onReady={onReady} />)
    await Promise.resolve()
  })
  currentLoad.resolve(projectMapB)
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0))
  })
  expect(readyMaps.at(-1)).toBe(projectMapB)

  oldLoad.resolve(projectMap)
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0))
  })
  expect(readyMaps).toEqual([projectMapB])
})

test('碰撞遮罩忽略组合未记录的 null 与开放值 0，只标红显式非零碰撞', () => {
  const stampSurface = {
    ...projectMap,
    width: 2,
    collision: [
      [null, 0],
      [1, 7],
    ],
  }
  expect(isCollisionOverlayMarked(stampSurface, { row: 0, col: 0 })).toBe(false)
  expect(isCollisionOverlayMarked(stampSurface, { row: 0, col: 1 })).toBe(false)
  expect(isCollisionOverlayMarked(stampSurface, { row: 1, col: 0 })).toBe(true)
  expect(isCollisionOverlayMarked(stampSurface, { row: 1, col: 1 })).toBe(true)
})

test('网格只裁在非倾斜画布矩形内，不把视口防弹跳余量画成额外格子', () => {
  class TestPath2D {
    moveTo() {}
    lineTo() {}
    closePath() {}
  }
  vi.stubGlobal('Path2D', TestPath2D)
  const rect = vi.fn()
  const context = {
    canvas: { width: 400, height: 300 },
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    beginPath: vi.fn(),
    rect,
    clip: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D

  drawGridBlocked(
    context,
    { ...projectMap, width: 3, height: 3 },
    { col: 0, row: 0, cols: 3, rows: 3 },
    { zoom: 1, panX: -100, panY: -100 },
    { grid: true, blocked: false },
  )

  expect(rect).toHaveBeenCalledWith(0, 0, 96, 48)
})

test('触发高亮只消费 current page activation，并按实际范围绘制黄色格', () => {
  const fill = vi.fn()
  const context = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill,
    stroke: vi.fn(),
    setLineDash: vi.fn(),
  } as unknown as CanvasRenderingContext2D
  const entity = {
    pos: { col: 4, row: 7, height: 0 },
    // 旧 trigger 即使存在也不得再被共享画布读取。
    pages: [{ trigger: { on: 'touch', range: 0, stages: [] } }],
  } as never

  drawTriggerHighlight(context, entity, { x: 0, y: 0 }, 1, 0, {
    activation: { on: 'interact', range: 1 },
  })
  expect(fill).toHaveBeenCalledTimes(9)

  fill.mockClear()
  drawTriggerHighlight(context, entity, { x: 0, y: 0 }, 1, 0, {
    activation: { on: 'touch', range: 0 },
  })
  expect(fill).toHaveBeenCalledTimes(1)
})
