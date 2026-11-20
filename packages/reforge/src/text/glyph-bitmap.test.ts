import { expect, test } from 'vitest'
import { decodeGlyph, type Glyph } from './glyph.js'

test('2×2 点阵逐像素区分亮点与透明背景', () => {
  const glyph: Glyph = { width: 2, height: 2, bitmap: Uint8Array.of(0x80, 0x40) }
  expect(Array.from(decodeGlyph(glyph, [10, 20, 30]))).toEqual([
    10, 20, 30, 255, 0, 0, 0, 0, 0, 0, 0, 0, 10, 20, 30, 255,
  ])
})

test('10px 行按两个字节读取，第二行的末列不会错位', () => {
  const glyph: Glyph = { width: 10, height: 2, bitmap: Uint8Array.of(0, 0, 0, 0x40) }
  const pixels = decodeGlyph(glyph, [11, 22, 33])
  expect(Array.from(pixels.slice(0, 76))).toEqual(new Array<number>(76).fill(0))
  expect(Array.from(pixels.slice(76))).toEqual([11, 22, 33, 255])
})

test('内部点阵缺少末行时，该行像素保持透明', () => {
  const glyph: Glyph = { width: 8, height: 2, bitmap: Uint8Array.of(0xff) }
  const pixels = decodeGlyph(glyph, [9, 8, 7])
  expect(Array.from(pixels.slice(0, 32))).toEqual(
    Array.from({ length: 8 }, () => [9, 8, 7, 255]).flat(),
  )
  expect(Array.from(pixels.slice(32))).toEqual(new Array<number>(32).fill(0))
})
