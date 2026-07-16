export interface DecodedImageFrame {
  readonly name: string
  readonly width: number
  readonly height: number
  readonly rgba: Uint8Array
}

const natural = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

export function sortFrameImageFiles(files: readonly File[]): File[] {
  return [...files].sort((left, right) => natural.compare(left.name, right.name))
}

export function assertFrameImageFile(file: File): void {
  if (
    !file.type.startsWith('image/png') &&
    !file.type.startsWith('image/jpeg') &&
    !file.type.startsWith('image/webp') &&
    !/\.(png|jpe?g|webp)$/i.test(file.name)
  )
    throw new Error(`${file.name}: 只支持 PNG、JPEG 或 WebP`)
}

export async function decodeFrameImage(file: File): Promise<DecodedImageFrame> {
  assertFrameImageFile(file)
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error(`${file.name}: 无法创建 2D 画布`)
    context.clearRect(0, 0, bitmap.width, bitmap.height)
    context.drawImage(bitmap, 0, 0)
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data
    return {
      name: file.name,
      width: bitmap.width,
      height: bitmap.height,
      rgba: new Uint8Array(pixels.buffer.slice(0)),
    }
  } finally {
    bitmap.close()
  }
}

export async function decodeFrameImages(
  files: readonly File[],
  options: { preserveOrder?: boolean } = {},
): Promise<DecodedImageFrame[]> {
  const ordered = options.preserveOrder ? [...files] : sortFrameImageFiles(files)
  if (ordered.length === 0) throw new Error('至少选择一张图片')
  const decoded: DecodedImageFrame[] = []
  for (const file of ordered) decoded.push(await decodeFrameImage(file))
  const first = decoded[0]
  if (!first) throw new Error('图片序列为空')
  const mismatch = decoded.find(
    (frame) => frame.width !== first.width || frame.height !== first.height,
  )
  if (mismatch)
    throw new Error(
      `${mismatch.name}: 尺寸 ${mismatch.width}x${mismatch.height}，` +
        `应与首帧 ${first.width}x${first.height} 一致`,
    )
  return decoded
}
