import { describe, expect, it } from 'vitest'
import { legalPalette } from '../__tests__/asset-fixtures.js'
import { createFramebuffer } from './framebuffer.js'
import { flushToCanvas } from './present.js'

describe('Canvas output', () => {
  describe('G04-D present 冻屏归属与调色板', () => {
    it('G04-D08 flushToCanvas 按原点写入完整异色 RGBA，保留边界和索引缓冲', () => {
      const fb = createFramebuffer(3, 2)
      fb.indices.set([0, 9, 2, 3, 0, 4])
      const palette = legalPalette((colors) => {
        colors[0] = [1, 2, 3]
        colors[9] = [10, 20, 30]
        colors[2] = [40, 50, 60]
        colors[3] = [70, 80, 90]
        colors[4] = [100, 110, 120]
      })
      const canvas = document.createElement('canvas')
      canvas.width = 4
      canvas.height = 3
      const ctx2d = canvas.getContext('2d')
      if (!ctx2d) throw new Error('2d context unavailable')
      flushToCanvas(fb, ctx2d, palette)
      expect(Array.from(ctx2d.getImageData(0, 0, 3, 2).data)).toEqual([
        1, 2, 3, 255, 10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, 1, 2, 3, 255, 100, 110,
        120, 255,
      ])
      expect(Array.from(ctx2d.getImageData(3, 0, 1, 1).data)).toEqual([0, 0, 0, 0])
      expect(Array.from(ctx2d.getImageData(0, 2, 1, 1).data)).toEqual([0, 0, 0, 0])
      expect(Array.from(fb.indices)).toEqual([0, 9, 2, 3, 0, 4])
    })
  })
})
