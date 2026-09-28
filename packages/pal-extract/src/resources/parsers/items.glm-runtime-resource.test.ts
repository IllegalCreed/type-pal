/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R07（parsers/items.ts）。
 * 去重账：tables.test 覆盖 flags 位序/截断 throw/真实规模/_name；items.boundaries（PAL-TABLES P04）
 * 覆盖全 296×14B 七 WORD 逐条、六基础位 + 六装备位一热、295 梦蛇排除邻位。
 * 本文件只做未占用合同：words 空串名不产 _name 键（`if (nm)` 假臂）、同表非空名产 _name、
 * 输入零突变。
 */
import { describe, expect, test } from 'vitest'
import { itemsObjectBytes } from '../../__tests__/glm-tb04-fixtures.js'
import type { Words } from '../../io/word.js'
import { parseItems } from './items.js'

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

describe('R07 parseItems _name 附加轴', () => {
  test('words.items[0] 空串 → 无 _name 键；非空串 → 精确 _name', () => {
    const items = parseItems(itemsObjectBytes(), words)
    const first = items[0]! // id 61 → local 0 → 空词
    expect(first.id).toBe(61)
    expect('_name' in first).toBe(false)
    const second = items[1]! // id 62 → local 1 → 非空
    expect(second._name).toBe('止血草')
  })

  test('输入表零突变（parse 不改写 objBuf）', () => {
    const buf = itemsObjectBytes()
    const before = structuredClone(buf)
    parseItems(buf)
    expect(buf).toEqual(before)
  })
})
