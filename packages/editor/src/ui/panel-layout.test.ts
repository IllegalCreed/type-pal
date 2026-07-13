import { describe, expect, test } from 'vitest'
import { clampPanelSize, fitSidePanelWidths } from './panel-layout.js'

describe('clampPanelSize', () => {
  test('把尺寸限制在允许范围内', () => {
    expect(clampPanelSize(80, 120, 400)).toBe(120)
    expect(clampPanelSize(260.4, 120, 400)).toBe(260)
    expect(clampPanelSize(900, 120, 400)).toBe(400)
  })

  test('无效值和反向范围退回最小值', () => {
    expect(clampPanelSize(Number.NaN, 120, 400)).toBe(120)
    expect(clampPanelSize(200, 320, 180)).toBe(320)
  })
})

describe('fitSidePanelWidths', () => {
  test('空间充足时保持用户尺寸', () => {
    expect(
      fitSidePanelWidths({ available: 800, left: 220, right: 340, leftMin: 140, rightMin: 220 }),
    ).toEqual({ left: 220, right: 340 })
  })

  test('空间收窄时保留中间工作区并按余量压缩两侧', () => {
    expect(
      fitSidePanelWidths({ available: 440, left: 220, right: 340, leftMin: 140, rightMin: 220 }),
    ).toEqual({ left: 172, right: 268 })
  })

  test('极窄空间按两侧最小宽度比例退让', () => {
    expect(
      fitSidePanelWidths({ available: 180, left: 220, right: 340, leftMin: 140, rightMin: 220 }),
    ).toEqual({ left: 70, right: 110 })
  })
})
