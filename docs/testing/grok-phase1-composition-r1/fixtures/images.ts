import type { IndexedImage } from '../../../../packages/game/src/assets/png.js'
import type { SpriteImage } from '../../../../packages/game/src/present/draw-sprite.js'
import type { Glyph, GlyphTable } from '../../../../packages/game/src/present/font.js'
import type { Framebuffer } from '../../../../packages/game/src/present/framebuffer.js'

export const SENTINEL = 0x5a
export const TILE = 0x21
export const SPRITE = 0x11
export const BOX = 0x22
export const COVER = 0x07
export const DIALOG = 0x4f
export const TITLE = 0x8c
export const MESSAGE = 15
export const BG = 0x14
export const WORLD = 0x13
export const SUMMON_TO = 0x5a

export function at(fb: Framebuffer, x: number, y: number): number {
  return fb.indices[y * fb.width + x] ?? 0
}

/** 只点亮左上角一位。宽 16 的字形用两字节一行。 */
export function dotGlyph(width: 8 | 16): Glyph {
  const bytesPerRow = width === 16 ? 2 : 1
  const bitmap = new Uint8Array(bytesPerRow * 16)
  bitmap[0] = 0x80
  return { width, height: 16, bitmap }
}

export function glyphsOf(chars: readonly string[], width: 8 | 16 = 16): GlyphTable {
  const map = new Map<number, Glyph>()
  for (const ch of chars) {
    const cp = ch.codePointAt(0)
    if (cp !== undefined) map.set(cp, dotGlyph(width))
  }
  return {
    has: (cp) => map.has(cp),
    get: (cp) => map.get(cp),
  }
}

export function sprite(
  width: number,
  height: number,
  pixels: readonly { x: number; y: number; index: number }[],
  anchor?: { x: number; y: number },
): SpriteImage {
  const indices = new Uint8Array(width * height)
  const opaque = new Uint8Array(width * height)
  for (const pixel of pixels) {
    const off = pixel.y * width + pixel.x
    indices[off] = pixel.index
    opaque[off] = 1
  }
  return {
    width,
    height,
    indices,
    opaque,
    anchorX: anchor?.x ?? Math.floor(width / 2),
    anchorY: anchor?.y ?? height,
  }
}

export function solidSprite(
  width: number,
  height: number,
  index: number,
  anchor?: { x: number; y: number },
): SpriteImage {
  return {
    width,
    height,
    indices: new Uint8Array(width * height).fill(index),
    opaque: new Uint8Array(width * height).fill(1),
    anchorX: anchor?.x ?? Math.floor(width / 2),
    anchorY: anchor?.y ?? height,
  }
}

export function hiddenSprite(width: number, height: number): SpriteImage {
  return {
    width,
    height,
    indices: new Uint8Array(width * height),
    opaque: new Uint8Array(width * height),
    anchorX: Math.floor(width / 2),
    anchorY: height,
  }
}

export function image(width: number, height: number, index: number, opaque = 1): IndexedImage {
  return {
    width,
    height,
    indices: new Uint8Array(width * height).fill(index),
    opaque: new Uint8Array(width * height).fill(opaque),
  }
}

/** 数字精灵只在 (0,0) 不透明，颜色按黄 0xB0 / 青 0x70 分段。 */
export function yellowDigit(digit: number): number {
  return 0xb0 + digit
}

export function cyanDigit(digit: number): number {
  return 0x70 + digit
}

export function digitFrames(length = 80): IndexedImage[] {
  const frames = Array.from({ length }, () => image(6, 8, 0, 0))
  for (let digit = 0; digit <= 9; digit++) {
    frames[19 + digit] = image(6, 8, 0, 0)
    frames[19 + digit]!.indices[0] = yellowDigit(digit)
    frames[19 + digit]!.opaque[0] = 1
    frames[56 + digit] = image(6, 8, 0, 0)
    frames[56 + digit]!.indices[0] = cyanDigit(digit)
    frames[56 + digit]!.opaque[0] = 1
  }
  return frames
}

export function snapBitmap(img: {
  width: number
  height: number
  indices: Uint8Array
  opaque?: Uint8Array
}): { width: number; height: number; indices: number[]; opaque?: number[] } {
  return {
    width: img.width,
    height: img.height,
    indices: Array.from(img.indices),
    ...(img.opaque ? { opaque: Array.from(img.opaque) } : {}),
  }
}
