/**
 * P03：已知GBK字节切片、空段/末offset、两输入的实际所有权。
 * bytes/offsets均为带非零偏移的视图，父buffer前后保护区也须保持。
 * 越界与倒序已由CODE3b入口明确拒绝，分成独立输入轴。
 */
import { describe, expect, test } from 'vitest'
import { concatBytes, gbk, msgRegion } from '../__tests__/glm-tb04-fixtures.js'
import { parseMessages } from './msg.js'

function offsetViews() {
  const { bytes, offsets } = msgRegion()
  const bytesParent = concatBytes([Uint8Array.of(1, 2, 3, 4), bytes, Uint8Array.of(5, 6, 7, 8)])
  const bytesView = bytesParent.subarray(4, 4 + bytes.byteLength)
  const offsetsParent = new Uint8Array(8 + offsets.byteLength + 4).fill(0xa7)
  const view = new DataView(offsetsParent.buffer)
  offsets.forEach((value, index) => view.setUint32(8 + index * 4, value, true))
  const offsetsView = new Uint32Array(offsetsParent.buffer, 8, offsets.length)
  return { bytesView, offsetsView, bytesParent, offsetsParent }
}

describe('P03 parseMessages 已知字节切片', () => {
  test('四条精确（含空条）；末 offset 是末条终点，不另产消息；GBK 双字节轴', () => {
    const { bytesView, offsetsView, bytesParent, offsetsParent } = offsetViews()
    const beforeBytes = bytesParent.slice()
    const beforeOffsets = offsetsParent.slice()
    expect(bytesView.byteOffset).toBe(4)
    expect(offsetsView.byteOffset).toBe(8)
    expect(parseMessages(bytesView, offsetsView)).toEqual(['甲', '乙丙', '', '丁'])
    expect(bytesParent).toEqual(beforeBytes)
    expect(offsetsParent).toEqual(beforeOffsets)
  })

  test('合法 [0] 单 offset → 零消息', () => {
    expect(parseMessages(gbk('甲乙丙丁'), new Uint32Array([0]))).toEqual([])
  })

  test.each([
    {
      title: 'offset越界',
      offsets: [0, 5],
      error: 'parseMessages: offset[1] 5 exceeds message buffer 4',
    },
    {
      title: 'offset倒序',
      offsets: [1, 0],
      error: 'parseMessages: offset[1] 0 precedes offset[0] 1',
    },
  ])('$title：显式失败并指出实际索引和值', ({ offsets, error }) => {
    expect(() => parseMessages(gbk('甲乙'), new Uint32Array(offsets))).toThrow(error)
  })
})
