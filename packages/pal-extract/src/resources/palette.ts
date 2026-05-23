import type { Palette, PaletteCycle } from '@type-pal/shared'

/**
 * 调色板 VGA(0-63)→ RGB(0-255)。256 色 × 3 字节 = 768 字节。
 * 升 8-bit 用 `(v << 2) | (v >> 4)`(等效 ×255/63,无浮点)。
 *
 * 循环动画段(cycles)在 M1 先返回空 —— 实施时若发现切片场景有循环段,
 * 再加从 MGO.MKF 解析的逻辑。
 *
 * 参考 reference/sdlpal/palette.c。
 */
export function decodePalette(buf: Uint8Array, cycles: PaletteCycle[] = []): Palette {
  const colors: Palette['colors'] = []
  for (let i = 0; i < 256; i++) {
    // biome-ignore lint/style/noNonNullAssertion: buf is 768 bytes, index always in bounds
    const r6 = buf[i * 3]!
    // biome-ignore lint/style/noNonNullAssertion: buf is 768 bytes, index always in bounds
    const g6 = buf[i * 3 + 1]!
    // biome-ignore lint/style/noNonNullAssertion: buf is 768 bytes, index always in bounds
    const b6 = buf[i * 3 + 2]!
    const r = ((r6 << 2) | (r6 >> 4)) & 0xff
    const g = ((g6 << 2) | (g6 >> 4)) & 0xff
    const b = ((b6 << 2) | (b6 >> 4)) & 0xff
    colors.push([r, g, b])
  }
  return { colors, cycles }
}
