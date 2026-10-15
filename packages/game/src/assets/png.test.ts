import { describe, expect, it } from 'vitest'
import { encodeRgbaPng } from '../present/__tests__/grok-present/png-rgba.js'
import { decodePngToIndices } from './png.js'

describe('decodePngToIndices', () => {
  it('保留包含高位下标 200 的完整首行', async () => {
    const bytes = encodeRgbaPng(2, 1, Uint8Array.of(42, 42, 42, 255, 200, 200, 200, 255))
    const blob = new Blob([Buffer.from(bytes)], { type: 'image/png' })
    const result = await decodePngToIndices(blob)
    expect(result.width).toBe(2)
    expect(result.height).toBe(1)
    expect(Array.from(result.indices)).toEqual([42, 200])
    expect(Array.from(result.opaque)).toEqual([1, 1])
  })
})
