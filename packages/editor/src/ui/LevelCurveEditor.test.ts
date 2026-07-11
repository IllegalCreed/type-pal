import { describe, expect, test } from 'vitest'
import { genExpTable, isNonDecreasing, resizeExpTable } from './LevelCurveEditor.js'

describe('C6 升级曲线编辑器助手', () => {
  test('genExpTable:table[0]=0,每级需求 first+step×(i−1) 向后累计', () => {
    // first=15, step=25:需求 15,40,65 → 累计 [0,15,55,120]
    expect(genExpTable(15, 25, 4)).toEqual([0, 15, 55, 120])
    expect(genExpTable(10, 0, 3)).toEqual([0, 10, 20]) // 零递增 = 等差累计
  })
  test('resizeExpTable:加长按末段增量外推,缩短截断', () => {
    expect(resizeExpTable([0, 15, 55], 5)).toEqual([0, 15, 55, 95, 135]) // Δ40 外推
    expect(resizeExpTable([0, 15, 55], 2)).toEqual([0, 15])
    expect(resizeExpTable([7], 3)).toEqual([7, 14, 21]) // 无末段增量 → +首值
  })
  test('isNonDecreasing:回落检出', () => {
    expect(isNonDecreasing([0, 15, 55])).toBe(true)
    expect(isNonDecreasing([0, 55, 15])).toBe(false)
  })
})
