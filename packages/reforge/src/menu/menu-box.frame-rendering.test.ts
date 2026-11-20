import { afterEach, describe, expect, test, vi } from 'vitest'
import { boxTiles, drawHost } from '../__tests__/glm-runtime-resource/menu-draw-fixtures.js'
import { drawScroll, drawSlicedBox } from './menu-box.js'

afterEach(() => vi.unstubAllGlobals())

describe('九宫格框与卷轴', () => {
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

  test('缺少右下角块时保留其他三个角与中央平铺', () => {
    const host = drawHost()
    const tiles = boxTiles()
    tiles.tiles.pop()
    drawSlicedBox(host.ctx, tiles, 0, 0, 40, 40, { shadow: false })
    expect(host.drawImage.mock.calls.slice(-3)).toEqual([
      [tiles.tiles[0], 0, 0],
      [tiles.tiles[2], 31, 0],
      [tiles.tiles[6], 0, 36],
    ])
    expect(host.drawImage).toHaveBeenCalledWith(tiles.tiles[4], 8, 4)
    expect(host.drawImage.mock.calls.filter(([, x, y]) => x === 31 && y === 36)).toEqual([])
  })

  test('默认阴影：离屏画布按框宽高+16 建、source-in 染黑、(x+6,y+6) α0.35 贴回', () => {
    const host = drawHost()
    const stencil = drawHost()
    const surface = { width: 0, height: 0, getContext: () => stencil.ctx }
    const createElement = vi.fn(() => surface)
    const fillStencil = vi.fn()
    const compositeAlpha = vi.fn()
    stencil.fillRect.mockImplementation((...rect: unknown[]) => {
      fillStencil(rect, stencil.ctx.globalCompositeOperation, stencil.ctx.fillStyle)
    })
    host.drawImage.mockImplementation((bitmap, x, y) => {
      if (bitmap === surface) compositeAlpha(x, y, host.ctx.globalAlpha)
    })
    vi.stubGlobal('document', { createElement })
    drawSlicedBox(host.ctx, boxTiles(), 10, 20, 61, 94)
    expect(createElement).toHaveBeenCalledExactlyOnceWith('canvas')
    expect([surface.width, surface.height]).toEqual([77, 110])
    expect(fillStencil).toHaveBeenCalledExactlyOnceWith([0, 0, 77, 110], 'source-in', '#000')
    expect(compositeAlpha).toHaveBeenCalledExactlyOnceWith(16, 26, 0.35)
    expect(host.save.mock.invocationCallOrder[0]).toBeLessThan(
      compositeAlpha.mock.invocationCallOrder[0] ?? 0,
    )
    expect(host.restore.mock.invocationCallOrder[0]).toBeGreaterThan(
      compositeAlpha.mock.invocationCallOrder[0] ?? 0,
    )
  })

  test('drawScroll 零尺寸（空 tiles）早退：零绘制', () => {
    const host = drawHost()
    const createElement = vi.fn()
    vi.stubGlobal('document', { createElement })
    drawScroll(host.ctx, { tiles: [] }, 5, 5, 3)
    expect(createElement).not.toHaveBeenCalled()
    expect(host.drawImage).not.toHaveBeenCalled()
    expect(host.save).not.toHaveBeenCalled()
  })

  test('框小于边块合计时只在主画布绘制阴影和四角', () => {
    const host = drawHost()
    const { tiles } = boxTiles()
    const stencil = drawHost()
    const surface = { width: 0, height: 0, getContext: () => stencil.ctx }
    vi.stubGlobal('document', { createElement: () => surface })
    drawSlicedBox(host.ctx, { tiles }, 0, 0, 4, 4)
    expect(host.drawImage.mock.calls).toEqual([
      [surface, 6, 6],
      [tiles[0], 0, 0],
      [tiles[2], -5, 0],
      [tiles[6], 0, 0],
      [tiles[8], -5, 0],
    ])
  })

  test('离屏阴影上下文不可用时仍完整绘制框', () => {
    const host = drawHost()
    const { tiles } = boxTiles()
    const surface = { width: 0, height: 0, getContext: vi.fn(() => null) }
    vi.stubGlobal('document', { createElement: () => surface })
    drawSlicedBox(host.ctx, { tiles }, 0, 0, 61, 94)
    expect(surface.getContext).toHaveBeenCalledExactlyOnceWith('2d')
    expect(host.drawImage).not.toHaveBeenCalledWith(surface, 6, 6)
    expect(host.drawImage).toHaveBeenCalledWith(tiles[4], 8, 4)
    expect(host.drawImage.mock.calls.slice(-4)).toEqual([
      [tiles[0], 0, 0],
      [tiles[2], 52, 0],
      [tiles[6], 0, 90],
      [tiles[8], 52, 90],
    ])
  })

  test('卷轴按中段数量求尺寸，关闭阴影时右角仍伸出框缘', () => {
    const host = drawHost()
    const { tiles } = boxTiles()
    const createElement = vi.fn()
    vi.stubGlobal('document', { createElement })
    drawScroll(host.ctx, { tiles }, 10, 20, 2, { shadow: false })
    expect(host.rect).toHaveBeenCalledWith(18, 24, 32, 18)
    expect(host.drawImage.mock.calls.slice(-4)).toEqual([
      [tiles[0], 10, 20],
      [tiles[2], 50, 20],
      [tiles[6], 10, 42],
      [tiles[8], 50, 42],
    ])
    expect(createElement).not.toHaveBeenCalled()
  })
})
