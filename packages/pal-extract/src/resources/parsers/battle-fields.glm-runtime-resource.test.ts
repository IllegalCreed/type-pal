/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R08（parsers/battle-fields.ts）。
 * tables.test核原盘完整字段；battle-fields.boundaries（PAL-TABLES P06）
 * 覆盖两 12B 记录完整对象（unsigned 高位 screenWave + 五维 signed 极值）。
 * 本文件核奇数偏移subarray隔离与7B尺寸拒绝的精确错误。
 */
import { describe, expect, test } from 'vitest'
import { battleFieldsBytes } from '../../__tests__/glm-tb04-fixtures.js'
import { parseBattleFields } from './battle-fields.js'

describe('R08 parseBattleFields subarray 隔离', () => {
  test('大缓冲奇数偏移 subarray：与独立缓冲全等（12B 记录 × 2）', () => {
    const bc = battleFieldsBytes()
    const parent = new Uint8Array(11 + bc.length)
    parent.fill(0x55)
    parent.set(bc, 11)
    expect(parseBattleFields(parent.subarray(11))).toEqual(parseBattleFields(bc))
  })
})

test('parseBattleFields：尺寸不整除精确拒绝', () => {
  expect(() => parseBattleFields(new Uint8Array(7))).toThrow(
    'parseBattleFields: DATA.MKF chunk 5 size 7 不能被 FIELD_RECORD_SIZE=12 整除',
  )
})
