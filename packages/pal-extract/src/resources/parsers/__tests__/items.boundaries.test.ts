/**
 * TEST-PAL-TABLES-COVERAGE-1 P04：parseItems 边界（parsers/items.ts）。
 * 既有 tables.test 已覆盖 flags bit 顺序（usable+equipable、6 role 装备位）、截断 throw、
 * 真实数据规模/_name ——不重复。本文件：全 296×14B 表中七 WORD 每条各异（串位/字段别名即检出）、
 * 六基础 flag 与六装备位一热轴、id=wObjectID 与 295 梦蛇排除的邻位完整。
 */
import { describe, expect, test } from 'vitest'
import { expectedItemWords, itemsObjectBytes } from '../../../__tests__/glm-tb04-fixtures.js'
import { parseItems } from '../items.js'

describe('P04 parseItems 全量七 WORD 字段保真', () => {
  test('296×14B 表：234 条（61..294）逐条七 WORD 精确，梦蛇 295 排除且邻位完整', () => {
    const items = parseItems(itemsObjectBytes())
    expect(items).toHaveLength(234)
    for (const item of items) {
      expect(item.id).toBeGreaterThanOrEqual(61)
      expect(item.id).toBeLessThanOrEqual(294)
      const [bitmap, price, scriptOnUse, scriptOnEquip, scriptOnThrow, scriptDesc] =
        expectedItemWords(item.id)
      expect(item.bitmap).toBe(bitmap)
      expect(item.price).toBe(price)
      expect(item.scriptOnUse).toBe(scriptOnUse)
      expect(item.scriptOnEquip).toBe(scriptOnEquip) // 字段别名（偏移串位）即红
      expect(item.scriptOnThrow).toBe(scriptOnThrow)
      expect(item.scriptDesc).toBe(scriptDesc)
    }
    // 排除位与邻位：61 首位在、294 末位在、295 缺席
    expect(items[0]!.id).toBe(61)
    expect(items[items.length - 1]!.id).toBe(294)
    expect(items.some((item) => item.id === 295)).toBe(false)
  })
  test('六基础 flag 一热 + 六装备位一热（同 role 号），295 不在断言域', () => {
    const items = parseItems(itemsObjectBytes())
    for (const item of items) {
      const local = item.id - 61
      const bit = local % 6
      const flags = item.flags
      // 六基础位只有第 bit 位真
      expect(flags.usable).toBe(bit === 0)
      expect(flags.equipable).toBe(bit === 1)
      expect(flags.throwable).toBe(bit === 2)
      expect(flags.consuming).toBe(bit === 3)
      expect(flags.applyToAll).toBe(bit === 4)
      expect(flags.sellable).toBe(bit === 5)
      // 六装备位只有第 bit role 真
      for (let role = 0; role < 6; role++) expect(flags.equipableBy[role]).toBe(role === bit)
    }
  })
})
