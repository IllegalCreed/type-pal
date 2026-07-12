import { describe, expect, test } from 'vitest'
import { narrationScrollLayout, narrationTextUnits } from './narration-scroll.js'

describe('narrationScrollLayout', () => {
  test('全角获得提示按文字宽度居中展开横向卷轴', () => {
    expect(narrationTextUnits('获得净衣符')).toBe(10)
    expect(narrationScrollLayout('获得净衣符')).toEqual({
      boxX: 120,
      boxY: 40,
      boxLen: 5,
      textX: 128,
      textY: 50,
    })
  })

  test('半角字符参与奇偶补偿，文字仍落在原版单行框坐标', () => {
    expect(narrationTextUnits('获得2个')).toBe(7)
    expect(narrationScrollLayout('获得2个')).toEqual({
      boxX: 132,
      boxY: 40,
      boxLen: 4,
      textX: 144,
      textY: 50,
    })
  })
})
