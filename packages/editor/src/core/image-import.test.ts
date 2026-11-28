import { describe, expect, test } from 'vitest'
import { quantizeRgbaToPalette } from './image-import.js'

const palette = Array.from({ length: 256 }, (_, index) => [index, index, index] as const)

describe('静态图片导入量化', () => {
  test('最近色确定、同距取较小色号，并输出不透明索引 PNG 像素契约', () => {
    const colors = Array.from({ length: 256 }, (_, index) => {
      if (index === 17) return [4, 0, 0] as const
      if (index === 44) return [6, 0, 0] as const
      return [255, 255, 255] as const
    })
    const result = quantizeRgbaToPalette(new Uint8ClampedArray([5, 0, 0, 7, 6, 0, 0, 0]), colors)
    expect([...result.indices]).toEqual([17, 44])
    expect([...result.indexedRgba]).toEqual([17, 17, 17, 255, 44, 44, 44, 255])
    expect([...result.previewRgba]).toEqual([4, 0, 0, 255, 6, 0, 0, 255])
  })

  test('拒绝非 256 色与损坏 RGBA 长度', () => {
    expect(() => quantizeRgbaToPalette(new Uint8ClampedArray(4), palette.slice(0, 2))).toThrow(
      '256',
    )
    expect(() => quantizeRgbaToPalette(new Uint8ClampedArray(3), palette)).toThrow('4 的倍数')
  })
})
