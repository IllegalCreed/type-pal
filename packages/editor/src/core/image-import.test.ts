import { describe, expect, test } from 'vitest'
import { quantizeRgbaToPalette } from './image-import.js'

const palette = Array.from({ length: 256 }, (_, index) => [index, index, index] as const)

describe('静态图片导入量化', () => {
  test('最近色确定、同距取较小色号，并输出不透明索引 PNG 像素契约', () => {
    const source = new Uint8ClampedArray([10, 12, 14, 7, 20, 21, 20, 0])
    const result = quantizeRgbaToPalette(source, palette)
    expect([...result.indices]).toEqual([12, 20])
    expect([...result.indexedRgba]).toEqual([12, 12, 12, 255, 20, 20, 20, 255])
    expect([...result.previewRgba]).toEqual([12, 12, 12, 255, 20, 20, 20, 255])
  })

  test('拒绝非 256 色与损坏 RGBA 长度', () => {
    expect(() => quantizeRgbaToPalette(new Uint8ClampedArray(4), palette.slice(0, 2))).toThrow(
      '256',
    )
    expect(() => quantizeRgbaToPalette(new Uint8ClampedArray(3), palette)).toThrow('4 的倍数')
  })
})
