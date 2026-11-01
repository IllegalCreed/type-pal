import { afterEach, beforeEach, expect, it } from 'vitest'
import { renderText } from '../present/font.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { SMALL_FONT } from '../present/small-font.js'
import { useFallbackLanguage } from './language.js'
import { isolateLanguagePreference } from './language.test-fixtures.js'
import { layoutFont, layoutPosition, layoutShadow, setEnglishLayout } from './layout.js'

let restoreLanguage: () => void
beforeEach(() => {
  restoreLanguage = isolateLanguagePreference()
})
afterEach(() => {
  setEnglishLayout({})
  restoreLanguage()
})

it('uses the English small label layout while leaving Chinese layout and glyphs untouched', () => {
  const fallback = { x: 226, y: 10 }
  setEnglishLayout({ '17': { x: 110, y: 19, flags: 1 } })
  useFallbackLanguage('en')
  expect(layoutPosition(17, fallback)).toEqual({ x: 110, y: 19, flags: 1 })
  const fb = createFramebuffer()
  renderText(fb, 'Atk', 110, 19, 7, layoutFont(17))
  const litRows = Array.from({ length: 200 }, (_, y) =>
    fb.indices.subarray(y * 320, (y + 1) * 320).some((pixel) => pixel !== 0),
  )
  expect(litRows.some((lit, y) => lit && (y < 19 || y >= 27))).toBe(false)
  expect(litRows.filter(Boolean).length).toBeGreaterThan(0)
  expect(SMALL_FONT.get(65)?.bitmap[0]).toBe(0x30) // Public-domain 8×8 'A', MSB-left.
  useFallbackLanguage('zh-CN')
  expect(layoutPosition(17, fallback)).toBe(fallback)
  expect(layoutFont(17)).toBeUndefined()
})

it.each([
  { flags: 0, small: false, shadow: true },
  { flags: 1, small: true, shadow: true },
  { flags: 2, small: false, shadow: false },
  { flags: 3, small: true, shadow: false },
])('keeps font and shadow bits independent for layout flags=$flags', ({ flags, small, shadow }) => {
  const fallback = { has: () => false, get: () => undefined }
  setEnglishLayout({ '29': { x: 6, y: 6, flags } })
  useFallbackLanguage('en')
  expect(layoutFont(29, fallback)).toBe(small ? SMALL_FONT : fallback)
  expect(layoutShadow(29)).toBe(shadow)
  useFallbackLanguage('zh-CN')
  expect(layoutFont(29, fallback)).toBe(fallback)
  expect(layoutShadow(29)).toBe(true)
})

it('uses caller defaults for an absent layout and discards the previous installed layout', () => {
  const position = { x: 10, y: 20 }
  const font = { has: () => false, get: () => undefined }
  setEnglishLayout({ '29': { x: 6, y: 6, flags: 3 } })
  setEnglishLayout({})
  useFallbackLanguage('en')
  expect(layoutPosition(29, position)).toBe(position)
  expect(layoutFont(29, font)).toBe(font)
  expect(layoutShadow(29)).toBe(true)
})
