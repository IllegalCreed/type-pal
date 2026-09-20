/**
 * TEST-PAL-TABLES-COVERAGE-1 P08：data-misc 三表完整数组（parsers/data-misc.ts）。
 * 既有 data-misc.test 已覆盖 shape/计数/截断/magic=0 保留/roleCount=0——不重复。
 * 本文件：100 经验、20×5×2 学习表、20 效果 WORD 的完整数组逐项精确（entry 与 role 非对称），
 * 以及非零 byteOffset 输入视图。
 */
import { describe, expect, test } from 'vitest'
import {
  battleEffectBytes,
  concatBytes,
  levelUpExpBytes,
  levelUpMagicBytes,
} from '../../../__tests__/glm-tb04-fixtures.js'
import { parseBattleEffectIndex, parseLevelUpExp, parseLevelUpMagic } from '../data-misc.js'

describe('P08 data-misc 完整数组与非零偏移', () => {
  test('经验表 100 WORD 逐项精确（值 = i*3+1）', () => {
    const exp = parseLevelUpExp(levelUpExpBytes())
    expect(exp).toHaveLength(100)
    for (let i = 0; i < 100; i++) expect(exp[i]).toBe(i * 3 + 1)
  })
  test('学习表 20×5：level=e*5+r+1 / magic=e*7+r+2（entry 与 role 双向非对称，转置即红）', () => {
    const table = parseLevelUpMagic(levelUpMagicBytes(), 5)
    expect(table).toHaveLength(20)
    for (let e = 0; e < 20; e++) {
      expect(table[e]).toHaveLength(5)
      for (let r = 0; r < 5; r++) {
        expect(table[e]![r]).toEqual({ level: e * 5 + r + 1, magic: e * 7 + r + 2 })
      }
    }
  })
  test('效果索引 20 WORD 逐项精确；三个输入均支持非零 byteOffset 视图', () => {
    const effects = parseBattleEffectIndex(battleEffectBytes())
    expect(effects).toHaveLength(20)
    for (let i = 0; i < 20; i++) expect(effects[i]).toBe(i * 5 + 3)
    const pad = new Uint8Array(4)
    expect(parseLevelUpExp(concatBytes([pad, levelUpExpBytes()]).subarray(4))[99]).toBe(298)
    const magicView = concatBytes([pad, levelUpMagicBytes()]).subarray(4)
    expect(parseLevelUpMagic(magicView, 5)[19]![4]).toEqual({ level: 100, magic: 139 })
    expect(parseBattleEffectIndex(concatBytes([pad, battleEffectBytes()]).subarray(4))[19]).toBe(98)
  })
})
