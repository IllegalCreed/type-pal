import { describe, expect, test } from 'vitest'
import { charsShown, countChars, DEFAULT_SPEED_MS } from './typewriter.js'

describe('charsShown', () => {
  test('默认 24ms/字', () => {
    expect(charsShown(0, DEFAULT_SPEED_MS)).toBe(0)
    expect(charsShown(24, DEFAULT_SPEED_MS)).toBe(1)
    expect(charsShown(100, DEFAULT_SPEED_MS)).toBe(4)
  })
  test('慢速 48ms/字', () => {
    expect(charsShown(96, 48)).toBe(2)
  })
  test('零间隔首帧即可显示整行', () => {
    expect(charsShown(0, 0)).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('countChars', () => {
  test('多 span 求和(忽略 color,只数 text)', () => {
    expect(countChars([{ text: '前' }, { text: '\u{20bb7}', color: 'cyan' }, { text: '后' }])).toBe(
      3,
    )
  })
})
