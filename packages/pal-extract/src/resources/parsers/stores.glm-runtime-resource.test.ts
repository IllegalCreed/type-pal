/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R07（parsers/stores.ts）。
 * 去重账：tables.test 覆盖单条首 0 截断/满 9/非 18 整除；stores.boundaries（PAL-TABLES P05）
 * 覆盖三记录并存（空首槽/截断/满 9）互不串位。本文件只做未占用合同：
 * 相邻记录边界不串位（第 1 记录满 9 无 0、第 2 记录首槽即 0）、subarray byteOffset。
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
