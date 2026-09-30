// @vitest-environment jsdom
import type { Palette } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { MenuAssets } from '../menu/menu-box.js'
import type { GlyphTable } from '../text/glyph.js'
import {
  drawBattleGrid,
  drawBattleMenuBox,
  drawMainIcons,
  drawPlayerInfoBox,
  ITEM_GRID,
} from './battle-ui.js'

interface SpanStyle {
  glyphs?: GlyphTable
  shadow?: boolean
  forceRgba?: readonly number[]
}

const calls = vi.hoisted(() => ({
  text: vi.fn<
    (
      ctx: CanvasRenderingContext2D,
      spans: readonly { text: string }[],
      x: number,
      y: number,
      style: SpanStyle,
    ) => number
  >(() => 0),
  number:
    vi.fn<
      (
        ctx: CanvasRenderingContext2D,
        value: number,
        x: number,
        y: number,
        nums: (ImageBitmap | undefined)[],
      ) => void
    >(),
  scroll:
    vi.fn<
      (
        ctx: CanvasRenderingContext2D,
        scroll: { tiles: ImageBitmap[] },
        x: number,
        y: number,
        nLen: number,
        opts?: { shadow?: boolean },
      ) => void
    >(),
  box: vi.fn<
    (
      ctx: CanvasRenderingContext2D,
      box: { tiles: ImageBitmap[] },
      x: number,
      y: number,
      w: number,
      h: number,
      opts?: { shadow?: boolean },
    ) => void
  >(),
}))
/** 本文件创建的每个画布 → 其 2d 替身；用 WeakMap 回读，不依赖 getContext 二次调用。 */
interface Tracked2d {
  putImageData: ReturnType<typeof vi.fn>
}
let contexts: WeakMap<object, Tracked2d>

vi.mock('../menu/menu-box.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../menu/menu-box.js')>()
  type NumberArgs = Parameters<typeof actual.drawNumber>
  type ScrollArgs = Parameters<typeof actual.drawScroll>
  type BoxArgs = Parameters<typeof actual.drawSlicedBox>
  return {
    ...actual,
    drawNumber: (...args: NumberArgs) => calls.number(...args),
    drawNumberLeft: (...args: NumberArgs) => calls.number(...args),
    drawScroll: (...args: ScrollArgs) => calls.scroll(...args),
    drawSlicedBox: (...args: BoxArgs) => calls.box(...args),
  }
})
vi.mock('../text/text-render.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../text/text-render.js')>()
  type SpanArgs = Parameters<typeof actual.renderSpans>
  return {
    ...actual,
    renderSpans: (...args: SpanArgs) => calls.text(...args),
  }
})

/** mono 调制路径的可控白像素画布替身（dead 信息框/主图标单色化）。
 *  jsdom 无 2d 实现；同形实现对象在本文件内只经一处收敛为 ctx 类型。 */
function toCtx(impl: object): CanvasRenderingContext2D {
  return impl as unknown as CanvasRenderingContext2D
}

beforeEach(() => {
  contexts = new WeakMap()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
    kind,
  ) {
    if (kind !== '2d') return null
    const impl = {
      canvas: this,
      drawImage: vi.fn(),
      putImageData: vi.fn(),
      getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => {
        const data = new Uint8ClampedArray(w * h * 4)
        for (let i = 0; i < w * h; i++) {
          data[i * 4] = 255
          data[i * 4 + 1] = 255
          data[i * 4 + 2] = 255
          data[i * 4 + 3] = 255
        }
        return { width: w, height: h, data, colorSpace: 'srgb' } as ImageData
      }),
      createImageData: (w: number, h: number) =>
        ({
          width: w,
          height: h,
          data: new Uint8ClampedArray(w * h * 4),
          colorSpace: 'srgb',
        }) as ImageData,
    }
    contexts.set(this, impl)
    return toCtx(impl)
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function drawHost() {
  const image = (width = 8, height = 8): ImageBitmap => ({ width, height }) as ImageBitmap
  const tile = image()
  const tiles = { tiles: Array.from({ length: 9 }, () => tile) }
  const digits = Array.from({ length: 10 }, () => image(6, 8))
  const digitsBlue = Array.from({ length: 10 }, () => image(6, 8))
  const menu: MenuAssets = {
    box: tiles,
    statusBg: tile,
    equipSlot: tile,
    scroll: tiles,
    nums: digits,
    avatar: undefined,
    numsBlue: digitsBlue,
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
  const impl = {
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    filter: 'none',
  }
  const ctx = toCtx(impl)
  const glyphs: GlyphTable = { has: () => false, get: () => undefined }
  for (const spy of Object.values(calls)) spy.mockClear()
  return { menu, ctx, impl, glyphs, image, digits, digitsBlue }
}

function texts() {
  return calls.text.mock.calls.map((call) => ({
    text: call[1].map((span) => span.text).join(''),
    color: call[4].forceRgba,
  }))
}

describe('N04 信息框头像形态与状态字调色门', () => {
  test('死亡头像走灰化滤镜直绘位图；中毒头像单色化并按 roleId+rgb 缓存', () => {
    const host = drawHost()
    const face = host.image(8, 8)
    const dead: Parameters<typeof drawPlayerInfoBox>[3] = {
      roleId: 'n-dead',
      hp: 0,
      maxHp: 100,
      mp: 10,
      maxMp: 40,
      status: { confused: 2 },
    }
    drawPlayerInfoBox(host.ctx, host.menu, face, dead, 0, host.glyphs, palette())
    expect(host.impl.drawImage).toHaveBeenCalledWith(face, 89, 161)
    // 死亡臂：save/restore 之间灰化滤镜生效（替身 restore 不回滚 filter，保留生效值）。
    expect(host.impl.filter).toBe('grayscale(1) brightness(0.6)')

    const poisoned: Parameters<typeof drawPlayerInfoBox>[3] = {
      roleId: 'n-poison-a',
      hp: 50,
      maxHp: 100,
      mp: 10,
      maxMp: 40,
      poisonRgb: [200, 100, 50],
    }
    drawPlayerInfoBox(host.ctx, host.menu, face, poisoned, 0, host.glyphs, palette())
    // mono 画布 = 调用里唯一真实 HTMLCanvasElement 实参（其余是替身位图对象）。
    const canvasArgs = () =>
      host.impl.drawImage.mock.calls
        .map((call) => call[0])
        .filter((arg): arg is HTMLCanvasElement => arg instanceof HTMLCanvasElement)
    const first = canvasArgs()[0]
    if (!first) throw new Error('mono canvas not drawn')
    // 白像素 × luma 1 → 单色化输出 = 毒色。
    const modulated = contexts.get(first)?.putImageData
    if (!modulated) throw new Error('mono canvas context not tracked')
    expect(modulated).toHaveBeenCalled()
    expect(Array.from(modulated.mock.lastCall![0].data.slice(0, 4))).toEqual([200, 100, 50, 255])
    // 同 roleId+rgb 再绘 → 命中缓存返回同一画布；换色 → 新画布。
    drawPlayerInfoBox(host.ctx, host.menu, face, poisoned, 1, host.glyphs, palette())
    expect(canvasArgs()[1]).toBe(first)
    drawPlayerInfoBox(
      host.ctx,
      host.menu,
      face,
      { ...poisoned, roleId: 'n-poison-b', poisonRgb: [10, 20, 30] },
      0,
      host.glyphs,
      palette(),
    )
    expect(canvasArgs()[2]).not.toBe(first)
  })

  test('状态字只在活人、有字模且有调色板色时绘制；越界色号（短色板）条目跳过', () => {
    const host = drawHost()
    const living: Parameters<typeof drawPlayerInfoBox>[3] = {
      roleId: 'n-status',
      hp: 1,
      maxHp: 2,
      mp: 3,
      maxMp: 4,
      status: { confused: 1, paralyzed: 1, sleep: 1, silence: 1 },
    }
    drawPlayerInfoBox(host.ctx, host.menu, undefined, living, 0, host.glyphs, palette())
    const words = texts().map((row) => row.text)
    expect(words).toEqual(['乱', '定', '眠', '封'])
    for (const row of texts()) expect(row.color).toBeTruthy()

    // 合法短色板：仅 15 色，0x5f/0xbf/0x3c 越界无色 → 只剩 0x0e「眠」。
    const shortPalette: Palette = {
      colors: Array.from({ length: 15 }, () => [0, 0, 0] as [number, number, number]),
      cycles: [],
    }
    shortPalette.colors[0x0e] = [7, 8, 9]
    for (const spy of Object.values(calls)) spy.mockClear()
    drawPlayerInfoBox(host.ctx, host.menu, undefined, living, 0, host.glyphs, shortPalette)
    expect(texts().map((row) => row.text)).toEqual(['眠'])
    expect(texts()[0]?.color).toEqual([7, 8, 9])
  })
})

describe('N04 战斗菜单盒禁用/确认配色与右值数字色', () => {
  test('禁用行选中暗红选中色、确认父项金黄、禁用右值走蓝数字', () => {
    const host = drawHost()
    drawBattleMenuBox(
      host.ctx,
      host.menu,
      host.glyphs,
      [
        { label: '杂项', disabled: true },
        { label: '投掷', right: 3, disabled: true },
        { label: '物品' },
      ],
      0,
      0,
      27,
      140,
      64,
      96,
      true,
    )
    const rows = texts()
    expect(rows[0]?.color).toEqual([215, 109, 93]) // COLOR_DISABLED_SEL
    expect(rows[1]?.color).toEqual([166, 40, 32]) // COLOR_DISABLED
    expect(rows[2]?.color).toEqual([199, 186, 174]) // COLOR_NORMAL（confirmed 只作用于选中项）
    // 禁用行的右值用蓝数字数组身份。
    const firstNumber = calls.number.mock.calls[0]
    expect(firstNumber?.[1]).toBe(3)
    expect(firstNumber?.[4]).toBe(host.digitsBlue)
    // 换启用选中 + 非确认：选中行闪烁色来自 SELECTED_COLORS 拍频。
    for (const spy of Object.values(calls)) spy.mockClear()
    drawBattleMenuBox(
      host.ctx,
      host.menu,
      host.glyphs,
      [{ label: '攻击' }],
      0,
      0,
      27,
      140,
      64,
      96,
      false,
    )
    expect(texts()[0]?.color).toEqual([247, 231, 109])
    // 再换启用选中 + 确认：父项固定金黄 COLOR_CONFIRMED，不闪。
    for (const spy of Object.values(calls)) spy.mockClear()
    drawBattleMenuBox(
      host.ctx,
      host.menu,
      host.glyphs,
      [{ label: '攻击' }],
      0,
      0,
      27,
      140,
      64,
      96,
      true,
    )
    expect(texts()[0]?.color).toEqual([255, 203, 113])
  })
})

describe('N04 物品网格分页钳制与数量门', () => {
  test('光标在首页时 pageStart 钳零不越界；right≤1 不画数量数字', () => {
    const host = drawHost()
    const rows = [
      { label: 'a', right: 1 },
      { label: 'b', right: 2 },
      { label: 'c' },
      { label: 'd' },
    ]
    drawBattleGrid(host.ctx, host.menu, host.glyphs, rows, 0, 0, ITEM_GRID)
    const labels = texts().map((row) => row.text)
    expect(labels).toEqual(['a', 'b', 'c', 'd'])
    // 数量 2 才画；1 与缺席都不画。
    expect(calls.number.mock.calls).toHaveLength(1)
    // 光标 0 + pageOffset 4 → 未钳制会从 -12 行起跳，钳制后仍从 0 号开始。
    for (const spy of Object.values(calls)) spy.mockClear()
    drawBattleGrid(host.ctx, host.menu, host.glyphs, rows, 0, 0, {
      ...ITEM_GRID,
      pageOffset: 40,
    })
    expect(texts().map((row) => row.text)).toEqual(['a', 'b', 'c', 'd'])
  })

  test('空行集只画红框不画任何条目', () => {
    const host = drawHost()
    drawBattleGrid(host.ctx, host.menu, host.glyphs, [], 0, 0, ITEM_GRID)
    expect(texts()).toEqual([])
    expect(calls.box).toHaveBeenCalledTimes(1)
  })
})

describe('N04 主图标单色化缓存与缺位跳过', () => {
  test('缺位图标跳过绘制；可用/不可用走灰/暗红两带且同图缓存', () => {
    const host = drawHost()
    const attack = host.image(8, 8)
    const magic = host.image(8, 8)
    drawMainIcons(
      host.ctx,
      [attack, magic, undefined, undefined],
      0,
      [true, false, false, false],
      false,
    )
    const drawn = host.impl.drawImage.mock.calls.map((call) => call[0]) as HTMLCanvasElement[]
    expect(drawn).toHaveLength(2)
    // luma 255 → lv 15-4 = 11：可用灰带 ICON_GRAY[11]=186，不可用暗红带 ICON_RED[11]。
    expect(readBack(drawn[0])).toEqual([186, 186, 186, 255])
    expect(readBack(drawn[1])).toEqual([203, 89, 77, 255])
    // 同 bitmap 再绘 → 缓存画布身份一致；highlight 选中 = 原位图直绘。
    host.impl.drawImage.mockClear()
    drawMainIcons(
      host.ctx,
      [attack, magic, undefined, undefined],
      1,
      [true, false, false, false],
      true,
    )
    expect(host.impl.drawImage.mock.calls[0]?.[0]).toBe(drawn[0])
    expect(host.impl.drawImage.mock.calls[1]?.[0]).toBe(magic)
  })
})

function palette(): Palette {
  const colors = Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number])
  colors[0x5f] = [1, 2, 3]
  colors[0xbf] = [4, 5, 6]
  colors[0x0e] = [7, 8, 9]
  colors[0x3c] = [10, 11, 12]
  return { colors, cycles: [] }
}

/** 从 mono 画布读回首个调制像素（替身 getImageData 输出白底）。 */
function readBack(canvas: HTMLCanvasElement | undefined): number[] {
  if (!canvas) throw new Error('mono canvas missing')
  const context = contexts.get(canvas)
  if (!context) throw new Error('canvas was not created under this host')
  const first = context.putImageData.mock.calls[0]?.[0] as ImageData
  expect(first).toBeTruthy()
  return Array.from(first.data.slice(0, 4))
}
