// @vitest-environment jsdom
import type { Palette, RleFrame } from '@type-pal/shared'
import { expect, test } from 'vitest'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapTiles,
} from './project-map.js'
import { Canvas2DRenderer, type SpriteDraw } from './render.js'

function frame(width: number, height: number, index: number): RleFrame {
  return {
    width,
    height,
    pixels: new Uint8Array(width * height).fill(index),
    opaque: new Uint8Array(width * height).fill(1),
  }
}

test('脚下投影排序依赖层偏移，精灵的可见像素在原位置', () => {
  let map = buildBlankProjectMap(3, 3, 'tileset-test')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'cover', '高物'))
  map = paintProjectMapTiles(map, [
    { layerId: 'cover', col: 0, row: 3, tileId: 7, tilesetId: 'tileset-test', height: 2 },
  ])
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 48
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas is required')
  const pixel = (x: number, y: number) => [...ctx.getImageData(x, y, 1, 1).data]
  const palette: Palette = {
    colors: [
      [0, 0, 0],
      [255, 0, 0],
      [0, 0, 255],
    ],
    cycles: [],
  }
  const tiles = new Map([['tileset-test', new Map([[7, frame(32, 16, 2)]])]])
  const renderer = new Canvas2DRenderer(ctx, palette, tiles)
  const sprite: SpriteDraw = {
    frame: frame(10, 10, 1),
    worldX: 32,
    worldY: 32,
    anchorX: 5,
    anchorY: 10,
  }
  const view = { col: 0, row: 0, cols: 3, rows: 3 }
  const camera = { x: 0, y: 0 }

  renderer.renderScene(map, view, camera, [sprite])
  expect(pixel(29, 29)).toEqual([0, 0, 255, 255])
  expect(pixel(29, 32)).toEqual([255, 0, 0, 255])

  renderer.renderScene(map, view, camera, [
    { ...sprite, baseYBias: 6, coverILayer: 50, coverSortOffset: 57 },
  ])
  expect(pixel(29, 29)).toEqual([255, 0, 0, 255])

  renderer.renderScene(map, view, camera, [
    { ...sprite, baseYBias: 6, sortOffset: 10, coverILayer: 54, coverSortOffset: 58 },
  ])
  expect(pixel(29, 29)).toEqual([255, 0, 0, 255])
})
