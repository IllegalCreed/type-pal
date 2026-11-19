import { describe, expect, test } from 'vitest'
import { mapNameFromSourceNumber } from './pal-map-names.js'

describe('PAL 地图发布标题', () => {
  test('沿用已考证的地图标题，并为两张实际未命名地图保留编号', () => {
    expect(mapNameFromSourceNumber(1)).toBe('盛渔村')
    expect(mapNameFromSourceNumber(23)).toBe('苏州城')
    expect(mapNameFromSourceNumber(174)).toBe('女娲神庙外雨季')
    expect(mapNameFromSourceNumber(225)).toBe('试炼窟遗迹')
    expect(mapNameFromSourceNumber(104)).toBe('PAL 地图 104')
    expect(mapNameFromSourceNumber(164)).toBe('PAL 地图 164')
  })

  test('分别拒绝非法编号和缺考据标题的合法编号', () => {
    expect(() => mapNameFromSourceNumber(0)).toThrow('正整数')
    expect(() => mapNameFromSourceNumber(-1)).toThrow('正整数')
    expect(() => mapNameFromSourceNumber(1.5)).toThrow('正整数')
    expect(() => mapNameFromSourceNumber(999)).toThrow('PAL 地图 999 缺少一阶段考据名称')
  })
})
