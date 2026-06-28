/**
 * 资产迁移核心:indexed RGBA → 真彩 RGBA(asset-pipeline §3 D-c / D15)。
 *
 * 源像素 R=G=B=palette index、A=opaque mask(pal-extract `encodeIndexedPng` 约定):
 * 不透明像素(A>0)按 R 查 palette 填真彩,透明像素(A=0)保持全透明。
 * 纯转换、无 PNG IO → 可单测;PNG 编解码留在 CLI 层(bake-assets.mts)。
 */
type Rgb = readonly [number, number, number]

export function bakeIndexedRgba(src: Uint8Array, palette: readonly Rgb[]): Uint8Array {
  const out = new Uint8Array(src.length)
  for (let i = 0; i < src.length; i += 4) {
    if ((src[i + 3] ?? 0) > 0) {
      const c = palette[src[i] ?? 0] ?? ([0, 0, 0] as const)
      out[i] = c[0]
      out[i + 1] = c[1]
      out[i + 2] = c[2]
      out[i + 3] = 255
    }
    // 透明像素:out 默认 0 = 全透明
  }
  return out
}
