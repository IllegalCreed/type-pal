/**
 * TEST-GLM-PHASE1-LEAVES-3 L20（time-format.ts）— 去重表：
 *  - time-format.test（formatClock 厘秒/formatHms 到秒/parseHms 两三种/formatDiff 符号）→ 不重复
 *  - time-format.boundaries.test（59.995 进位/负数归 0/formatDiff 截断/parseHms 拒绝集）→ 不重复
 *  - 新差异：小时位进位（≥1h 的 formatClock/formatHms 手算预期）、formatHms 负数归 0。
 */
import { describe, expect, it } from 'vitest'
import { formatClock, formatHms } from './time-format.js'

describe('L20 time-format 小时位', () => {
  it('formatClock 1h01m01s.23：3661234ms → "1:01:01.23"（手算 3600s+60s+1s+230ms）', () => {
    expect(formatClock(3_661_234)).toBe('1:01:01.23')
  })

  it('formatHms 小时进位与负数归 0', () => {
    expect(formatHms(3_661_000)).toBe('1:01:01')
    expect(formatHms(-5)).toBe('0:00:00')
  })
})
