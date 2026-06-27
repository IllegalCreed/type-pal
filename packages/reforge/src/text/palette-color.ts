import type { DialogColor } from '@type-pal/content'
import type { Palette } from '@type-pal/shared'

/** DialogColor → palette index(GLM spec §3 真值)。内容层只存语义名,渲染层在此映射。 */
const COLOR_INDEX: Record<DialogColor, number> = {
  default: 0x4f,
  cyan: 0x8d,
  red: 0x1a,
  redAlt: 0x17,
  yellow: 0x2d,
}

/** 姓名牌 title 色(CYAN_ALT,spec §3)。 */
export const TITLE_COLOR_INDEX = 0x8c

export function colorIndex(c: DialogColor): number {
  return COLOR_INDEX[c]
}

export function resolveRgba(c: DialogColor, palette: Palette): [number, number, number] {
  return palette.colors[colorIndex(c)] ?? [255, 255, 255]
}

/** palette index → RGBA(姓名牌固定色 / 光标轮转用)。 */
export function indexToRgba(index: number, palette: Palette): [number, number, number] {
  return palette.colors[index] ?? [255, 255, 255]
}
