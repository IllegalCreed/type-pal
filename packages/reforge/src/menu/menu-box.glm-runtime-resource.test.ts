/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R11（reforge/menu/menu-box.ts）。
 * 去重账：menu-box.residual 覆盖数字右/左对齐边界、单行卷轴自然宽高（shadow:false 路径）、
 * 确认框位置与互斥高亮；status-residual 覆盖状态板/级联。本文件只做未占用合同：
 * drawSlicedBox 默认阴影路径（离屏镂空 → source-in 染黑 → (x+6,y+6) 半透明贴回）、
 * 中心/四边 tileFill 平铺精确坐标、tile 空缺跳过、drawScroll 零尺寸早退。
 */
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  boxTiles,
  drawHost,
  stubDocumentCanvas,
} from '../__tests__/glm-runtime-resource/menu-draw-fixtures.js'
import { drawScroll, drawSlicedBox } from './menu-box.js'

afterEach(() => vi.unstubAllGlobals())

describe('R11 drawSlicedBox 平铺与阴影', () => {
  test('中心 tileFill 15 块（3 列 × 5 行）逐块坐标 + 裁剪矩形；四角锚位', () => {
    const host = drawHost()
    const tiles = boxTiles()
    drawSlicedBox(host.ctx, tiles, 10, 20, 61, 94, { shadow: false })
    // 中心 16×18，内区 (18,24,44,86)：xx 18/34/50 × yy 24/42/60/78/96
    const center = tiles.tiles[4]!
    const centerDraws = host.drawImage.mock.calls.filter((c: unknown[]) => c[0] === center)
    expect(centerDraws.map((c: unknown[]) => [c[1], c[2]])).toEqual(
      [24, 42, 60, 78, 96].flatMap((y) => [18, 34, 50].map((x) => [x, y])),
    )
    expect(host.rect).toHaveBeenCalledWith(18, 24, 44, 86)
    // 四角：左列锚左、右列锚 rightColX = 10+61-9 = 62
    expect(host.drawImage).toHaveBeenCalledWith(tiles.tiles[0], 10, 20)
    expect(host.drawImage).toHaveBeenCalledWith(tiles.tiles[2], 62, 20)
    expect(host.drawImage).toHaveBeenCalledWith(tiles.tiles[6], 10, 110)
    expect(host.drawImage).toHaveBeenCalledWith(tiles.tiles[8], 62, 110)
  })

  test('缺角块（pop 移除 br）：跳过对应 drawImage 不崩', () => {
    const host = drawHost()
    const tiles = boxTiles()
    const br = tiles.tiles.pop()!
    drawSlicedBox(host.ctx, tiles, 0, 0, 40, 40, { shadow: false })
    expect(host.drawImage).not.toHaveBeenCalledWith(br, expect.anything(), expect.anything())
  })

  test('默认阴影：离屏画布按框宽高+16 建、source-in 染黑、(x+6,y+6) α0.35 贴回', () => {
    const host = drawHost()
    const { created } = stubDocumentCanvas(host)
    const tiles = boxTiles()
    drawSlicedBox(host.ctx, tiles, 10, 20, 61, 94)
    expect(created).toHaveLength(1)
    expect(created[0]!.width).toBe(61 + 16)
    expect(created[0]!.height).toBe(94 + 16)
    expect(host.drawImage).toHaveBeenCalledWith(created[0], 16, 26)
    expect(host.ctx.globalAlpha).toBe(0.35) // 影层半透明；真浏览器由 ctx.restore 复位（录制桩不复位）
  })

  test('drawScroll 零尺寸（空 tiles）早退：零绘制', () => {
    const host = drawHost()
    drawScroll(host.ctx, { tiles: [] }, 5, 5, 3)
    expect(host.drawImage).not.toHaveBeenCalled()
    expect(host.save).not.toHaveBeenCalled()
  })
})
