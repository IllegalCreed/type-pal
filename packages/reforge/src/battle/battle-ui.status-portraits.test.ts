// @vitest-environment jsdom
import type { Palette } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { MenuAssets } from '../menu/menu-box.js'
import type { GlyphTable } from '../text/glyph.js'
import { drawPlayerInfoBox } from './battle-ui.js'

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
}))

vi.mock('../menu/menu-box.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../menu/menu-box.js')>()
  type NumberArgs = Parameters<typeof actual.drawNumber>
  return {
    ...actual,
    drawNumber: (...args: NumberArgs) => calls.number(...args),
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
  return { menu, ctx, glyphs, image }
}

function texts() {
  return calls.text.mock.calls.map((call) => ({
    text: call[1].map((span) => span.text).join(''),
    x: call[2],
    y: call[3],
    color: call[4].forceRgba,
  }))
}

describe('战斗队员信息框', () => {
  test('阵亡头像取黑白色段并覆盖毒色，单色头像按位图、调色板与色段复用', () => {
    const host = drawHost()
    const face = host.image(8, 8)
    const dead: Parameters<typeof drawPlayerInfoBox>[3] = {
      hp: 0,
      maxHp: 100,
      mp: 10,
      maxMp: 40,
      status: { confused: 2 },
      poisonColor: 0x10,
    }
    const deadPalette = palette()
    deadPalette.colors[0x05] = [255, 255, 255]
    deadPalette.colors[0x0f] = [180, 180, 180]
    deadPalette.colors[0x15] = [190, 100, 90]
    drawPlayerInfoBox(host.ctx, host.menu, face, dead, 0, host.glyphs, deadPalette)
    const deadSurface = drawImageSpy.mock.calls.find(
      ([, x, y]: unknown[]) => x === 89 && y === 161,
    )?.[0]
    if (!canvasLike(deadSurface)) throw new Error('阵亡头像未使用调色板绘制')
    expect(readBack(deadSurface)).toEqual([255, 255, 255, 255])

    const poisoned: Parameters<typeof drawPlayerInfoBox>[3] = {
      hp: 50,
      maxHp: 100,
      mp: 10,
      maxMp: 40,
    }
    const sourcePalette = palette()
    sourcePalette.colors[0x1f] = [200, 100, 50]
    sourcePalette.colors[0x2f] = [10, 20, 30]
    const drawPoison = (image: ImageBitmap, poisonColor: number, colors = sourcePalette) => {
      drawImageSpy.mockClear()
      drawPlayerInfoBox(
        host.ctx,
        host.menu,
        image,
        { ...poisoned, poisonColor },
        0,
        host.glyphs,
        colors,
      )
      return drawImageSpy.mock.calls
        .map((call: unknown[]) => call[0])
        .filter(canvasLike)
        .at(-1)
    }
    const first = drawPoison(face, 0x10)
    if (!first) throw new Error('mono canvas not drawn')
    expect(first.width).toBe(8)
    expect(first.height).toBe(8)
    // 宿主白像素在表外，落最亮一档。相同色段的毒色索引共用成图。
    expect(readBack(first)).toEqual([200, 100, 50, 255])
    expect(drawPoison(face, 0x1a)).toBe(first)
    expect(drawPoison(host.image(8, 8), 0x10)).not.toBe(first)
    expect(readBack(drawPoison(face, 0x20))).toEqual([10, 20, 30, 255])
    const otherPalette = palette()
    otherPalette.colors[0x1f] = [220, 10, 3]
    expect(readBack(drawPoison(face, 0x10, otherPalette))).toEqual([220, 10, 3, 255])
  })

  test('首个与第三个队员框按槽定位，活人状态字使用对应调色板色', () => {
    const host = drawHost()
    const colors = palette()
    const player: Parameters<typeof drawPlayerInfoBox>[3] = {
      hp: 45,
      maxHp: 120,
      mp: 8,
      maxMp: 35,
      status: { confused: 2, paralyzed: 1, sleep: 1, silence: 1 },
    }
    const before = structuredClone(player)
    drawPlayerInfoBox(host.ctx, host.menu, undefined, player, 0, host.glyphs, colors)
    expect(drawImageSpy).toHaveBeenCalledWith(host.menu.magicPlayerBox, 91, 165)
    expect(drawImageSpy).toHaveBeenCalledWith(host.menu.slash, 140, 171)
    expect(drawImageSpy).toHaveBeenCalledWith(host.menu.slash, 140, 187)
    expect(calls.number.mock.calls.map((call) => [call[1], call[2], call[3]])).toEqual([
      [45, 141, 170],
      [120, 162, 173],
      [8, 141, 186],
      [35, 162, 189],
    ])
    expect(texts()).toEqual([
      { text: '乱', x: 126, y: 184, color: [1, 2, 3] },
      { text: '定', x: 135, y: 177, color: [4, 5, 6] },
      { text: '眠', x: 145, y: 166, color: [7, 8, 9] },
      { text: '封', x: 146, y: 185, color: [10, 11, 12] },
    ])
    expect(player).toEqual(before)

    calls.text.mockClear()
    drawImageSpy.mockClear()
    drawPlayerInfoBox(host.ctx, host.menu, undefined, { ...player, hp: 0 }, 2, host.glyphs, colors)
    expect(drawImageSpy).toHaveBeenCalledWith(host.menu.magicPlayerBox, 245, 165)
    expect(texts()).toEqual([])
  })

  test('活人只绘制实际给出的状态字，省略的状态保持空白', () => {
    const host = drawHost()
    const player: Parameters<typeof drawPlayerInfoBox>[3] = {
      hp: 45,
      maxHp: 120,
      mp: 8,
      maxMp: 35,
      status: { confused: 2, sleep: 1 },
    }
    drawPlayerInfoBox(host.ctx, host.menu, undefined, player, 0, host.glyphs, palette())

    expect(texts()).toEqual([
      { text: '乱', x: 126, y: 184, color: [1, 2, 3] },
      { text: '眠', x: 145, y: 166, color: [7, 8, 9] },
    ])
  })

  test('活人缺字库或调色板时仍绘制角色框，且不派发状态字', () => {
    const host = drawHost()
    const player: Parameters<typeof drawPlayerInfoBox>[3] = {
      hp: 45,
      maxHp: 120,
      mp: 8,
      maxMp: 35,
      status: { confused: 2 },
    }
    drawPlayerInfoBox(host.ctx, host.menu, undefined, player, 0, undefined, palette())
    expect(drawImageSpy).toHaveBeenCalledWith(host.menu.magicPlayerBox, 91, 165)
    expect(texts()).toEqual([])

    drawImageSpy.mockClear()
    calls.text.mockClear()
    drawPlayerInfoBox(host.ctx, host.menu, undefined, player, 0, host.glyphs)
    expect(drawImageSpy).toHaveBeenCalledWith(host.menu.magicPlayerBox, 91, 165)
    expect(texts()).toEqual([])
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
