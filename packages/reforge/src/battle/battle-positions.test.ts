import { describe, expect, test } from 'vitest'
import { getEnemyBasePos, getPlayerBasePos } from './battle-positions.js'

describe('战斗精灵底锚坐标', () => {
  test('一至三人编队沿用原盘队员站位表，越界槽没有底锚', () => {
    // SDLPal battle.c:27–31 g_rgPlayerPos。
    const originalLayouts = [
      [{ x: 240, y: 170 }],
      [
        { x: 200, y: 176 },
        { x: 256, y: 152 },
      ],
      [
        { x: 180, y: 180 },
        { x: 234, y: 170 },
        { x: 270, y: 146 },
      ],
    ]
    for (const layout of originalLayouts) {
      expect(layout.map((_, slot) => getPlayerBasePos(layout.length, slot))).toEqual(layout)
      expect(getPlayerBasePos(layout.length, layout.length)).toBeUndefined()
    }
    expect(getPlayerBasePos(0, 0)).toBeUndefined()
  })

  test('扩展编队有第四和第五站位，超过五人仍使用五人表', () => {
    // 扩展站位由 Reforge 定义，原盘只有前三档。
    expect(getPlayerBasePos(4, 3)).toEqual({ x: 280, y: 130 })
    expect(getPlayerBasePos(4, 4)).toBeUndefined()
    expect(getPlayerBasePos(5, 4)).toEqual({ x: 290, y: 110 })
    expect(getPlayerBasePos(6, 4)).toEqual({ x: 290, y: 110 })
    expect(getPlayerBasePos(6, 5)).toBeUndefined()
  })

  test('敌方只偏移纵坐标，越界返回空，超出最大编队取第五档', () => {
    expect(getEnemyBasePos(5, 3, 30)).toEqual({ x: 30, y: 140 })
    expect(getEnemyBasePos(5, 3, -4)).toEqual({ x: 30, y: 106 })
    expect(getEnemyBasePos(5, 5)).toBeUndefined()
    expect(getEnemyBasePos(0, 0)).toBeUndefined()
    expect(getEnemyBasePos(6, 4)).toEqual({ x: 90, y: 80 })
  })

  test('各敌方编队按原盘槽序取独立站位', () => {
    // DATA.MKF 第 13 块，按 SDLPal battle.c:936–937 读取槽号和阵容行。
    const originalLayouts = [
      [{ x: 100, y: 110 }],
      [
        { x: 70, y: 130 },
        { x: 140, y: 106 },
      ],
      [
        { x: 70, y: 140 },
        { x: 100, y: 110 },
        { x: 160, y: 100 },
      ],
      [
        { x: 70, y: 140 },
        { x: 100, y: 110 },
        { x: 160, y: 100 },
        { x: 50, y: 100 },
      ],
      [
        { x: 70, y: 140 },
        { x: 100, y: 110 },
        { x: 160, y: 100 },
        { x: 30, y: 110 },
        { x: 90, y: 80 },
      ],
    ]
    for (const layout of originalLayouts) {
      expect(layout.map((_, slot) => getEnemyBasePos(layout.length, slot))).toEqual(layout)
    }
  })
})
