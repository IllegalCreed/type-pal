import type { AssetRecordV1 } from '@type-pal/content'
import { sha256Hex } from '../../core/binary-signature.js'
import { UpsertAssetCommand } from '../../core/commands.js'
import type { EditSession } from '../../core/edit-session.js'
import type { StaticImageKind } from '../../core/static-image.js'

/** 交替色真实像素块（解码/量化期望的独立计算输入）。 */
export function patternedRgba(
  width: number,
  height: number,
  colors: readonly (readonly [number, number, number, number])[],
): Uint8Array {
  const rgba = new Uint8Array(width * height * 4)
  for (let pixel = 0; pixel < width * height; pixel += 1)
    rgba.set(colors[pixel % colors.length]!, pixel * 4)
  return rgba
}

/** 真实命令播种静态图像：record 的 bytes/sha256 与真实 PNG 字节自洽（guard 可接受）。 */
export async function seedImage(
  session: EditSession,
  input: { id: string; kind: StaticImageKind; label?: string; png: Uint8Array },
): Promise<{ record: AssetRecordV1; bytes: ArrayBuffer }> {
  const bytes = Uint8Array.from(input.png).buffer
  const sha256 = await sha256Hex(bytes)
  const record: AssetRecordV1 = {
    kind: input.kind,
    path: `assets/authored/${input.kind}/${sha256}.png`,
    mediaType: 'image/png',
    bytes: bytes.byteLength,
    sha256,
    ...(input.label ? { label: input.label } : {}),
    origin: { kind: 'authored', ref: `${input.label ?? input.id}.png` },
  }
  session.dispatch(new UpsertAssetCommand(input.id, record, bytes))
  return { record, bytes }
}

/** 独立真实解码 oracle：经同一硬件端口真实解码 PNG 字节并逐像素读回。 */
export async function decodePngPixels(
  bytes: ArrayBuffer | Uint8Array,
): Promise<{ width: number; height: number; rgba: Uint8ClampedArray }> {
  const buffer = bytes instanceof Uint8Array ? Uint8Array.from(bytes).buffer : bytes
  const bitmap = await createImageBitmap(new Blob([buffer], { type: 'image/png' }))
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  try {
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('解码画布不可用')
    context.drawImage(bitmap, 0, 0)
    const image = context.getImageData(0, 0, canvas.width, canvas.height)
    return { width: canvas.width, height: canvas.height, rgba: image.data }
  } finally {
    bitmap.close()
  }
}
