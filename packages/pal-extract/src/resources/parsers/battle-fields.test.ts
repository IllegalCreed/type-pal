/** Battlefield unsigned wave, signed elemental fields, input views and record size. */
import { describe, expect, test } from 'vitest'
import { battleFieldsBytes } from '../../__tests__/table-records.js'
import { parseBattleFields } from './battle-fields.js'

describe('unsigned wave and signed elemental fields', () => {
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

describe('input views and record sizes', () => {
  test('大缓冲奇数偏移 subarray：两条战场记录逐字段精确', () => {
    const bytes = battleFieldsBytes()
    const parent = new Uint8Array(11 + bytes.length)
    parent.fill(0x55)
    parent.set(bytes, 11)
    const expected = [
      {
        id: 0,
        screenWave: 0xffff,
        magicEffect: { wind: 1, thunder: -2, water: 0x7fff, fire: -0x8000, earth: 0 },
      },
      {
        id: 1,
        screenWave: 0x0100,
        magicEffect: { wind: -0x7fff, thunder: 2, water: -3, fire: 100, earth: -100 },
      },
    ]
    expect(parseBattleFields(parent.subarray(11))).toEqual(expected)
    expect(parseBattleFields(bytes)).toEqual(expected)
  })

  test('parseBattleFields：尺寸不整除精确拒绝', () => {
    expect(() => parseBattleFields(new Uint8Array(7))).toThrow(
      'parseBattleFields: DATA.MKF chunk 5 size 7 不能被 FIELD_RECORD_SIZE=12 整除',
    )
  })
})
