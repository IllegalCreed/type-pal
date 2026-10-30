import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type GameLanguage, getLanguage, useFallbackLanguage } from '../localization/language.js'
import { getMapName, hasMapName } from './map-names.js'

let previousLanguage: GameLanguage
let previousHtmlLanguage: string | null
beforeEach(() => {
  previousLanguage = getLanguage()
  previousHtmlLanguage = document.documentElement.getAttribute('lang')
  // 只切有效语言，不改持久偏好；实际地名仍由生产 localize 选择。
  useFallbackLanguage('zh-CN')
})
afterEach(() => {
  useFallbackLanguage(previousLanguage)
  if (previousHtmlLanguage === null) document.documentElement.removeAttribute('lang')
  else document.documentElement.setAttribute('lang', previousHtmlLanguage)
})

describe('map-names', () => {
  it('已知地图按当前语言显示，保留零号梦境和考据地名', () => {
    const maps = [0, 1, 23, 25, 119]
    expect(maps.map(getMapName)).toEqual([
      '梦境',
      '盛渔村',
      '苏州城',
      '仙灵岛迷宫（破解后）',
      '仙灵岛桃花林',
    ])
    useFallbackLanguage('en')
    expect(maps.map(getMapName)).toEqual([
      'Dream',
      'Shengyu Village',
      'Suzhou',
      'Fairy Island Maze (solved)',
      'Fairy Island Peach Forest',
    ])
  })

  it('范围内缺名和范围外未知地图都使用当前语言回退', () => {
    expect(getMapName(104)).toBe('地图104')
    expect(getMapName(9999)).toBe('地图9999')
    useFallbackLanguage('en')
    expect(getMapName(104)).toBe('Map 104')
    expect(getMapName(9999)).toBe('Map 9999')
  })

  it('hasMapName 按考据表成员判断，语言与回退标签不改变成员关系', () => {
    const maps = [0, 1, 119, 104, 9999]
    expect(maps.map(hasMapName)).toEqual([true, true, true, false, false])
    useFallbackLanguage('en')
    expect(maps.map(hasMapName)).toEqual([true, true, true, false, false])
  })
})
