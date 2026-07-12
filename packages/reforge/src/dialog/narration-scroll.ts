/** 原版 PAL_CreateSingleLineBox 使用的半角单位：半角=1，全角=2。 */
export function narrationTextUnits(text: string): number {
  let units = 0
  for (const ch of text) units += (ch.codePointAt(0) ?? 0) < 0x80 ? 1 : 2
  return units
}

export interface NarrationScrollLayout {
  boxX: number
  boxY: number
  boxLen: number
  textX: number
  textY: number
}

/** 对齐一阶段 drawNarrationDialog / sdlpal text.c:1663-1710。 */
export function narrationScrollLayout(text: string): NarrationScrollLayout {
  const units = narrationTextUnits(text)
  const boxX = 160 - units * 4
  const boxY = 40
  return {
    boxX,
    boxY,
    boxLen: Math.max(1, Math.floor((units + 1) / 2)),
    textX: boxX + 8 + ((units & 1) << 2),
    textY: boxY + 10,
  }
}
