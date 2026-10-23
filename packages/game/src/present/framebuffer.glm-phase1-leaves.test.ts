/**
 * TEST-GLM-PHASE1-LEAVES-3 L16（framebuffer.ts / screen-wave.ts）— 去重表：
 *  - framebuffer.test（320×200 初始/writePixel+clear/toImageData RGBA）→ 不重复
 *  - 新差异：writePixel 越界静默、自定义尺寸缓冲、toImageData 缺色 fallback [0,0,0]。
 */
import type { Palette } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createFramebuffer } from './framebuffer.js'

describe('L16 framebuffer 剩余合同', () => {
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
