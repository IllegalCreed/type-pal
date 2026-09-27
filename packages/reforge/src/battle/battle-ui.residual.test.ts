import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { MenuAssets } from '../menu/menu-box.js'
import type { GlyphTable } from '../text/glyph.js'
import {
  drawBattleGrid,
  drawBattleMenuBox,
  drawCurrentFinger,
  drawItemDetailBox,
  drawMainIcons,
  drawMpBox,
  drawPlayerInfoBox,
  drawPlayerTargetArrow,
  ITEM_GRID,
  MAGIC_GRID,
} from './battle-ui.js'

afterEach(() => vi.unstubAllGlobals())

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

describe('当前 Reforge 战斗菜单绘制命令', () => {
  test('一人/三人信息框按站位绘制 HP/MP 与活人坏状态；死者不画状态字', () => {
    const host = drawHost()
    const palette: Palette = {
      colors: Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]),
      cycles: [],
    }
    palette.colors[0x5f] = [1, 2, 3]
    palette.colors[0x0e] = [4, 5, 6]
    const player = {
      roleId: 'hero',
      hp: 45,
      maxHp: 120,
      mp: 8,
      maxMp: 35,
      status: { confused: 2, sleep: 1 },
    }
    const before = structuredClone(player)
    drawPlayerInfoBox(host.ctx, host.menu, undefined, player, 0, host.glyphs, palette)
    expect(host.drawImage).toHaveBeenCalledWith(host.menu.magicPlayerBox, 91, 165)
    expect(host.drawImage).toHaveBeenCalledWith(host.menu.slash, 140, 171)
    expect(host.drawImage).toHaveBeenCalledWith(host.menu.slash, 140, 187)
    expect(calls.number.mock.calls.map((call) => [call[1], call[2], call[3]])).toEqual([
      [45, 141, 170],
      [120, 162, 173],
      [8, 141, 186],
      [35, 162, 189],
    ])
    expect(texts()).toEqual([
      { text: '乱', x: 126, y: 184, color: [1, 2, 3] },
      { text: '眠', x: 145, y: 166, color: [4, 5, 6] },
    ])
    expect(player).toEqual(before)

    calls.text.mockClear()
    drawPlayerInfoBox(host.ctx, host.menu, undefined, { ...player, hp: 0 }, 2, host.glyphs, palette)
    expect(host.drawImage).toHaveBeenCalledWith(host.menu.magicPlayerBox, 245, 165)
    expect(texts()).toEqual([])
  })

  test('竖排菜单固定框宽，禁用与确认选中的字色、右侧数量分别派发', () => {
    const host = drawHost()
    const rows = [
      { label: '使用', right: 3 },
      { label: '投掷', disabled: true, right: 1 },
      { label: '逃跑', right: 2 },
    ]
    expect(
      drawBattleMenuBox(host.ctx, host.menu, host.glyphs, rows, 0, 0, 2, 20, 64, 96, true),
    ).toBe(64)
    expect(calls.box).toHaveBeenCalledExactlyOnceWith(host.ctx, host.menu.box, 2, 20, 64, 96)
    expect(texts()).toEqual([
      { text: '使用', x: 16, y: 32, color: [255, 203, 113] },
      { text: '投掷', x: 16, y: 50, color: [166, 40, 32] },
      { text: '逃跑', x: 16, y: 68, color: [199, 186, 174] },
    ])
    expect(calls.number.mock.calls.map((call) => call[1])).toEqual([3, 1, 2])
    expect(rows).toEqual([
      { label: '使用', right: 3 },
      { label: '投掷', disabled: true, right: 1 },
      { label: '逃跑', right: 2 },
    ])
  })

  test('网格按三列翻页且保留实际物品数量；1 件不显示多余数字', () => {
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
    expect(calls.number.mock.calls.map((call) => call[1])).toEqual([5])
    expect(host.drawImage).toHaveBeenCalledWith(host.menu.cursorGrid, 140, 22)
  })

  test('MP/物品详情与两种箭头使用不同锚和拍频，不从项目色盘重染', () => {
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

  test('四主图标选中保原图，可用灰/不可用暗红；同图缓存而换图重烤', () => {
    const host = drawHost()
    type Scratch = { width: number; height: number; pixels?: number[]; getContext: () => object }
    const generated: Scratch[] = []
    vi.stubGlobal('document', {
      createElement(tag: string) {
        expect(tag).toBe('canvas')
        const canvas: Scratch = {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: vi.fn(),
            getImageData: () => ({
              data: new Uint8ClampedArray([200, 150, 100, 255, 0, 0, 0, 0]),
            }),
            putImageData: (img: { data: Uint8ClampedArray }) => {
              canvas.pixels = [...img.data]
            },
          }),
        }
        generated.push(canvas)
        return canvas
      },
    })
    const icons = Array.from({ length: 4 }, () => host.image(2, 1))
    drawMainIcons(host.ctx, icons, 0, [true, true, false, true], true)
    expect(host.drawImage.mock.calls.map(([image, x, y]) => [image, x, y])).toEqual([
      [icons[0], 27, 140],
      [generated[0], 0, 155],
      [generated[1], 54, 155],
      [generated[2], 27, 170],
    ])
    expect(generated[0]?.pixels).toEqual([89, 89, 89, 255, 0, 0, 0, 0])
    expect(generated[1]?.pixels).toEqual([121, 16, 12, 255, 0, 0, 0, 0])
    expect(generated[2]?.pixels).toEqual(generated[0]?.pixels)

    host.drawImage.mockClear()
    drawMainIcons(host.ctx, icons, 0, [true, true, false, true], true)
    expect(generated).toHaveLength(3)
    expect(host.drawImage).toHaveBeenCalledWith(generated[1], 54, 155)

    const replacement = host.image(2, 1)
    drawMainIcons(
      host.ctx,
      [icons[0], icons[1], replacement, icons[3]],
      0,
      [true, true, false, true],
      true,
    )
    expect(generated).toHaveLength(4)
    expect(generated[3]?.pixels).toEqual([121, 16, 12, 255, 0, 0, 0, 0])
  })
})
