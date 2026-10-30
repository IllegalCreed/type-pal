/** Dialogue drawing inputs: fresh buffers/flags per call, no renderer or global test state. */
import type { Item } from '@type-pal/shared'
import type { IndexedImage } from '../assets/png.js'
import type { Glyph, GlyphTable } from '../present/font.js'

export function dialogSprite(width: number, height: number, color: number): IndexedImage {
  return {
    width,
    height,
    indices: new Uint8Array(width * height).fill(color),
    opaque: new Uint8Array(width * height).fill(1),
  }
}

export function dialogItem(id: number, bitmap: number): Item {
  return {
    id,
    bitmap,
    price: 0,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: false,
      equipable: false,
      throwable: false,
      consuming: false,
      applyToAll: false,
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
    },
  }
}

export function dialogGlyphs(specs: Record<string, number>): GlyphTable {
  const map = new Map<number, Glyph>()
  for (const [ch, width] of Object.entries(specs)) {
    const cp = ch.codePointAt(0)
    if (cp === undefined) continue
    const bytesPerRow = Math.ceil(width / 8)
    const bitmap = new Uint8Array(bytesPerRow * 16)
    bitmap[0] = 0x80
    map.set(cp, { width, height: 16, bitmap })
  }
  return {
    has: (cp) => map.has(cp),
    get: (cp) => map.get(cp),
  }
}
