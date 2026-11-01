import { afterEach, beforeEach, expect, it } from 'vitest'
import { useFallbackLanguage } from '../../localization/language.js'
import { isolateLanguagePreference } from '../../localization/language.test-fixtures.js'
import type { GlyphTable } from '../font.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawScriptDescription } from './draw-description.js'

let restoreLanguage: () => void
beforeEach(() => {
  restoreLanguage = isolateLanguagePreference()
})
afterEach(() => {
  restoreLanguage()
})

it('renders the full-width separators in a real English attribute description as blank space', () => {
  useFallbackLanguage('en')
  const fb = createFramebuffer()
  drawScriptDescription(fb, ['Atk+28　Agi+12　Def+3'], 71, 151, 240, 0x3c)
  const separator = Array.from({ length: 8 }, (_, y) =>
    Array.from({ length: 15 }, (_, x) => fb.indices[(151 + y) * 320 + 120 + x]),
  ).flat()
  expect(separator).toEqual(Array<number>(120).fill(0))
  // 'A' starts with pixels at columns 2/3 in SDLPal's 8px font.
  // These flank the full-width space: a no-op renderer must not satisfy the blank-space check.
  expect([fb.indices[151 * 320 + 73], fb.indices[151 * 320 + 137]]).toEqual([0x3c, 0x3c])
})

it('keeps Chinese descriptions on 16px source rows with the caller-provided glyphs', () => {
  const glyphs: GlyphTable = new Map([
    [
      '甲'.codePointAt(0)!,
      { width: 16, height: 16, bitmap: Uint8Array.from([0x80, ...Array<number>(31).fill(0)]) },
    ],
  ])
  const fb = createFramebuffer()
  drawScriptDescription(fb, ['甲', '甲'], 10, 20, 16, 7, glyphs)
  expect([fb.indices[20 * 320 + 10], fb.indices[36 * 320 + 10]]).toEqual([7, 7])
  expect(fb.indices[30 * 320 + 10]).toBe(0)
})
