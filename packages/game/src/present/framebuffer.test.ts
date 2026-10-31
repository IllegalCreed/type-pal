import type { Palette } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { legalPalette } from '../__tests__/asset-fixtures.js'
import { createFramebuffer } from './framebuffer.js'

describe('Framebuffer values', () => {
  describe('G04-D present 冻屏归属与调色板', () => {
    it('G04-D09 writePixel(300) 截成 44，toImageData 读的是 44 号色', () => {
      const fb = createFramebuffer()
      fb.writePixel(2, 1, 300)
      expect(fb.indices[320 + 2]).toBe(44)
      const palette = legalPalette((colors) => {
        colors[44] = [7, 8, 9]
      })
      const image = fb.toImageData(palette)
      expect(Array.from(image.data.slice((320 + 2) * 4, (320 + 2) * 4 + 4))).toEqual([7, 8, 9, 255])
    })
  })

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

  describe('framebuffer clipping and palette boundaries', () => {
    it('writePixel 越界（负值/超宽高）静默不写不抛', () => {
      const fb = createFramebuffer(4, 4)
      fb.writePixel(-1, 1, 9) // 若漏负 x 守卫，会误写上一行末像素
      fb.writePixel(4, 0, 9)
      fb.writePixel(0, -1, 9)
      fb.writePixel(0, 4, 9)
      expect(fb.indices.every((v) => v === 0)).toBe(true)
      fb.writePixel(3, 3, 7)
      expect(fb.indices[3 * 4 + 3]).toBe(7)
    })

    it('自定义尺寸离屏缓冲的末像素写入与 RGBA 尺寸', () => {
      const fb = createFramebuffer(10, 5)
      expect(fb.width).toBe(10)
      expect(fb.height).toBe(5)
      expect(fb.indices.length).toBe(50)
      fb.writePixel(9, 4, 1)
      const image = fb.toImageData({
        colors: [
          [0, 0, 0],
          [4, 5, 6],
        ],
        cycles: [],
      })
      expect([image.width, image.height, image.data.length]).toEqual([10, 5, 200])
      expect(Array.from(image.data.subarray(-8))).toEqual([0, 0, 0, 255, 4, 5, 6, 255])
    })

    it('toImageData：palette 缺该索引颜色 → fallback [0,0,0]、alpha 恒 255', () => {
      const fb = createFramebuffer(2, 1)
      fb.writePixel(0, 0, 250) // 超出 palette 提供范围
      fb.writePixel(1, 0, 1)
      const palette: Palette = {
        colors: [
          [10, 20, 30],
          [40, 50, 60],
        ],
        cycles: [],
      }
      const img = fb.toImageData(palette)
      expect(Array.from(img.data.slice(0, 4))).toEqual([0, 0, 0, 255])
      expect(Array.from(img.data.slice(4, 8))).toEqual([40, 50, 60, 255])
    })
  })
})
