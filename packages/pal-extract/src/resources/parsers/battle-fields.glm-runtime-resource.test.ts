/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R08（parsers/battle-fields.ts）。
 * 去重账：tables.test 覆盖真实规模/shape/0xFFFF→-1/截断；battle-fields.boundaries（PAL-TABLES P06）
 * 覆盖两 12B 记录完整对象（unsigned 高位 screenWave + 五维 signed 极值）。
 * 本文件只做未占用合同：奇数偏移 subarray 隔离（DataView byteOffset 传播）。
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
