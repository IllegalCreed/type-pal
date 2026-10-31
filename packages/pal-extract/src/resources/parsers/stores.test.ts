/** Store record termination, adjacent rows, input views and size validation. */
import { describe, expect, test } from 'vitest'
import { storesBytes } from '../../__tests__/table-records.js'
import { parseStores } from './stores.js'

describe('record termination and adjacent records', () => {
  test('空首槽 / 首 0 截断 / 满 9 三记录并存：id 0..2、数组互不串位', () => {
    const stores = parseStores(storesBytes())
    expect(stores).toHaveLength(3)
    expect(stores[0]).toEqual({ id: 0, items: [] }) // 首槽空 → 空列表（不过滤成产品政策）
    expect(stores[1]).toEqual({ id: 1, items: [201, 202] }) // 首 0 截断，其后不读
    expect(stores[2]).toEqual({
      id: 2,
      items: [301, 302, 303, 304, 305, 306, 307, 308, 309], // 满 9 无 0 全保留
    })
  })
})

describe('input views and record sizes', () => {
  function storeTable(rows: number[][]): Uint8Array {
    const out = new Uint8Array(rows.length * 18)
    const view = new DataView(out.buffer)
    rows.forEach((row, i) => {
      row.forEach((obj, j) => view.setUint16(i * 18 + j * 2, obj, true))
    })
    return out
  }

  test('满 9 记录与紧邻空记录：9 槽全保留且不串入下一条', () => {
    const stores = parseStores(
      storeTable([
        [311, 312, 313, 314, 315, 316, 317, 318, 319],
        [0, 999, 999, 999, 999, 999, 999, 999, 999],
      ]),
    )
    expect(stores).toEqual([
      { id: 0, items: [311, 312, 313, 314, 315, 316, 317, 318, 319] },
      { id: 1, items: [] },
    ])
  })

  test('奇数偏移 subarray：两条记录逐字段精确', () => {
    const bytes = storeTable([[61], [62, 63]])
    const parent = new Uint8Array(5 + bytes.length)
    parent.fill(0x33)
    parent.set(bytes, 5)
    const expected = [
      { id: 0, items: [61] },
      { id: 1, items: [62, 63] },
    ]
    expect(parseStores(parent.subarray(5))).toEqual(expected)
    expect(parseStores(bytes)).toEqual(expected)
  })

  test('parseStores：尺寸不整除精确拒绝', () => {
    expect(() => parseStores(new Uint8Array(7))).toThrow(
      'parseStores: DATA.MKF chunk 0 size 7 不能被 STORE_RECORD_SIZE=18 整除',
    )
  })
})
