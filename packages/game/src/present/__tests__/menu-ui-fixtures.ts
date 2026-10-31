/** Menu chrome and digit sprite inputs; UI_TILE_SIZE is a size, while composition palette constants live separately. */
import type { IndexedImage } from '../../assets/png.js'
import {
  iconImage,
  solidIndexedImage as image,
  solidIndexedImage as solidImage,
  sparseImage,
} from './raster-fixtures.js'

/** style 0 九宫格整片不透明色。 */
export const BOX_STYLE0 = 0x11

/** style 1 九宫格整片不透明色。 */
export const BOX_STYLE1 = 0x22

export const UI_TILE_SIZE = 8

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
 * 独立按 sdlpal ui.c::PAL_DrawNumber 的步进算坐标，不调用 TS 绘制函数生成预期。
 */
export function rightDigitX(posX: number, nLength: number, placeFromRight: number): number {
  return posX - 6 + 6 * nLength - 6 * placeFromRight
}

/** 中对齐个位的左上角。actualLength 含 0 也至少画 1 位。 */
export function midOnesX(posX: number, nLength: number, actualLength: number): number {
  return posX - 6 + 3 * (nLength + actualLength)
}

/** SPRITEUI 下标与 draw-* 常量对齐。未用到的槽位留空，缺帧会让 drawBox 自己抛错。 */
export function makeUiFrames(): IndexedImage[] {
  const frames: IndexedImage[] = []
  for (let i = 0; i < 9; i++) frames[i] = solidImage(UI_TILE_SIZE, UI_TILE_SIZE, BOX_STYLE0)
  for (let i = 9; i < 18; i++) frames[i] = solidImage(UI_TILE_SIZE, UI_TILE_SIZE, BOX_STYLE1)
  frames[18] = iconImage(INFOBOX_ID)
  for (let digit = 0; digit < 10; digit++) {
    frames[19 + digit] = sparseImage(6, 8, [{ x: 0, y: 0, index: yellowDigit(digit) }])
    frames[29 + digit] = sparseImage(6, 8, [{ x: 0, y: 0, index: blueDigit(digit) }])
    frames[56 + digit] = sparseImage(6, 8, [{ x: 0, y: 0, index: cyanDigit(digit) }])
  }
  frames[39] = iconImage(SLASH_ID)
  frames[44] = solidImage(UI_TILE_SIZE, UI_TILE_SIZE, BOX_STYLE0)
  frames[45] = solidImage(UI_TILE_SIZE, UI_TILE_SIZE, BOX_STYLE0)
  frames[46] = solidImage(UI_TILE_SIZE, UI_TILE_SIZE, BOX_STYLE0)
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

/** Fresh sparse UI frame set with one absent slot; callers own the returned arrays. */
export function uiFramesWithoutSlot(omittedSlot: number): IndexedImage[] {
  const source = makeUiFrames()
  const frames: IndexedImage[] = []
  for (let slot = 0; slot < source.length; slot++) {
    if (slot !== omittedSlot) frames[slot] = source[slot]!
  }
  return frames
}
