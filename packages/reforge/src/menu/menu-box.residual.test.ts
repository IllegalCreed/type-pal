import { afterEach, describe, expect, test, vi } from 'vitest'
import type { GlyphTable } from '../text/glyph.js'
import {
  type BoxTiles,
  drawConfirmBox,
  drawNumber,
  drawNumberLeft,
  drawScroll,
} from './menu-box.js'

const textCalls = vi.hoisted(() => vi.fn())
vi.mock('../text/text-render.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../text/text-render.js')>()
  return {
    ...actual,
    renderSpans: (...args: unknown[]) => {
      textCalls(...args)
      return 0
    },
  }
})

const image = (id: string, width: number, height: number): ImageBitmap =>
  ({ id, width, height, close() {} }) as ImageBitmap

function host() {
  const drawImage = vi.fn()
  const rect = vi.fn()
  const ctx = {
    drawImage,
    rect,
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    clip: vi.fn(),
    fillRect: vi.fn(),
    imageSmoothingEnabled: true,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D
  const tiles: BoxTiles = {
    tiles: [
      image('tl', 8, 4),
      image('top', 16, 4),
      image('tr', 13, 4),
      image('left', 8, 18),
      image('center', 16, 18),
      image('right', 9, 18),
      image('bl', 8, 4),
      image('bottom', 16, 4),
      image('br', 13, 4),
    ],
  }
  textCalls.mockClear()
  return { ctx, drawImage, rect, tiles }
}

afterEach(() => vi.unstubAllGlobals())

describe('当前菜单九宫格与数字绘制边界', () => {
  test('数字右对齐与左对齐各按实际字形宽排，负数钳零且缺失字形零绘制', () => {
    const { ctx, drawImage } = host()
    const digits = Array.from({ length: 10 }, (_, digit) => image(String(digit), digit + 3, 8))
    drawNumber(ctx, 120, 100, 7, digits)
    expect(drawImage.mock.calls).toEqual([
      [digits[0], 97, 7],
      [digits[2], 92, 7],
      [digits[1], 88, 7],
    ])
    drawImage.mockClear()
    drawNumberLeft(ctx, 120, 10, 9, digits)
    expect(drawImage.mock.calls).toEqual([
      [digits[1], 10, 9],
      [digits[2], 14, 9],
      [digits[0], 19, 9],
    ])
    drawImage.mockClear()
    drawNumber(ctx, -4, 50, 11, digits)
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(digits[0], 47, 11)
    drawImage.mockClear()
    const noTwo: Array<ImageBitmap | undefined> = [...digits]
    noTwo[2] = undefined
    drawNumberLeft(ctx, 12, 5, 5, noTwo)
    expect(drawImage.mock.calls).toEqual([[digits[1], 5, 5]])
  })

  test('单行卷轴按中段数量算自然宽高；宽右角从中段右列向外探出', () => {
    const { ctx, drawImage, rect, tiles } = host()
    drawScroll(ctx, tiles, 10, 20, 2, { shadow: false })
    // left 8 + center 16×2 + right 9 = 49，top 4 + middle 18 + bottom 4 = 26。
    expect(rect).toHaveBeenCalledWith(18, 24, 32, 18)
    expect(drawImage.mock.calls.slice(-4)).toEqual([
      [tiles.tiles[0], 10, 20],
      [tiles.tiles[2], 50, 20],
      [tiles.tiles[6], 10, 42],
      [tiles.tiles[8], 50, 42],
    ])
  })

  test('确认框固定两卷轴位置，左右选中互斥且第二拍只改变高亮色', () => {
    const { ctx, drawImage, tiles } = host()
    const created: Array<{ width: number; height: number }> = []
    vi.stubGlobal('document', {
      createElement(tag: string) {
        expect(tag).toBe('canvas')
        const off = {
          width: 0,
          height: 0,
          getContext: () => ({
            ...ctx,
            drawImage: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            rect: vi.fn(),
            clip: vi.fn(),
            fillRect: vi.fn(),
          }),
        }
        created.push(off)
        return off
      },
    })
    const glyphs: GlyphTable = { has: () => false, get: () => undefined }
    drawConfirmBox(ctx, tiles, { leftText: '否', rightText: '是', rightSelected: false }, glyphs, 0)
    expect(created).toHaveLength(2)
    expect(drawImage).toHaveBeenCalledWith(created[0], 136, 106)
    expect(drawImage).toHaveBeenCalledWith(created[1], 211, 106)
    expect(
      textCalls.mock.calls.map((call) => [call[1][0].text, call[2], call[3], call[4].forceRgba]),
    ).toEqual([
      ['否', 145, 110, [247, 231, 109]],
      ['是', 220, 110, [199, 186, 174]],
    ])
    textCalls.mockClear()
    drawConfirmBox(
      ctx,
      tiles,
      { leftText: '否', rightText: '是', rightSelected: true },
      glyphs,
      100,
    )
    expect(textCalls.mock.calls.map((call) => [call[1][0].text, call[4].forceRgba])).toEqual([
      ['否', [199, 186, 174]],
      ['是', [235, 211, 97]],
    ])
  })
})
