import { describe, expect, test, vi } from 'vitest'
import type { MenuAssets } from '../menu/menu-box.js'
import type { GlyphTable } from '../text/glyph.js'
import {
  drawBattleGrid,
  drawBattleMenuBox,
  drawCurrentFinger,
  drawItemDetailBox,
  drawMpBox,
  drawPlayerTargetArrow,
  ITEM_GRID,
  MAGIC_GRID,
} from './battle-ui.js'

const calls = vi.hoisted(() => ({
  text: vi.fn(),
  number: vi.fn(),
  scroll: vi.fn(),
  box: vi.fn(),
}))
vi.mock('../menu/menu-box.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../menu/menu-box.js')>()
  return {
    ...actual,
    drawNumber: (...args: unknown[]) => calls.number(...args),
    drawScroll: (...args: unknown[]) => calls.scroll(...args),
    drawSlicedBox: (...args: unknown[]) => calls.box(...args),
  }
})
vi.mock('../text/text-render.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../text/text-render.js')>()
  return {
    ...actual,
    renderSpans: (...args: unknown[]) => {
      calls.text(...args)
      return 0
    },
  }
})

function drawHost() {
  const image = (width = 8, height = 8): ImageBitmap => ({ width, height }) as ImageBitmap
  const tile = image()
  const tiles = { tiles: Array.from({ length: 9 }, () => tile) }
  const digits = Array.from({ length: 10 }, () => image(6, 8))
  const menu: MenuAssets = {
    box: tiles,
    statusBg: tile,
    equipSlot: tile,
    scroll: tiles,
    nums: digits,
    avatar: undefined,
    numsBlue: Array.from({ length: 10 }, () => image(6, 8)),
    numsCyan: Array.from({ length: 10 }, () => image(6, 8)),
    slash: image(3, 8),
    itemIcons: {},
    redBox: tiles,
    magicPlayerBox: image(75, 35),
    cursorGrid: image(9, 6),
    cursorUp: image(9, 6),
    cursorUpRed: image(9, 6),
    cursorDown: image(9, 6),
    settleArrow: tile,
    battleIcons: [],
    itembox: tiles,
  }
  const drawImage = vi.fn()
  const ctx = {
    drawImage,
    save: vi.fn(),
    restore: vi.fn(),
    filter: 'none',
  } as unknown as CanvasRenderingContext2D
  const glyphs: GlyphTable = { has: () => false, get: () => undefined }
  for (const spy of Object.values(calls)) spy.mockClear()
  return { menu, ctx, glyphs, drawImage, image }
}

function texts() {
  return calls.text.mock.calls.map((call) => ({
    text: (call[1] as Array<{ text: string }>).map((span) => span.text).join(''),
    x: call[2] as number,
    y: call[3] as number,
    color: (call[4] as { forceRgba: readonly number[] }).forceRgba,
  }))
}

describe('战斗指令菜单布局', () => {
  test('竖排框按给定尺寸绘制，确认、禁用与普通行使用各自颜色', () => {
    const host = drawHost()
    const rows = [
      { label: '使用', right: 3 },
      { label: '投掷', disabled: true, right: 1 },
      { label: '逃跑', right: 2 },
    ]
    const before = structuredClone(rows)
    drawBattleMenuBox(host.ctx, host.menu, host.glyphs, rows, 0, 0, 2, 20, 61, 112, true)
    expect(calls.box).toHaveBeenCalledExactlyOnceWith(host.ctx, host.menu.box, 2, 20, 61, 112)
    expect(texts()).toEqual([
      { text: '使用', x: 16, y: 32, color: [255, 203, 113] },
      { text: '投掷', x: 16, y: 50, color: [166, 40, 32] },
      { text: '逃跑', x: 16, y: 68, color: [199, 186, 174] },
    ])
    expect(calls.number.mock.calls.map((call) => call.slice(1))).toEqual([
      [3, 49, 37, host.menu.nums],
      [1, 49, 55, host.menu.numsBlue],
      [2, 49, 73, host.menu.nums],
    ])
    expect(rows).toEqual(before)
  })

  test('未确认的选中项使用闪烁色，禁用的选中项使用暗红选中色', () => {
    const host = drawHost()
    const rows = [{ label: '使用' }, { label: '投掷', disabled: true }]
    drawBattleMenuBox(host.ctx, host.menu, host.glyphs, rows, 0, 0, 30, 50, 61, 58)
    expect(texts()[0]?.color).toEqual([247, 231, 109])

    calls.text.mockClear()
    drawBattleMenuBox(host.ctx, host.menu, host.glyphs, rows, 1, 0, 30, 50, 61, 58)
    expect(texts()[1]?.color).toEqual([215, 109, 93])
  })

  test('仙术翻页跟随光标；首页物品只对多于一件绘制数量', () => {
    const host = drawHost()
    const rows = Array.from({ length: 20 }, (_, index) => ({
      label: `仙术${index}`,
      disabled: index === 12,
      right: index + 1,
    }))
    drawBattleGrid(host.ctx, host.menu, host.glyphs, rows, 12, 0, MAGIC_GRID)
    expect(texts().map((row) => row.text)).toEqual(rows.slice(6, 20).map((row) => row.label))
    expect(texts().find((row) => row.text === '仙术12')?.color).toEqual([215, 109, 93])
    expect(calls.number).not.toHaveBeenCalled()
    expect(host.drawImage).toHaveBeenCalledWith(host.menu.cursorGrid, 60, 100)

    calls.text.mockClear()
    host.drawImage.mockClear()
    drawBattleGrid(
      host.ctx,
      host.menu,
      host.glyphs,
      [
        { label: '药', right: 1 },
        { label: '符', right: 5 },
      ],
      1,
      0,
      ITEM_GRID,
    )
    expect(texts().map((row) => row.text)).toEqual(['药', '符'])
    expect(calls.number).toHaveBeenCalledExactlyOnceWith(host.ctx, 5, 196, 17, host.menu.numsCyan)
    expect(host.drawImage).toHaveBeenCalledWith(host.menu.cursorGrid, 140, 22)
  })

  test('MP 框、物品详情和两种箭头使用各自锚点与拍频', () => {
    const host = drawHost()
    const icon = host.image(12, 12)
    drawMpBox(host.ctx, host.menu, 8, 35)
    expect(calls.scroll).toHaveBeenCalledExactlyOnceWith(host.ctx, host.menu.scroll, 0, 0, 5)
    expect(calls.number.mock.calls.map((call) => call[1])).toEqual([8, 35])
    expect(host.drawImage).toHaveBeenCalledWith(host.menu.slash, 45, 14)
    drawItemDetailBox(host.ctx, host.menu, icon)
    expect(calls.box).toHaveBeenCalledWith(host.ctx, host.menu.itembox, 0, 140, 64, 64)
    expect(host.drawImage).toHaveBeenCalledWith(icon, 8, 147)

    host.drawImage.mockClear()
    drawCurrentFinger(host.ctx, host.menu, 100, 150, 0)
    drawCurrentFinger(host.ctx, host.menu, 100, 150, 160)
    drawPlayerTargetArrow(host.ctx, host.menu, 180, 170, 0)
    drawPlayerTargetArrow(host.ctx, host.menu, 180, 170, 40)
    expect(host.drawImage.mock.calls).toEqual([
      [host.menu.cursorDown, 92, 76],
      [host.menu.cursorGrid, 92, 76],
      [host.menu.cursorUp, 172, 103],
      [host.menu.cursorUpRed, 172, 103],
    ])
  })

  test('空物品列表只画红框', () => {
    const host = drawHost()
    drawBattleGrid(host.ctx, host.menu, host.glyphs, [], 0, 0, ITEM_GRID)
    expect(calls.box).toHaveBeenCalledExactlyOnceWith(host.ctx, host.menu.redBox, 2, 0, 316, 150)
    expect(texts()).toEqual([])
    expect(calls.number).not.toHaveBeenCalled()
    expect(host.drawImage).not.toHaveBeenCalled()
  })
})
