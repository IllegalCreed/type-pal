import type { Palette, PaletteCycle } from '@type-pal/shared'

/**
 * 解一个 256-色块(768 字节)VGA(0-63)→ RGB(0-255)。
 * 升 8-bit 用 `(v << 2) | (v >> 4)`(等效 ×255/63,无浮点)。
 * @param offset 块在 buf 内的起始字节(白天=0,夜间=768)。
 */
function decodeColorBlock(buf: Uint8Array, offset: number): Palette['colors'] {
  const colors: Palette['colors'] = []
  for (let i = 0; i < 256; i++) {
    const r6 = buf[offset + i * 3] ?? 0
    const g6 = buf[offset + i * 3 + 1] ?? 0
    const b6 = buf[offset + i * 3 + 2] ?? 0
    const r = ((r6 << 2) | (r6 >> 4)) & 0xff
    const g = ((g6 << 2) | (g6 >> 4)) & 0xff
    const b = ((b6 << 2) | (b6 >> 4)) & 0xff
    colors.push([r, g, b])
  }
  return colors
}

/**
 * 调色板 VGA(0-63)→ RGB(0-255)。一个 PAT.MKF chunk = 256 色 × 3 = 768 字节(纯白天),
 * 或 1536 字节(白天 256 + 夜间 256,sdlpal `PAL_GetPalette(n, fNight)` 真值,palette.c:
 * `buf[(fNight ? 256*3 : 0) + i*3]`)。实测 PAT.MKF 仅 chunk #0/#5 含夜间半。
 *
 * 循环动画段(cycles)在 M1 先返回空 —— 实施时若发现切片场景有循环段,
 * 再加从 MGO.MKF 解析的逻辑。
 *
 * 参考 reference/sdlpal/palette.c PAL_GetPalette。
 */
export function decodePalette(buf: Uint8Array, cycles: PaletteCycle[] = []): Palette {
  const colors = decodeColorBlock(buf, 0)
  // 后半 256 色(768..1535)= 夜间调色板;sdlpal 判据 `i <= 256*3` 时无夜色(palette.c PAL_GetPalette)。
  const nightColors = buf.byteLength > 768 ? decodeColorBlock(buf, 768) : undefined
  return nightColors ? { colors, cycles, nightColors } : { colors, cycles }
}
