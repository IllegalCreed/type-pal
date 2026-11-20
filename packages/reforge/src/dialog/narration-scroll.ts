/** 第一阶段的固定宽度约定以 8px 为一单位，无需加载实际字体。 */
function narrationTextUnits(text: string): number {
  let units = 0
  for (const ch of text) units += ch.charCodeAt(0) < 0x80 ? 1 : 2
  return units
}

interface NarrationScrollLayout {
  boxX: number
  boxY: number
  boxLen: number
  textX: number
  textY: number
}

/** 原始居中窗口的卷轴和文字坐标。世界拾取提示复用横向布局并指定纵坐标。 */
export function narrationScrollLayout(text: string, boxY = 40): NarrationScrollLayout {
  const units = narrationTextUnits(text)
  const boxX = 160 - units * 4
  return {
    boxX,
    boxY,
    boxLen: Math.max(1, Math.ceil(units / 2)),
    textX: boxX + 8 + ((units & 1) << 2),
    textY: boxY + 10,
  }
}
