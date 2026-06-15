import { describe, expect, it } from 'vitest'
import { getMapName, hasMapName } from './map-names.js'

describe('map-names', () => {
  it('已知地图返回考据地名', () => {
    expect(getMapName(1)).toBe('盛渔村')
    expect(getMapName(23)).toBe('苏州城')
    expect(getMapName(25)).toBe('仙灵岛迷宫（破解后）')
    expect(getMapName(119)).toBe('仙灵岛桃花林')
  })
  it('未知地图回退 地图N', () => {
    expect(getMapName(9999)).toBe('地图9999')
    expect(getMapName(0)).toBe('地图0')
  })
  it('hasMapName 区分已知/未知', () => {
    expect(hasMapName(1)).toBe(true)
    expect(hasMapName(119)).toBe(true)
    expect(hasMapName(9999)).toBe(false)
    expect(hasMapName(0)).toBe(false)
  })
})
