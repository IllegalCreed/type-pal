/**
 * TEST-GAME-HOST-BOUNDARIES-1 H08：time-format 边界（tools/speedrun/time-format.ts）。
 * 主测试负责正常格式；本文件分别核截断/进位、负数归零、差值与解析边界。
 * 分钟越界但秒合法、科学计数法拒绝由 leaves 文件独立核对，避免一个守卫掩盖另一个。
 */
import { describe, expect, it } from 'vitest'
import { formatClock, formatDiff, formatHms, parseHms } from './time-format.js'

describe('H08 进位与符号边界', () => {
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
})
