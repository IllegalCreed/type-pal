// @vitest-environment jsdom
import type { Palette, RleFrame } from '@type-pal/shared'
import { expect, test } from 'vitest'
import { buildBlankProjectMap } from './project-map.js'
import { Canvas2DRenderer } from './render.js'
import { type RenderSceneFrameArgs, renderSceneFrame } from './render-scene.js'

const palette: Palette = {
  colors: [
    [0, 0, 0],
    [255, 80, 0],
  ],
  cycles: [],
}
const sprite: RleFrame = { width: 1, height: 1, pixels: Uint8Array.of(1), opaque: Uint8Array.of(1) }
const args: RenderSceneFrameArgs = {
  map: buildBlankProjectMap(1, 1, 'blank'),
  room: { col: 0, row: 0, cols: 1, rows: 1 },
  camera: { x: 0, y: 0 },
  sprites: [{ frame: sprite, worldX: 1, worldY: 1, anchorX: 0, anchorY: 1 }],
  worldScale: 4,
}

function surface() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 40
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas is required')
  return { ctx, pixel: (x: number, y: number) => [...ctx.getImageData(x, y, 1, 1).data] }
}

test('场景使用逻辑像素四倍绘制，恢复调用者的画布状态', () => {
  const { ctx, pixel } = surface()
  const renderer = new Canvas2DRenderer(ctx, palette, new Map())
  ctx.imageSmoothingEnabled = true
  renderSceneFrame(ctx, renderer, args)

  expect(pixel(0, 0)).toEqual([0, 0, 0, 255])
  expect(pixel(4, 28)).toEqual([255, 80, 0, 255])
  expect(pixel(7, 31)).toEqual([255, 80, 0, 255])
  expect(pixel(8, 31)).toEqual([0, 0, 0, 255])
  expect(ctx.getTransform().isIdentity).toBe(true)
  expect(ctx.imageSmoothingEnabled).toBe(true)
})

test('目标画布与 renderer 不同时，报错并保留两个画布', () => {
  const target = surface()
  const owner = surface()
  const renderer = new Canvas2DRenderer(owner.ctx, palette, new Map())
  expect(() => renderSceneFrame(target.ctx, renderer, args)).toThrow(
    'renderer 与目标 context 不一致',
  )
  expect(target.pixel(0, 0)).toEqual([0, 0, 0, 0])
  expect(owner.pixel(0, 0)).toEqual([0, 0, 0, 0])
})

test('绘制抛错仍恢复场景调用者的缩放和采样状态', () => {
  const { ctx } = surface()
  const failure = new Error('draw failed')
  class BrokenRenderer extends Canvas2DRenderer {
    override renderScene(): void {
      throw failure
    }
  }
  const renderer = new BrokenRenderer(ctx, palette, new Map())
  ctx.translate(2, 3)
  ctx.imageSmoothingEnabled = true

  expect(() => renderSceneFrame(ctx, renderer, args)).toThrow(failure)
  expect(ctx.getTransform()).toMatchObject({ a: 1, d: 1, e: 2, f: 3 })
  expect(ctx.imageSmoothingEnabled).toBe(true)
})
