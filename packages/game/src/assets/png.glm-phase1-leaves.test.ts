/**
 * L23：alpha=0 透明位与非零 alpha 200 归一化为 opaque 1。
 * 坏 Blob 的弱摘要已并入 Grok A05 完整上下文/真实 cause；此文件不调用 dialog loader。
 */
import { describe, expect, it } from 'vitest'
import { encodeRgbaPng } from '../present/__tests__/grok-present/png-rgba.js'
import { decodePngToIndices } from './png.js'

describe('L23 decodePngToIndices 剩余合同', () => {
  it('alpha=0 → opaque 0（RLE-skip 透明），alpha>0 → opaque 1（palette-0 也保）', async () => {
    const bytes = encodeRgbaPng(2, 1, Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 200))
    const blob = new Blob([Buffer.from(bytes)], { type: 'image/png' })
    const r = await decodePngToIndices(blob)
    expect(Array.from(r.indices)).toEqual([0, 0])
    expect(Array.from(r.opaque)).toEqual([0, 1])
  })
})
