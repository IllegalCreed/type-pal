import type { DialogColor } from '@type-pal/content'

type Rgb = readonly [red: number, green: number, blue: number]

/** 对话色取固定的 UI 色表，场景换色时保持可读性。透明度由字模遮罩决定。 */
const DIALOG_RGB: Record<DialogColor, Rgb> = {
  default: [199, 186, 174], // 原 0x4F
  cyan: [121, 219, 186], // 原 0x8D
  red: [190, 73, 60], // 原 0x1A
  redAlt: [150, 32, 24], // 原 0x17
  yellow: [255, 223, 134], // 原 0x2D
}
/** 姓名牌色取自 UI 调色板索引 0x8C。 */
export const TITLE_RGBA: Rgb = [101, 203, 170]
/** 光标按 UI 调色板索引 0xF9 到 0xFE 的顺序轮转。 */
export const CURSOR_RGBA: readonly Rgb[] = [
  [247, 231, 109],
  [235, 211, 97],
  [227, 190, 89],
  [219, 174, 81],
  [231, 195, 93],
  [243, 219, 105],
]
export const CURSOR_COLOR_COUNT = CURSOR_RGBA.length

export function colorRgba(color: DialogColor): Rgb {
  return DIALOG_RGB[color]
}
