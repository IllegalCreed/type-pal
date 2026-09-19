/**
 * TEST-PAL-TABLES-COVERAGE-1 P03：parseMessages 边界（io/msg.ts）。
 * 既有 msg.test 只用真实 M.MSG（规模/字符串/逍遥）——不重复。本文件：独立已知 GBK/ASCII
 * 字节 + 偏移表，精确四条含空条、末 offset sentinel 不产消息、合法 [0] 零消息、
 * 两输入均带非零 byteOffset（4 字节对齐）。
 */
import { describe, expect, test } from 'vitest'
import { concatBytes, gbk, msgRegion } from '../__tests__/glm-tb04-fixtures.js'
import { parseMessages } from './msg.js'

/** 把 bytes/offsets 各放进带 4B 前导垫的缓冲，返回非零 byteOffset 视图。 */
function offsetViews() {
  const { bytes, offsets } = msgRegion()
  const paddedBytes = concatBytes([new Uint8Array(4), bytes])
  const bytesView = paddedBytes.subarray(4)
  const offsetsRaw = new Uint8Array(8 + offsets.byteLength)
  const view = new DataView(offsetsRaw.buffer)
  offsets.forEach((value, index) => view.setUint32(8 + index * 4, value, true))
  const offsetsView = new Uint32Array(offsetsRaw.buffer, 8, offsets.length)
  return { bytesView, offsetsView }
}

describe('P03 parseMessages 已知字节切片', () => {
  test('四条精确（含空条）；末 offset 只作下界不产消息；GBK 双字节轴', () => {
    const { bytesView, offsetsView } = offsetViews()
    expect(bytesView.byteOffset).toBe(4)
    expect(offsetsView.byteOffset).toBe(8)
    expect(parseMessages(bytesView, offsetsView)).toEqual(['甲', '乙丙', '', '丁'])
  })
  test('合法 [0] 单 offset → 零消息；offset 递减不越界读取（subarray 天然空）', () => {
    const bytes = gbk('甲乙丙丁')
    expect(parseMessages(bytes, new Uint32Array([0]))).toEqual([])
    // 非递增相邻对产出空段（不抛、不吞字节）：甲@0..2 乙@2..4 丙@4..6 丁@6..8
    expect(parseMessages(bytes, new Uint32Array([4, 2, 6]))).toEqual(['', '乙丙'])
  })
})
