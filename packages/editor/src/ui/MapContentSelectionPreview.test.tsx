// @vitest-environment jsdom
import type { Palette, RleFrame } from '@type-pal/reforge'
import { buildBlankProjectMap, paintProjectMapTiles } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { MapContentSelectionPreview } from './MapContentSelectionPreview.js'

const bakeFrameMock = vi.hoisted(() => vi.fn(() => document.createElement('canvas')))

vi.mock('@type-pal/reforge', async (importOriginal) => {
  const original = await importOriginal<typeof import('@type-pal/reforge')>()
  return { ...original, bakeFrame: bakeFrameMock }
})

const roots: { root: ReturnType<typeof createRoot>; host: HTMLDivElement }[] = []
const drawImage = vi.fn()

function frame(width: number, height: number): RleFrame {
  return {
    width,
    height,
    pixels: new Uint8Array(width * height),
    opaque: new Uint8Array(width * height).fill(1),
  }
}

const palette: Palette = {
  colors: Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]),
  cycles: [],
}

beforeEach(() => {
  ;(
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value(this: HTMLCanvasElement) {
      return {
        canvas: this,
        clearRect: vi.fn(),
        drawImage,
        setTransform: vi.fn(),
      }
    },
  })
})

afterEach(async () => {
  while (roots.length) {
    const mounted = roots.pop()!
    await act(async () => mounted.root.unmount())
    mounted.host.remove()
  }
  vi.clearAllMocks()
})

describe('MapContentSelectionPreview', () => {
  test('从当前地图矩阵读取选中 tile，同 tileId 只烘焙一次但绘制所有实例', async () => {
    let map = buildBlankProjectMap(2, 2, 'tiles')
    map = paintProjectMapTiles(map, [
      { layerId: 'floor', row: 0, col: 0, tileId: 7, height: 0 },
      { layerId: 'floor', row: 0, col: 1, tileId: 7, height: 0 },
      { layerId: 'floor', row: 1, col: 0, tileId: 8, height: 0 },
    ])
    const tile7 = frame(32, 16)
    const tile8 = frame(48, 32)
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    roots.push({ root, host })

    await act(async () =>
      root.render(
        <MapContentSelectionPreview
          map={map}
          visualSlots={[
            { layerId: 'floor', row: 0, col: 0 },
            { layerId: 'floor', row: 0, col: 1 },
            { layerId: 'floor', row: 1, col: 0 },
          ]}
          tiles={
            new Map([
              [7, tile7],
              [8, tile8],
            ])
          }
          palette={palette}
          title="当前选区"
          subtitle="实际地图值"
        />,
      ),
    )

    expect(host.querySelector('canvas[role="img"]')).not.toBeNull()
    expect(host.textContent).toContain('3 个视觉实例')
    expect(bakeFrameMock).toHaveBeenCalledTimes(2)
    expect(bakeFrameMock).toHaveBeenCalledWith(tile7, palette)
    expect(bakeFrameMock).toHaveBeenCalledWith(tile8, palette)
    expect(drawImage).toHaveBeenCalledTimes(3)
  })

  test('所选矩阵值没有对应帧时显示精确 tileId', async () => {
    let map = buildBlankProjectMap(1, 1, 'tiles')
    map = paintProjectMapTiles(map, [{ layerId: 'floor', row: 0, col: 0, tileId: 99, height: 0 }])
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    roots.push({ root, host })

    await act(async () =>
      root.render(
        <MapContentSelectionPreview
          map={map}
          visualSlots={[{ layerId: 'floor', row: 0, col: 0 }]}
          tiles={new Map()}
          palette={palette}
          title="当前选区"
          subtitle="实际地图值"
        />,
      ),
    )

    expect(host.textContent).toContain('所选瓦片帧不可用')
    expect(host.textContent).toContain('瓦片集缺少 tileId：99')
  })
})
