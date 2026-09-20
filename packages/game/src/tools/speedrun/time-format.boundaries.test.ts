/**
 * TEST-GAME-HOST-BOUNDARIES-1 H08：time-format 边界（tools/speedrun/time-format.ts）。
 * 既有 time-format.test 已覆盖常规格式化/解析——不重复。本文件：59→60 进位、负数归 0、
 * formatDiff 符号与截断、parseHms 负数文本/空白/空段/非数字/分秒 60 拒绝。
 */
import { describe, expect, it } from 'vitest'
import { formatClock, formatDiff, formatHms, parseHms } from './time-format.js'

describe('H08 进位与符号边界', () => {
  it('59.995s 进位到 60 秒；负数归 0；formatHms 同步', () => {
    expect(formatClock(59_995)).toBe('0:00:59.99')
    expect(formatClock(60_000)).toBe('0:01:00.00') // 整分进位
    expect(formatClock(3_599_999)).toBe('0:59:59.99')
    expect(formatClock(3_600_000)).toBe('1:00:00.00')
    expect(formatClock(-5)).toBe('0:00:00.00')
    expect(formatHms(-1)).toBe('0:00:00')
    expect(formatHms(3_600_000)).toBe('1:00:00')
  })
  it('formatDiff：正/负号、0 无符号、绝对值截断到整秒', () => {
    expect(formatDiff(0)).toBe('0:00')
    expect(formatDiff(65_400)).toBe('+1:05')
    expect(formatDiff(-65_400)).toBe('-1:05')
    expect(formatDiff(-999)).toBe('-0:00') // 不足 1 秒截断
  })
  it('parseHms：2/3 段合法；负号/空白段/非数字/分秒 60/单段全拒绝', () => {
    expect(parseHms('1:05')).toBe(65_000)
    expect(parseHms('1:02:03')).toBe(3_723_000)
    expect(parseHms(' 1 : 05 ')).toBe(65_000) // 段内 trim
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
})
