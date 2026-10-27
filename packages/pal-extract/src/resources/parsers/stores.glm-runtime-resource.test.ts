/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R07（parsers/stores.ts）。
 * tables.test核原盘完整列表；stores.boundaries核空首槽/截断/满9的完整三记录。
 * 本文件保留紧邻满9与空记录、subarray偏移，以及7B非整除的精确拒绝。
 */
import { describe, expect, test } from 'vitest'
import { parseStores } from './stores.js'

function storesBytes(rows: number[][]): Uint8Array {
  const out = new Uint8Array(rows.length * 18)
  const view = new DataView(out.buffer)
  rows.forEach((row, i) => {
    row.forEach((obj, j) => view.setUint16(i * 18 + j * 2, obj, true))
  })
  return out
}

describe('R07 parseStores 记录边界', () => {
  test('满 9 记录与紧邻空记录：9 槽全保留且不串入下一条', () => {
    const stores = parseStores(
      storesBytes([
        [311, 312, 313, 314, 315, 316, 317, 318, 319],
        [0, 999, 999, 999, 999, 999, 999, 999, 999],
      ]),
    )
    expect(stores).toEqual([
      { id: 0, items: [311, 312, 313, 314, 315, 316, 317, 318, 319] },
      { id: 1, items: [] },
    ])
  })

  test('奇数偏移 subarray：与独立缓冲全等', () => {
    const bc = storesBytes([[61], [62, 63]])
    const parent = new Uint8Array(5 + bc.length)
    parent.fill(0x33)
    parent.set(bc, 5)
    expect(parseStores(parent.subarray(5))).toEqual(parseStores(bc))
  })
})

test('parseStores：尺寸不整除精确拒绝', () => {
  expect(() => parseStores(new Uint8Array(7))).toThrow(
    'parseStores: DATA.MKF chunk 0 size 7 不能被 STORE_RECORD_SIZE=18 整除',
  )
})
