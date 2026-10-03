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

/** jsdom 真实 2D 原型（全局绑定未导出构造器，经实例取原型；原型对象即接口形态）。 */
let proto2d: CanvasRenderingContext2D
/** CanvasImageSource 各成员的像素尺寸（in 收窄 + typeof 守卫，无类型断言）。 */
function pixelSource(image: CanvasImageSource): { width: number; height: number } | undefined {
  if ('videoWidth' in image) return { width: image.videoWidth, height: image.videoHeight }
  if ('naturalWidth' in image) return { width: image.naturalWidth, height: image.naturalHeight }
  if ('width' in image && 'height' in image) {
    const width = image.width
    const height = image.height
    if (typeof width === 'number' && typeof height === 'number') return { width, height }
  }
  return undefined
}

const spyOnDrawImage = (o: CanvasRenderingContext2D) => vi.spyOn(o, 'drawImage')
const spyOnPutImageData = (o: CanvasRenderingContext2D) => vi.spyOn(o, 'putImageData')
/** 画布类实参守卫：jsdom+canvas 集成下 mono 表面可能是底层 Canvas（非 DOM 包装），
 *  二者都有 getContext/width/height；替身位图三者皆无。 */
function canvasLike(arg: unknown): arg is HTMLCanvasElement {
  return (
    typeof arg === 'object' &&
    arg !== null &&
    'getContext' in arg &&
    'width' in arg &&
    'height' in arg
  )
}

let drawImageSpy: ReturnType<typeof vi.spyOn>
let putImageDataSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  // 类型化外部宿主边界：jsdom 真实 2D 上下文，只在原型层拦截绘制并记录写回。
  proto2d = Object.getPrototypeOf(document.createElement('canvas').getContext('2d')!)
  // 类型化宿主边界：拦截绘制并把源位图按不透明白像素写入目标画布
  // （模拟真实位图源），使 mono 调制在真画布上按白底 luma=1 真实执行。
  drawImageSpy = spyOnDrawImage(proto2d).mockImplementation(function (
    this: CanvasRenderingContext2D,
    source: CanvasImageSource,
    firstOffsetX?: number,
    firstOffsetY?: number,
    _sx?: number,
    _sy?: number,
    _sw?: number,
    _sh?: number,
    lastOffsetX?: number,
    lastOffsetY?: number,
  ) {
    // 兼容 drawImage(image, dx, dy) 与 9 参裁剪形态：dx/dy 取对应槽位。
    const nineArg = lastOffsetX !== undefined || lastOffsetY !== undefined
    const size = pixelSource(source)
    const width = size?.width ?? 0
    const height = size?.height ?? 0
    if (width <= 0 || height <= 0) return
    const x = (nineArg ? lastOffsetX : firstOffsetX) ?? 0
    const y = (nineArg ? lastOffsetY : firstOffsetY) ?? 0
    const region = this.getImageData(x, y, width, height)
    for (let i = 0; i < region.data.length; i += 4) {
      region.data[i] = 255
      region.data[i + 1] = 255
      region.data[i + 2] = 255
      region.data[i + 3] = 255
    }
    this.putImageData(region, x, y)
  })
  putImageDataSpy = spyOnPutImageData(proto2d)
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
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('jsdom 2d canvas unavailable')
  const glyphs: GlyphTable = { has: () => false, get: () => undefined }
  for (const spy of Object.values(calls)) spy.mockClear()
  drawImageSpy.mockClear()
  putImageDataSpy.mockClear()
  return { menu, canvas, ctx, glyphs, image, digits, digitsBlue }
}

function texts() {
  return calls.text.mock.calls.map((call) => ({
    text: call[1].map((span) => span.text).join(''),
    color: call[4].forceRgba,
  }))
}

describe('N04 信息框头像形态与状态字调色门', () => {
  test('死亡头像走灰化滤镜直绘位图；中毒头像经单色化画布并按 roleId+rgb 缓存', () => {
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
    expect(drawImageSpy.mock.calls).toContainEqual([face, 89, 161])
    // 死亡臂：save/restore 之间灰化滤镜生效（宿主 ctx 保留最后一次写入值）。
    expect(host.ctx.filter).toBe('grayscale(1) brightness(0.6)')

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
      drawImageSpy.mock.calls.map((call: unknown[]) => call[0]).filter(canvasLike)
    const first = canvasArgs()[0]
    if (!first) throw new Error('mono canvas not drawn')
    expect(first.width).toBe(8)
    expect(first.height).toBe(8)
    // 白底（luma 1）× 毒色 → 单色化调制在真画布上产出毒色（PAL_RLEBlitMonoColor RGBA 近似）。
    expect(readBack(first)).toEqual([200, 100, 50, 255])
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

  test('状态字只在活人、有字模且有调色板色时绘制', () => {
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
  test('缺位图标跳过绘制；可用/不可用各走单色化画布且同图缓存', () => {
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
    const drawn = drawImageSpy.mock.calls.map((call: unknown[]) => call[0]).filter(canvasLike)
    expect(drawn).toHaveLength(2) // 两次单色化表面（内部绘制已被同 spy 拦截，无画布实参）
    const grayBand = drawn[0]
    const redBand = drawn[1]
    expect(grayBand).not.toBe(redBand) // 灰带 / 暗红带各自成画布
    // luma 255 → lv 15-4 = 11：可用灰带 ICON_GRAY[11]=186，不可用暗红带 ICON_RED[11]。
    expect(readBack(grayBand)).toEqual([186, 186, 186, 255])
    expect(readBack(redBand)).toEqual([203, 89, 77, 255])
    // 同 bitmap 再绘 → 缓存画布身份一致；highlight 选中 = 原位图直绘。
    drawImageSpy.mockClear()
    drawMainIcons(
      host.ctx,
      [attack, magic, undefined, undefined],
      1,
      [true, false, false, false],
      true,
    )
    expect(drawImageSpy.mock.calls[0]?.[0]).toBe(grayBand)
    expect(drawImageSpy.mock.calls[1]?.[0]).toBe(magic)
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

/** 从真 mono 画布读回首像素（宿主 putImageData 真写、getImageData 真读）。 */
function readBack(canvas: HTMLCanvasElement | undefined): number[] {
  if (!canvas) throw new Error('mono canvas missing')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('mono canvas 2d context missing')
  return Array.from(context.getImageData(0, 0, 1, 1).data.slice(0, 4))
}
