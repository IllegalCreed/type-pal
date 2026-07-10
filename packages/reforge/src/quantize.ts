/**
 * 上传素材量化(W7B,D25 第 4 条)—— 全彩 RGBA → 盘 0 索引(最近邻色距),
 * 输出 RleFrame(索引 + opaque),经 encodeSpriteChunk 落盘为原版同构 tileset。
 * 「调色盘」是内部机制:作者上传即量化,零调色盘知识(D25 定案)。
 */
import type { Palette, RleFrame } from '@type-pal/shared'

/** alpha 阈值:< 128 视为 RLE 透明(跳段),否则量化为最近盘色。 */
const ALPHA_OPAQUE = 128

/**
 * RGBA 像素块 → 盘 0 索引帧。最近邻 RGB 欧氏距离;同色缓存(素材色彩重复率高,
 * 缓存后大图集量化为毫秒级)。
 */
export function quantizeToRleFrame(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  palette: Palette,
): RleFrame {
  if (rgba.length < width * height * 4)
    throw new Error(`quantize: 像素数据不足(需 ${width * height * 4}B,得 ${rgba.length}B)`)
  const colors = palette.colors
  const cache = new Map<number, number>()
  const nearest = (r: number, g: number, b: number): number => {
    const key = (r << 16) | (g << 8) | b
    const hit = cache.get(key)
    if (hit !== undefined) return hit
    let best = 0
    let bestD = Number.POSITIVE_INFINITY
    for (let i = 0; i < colors.length; i++) {
      const c = colors[i]
      if (!c) continue
      const dr = r - c[0]
      const dg = g - c[1]
      const db = b - c[2]
      const d = dr * dr + dg * dg + db * db
      if (d < bestD) {
        bestD = d
        best = i
        if (d === 0) break
      }
    }
    cache.set(key, best)
    return best
  }
  const total = width * height
  const pixels = new Uint8Array(total)
  const opaque = new Uint8Array(total)
  for (let i = 0; i < total; i++) {
    const o = i * 4
    if ((rgba[o + 3] ?? 0) < ALPHA_OPAQUE) continue // 透明:opaque=0,pixels 占位 0
    pixels[i] = nearest(rgba[o] ?? 0, rgba[o + 1] ?? 0, rgba[o + 2] ?? 0)
    opaque[i] = 1
  }
  return { width, height, pixels, opaque }
}

/** 等距网格切片:图集 (imgW×imgH) 按 tileW×tileH 均分,行优先产出每格的 RGBA 子块。 */
export function sliceAtlasGrid(
  rgba: Uint8Array | Uint8ClampedArray,
  imgW: number,
  imgH: number,
  tileW: number,
  tileH: number,
): { rgba: Uint8Array; width: number; height: number }[] {
  if (tileW <= 0 || tileH <= 0) throw new Error('slice: 瓦片尺寸须为正')
  const cols = Math.floor(imgW / tileW)
  const rows = Math.floor(imgH / tileH)
  const out: { rgba: Uint8Array; width: number; height: number }[] = []
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const tile = new Uint8Array(tileW * tileH * 4)
      for (let y = 0; y < tileH; y++) {
        const srcOff = ((ty * tileH + y) * imgW + tx * tileW) * 4
        tile.set(rgba.subarray(srcOff, srcOff + tileW * 4), y * tileW * 4)
      }
      out.push({ rgba: tile, width: tileW, height: tileH })
    }
  }
  return out
}
