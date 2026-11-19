import { describe, expect, it } from 'vitest'
import { bakeIndexedRgba } from './bake-indexed-rgba.js'

describe('bakeIndexedRgba', () => {
  const palette = [
    [0, 0, 0],
    [255, 0, 0], // index 1 = 红
    [0, 255, 0], // index 2 = 绿
  ] as const

  it('可见像素取调色板真彩，输出 alpha 为 255', () => {
    const src = new Uint8Array([1, 1, 1, 255, 2, 2, 2, 1])
    expect([...bakeIndexedRgba(src, palette)]).toEqual([255, 0, 0, 255, 0, 255, 0, 255])
  })

  it('透明像素的颜色和 alpha 均为零', () => {
    const src = new Uint8Array([1, 1, 1, 0])
    expect([...bakeIndexedRgba(src, palette)]).toEqual([0, 0, 0, 0])
  })

  it('可见像素找不到调色板索引时输出不透明黑', () => {
    const src = new Uint8Array([99, 99, 99, 255])
    expect([...bakeIndexedRgba(src, palette)]).toEqual([0, 0, 0, 255])
  })
})
