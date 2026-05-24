/**
 * 索引位图 PNG 加载。
 * pal-extract 用 RGBA 四通道方式存索引位图:
 *   - R = G = B = palette index(运行时取 R)
 *   - A = opaque mask(M3.5 fix:>0 即 opaque,= 0 即 RLE-skip 透明)
 *
 * 之前忽略 A、永远当 opaque,运行时 blit 用 `idx === 0 continue` 判定透明 ——
 * 把 RLE-skip 透明与 opaque palette-0 合并 → scene 16 通道 tile / 角色 sprite
 * 头发暗部凡 palette 0 全被误判为透明。修法:读出来时同时取 R + A 两通道,
 * 构造 indices + opaque,blit 端按 opaque 判透明。
 */

export interface IndexedImage {
  width: number
  height: number
  /** palette index,长度 = width * height。只有 `opaque[i] > 0` 时才有效。 */
  indices: Uint8Array
  /** opaque mask,长度 = width * height。1 = 写入像素;0 = RLE-skip 透明,blit 跳过。
   *  battle-bg 等无 RLE 的位图统一构造为全 1(全 opaque)。 */
  opaque: Uint8Array
}

export async function decodePngToIndices(source: Blob): Promise<IndexedImage> {
  const bitmap = await createImageBitmap(source).catch((cause: unknown) => {
    throw new Error(
      `decodePngToIndices: failed to decode PNG blob (${source.size}B, type=${source.type})`,
      { cause },
    )
  })
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('decodePngToIndices: 2d context unavailable')
    ctx.drawImage(bitmap, 0, 0)
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const total = canvas.width * canvas.height
    const indices = new Uint8Array(total)
    const opaque = new Uint8Array(total)
    for (let i = 0; i < total; i++) {
      indices[i] = img.data[i * 4]!
      opaque[i] = img.data[i * 4 + 3]! > 0 ? 1 : 0
    }
    return { width: canvas.width, height: canvas.height, indices, opaque }
  } finally {
    bitmap.close()
  }
}
