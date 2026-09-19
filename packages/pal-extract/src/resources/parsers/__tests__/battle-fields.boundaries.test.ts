/**
 * TEST-PAL-TABLES-COVERAGE-1 P06：parseBattleFields 边界（parsers/battle-fields.ts）。
 * 既有 tables.test 已覆盖真实规模/shape/单条 0xFFFF→-1/截断——不重复。
 * 本文件：两 12B 记录完整对象相等（五维不同正负值 + unsigned 高位 screenWave）。
 */
import { describe, expect, test } from 'vitest'
import { battleFieldsBytes } from '../../../__tests__/glm-tb04-fixtures.js'
import { parseBattleFields } from '../battle-fields.js'

describe('P06 parseBattleFields 两记录完整对象', () => {
  test('screenWave unsigned 高位 + 五维 signed 正负极值逐字段精确', () => {
    const fields = parseBattleFields(battleFieldsBytes())
    expect(fields).toEqual([
      {
        id: 0,
        screenWave: 0xffff, // unsigned（不是 -1）
        magicEffect: { wind: 1, thunder: -2, water: 0x7fff, fire: -0x8000, earth: 0 },
      },
      {
        id: 1,
        screenWave: 0x0100,
        magicEffect: { wind: -0x7fff, thunder: 2, water: -3, fire: 100, earth: -100 },
      },
    ])
  })
})
