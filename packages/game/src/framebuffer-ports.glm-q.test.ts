// Q09 · framebuffer 纯输入边界残差（排重：SCREEN_W/H 常量被旧测引用，createFramebuffer
// 本体 0 直测命中；本文件补构造/越界写/清零/调色板成像合同）。
import type { Palette } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { createFramebuffer, SCREEN_H, SCREEN_W } from './present/framebuffer.js'

const palette: Palette = {
  colors: Array.from({ length: 256 }, (_, v) => [v, (v * 2) % 256, 255 - v]),
  cycles: [],
}

describe('Q09 createFramebuffer', () => {
  test('默认 320×200；自定义尺寸按参数建', () => {
    const fb = createFramebuffer()
    expect(fb.width).toBe(SCREEN_W)
    expect(fb.height).toBe(SCREEN_H)
    expect(fb.indices).toHaveLength(SCREEN_W * SCREEN_H)
    const small = createFramebuffer(4, 3)
    expect(small.width).toBe(4)
    expect(small.height).toBe(3)
    expect(small.indices).toHaveLength(12)
  })

  test('writePixel 四边界外全部忽略；界内按 y*width+x 落位', () => {
    const fb = createFramebuffer(4, 3)
    for (const [x, y] of [
      [-1, 0],
      [0, -1],
      [4, 0],
      [0, 3],
      [100, 100],
    ] as const)
      fb.writePixel(x, y, 9)
    expect([...fb.indices].every((v) => v === 0)).toBe(true)
    fb.writePixel(2, 1, 7)
    expect(fb.indices[1 * 4 + 2]).toBe(7)
  })

  test('clear 归零全部索引', () => {
    const fb = createFramebuffer(2, 2)
    fb.writePixel(0, 0, 5)
    fb.writePixel(1, 1, 6)
    fb.clear()
    expect([...fb.indices].every((v) => v === 0)).toBe(true)
  })

  test('toImageData 按 palette 展开 RGBA、alpha 恒 255、缺色回退黑', () => {
    const fb = createFramebuffer(2, 1)
    fb.writePixel(0, 0, 3)
    fb.writePixel(1, 0, 200)
    const image = fb.toImageData(palette)
    expect(image.width).toBe(2)
    expect(image.height).toBe(1)
    expect([...image.data.slice(0, 4)]).toEqual([3, 6, 252, 255])
    expect([...image.data.slice(4, 8)]).toEqual([200, 144, 55, 255])
    const hole = createFramebuffer(1, 1)
    hole.writePixel(0, 0, 250)
    const missing: Palette = { colors: [], cycles: [] }
    const dark = hole.toImageData(missing)
    expect([...dark.data]).toEqual([0, 0, 0, 255])
  })
})
