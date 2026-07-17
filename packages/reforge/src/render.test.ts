import type { Palette, RleFrame } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapTiles,
} from './project-map.js'
import { Canvas2DRenderer, type SpriteDraw } from './render.js'

function frame(width: number, height: number): RleFrame {
  return {
    width,
    height,
    pixels: new Uint8Array(width * height).fill(1),
    opaque: new Uint8Array(width * height).fill(1),
  }
}

describe('Canvas2DRenderer cover layer', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      createElement: () => {
        const canvas = {
          width: 0,
          height: 0,
          getContext: () => ({
            createImageData: (width: number, height: number) => ({
              data: new Uint8ClampedArray(width * height * 4),
            }),
            putImageData: () => undefined,
          }),
        }
        return canvas
      },
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  test('sLayer=6 把同一高物排到人物之前，layer=0 对照会盖住人物', () => {
    let map = buildBlankProjectMap(3, 3, 'tileset-test')
    map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'cover', '高物'))
    map = paintProjectMapTiles(map, [{ layerId: 'cover', col: 0, row: 3, tileId: 7, height: 2 }])

    const drawOrder: number[] = []
    const ctx = {
      canvas: { width: 320, height: 200 },
      drawImage: (image: { width: number }) => drawOrder.push(image.width),
      fillRect: () => undefined,
      restore: () => undefined,
      save: () => undefined,
    } as unknown as CanvasRenderingContext2D
    const palette: Palette = {
      colors: Array.from({ length: 256 }, () => [0, 0, 0]),
      cycles: [],
    }
    const renderer = new Canvas2DRenderer(ctx, palette, new Map([[7, frame(32, 16)]]))
    const sprite: SpriteDraw = {
      frame: frame(10, 10),
      worldX: 32,
      worldY: 32,
      anchorX: 5,
      anchorY: 10,
    }
    const view = { col: 0, row: 0, cols: 3, rows: 3 }
    const camera = { x: 0, y: 0 }

    renderer.renderScene(map, view, camera, [sprite])
    expect(drawOrder.slice(-2)).toEqual([10, 32])

    drawOrder.length = 0
    renderer.renderScene(map, view, camera, [
      {
        ...sprite,
        baseYBias: 6,
        coverILayer: 6 * 8 + 2,
        coverSortOffset: 6 * 8 + 9,
      },
    ])
    expect(drawOrder.slice(-2)).toEqual([32, 10])

    drawOrder.length = 0
    renderer.renderScene(map, view, camera, [
      {
        ...sprite,
        baseYBias: 6,
        sortOffset: 10,
        coverILayer: 6 * 8 + 6,
        coverSortOffset: 6 * 8 + 10,
      },
    ])
    expect(drawOrder.slice(-2)).toEqual([32, 10])
  })
})
