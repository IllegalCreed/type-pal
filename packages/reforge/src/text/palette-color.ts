import type { DialogColor } from '@type-pal/content'
import type { Palette } from '@type-pal/shared'

/** 对话 UI 固定 RGBA(原版 pal0 的 UI index 快照;D15:不再绑场景 palette)。 */
const DIALOG_RGBA: Record<DialogColor, readonly [number, number, number]> = {
  default: [199, 186, 174], // 原 0x4F
  cyan: [121, 219, 186], // 原 0x8D
  red: [190, 73, 60], // 原 0x1A
  redAlt: [150, 32, 24], // 原 0x17
  yellow: [255, 223, 134], // 原 0x2D
}
/** 姓名牌 title 色(原 0x8C)。 */
export const TITLE_RGBA: readonly [number, number, number] = [101, 203, 170]
/** 光标闪烁 6 色轮转(原 palette 0xF9-0xFE 快照)。 */
export const CURSOR_RGBA: readonly (readonly [number, number, number])[] = [
  [247, 231, 109],
  [235, 211, 97],
  [227, 190, 89],
  [219, 174, 81],
  [231, 195, 93],
  [243, 219, 105],
]
export const CURSOR_COLOR_COUNT = 6

export function colorRgba(c: DialogColor): readonly [number, number, number] {
  return DIALOG_RGBA[c]
}

// ── 旧 palette 版 API(暂留:dialog-box 仍引用;Task 4 删)。 ─────────────────────
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
