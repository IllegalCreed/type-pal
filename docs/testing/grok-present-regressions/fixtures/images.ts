import type { IndexedImage } from '../../../../packages/game/src/assets/png.js'
import type { Framebuffer } from '../../../../packages/game/src/present/framebuffer.js'

/** 预填背景。与菜单色、数字色都不同，用来认出没被画到的像素。 */
export const SENTINEL = 0x5a
/** style 0 九宫格整片不透明色。 */
export const BOX_STYLE0 = 0x11
/** style 1 九宫格整片不透明色。 */
export const BOX_STYLE1 = 0x22
export const TILE = 8

export const CURSOR_ID = 0x69
export const CURSOR_HOLE = 0xee
export const ITEMBOX_ID = 0x6e
export const SLASH_ID = 0x39
export const ARROW_ID = 0x47
export const CURSOR_UP_ID = 0x67
export const INFOBOX_ID = 0x17

/** 黄/蓝/青数字精灵只在 (0,0) 点亮，索引按颜色分段，避免和菜单色撞车。 */
export function yellowDigit(digit: number): number {
  return 0xb0 + digit
}
export function blueDigit(digit: number): number {
  return 0xd0 + digit
}
export function cyanDigit(digit: number): number {
  return 0x70 + digit
}

/**
 * 右对齐数字字段里，从右数第 place 位（0 = 个位）的精灵左上角。
 * 只对实际画出来的位数成立；高位不足时该位置不会被数字覆盖。
 * 坐标来自 draw-number 对 sdlpal ui.c:705-731 的步进：起点 pos.x-6，右对齐再加 6*nLength，然后每位左移 6。
 */
export function rightDigitX(posX: number, nLength: number, placeFromRight: number): number {
  return posX - 6 + 6 * nLength - 6 * placeFromRight
}

/** 中对齐个位的左上角。actualLength 含 0 也至少画 1 位。 */
export function midOnesX(posX: number, nLength: number, actualLength: number): number {
  return posX - 6 + 3 * (nLength + actualLength)
}

export function digitCount(num: number, nLength: number): number {
  if (num <= 0) return 1
  let n = 0
  let value = num
  while (value > 0 && n < nLength) {
    value = Math.floor(value / 10)
    n++
  }
  return n
}

export function solidImage(width: number, height: number, index: number): IndexedImage {
  const n = width * height
  return {
    width,
    height,
    indices: new Uint8Array(n).fill(index),
    opaque: new Uint8Array(n).fill(1),
  }
}

export function sparseImage(
  width: number,
  height: number,
  pixels: readonly { x: number; y: number; index: number }[],
): IndexedImage {
  const indices = new Uint8Array(width * height)
  const opaque = new Uint8Array(width * height)
  for (const pixel of pixels) {
    const off = pixel.y * width + pixel.x
    indices[off] = pixel.index
    opaque[off] = 1
  }
  return { width, height, indices, opaque }
}

export function iconImage(index: number): IndexedImage {
  return sparseImage(1, 1, [{ x: 0, y: 0, index }])
}

/** SPRITEUI 下标与 draw-* 常量对齐。未用到的槽位留空，缺帧会让 drawBox 自己抛错。 */
export function makeUiFrames(): IndexedImage[] {
  const frames: IndexedImage[] = []
  for (let i = 0; i < 9; i++) frames[i] = solidImage(TILE, TILE, BOX_STYLE0)
  for (let i = 9; i < 18; i++) frames[i] = solidImage(TILE, TILE, BOX_STYLE1)
  frames[18] = iconImage(INFOBOX_ID)
  for (let digit = 0; digit < 10; digit++) {
    frames[19 + digit] = sparseImage(6, 8, [{ x: 0, y: 0, index: yellowDigit(digit) }])
    frames[29 + digit] = sparseImage(6, 8, [{ x: 0, y: 0, index: blueDigit(digit) }])
    frames[56 + digit] = sparseImage(6, 8, [{ x: 0, y: 0, index: cyanDigit(digit) }])
  }
  frames[39] = iconImage(SLASH_ID)
  frames[44] = solidImage(TILE, TILE, BOX_STYLE0)
  frames[45] = solidImage(TILE, TILE, BOX_STYLE0)
  frames[46] = solidImage(TILE, TILE, BOX_STYLE0)
  frames[47] = iconImage(ARROW_ID)
  for (let role = 0; role < 6; role++) frames[48 + role] = iconImage(0xa0 + role)
  frames[67] = iconImage(CURSOR_UP_ID)
  const cursor = sparseImage(3, 1, [
    { x: 0, y: 0, index: 0 },
    { x: 2, y: 0, index: CURSOR_ID },
  ])
  cursor.indices[1] = CURSOR_HOLE
  frames[69] = cursor
  frames[70] = iconImage(ITEMBOX_ID)
  return frames
}

export function fillSentinel(fb: Framebuffer, index = SENTINEL): void {
  fb.indices.fill(index)
}

export function pixel(fb: Framebuffer, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= fb.width || y >= fb.height) {
    throw new Error(`pixel out of range (${x},${y}) in ${fb.width}x${fb.height}`)
  }
  return fb.indices[y * fb.width + x]!
}
