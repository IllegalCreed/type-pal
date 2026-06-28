import { describe, expect, it } from 'vitest'
import { bakeIndexedRgba } from './bake-indexed-rgba.js'

describe('bakeIndexedRgba', () => {
  const palette = [
    [0, 0, 0],
    [255, 0, 0], // index 1 = 红
    [0, 255, 0], // index 2 = 绿
  ] as const

  it('不透明像素 R=index → palette 真彩, A=255', () => {
    const src = new Uint8Array([1, 1, 1, 255, 2, 2, 2, 255]) // index1 + index2
    expect([...bakeIndexedRgba(src, palette)]).toEqual([255, 0, 0, 255, 0, 255, 0, 255])
  })

  it('透明像素(A=0)保持全透明, 不查 palette', () => {
    const src = new Uint8Array([1, 1, 1, 0]) // index1 但透明
    expect([...bakeIndexedRgba(src, palette)]).toEqual([0, 0, 0, 0])
  })

  it('index 越界 → 黑兜底, 不崩', () => {
    const src = new Uint8Array([99, 99, 99, 255])
    expect([...bakeIndexedRgba(src, palette)]).toEqual([0, 0, 0, 255])
  })
})
