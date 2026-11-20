// @vitest-environment jsdom
import type { Palette, RleFrame } from '@type-pal/shared'
import { expect, test, vi } from 'vitest'
import { buildBlankProjectMap } from './project-map.js'
import { bakeFrame, Canvas2DRenderer, spriteBlitRect } from './render.js'

const palette: Palette = {
  colors: Array.from({ length: 256 }, (_, value) => [value, value, value]),
  cycles: [],
}

function pixels(canvas: HTMLCanvasElement, x: number, y: number, width = 1): number[] {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas is required')
  return [...ctx.getImageData(x, y, width, 1).data]
}

function surface() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 40
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas is required')
  return { canvas, ctx, renderer: new Canvas2DRenderer(ctx, palette, new Map()) }
}

function solid(width: number, height: number): RleFrame {
  return {
    width,
    height,
    pixels: new Uint8Array(width * height).fill(96),
    opaque: new Uint8Array(width * height).fill(1),
  }
}

test('精灵矩形按该帧锚点与脚下位置计算', () => {
  const input = { worldX: 100, worldY: 50, frame: { width: 10, height: 20 } }
  expect(spriteBlitRect({ ...input, anchorX: 5, anchorY: 12 })).toEqual({
    x: 95,
    y: 45,
    w: 10,
    h: 20,
  })
  expect(spriteBlitRect({ ...input, anchorX: 0, anchorY: 0 })).toEqual({
    x: 100,
    y: 57,
    w: 10,
    h: 20,
  })
})

test('调色只移动低四位色阶，透明遮罩与颜色索引独立', () => {
  const input: RleFrame = {
    width: 4,
    height: 1,
    pixels: Uint8Array.of(0x00, 0x0f, 0x34, 0x38),
    opaque: Uint8Array.of(1, 1, 1, 0),
  }
  const shifted = bakeFrame(input, palette, 2)
  expect(shifted.width).toBe(4)
  expect(pixels(shifted, 0, 0, 4)).toEqual([
    2, 2, 2, 255, 15, 15, 15, 255, 54, 54, 54, 255, 0, 0, 0, 0,
  ])
  expect(pixels(bakeFrame(input, palette, -5), 0, 0, 4)).toEqual([
    0, 0, 0, 255, 10, 10, 10, 255, 48, 48, 48, 255, 0, 0, 0, 0,
  ])
})

test('清除整幅画布为不透明黑色', () => {
  const { canvas, ctx, renderer } = surface()
  ctx.fillStyle = 'red'
  ctx.fillRect(0, 0, 40, 40)
  renderer.clear()
  expect(pixels(canvas, 0, 0)).toEqual([0, 0, 0, 255])
  expect(pixels(canvas, 39, 39)).toEqual([0, 0, 0, 255])
})

test('独立精灵 API 对相机相对坐标取整，重绘使用同一张帧画布', () => {
  const { canvas, ctx, renderer } = surface()
  const draw = vi.spyOn(ctx, 'drawImage')
  const frame = solid(8, 6)
  const camera = { x: 0.5, y: 0.5 }
  renderer.drawSprite(frame, 20.4, 30.6, 4, 6, camera)
  renderer.drawSprite(frame, 21.4, 30.6, 4, 6, camera)
  expect(pixels(canvas, 16, 24)).toEqual([96, 96, 96, 255])
  expect(pixels(canvas, 24, 24)).toEqual([96, 96, 96, 255])
  expect(pixels(canvas, 15, 24)).toEqual([0, 0, 0, 0])
  expect(draw.mock.calls.at(0)?.[0]).toBeDefined()
  expect(draw.mock.calls.at(1)?.[0]).toBe(draw.mock.calls.at(0)?.[0])
})

test('半透明精灵绘制失败后恢复调用者的透明度', () => {
  const { ctx, renderer } = surface()
  const failure = new Error('canvas rejected draw')
  const draw = vi.spyOn(ctx, 'drawImage')
  draw.mockImplementationOnce(() => {
    throw failure
  })
  ctx.globalAlpha = 0.75

  expect(() =>
    renderer.renderScene(
      buildBlankProjectMap(1, 1, 'blank'),
      { col: 0, row: 0, cols: 1, rows: 1 },
      { x: 0, y: 0 },
      [{ frame: solid(1, 1), worldX: 10, worldY: 10, anchorX: 0, anchorY: 0, alpha: 0.25 }],
    ),
  ).toThrow(failure)
  expect(ctx.globalAlpha).toBe(0.75)
})
