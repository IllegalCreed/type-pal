import { describe, expect, it } from 'vitest'
import { chunkCount, openMkf, readChunk } from './mkf.js'

/**
 * 手造 MKF:2 个子文件,内容分别是 [0x10, 0x11] 和 [0x20, 0x21, 0x22]。
 * 偏移表 = [12, 14, 17](3 个 u32 LE);
 *   offsets[0] = 12 → 子文件 0 起点(头长 = 3 × 4 = 12)
 *   offsets[1] = 14 → 子文件 0 结束 + 子文件 1 起点
 *   offsets[2] = 17 → 子文件 1 结束
 *   子文件数 = offsets[0] / 4 - 1 = 2
 */
function makeFixture(): Uint8Array {
  const buf = new Uint8Array(17)
  const view = new DataView(buf.buffer)
  view.setUint32(0, 12, true)
  view.setUint32(4, 14, true)
  view.setUint32(8, 17, true)
  buf.set([0x10, 0x11], 12)
  buf.set([0x20, 0x21, 0x22], 14)
  return buf
}

describe('mkf', () => {
  it('chunkCount 返回 2', () => {
    const mkf = openMkf(makeFixture())
    expect(chunkCount(mkf)).toBe(2)
  })

  it('readChunk 取出每个子文件', () => {
    const mkf = openMkf(makeFixture())
    expect(Array.from(readChunk(mkf, 0))).toEqual([0x10, 0x11])
    expect(Array.from(readChunk(mkf, 1))).toEqual([0x20, 0x21, 0x22])
  })

  it('readChunk 越界报错', () => {
    const mkf = openMkf(makeFixture())
    expect(() => readChunk(mkf, 2)).toThrow(/out of range/i)
  })
})
