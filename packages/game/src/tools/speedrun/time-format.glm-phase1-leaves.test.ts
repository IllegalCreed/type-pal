/**
 * 小时格式与负数归零已归主测试和 boundaries，本文件不重复数字变体。
 * 只核文本解析的独立拒绝合同：小时不接受科学计数法；分钟越界不能靠秒守卫挡住。
 */
import { describe, expect, it } from 'vitest'
import { parseHms } from './time-format.js'

describe('L20 time-format 解析拒绝边界', () => {
  it('小时字段拒绝科学计数法，即便 Number 能转换它', () => {
    expect(parseHms('1e2:00:05')).toBeNull()
  })

  it('分钟为 60 且秒合法时仍拒绝', () => {
    expect(parseHms('1:60:00')).toBeNull()
  })
})
