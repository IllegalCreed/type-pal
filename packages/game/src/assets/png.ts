/**
 * 索引位图 PNG 加载。
 * pal-extract 用 RGBA 三通道复制法(R=G=B=调色板下标,A=255)存索引位图。
 * 运行时只取 R 通道当索引,丢 GBA。
 */

export interface IndexedImage {
  width: number
  height: number
  indices: Uint8Array
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
    const indices = new Uint8Array(canvas.width * canvas.height)
    for (let i = 0; i < indices.length; i++) {
      indices[i] = img.data[i * 4]!
    }
    return { width: canvas.width, height: canvas.height, indices }
  } finally {
    bitmap.close()
  }
}
