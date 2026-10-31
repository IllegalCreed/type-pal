/** OBJECT_ITEM fields, flags, absolute identity, optional names and input ownership. */
import { describe, expect, test } from 'vitest'
import { withParserWarnings } from '../../__tests__/parser-diagnostics.js'
import { expectedItemWords, itemsObjectBytes } from '../../__tests__/table-records.js'
import type { Words } from '../../io/word.js'
import { parseItems } from './items.js'

describe('item fields, flags and absolute identities', () => {
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

  test('六基础 flag 一热 + 六角色装备许可位一热（同 role 号），295 不在断言域', () => {
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
      // 六角色装备许可位只有第 bit role 真，与头/手等装备部位无关。
      expect(flags.equipableBy).toEqual(Array.from({ length: 6 }, (_, role) => role === bit))
    }
  })

  test('parseItems：截断精确拒绝（报实测与所需字节数）', () => {
    expect(() => withParserWarnings([], () => parseItems(new Uint8Array(100)))).toThrow(
      'parseItems: SSS.MKF chunk 2 truncated (got 100B, need ≥ 4144B for items 0..234)',
    )
  })
})

describe('optional names and input ownership', () => {
  const words: Words = {
    items: ['', '止血草'], // [0]=id 61（空词）、[1]=62
    spells: [],
    persons: [],
    enemies: [],
    scenes: [],
    flat: [],
    system: [],
    battleUi: [],
  }

  test('words.items[0] 空串 → 无 _name 键；非空串 → 精确 _name', () => {
    const items = parseItems(itemsObjectBytes(), words)
    const first = items[0]! // id 61 → local 0 → 空词
    expect(first.id).toBe(61)
    expect('_name' in first).toBe(false)
    const second = items[1]! // id 62 → local 1 → 非空
    expect(second._name).toBe('止血草')
  })

  test('输入表零突变（parse 不改写 objBuf）', () => {
    const bytes = itemsObjectBytes()
    const before = structuredClone(bytes)
    parseItems(bytes)
    expect(bytes).toEqual(before)
  })
})
