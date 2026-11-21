import { afterEach, describe, expect, test, vi } from 'vitest'
import type { GlyphTable } from '../text/glyph.js'
import {
  type BoxTiles,
  drawConfirmBox,
  drawNumber,
  drawNumberLeft,
  drawStatNumber,
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

describe('菜单数字与确认框', () => {
  test.each([
    { tint: 'yellow', foreground: '#d7cbaa' },
    { tint: 'cyan', foreground: '#51ba96' },
  ] as const)('negative effective stat keeps its right edge and places its $tint sign to the left', ({
    tint,
    foreground,
  }) => {
    const { ctx, drawImage } = host()
    const digits = Array.from({ length: 10 }, (_, digit) => image(String(digit), 6, 8))
    const strokes: unknown[][] = []
    vi.spyOn(ctx, 'fillRect').mockImplementation((...rect) => {
      strokes.push([ctx.fillStyle, ...rect])
    })
    drawStatNumber(ctx, -12, 100, 9, digits, tint)
    expect(drawImage.mock.calls).toEqual([
      [digits[2], 94, 9],
      [digits[1], 88, 9],
    ])
    expect(strokes).toEqual([
      ['#000', 84, 14, 4, 1],
      [foreground, 83, 13, 4, 1],
    ])
  })

  test('数字右对齐与左对齐各按实际字形宽排，负数绘制为零且跳过缺失的字形', () => {
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
    drawImage.mockClear()
    drawNumber(ctx, 120, 100, 7, noTwo)
    expect(drawImage.mock.calls).toEqual([
      [digits[0], 97, 7],
      [digits[1], 93, 7],
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
