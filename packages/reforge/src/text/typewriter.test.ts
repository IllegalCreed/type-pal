import { describe, expect, test } from 'vitest'
import { charsShown, DEFAULT_SPEED_MS, isLineDone } from './typewriter.js'

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
