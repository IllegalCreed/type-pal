import { afterEach, expect, it } from 'vitest'
import { getWord, setEnglishWordTable, setWordTable } from '../core/word-lookup.js'
import { renderText } from '../present/font.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { SMALL_FONT } from '../present/small-font.js'
import { setLanguage } from './language.js'
import { layoutFont, layoutPosition, setEnglishLayout } from './layout.js'

afterEach(() => {
  setLanguage('zh-CN')
  setWordTable([])
  setEnglishWordTable({})
  setEnglishLayout({})
})

it('changes displayed names by true word identity and restores the same Chinese table', () => {
  const words = Array<string>(42).fill('')
  words[39] = '阿奴'
  words[40] = '巫后'
  setWordTable(words)
  setEnglishWordTable({ '39': 'Ah Nu', '40': 'Queen' })
  setLanguage('en')
  expect([getWord(40), getWord(39)]).toEqual(['Queen', 'Ah Nu'])
  setLanguage('zh-CN')
  expect([getWord(40), getWord(39)]).toEqual(['巫后', '阿奴'])
  expect(words[40]).toBe('巫后')
})

it('uses the English small label layout while leaving Chinese layout and glyphs untouched', () => {
  const fallback = { x: 226, y: 10 }
  setEnglishLayout({ '17': { x: 110, y: 19, flags: 1 } })
  setLanguage('en')
  expect(layoutPosition(17, fallback)).toEqual({ x: 110, y: 19, flags: 1 })
  const fb = createFramebuffer()
  renderText(fb, 'Atk', 110, 19, 7, layoutFont(17))
  const litRows = Array.from({ length: 200 }, (_, y) =>
    fb.indices.subarray(y * 320, (y + 1) * 320).some((pixel) => pixel !== 0),
  )
  expect(litRows.some((lit, y) => lit && (y < 19 || y >= 27))).toBe(false)
  expect(litRows.filter(Boolean).length).toBeGreaterThan(0)
  expect(SMALL_FONT.get(65)?.bitmap[0]).toBe(0x30) // Public-domain 8×8 'A', MSB-left.
  setLanguage('zh-CN')
  expect(layoutPosition(17, fallback)).toBe(fallback)
  expect(layoutFont(17)).toBeUndefined()
})
