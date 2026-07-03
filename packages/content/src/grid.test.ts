import { describe, expect, test } from 'vitest'
import { type GridPos, gridToPixel, pixelDeltaToGridDelta, pixelToGrid, spriteScreenY } from './grid.js'

describe('pixelDeltaToGridDelta(碎步增量,不取整)', () => {
  test('开场锅挥动 walkStep (+4,+2)px = (+0.25, 0) 格 —— round 版会吞成 0', () => {
    expect(pixelDeltaToGridDelta(4, 2)).toEqual({ dcol: 0.25, drow: 0 })
    expect(pixelDeltaToGridDelta(-4, -2)).toEqual({ dcol: -0.25, drow: 0 })
  })
  test('四步累积 = 整格(与原版 16,8px = 1 col 对齐)', () => {
    const d = pixelDeltaToGridDelta(4, 2)
    expect(d.dcol * 4).toBe(1)
  })
  test('纯 y 位移 → col/row 各半(iso 轴)', () => {
    expect(pixelDeltaToGridDelta(0, 8)).toEqual({ dcol: 0.5, drow: 0.5 })
  })
  test('与 gridToPixel 互逆(任意增量往返)', () => {
    const { dcol, drow } = pixelDeltaToGridDelta(7, -3)
    expect(16 * (dcol - drow)).toBeCloseTo(7)
    expect(8 * (dcol + drow)).toBeCloseTo(-3)
  })
})

describe('grid 坐标(菱形轴)', () => {
  test('格 → 像素 = (16(col−row), 8(col+row))', () => {
    expect(gridToPixel({ col: 90, row: 14, height: 0 })).toEqual({ x: 1216, y: 832 })
    expect(gridToPixel({ col: 91, row: 14, height: 0 })).toEqual({ x: 1232, y: 840 }) // 仅 col+1
  })

  test('像素 → 格(唯一反解,站位必得整数)', () => {
    expect(pixelToGrid(1216, 832)).toEqual({ col: 90, row: 14 })
    expect(pixelToGrid(1232, 840)).toEqual({ col: 91, row: 14 })
  })

  test('height 不影响平面投影(独立轴)', () => {
    expect(gridToPixel({ col: 90, row: 14, height: 5 })).toEqual(
      gridToPixel({ col: 90, row: 14, height: 0 }),
    )
  })

  test('走一格 = 单轴 ±1(四方向各一个轴,绝不对角)', () => {
    // 从 (1216,832) = 格(90,14) 四方向各走一步,只动一个轴:
    expect(pixelToGrid(1216 + 16, 832 + 8)).toEqual({ col: 91, row: 14 }) // 右下 col+1
    expect(pixelToGrid(1216 - 16, 832 - 8)).toEqual({ col: 89, row: 14 }) // 左上 col−1
    expect(pixelToGrid(1216 - 16, 832 + 8)).toEqual({ col: 90, row: 15 }) // 左下 row+1
    expect(pixelToGrid(1216 + 16, 832 - 8)).toEqual({ col: 90, row: 13 }) // 右上 row−1
  })

  test('任意整数 (col,row) 都合法(无 col+row 偶约束)', () => {
    const cases: GridPos[] = [
      { col: 90, row: 14, height: 0 },
      { col: 91, row: 14, height: 0 }, // col+row 奇
      { col: 90, row: 15, height: 0 }, // col+row 奇
      { col: 0, row: 1, height: 0 },
    ]
    for (const p of cases) {
      const px = gridToPixel(p)
      const back = pixelToGrid(px.x, px.y)
      expect(back).toEqual({ col: p.col, row: p.row })
    }
  })
})

describe('spriteScreenY(height 显示上移)', () => {
  test('地面(height=0)→ 与 gridToPixel().y 相同', () => {
    const ground: GridPos = { col: 90, row: 14, height: 0 }
    expect(spriteScreenY(ground)).toBe(gridToPixel(ground).y)
  })

  test('height 每级上移 16px(= 对角格 (col−h,row−h) 的屏幕 y)', () => {
    for (let h = 1; h <= 3; h++) {
      const flying: GridPos = { col: 90, row: 14, height: h }
      const diagCell: GridPos = { col: 90 - h, row: 14 - h, height: 0 }
      expect(spriteScreenY(flying)).toBe(gridToPixel(diagCell).y)
    }
  })
})
