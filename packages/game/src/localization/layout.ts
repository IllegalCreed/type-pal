import type { PalLanguagePack } from '@type-pal/shared'
import type { GlyphTable } from '../present/font.js'
import { SMALL_FONT } from '../present/small-font.js'
import { getLanguage } from './language.js'

let englishLayout: PalLanguagePack['layout'] = {}

export function setEnglishLayout(layout: PalLanguagePack['layout']): void {
  englishLayout = layout
}

export function layoutPosition(id: number, fallback: { x: number; y: number }) {
  return getLanguage() === 'en' ? (englishLayout[id] ?? fallback) : fallback
}

export function layoutFont(id: number, fallback?: GlyphTable): GlyphTable | undefined {
  return getLanguage() === 'en' && ((englishLayout[id]?.flags ?? 0) & 1) !== 0
    ? SMALL_FONT
    : fallback
}

export function layoutShadow(id: number): boolean {
  return getLanguage() !== 'en' || ((englishLayout[id]?.flags ?? 0) & 2) === 0
}
