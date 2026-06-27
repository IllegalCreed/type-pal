import { describe, expect, test } from 'vitest'
import { charsShown, countChars, DEFAULT_SPEED_MS, isLineDone } from './typewriter.js'

describe('charsShown', () => {
  test('默认 24ms/字', () => {
    expect(charsShown(0, DEFAULT_SPEED_MS)).toBe(0)
    expect(charsShown(24, DEFAULT_SPEED_MS)).toBe(1)
    expect(charsShown(100, DEFAULT_SPEED_MS)).toBe(4)
  })
  test('慢速 48ms/字', () => {
    expect(charsShown(96, 48)).toBe(2)
  })
})

describe('isLineDone', () => {
  test('全字显示前 = 未完成', () => {
    expect(isLineDone(24, 24, 5)).toBe(false) // 才 1/5 字
  })
  test('全字显示后(无 autoAdvance)= 完成', () => {
    expect(isLineDone(5 * 24, 24, 5)).toBe(true)
  })
  test('有 autoAdvance:全字后还要再等', () => {
    expect(isLineDone(5 * 24, 24, 5, 300)).toBe(false) // 字打完但没过尾停顿
    expect(isLineDone(5 * 24 + 300, 24, 5, 300)).toBe(true)
  })
})

describe('countChars', () => {
  test('单 span = 其字符数', () => {
    expect(countChars([{ text: '你好世界' }])).toBe(4)
  })
  test('多 span 求和(忽略 color,只数 text)', () => {
    expect(countChars([{ text: '前' }, { text: '中', color: 'cyan' }, { text: '后' }])).toBe(3)
  })
})
