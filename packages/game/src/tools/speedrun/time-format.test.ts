import { describe, expect, it } from 'vitest'
import { formatClock, formatDiff, formatHms, parseHms } from './time-format.js'

describe('time-format', () => {
  it('formatClock 到厘秒', () => {
    expect(formatClock(0)).toBe('0:00:00.00')
    expect(formatClock(3_661_420)).toBe('1:01:01.42') // 1h1m1s420ms
  })
  it('formatHms 到秒', () => {
    expect(formatHms(0)).toBe('0:00:00')
    expect(formatHms(3_661_000)).toBe('1:01:01')
  })
  it('parseHms 支持 H:MM:SS 与 M:SS', () => {
    expect(parseHms('1:01:01')).toBe(3_661_000)
    expect(parseHms('2:17:00')).toBe(8_220_000)
    expect(parseHms('5:49')).toBe(349_000)
    expect(parseHms('bad')).toBeNull()
    expect(parseHms('1:99:99')).toBeNull()
  })
  it('formatDiff 带符号', () => {
    expect(formatDiff(-9000)).toBe('-0:09')
    expect(formatDiff(72_000)).toBe('+1:12')
    expect(formatDiff(0)).toBe('0:00')
  })
})
