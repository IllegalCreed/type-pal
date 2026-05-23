import { describe, it, expect } from 'vitest'
import { decodePngToIndices } from './png.js'

describe('decodePngToIndices', () => {
  it('从 Blob 解出索引数组(取 R 通道)', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 1
    const ctx = canvas.getContext('2d')!
    const img = ctx.createImageData(2, 1)
    img.data.set([42, 0, 0, 255, 200, 0, 0, 255])
    ctx.putImageData(img, 0, 0)
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'))
    const result = await decodePngToIndices(blob)
    expect(result.width).toBe(2)
    expect(result.height).toBe(1)
    expect(Array.from(result.indices)).toEqual([42, 200])
  })
})
