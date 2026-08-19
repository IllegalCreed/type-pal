// @vitest-environment jsdom
import { loadTilesetAsset } from '@type-pal/reforge'
import { act, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { isCollisionOverlayMarked, useSceneAssets } from './scene-stage.js'

vi.mock('@type-pal/reforge', async (importOriginal) => {
  const original = await importOriginal<typeof import('@type-pal/reforge')>()
  return {
    ...original,
    Canvas2DRenderer: class {},
    loadStandardPalette: vi.fn(async () => ({
      colors: Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]),
      cycles: [],
    })),
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
