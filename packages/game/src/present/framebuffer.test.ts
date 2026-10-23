import type { Palette } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createFramebuffer } from './framebuffer.js'

describe('Framebuffer', () => {
  it('320×200,初始全 0', () => {
    const fb = createFramebuffer()
    expect(fb.width).toBe(320)
    expect(fb.height).toBe(200)
    expect(fb.indices.length).toBe(320 * 200)
    expect(fb.indices.every((value) => value === 0)).toBe(true)
  })

  it('writePixel + clear', () => {
    const fb = createFramebuffer()
    fb.writePixel(10, 5, 42)
    expect(fb.indices[5 * 320 + 10]).toBe(42)
    fb.indices.fill(42)
    fb.clear()
    expect(fb.indices.every((value) => value === 0)).toBe(true)
  })

  it('toImageData(palette) —— 索引 → RGBA', () => {
    const fb = createFramebuffer()
    fb.writePixel(0, 0, 1)
    fb.writePixel(1, 0, 2)
    const palette: Palette = {
      colors: [
        [0, 0, 0],
        [100, 0, 0],
        [0, 100, 0],
        ...Array.from({ length: 253 }, (): [number, number, number] => [0, 0, 0]),
      ],
      cycles: [],
    }
    const img = fb.toImageData(palette)
    expect(img.width).toBe(320)
    expect(img.height).toBe(200)
    expect(Array.from(img.data.subarray(0, 8))).toEqual([100, 0, 0, 255, 0, 100, 0, 255])
    expect(Array.from(img.data.subarray(-4))).toEqual([0, 0, 0, 255])
  })
})
