/**
 * 将提取 PNG 的索引通道和透明蒙版转换为 RGBA。调用方解码 PNG 后传入完整像素。
 * R 保存调色板索引。非零 A 表示可见，缺少相应颜色时按不透明黑色输出。
 */
type Rgb = readonly [number, number, number]

export function bakeIndexedRgba(src: Uint8Array, palette: readonly Rgb[]): Uint8Array {
  const out = new Uint8Array(src.length)
  for (let i = 0; i < src.length; i += 4) {
    if ((src[i + 3] ?? 0) > 0) {
      const color = palette[src[i] ?? 0] ?? ([0, 0, 0] as const)
      out[i] = color[0]
      out[i + 1] = color[1]
      out[i + 2] = color[2]
      out[i + 3] = 255
    }
  }
  return out
}
