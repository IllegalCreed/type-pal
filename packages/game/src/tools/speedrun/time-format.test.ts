import { describe, expect, it } from 'vitest'
import { formatClock, formatDiff, formatHms, parseHms } from './time-format.js'

describe('Clock and difference formatting', () => {
  it('formatClock 到厘秒', () => {
    expect(formatClock(0)).toBe('0:00:00.00')
    expect(formatClock(3_661_234)).toBe('1:01:01.23') // 1h1m1s234ms，厘秒截断
  })
  it('formatHms 到秒', () => {
    expect(formatHms(0)).toBe('0:00:00')
    expect(formatHms(3_661_000)).toBe('1:01:01')
  })
  it('formatDiff 带符号', () => {
    expect(formatDiff(-9000)).toBe('-0:09')
    expect(formatDiff(72_000)).toBe('+1:12')
    expect(formatDiff(0)).toBe('0:00')
  })
  it('formatClock 截断厘秒；整分和整小时前后正确进位', () => {
    expect(formatClock(59_995)).toBe('0:00:59.99')
    expect(formatClock(60_000)).toBe('0:01:00.00') // 整分进位
    expect(formatClock(3_599_999)).toBe('0:59:59.99')
    expect(formatClock(3_600_000)).toBe('1:00:00.00')
  })
  it('formatClock 负数归零', () => {
    expect(formatClock(-5)).toBe('0:00:00.00')
  })
  it('formatHms 在整小时边界截断到秒', () => {
    expect(formatHms(3_599_999)).toBe('0:59:59')
    expect(formatHms(3_600_000)).toBe('1:00:00')
  })
  it('formatHms 负数归零', () => {
    expect(formatHms(-5)).toBe('0:00:00')
  })
  it('formatDiff 绝对值截断到整秒，保留不足一秒的负号', () => {
    expect(formatDiff(65_400)).toBe('+1:05')
    expect(formatDiff(-65_400)).toBe('-1:05')
    expect(formatDiff(-999)).toBe('-0:00') // 不足 1 秒截断
  })
})

describe('Time parsing', () => {
  it('parseHms 支持 H:MM:SS 与 M:SS', () => {
    expect(parseHms('1:01:01')).toBe(3_661_000)
    expect(parseHms('2:17:00')).toBe(8_220_000)
    expect(parseHms('5:49')).toBe(349_000)
  })
  it('parseHms 允许段内首尾空白', () => {
    expect(parseHms(' 1 : 05 ')).toBe(65_000) // 段内 trim
  })
  it('parseHms 拒绝负号、空段、非数字、秒越界和错误段数', () => {
    expect(parseHms('bad')).toBeNull()
    expect(parseHms('-1:05')).toBeNull()
    expect(parseHms('1:-05')).toBeNull()
    expect(parseHms('1:')).toBeNull() // 空段
    expect(parseHms(':')).toBeNull()
    expect(parseHms('1:05x')).toBeNull()
    expect(parseHms('1:60')).toBeNull()
    expect(parseHms('1:59:60')).toBeNull()
    expect(parseHms('5')).toBeNull() // 单段
    expect(parseHms('1:2:3:4')).toBeNull() // 四段
  })
  it('parseHms：总毫秒溢出时拒绝，避免工具面板把 Infinity 持久化成 null', () => {
    expect(parseHms(`${'9'.repeat(308)}:59:59`)).toBeNull()
  })
  it('小时字段拒绝科学计数法，即便 Number 能转换它', () => {
    expect(parseHms('1e2:00:05')).toBeNull()
  })
  it('分钟为 60 且秒合法时仍拒绝', () => {
    expect(parseHms('1:60:00')).toBeNull()
  })
})
