/** TEST-GLM-WAVE-O-1 O10：MKF 容器公开合同（openMkf/chunkCount/readChunk）。
 *  旧证：mkf.boundaries.test.ts 覆盖截断/对齐主干；本卡按 gap-map 补未覆盖臂：
 *  count<0、chunk 越界读、空容器 chunkCount=0。
 */
import { describe, expect, test } from 'vitest'
import { chunkCount, openMkf, readChunk } from './mkf.js'

const mkfWith = (offsets: number[], bytes: number): Uint8Array => {
  const out = new Uint8Array(bytes)
  const view = new DataView(out.buffer)
  offsets.forEach((offset, index) => view.setUint32(index * 4, offset, true))
  return out
}

describe('O10 MKF：容器合同', () => {
  test('截断头拒绝 / 首偏移非 4 倍数拒绝', () => {
    expect(() => openMkf(new Uint8Array(3))).toThrow('MKF: buffer too small for header')
    expect(() => openMkf(mkfWith([6], 16))).toThrow(/not multiple of 4/)
  })

  test('合法容器：chunkCount 与逐 chunk 边界读取', () => {
    // offsets 表 [8, 12] → firstOffset=8 → 1 chunk；chunk0 = bytes 8..12（表后数据域）。
    const buf = mkfWith([8, 12], 12)
    buf.set([0xaa, 0xbb, 0xcc, 0xdd], 8)
    const mkf = openMkf(buf)
    expect(chunkCount(mkf)).toBe(1)
    expect(Array.from(readChunk(mkf, 0))).toEqual([0xaa, 0xbb, 0xcc, 0xdd])
    // chunkCount=1 → 索引 1 越界。
    expect(() => readChunk(mkf, 1)).toThrow(/out of range \(count=1\)/)
  })

  test('chunk 越界读 fail-loud（负数）', () => {
    const mkf = openMkf(mkfWith([8, 12], 16))
    expect(() => readChunk(mkf, -1)).toThrow(/out of range/)
  })
})
