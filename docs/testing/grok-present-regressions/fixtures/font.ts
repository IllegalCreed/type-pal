import type { Glyph, GlyphTable } from '../../../../packages/game/src/present/font.js'

/**
 * 每个字只点亮一个像素，列距 3，避开自身阴影 (+1,0)/(0,+1)/(+1,+1)。
 * 掩码是手写的点位，不是把 renderText 再跑一遍当期望。
 */
const FULL_COLS = [
  { col: 0, byte: 0, mask: 0x80 },
  { col: 3, byte: 0, mask: 0x10 },
  { col: 6, byte: 0, mask: 0x02 },
  { col: 9, byte: 1, mask: 0x40 },
  { col: 12, byte: 1, mask: 0x08 },
] as const

const FULL_CHARS =
  '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥修行体力真气武术灵防御身法吉运现有金钱售价否是获得经验值打败敌人文提升练成雷风瘟说诀木剑'

const ASCII_DOTS: Record<string, { col: number; row: number; mask: number }> = {
  E: { col: 0, row: 4, mask: 0x80 },
  x: { col: 3, row: 4, mask: 0x10 },
  p: { col: 6, row: 4, mask: 0x02 },
}

export interface GlyphDot {
  col: number
  row: number
  width: number
}

const dots = new Map<string, GlyphDot>()
const bitmaps = new Map<string, Glyph>()

function addFull(ch: string, index: number): void {
  if (dots.has(ch)) throw new Error(`duplicate glyph ${ch}`)
  const spec = FULL_COLS[Math.floor(index / 16) % FULL_COLS.length]!
  const row = index % 16
  const bitmap = new Uint8Array(32)
  bitmap[row * 2 + spec.byte] = spec.mask
  dots.set(ch, { col: spec.col, row, width: 16 })
  bitmaps.set(ch, { width: 16, height: 16, bitmap })
}

function addAscii(ch: string, spec: { col: number; row: number; mask: number }): void {
  if (dots.has(ch)) throw new Error(`duplicate glyph ${ch}`)
  const bitmap = new Uint8Array(16)
  bitmap[spec.row] = spec.mask
  dots.set(ch, { col: spec.col, row: spec.row, width: 8 })
  bitmaps.set(ch, { width: 8, height: 16, bitmap })
}

for (let i = 0; i < [...FULL_CHARS].length; i++) addFull([...FULL_CHARS][i]!, i)
for (const [ch, spec] of Object.entries(ASCII_DOTS)) addAscii(ch, spec)

export function glyphDot(ch: string): GlyphDot {
  const dot = dots.get(ch)
  if (!dot) throw new Error(`glyph not in fixture: ${ch}`)
  return dot
}

/** 字符串第 index 个字的唯一点在屏幕上的位置。 */
export function textDot(
  text: string,
  index: number,
  originX: number,
  originY: number,
): { x: number; y: number } {
  const chars = [...text]
  const ch = chars[index]
  if (!ch) throw new Error(`text index ${index} missing in ${text}`)
  let x = originX
  for (let i = 0; i < index; i++) x += glyphDot(chars[i]!).width
  const dot = glyphDot(ch)
  return { x: x + dot.col, y: originY + dot.row }
}

export function fixtureGlyphs(): GlyphTable {
  return {
    has: (codepoint) => bitmaps.has(String.fromCodePoint(codepoint)),
    get: (codepoint) => bitmaps.get(String.fromCodePoint(codepoint)),
  }
}
