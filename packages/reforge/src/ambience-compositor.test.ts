// @vitest-environment jsdom
import { expect, test, vi } from 'vitest'
import { compositeAmbienceTint } from './ambience-compositor.js'
import { expectDefined } from './defined.js'

function frame() {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 1
  const ctx = expectDefined(canvas.getContext('2d'))
  ctx.fillStyle = 'rgb(128,64,255)'
  ctx.fillRect(0, 0, 1, 1)
  ctx.fillStyle = '#fff'
  ctx.fillRect(1, 0, 1, 1)
  return { ctx, pixels: () => Array.from(ctx.getImageData(0, 0, 2, 1).data) }
}

test.each([
  { label: 'white', tint: [255, 255, 255] as const },
  { label: 'near-white blue', tint: [255, 255, 254] as const },
  { label: 'near-white red', tint: [254, 255, 255] as const },
])('skips the draw for canonical identity tint: $label', ({ tint }) => {
  const { ctx, pixels } = frame()
  const draw = vi.spyOn(ctx, 'fillRect')
  try {
    compositeAmbienceTint(ctx, tint, 2, 1)
    expect(draw).not.toHaveBeenCalled()
    expect(pixels()).toEqual([128, 64, 255, 255, 255, 255, 255, 255])
  } finally {
    draw.mockRestore()
  }
})

test('multiplies the full presented frame and restores the caller canvas state', () => {
  const { ctx, pixels } = frame()
  const priorFill = ctx.fillStyle
  compositeAmbienceTint(ctx, [128, 255, 64], 2, 1)
  expect(pixels()).toEqual([64, 64, 64, 255, 128, 255, 64, 255])
  expect(ctx.fillStyle).toBe(priorFill)
  expect(ctx.globalCompositeOperation).toBe('source-over')
})
