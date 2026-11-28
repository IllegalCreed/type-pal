/** Decode a local sprite image and release the bitmap even if drawing or readback fails. */
export async function readSpriteImagePixels(
  file: File,
): Promise<{ rgba: Uint8Array; width: number; height: number }> {
  const bitmap = await createImageBitmap(file)
  try {
    const { width, height } = bitmap
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('2d context 不可用')
    context.drawImage(bitmap, 0, 0)
    const { data } = context.getImageData(0, 0, width, height)
    return { rgba: new Uint8Array(data), width, height }
  } finally {
    bitmap.close()
  }
}
