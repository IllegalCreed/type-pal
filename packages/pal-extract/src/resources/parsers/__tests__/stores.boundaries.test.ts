/**
 * TEST-PAL-TABLES-COVERAGE-1 P05：parseStores 边界（parsers/stores.ts）。
 * 既有 tables.test 已覆盖单条 fake 首 0 截断/满 9/非 18 整除——不重复。
 * 本文件：三记录并存（空首槽 / 截断 / 满 9），完整 id 与数组，证明记录互不串位。
 */
import { describe, expect, test } from 'vitest'
import { storesBytes } from '../../../__tests__/glm-tb04-fixtures.js'
import { parseStores } from '../stores.js'

describe('P05 parseStores 三记录并存', () => {
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
