// @vitest-environment jsdom
import { expect, test } from 'vitest'
import type { Glyph, GlyphTable } from './glyph.js'
import { measureSpans, renderSpans } from './text-render.js'

const dot = { width: 8, height: 1, bitmap: Uint8Array.of(0x80) }
const wide = { width: 16, height: 1, bitmap: Uint8Array.of(0x80, 0) }
const transparent = [0, 0, 0, 0]
const defaultInk = [199, 186, 174, 255]

function glyphTable(entries: readonly (readonly [number, Glyph])[]): GlyphTable {
  const table = new Map(entries)
  return { has: (cp) => table.has(cp), get: (cp) => table.get(cp) }
}

const glyphs = glyphTable([
  [0x41, dot],
  [0x4e2d, wide],
])

function surface() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 40
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas is required by the rendering tests')
  return {
    ctx,
    pixel: (x: number, y: number) => Array.from(ctx.getImageData(x, y, 1, 1).data),
  }
}

test('测宽使用半宽、全宽和缺字间距，空文字宽度为零', () => {
  expect(measureSpans([{ text: 'A中' }], glyphs)).toBe(24)
  expect(measureSpans([{ text: 'A?x' }], glyphs)).toBe(40)
  expect(measureSpans([], glyphs)).toBe(0)
})

test('无阴影时半宽字推进 8px，两个字模都落在正文行', () => {
  const { ctx, pixel } = surface()
  expect(renderSpans(ctx, [{ text: 'A中' }], 10, 20, { glyphs })).toBe(24)
  expect(pixel(10, 20)).toEqual(defaultInk)
  expect(pixel(17, 20)).toEqual(transparent)
  expect(pixel(18, 20)).toEqual(defaultInk)
})

test('三个阴影像素位于正文右侧和下方', () => {
  const { ctx, pixel } = surface()
  renderSpans(ctx, [{ text: 'A' }], 0, 0, { glyphs, shadow: true })
  expect([pixel(1, 0), pixel(0, 1), pixel(1, 1)]).toEqual([
    [0, 0, 0, 255],
    [0, 0, 0, 255],
    [0, 0, 0, 255],
  ])
  expect(pixel(0, 0)).toEqual(defaultInk)
  expect(pixel(2, 0)).toEqual(transparent)
})

test('加粗显示在两个相邻像素，右侧阴影外移一格', () => {
  const { ctx, pixel } = surface()
  renderSpans(ctx, [{ text: 'A' }], 0, 0, { glyphs, shadow: true, bold: true })
  expect([pixel(0, 0), pixel(1, 0)]).toEqual([defaultInk, defaultInk])
  expect([pixel(2, 0), pixel(0, 1), pixel(2, 1)]).toEqual([
    [0, 0, 0, 255],
    [0, 0, 0, 255],
    [0, 0, 0, 255],
  ])
  expect(pixel(1, 1)).toEqual(transparent)
})

test('缺字保留 16px 空位并推进后续字形', () => {
  const { ctx, pixel } = surface()
  expect(renderSpans(ctx, [{ text: 'A?A' }], 0, 0, { glyphs })).toBe(32)
  expect([pixel(0, 0), pixel(8, 0), pixel(24, 0)]).toEqual([defaultInk, transparent, defaultInk])
})

test('打字上限跨富文本段，只绘制已显示字符', () => {
  const { ctx, pixel } = surface()
  expect(renderSpans(ctx, [{ text: 'A' }, { text: '中' }], 0, 0, { glyphs, maxChars: 1 })).toBe(8)
  expect(pixel(0, 0)).toEqual(defaultInk)
  expect(pixel(8, 0)).toEqual(transparent)
})

test('富文本使用自己的颜色，固定颜色覆盖该段的颜色', () => {
  const { ctx, pixel } = surface()
  const spans = [{ text: 'A', color: 'cyan' }] as const
  renderSpans(ctx, spans, 0, 0, { glyphs })
  renderSpans(ctx, spans, 8, 0, { glyphs, forceRgba: [12, 34, 56] })
  expect(pixel(0, 0)).toEqual([121, 219, 186, 255])
  expect(pixel(8, 0)).toEqual([12, 34, 56, 255])
})

test('相同字符和颜色在不同字形表中按各自的点阵绘制', () => {
  const { ctx, pixel } = surface()
  const alternate = glyphTable([[0x41, { width: 8, height: 1, bitmap: Uint8Array.of(0x40) }]])

  renderSpans(ctx, [{ text: 'A' }], 0, 0, { glyphs })
  renderSpans(ctx, [{ text: 'A' }], 8, 0, { glyphs: alternate })

  expect(pixel(0, 0)).toEqual(defaultInk)
  expect([pixel(8, 0), pixel(9, 0)]).toEqual([transparent, defaultInk])
})
