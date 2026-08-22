import type { AssetCatalogV1, AssetId, AssetRecordV1 } from '@type-pal/content'
import type { StaticImageKind } from './static-image.js'

export type ImagePalette = readonly (readonly [number, number, number])[]

export interface QuantizedImage {
  indices: Uint8Array
  indexedRgba: Uint8ClampedArray
  previewRgba: Uint8ClampedArray
}

/** 最近色欧氏距离；相同距离保留较小色号，保证跨运行确定性。 */
export function quantizeRgbaToPalette(
  rgba: Uint8ClampedArray,
  palette: ImagePalette,
): QuantizedImage {
  if (rgba.length % 4 !== 0) throw new Error('RGBA 字节长度必须是 4 的倍数')
  if (palette.length !== 256) throw new Error('项目标准色彩必须正好包含 256 色')
  const count = rgba.length / 4
  const indices = new Uint8Array(count)
  const indexedRgba = new Uint8ClampedArray(rgba.length)
  const previewRgba = new Uint8ClampedArray(rgba.length)
  for (let pixel = 0; pixel < count; pixel++) {
    const offset = pixel * 4
    const red = rgba[offset] ?? 0
    const green = rgba[offset + 1] ?? 0
    const blue = rgba[offset + 2] ?? 0
    let best = 0
    let bestDistance = Number.POSITIVE_INFINITY
    for (let index = 0; index < palette.length; index++) {
      const color = palette[index]!
      const dr = red - color[0]
      const dg = green - color[1]
      const db = blue - color[2]
      const distance = dr * dr + dg * dg + db * db
      if (distance < bestDistance) {
        best = index
        bestDistance = distance
      }
    }
    const color = palette[best]!
    indices[pixel] = best
    indexedRgba[offset] = best
    indexedRgba[offset + 1] = best
    indexedRgba[offset + 2] = best
    indexedRgba[offset + 3] = 255
    previewRgba[offset] = color[0]
    previewRgba[offset + 1] = color[1]
    previewRgba[offset + 2] = color[2]
    previewRgba[offset + 3] = 255
  }
  return { indices, indexedRgba, previewRgba }
}

function assertPng(name: string, bytes: ArrayBuffer): void {
  if (!name.toLowerCase().endsWith('.png')) throw new Error('只允许导入 PNG 文件')
  const signature = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 8))
  const expected = [137, 80, 78, 71, 13, 10, 26, 10]
  if (signature.length !== 8 || expected.some((value, index) => signature[index] !== value))
    throw new Error(`${name}: 不是有效 PNG 文件`)
}

async function canvasPng(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('浏览器无法编码 PNG'))),
      'image/png',
    ),
  )
  return blob.arrayBuffer()
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export interface PreparedImageImport {
  sourceBytes: ArrayBuffer
  bytes: ArrayBuffer
  effectPreviewBytes?: ArrayBuffer
  width: number
  height: number
  hash: string
  record: AssetRecordV1
}

export async function prepareAuthoredImage(
  file: File,
  kind: StaticImageKind,
  palette?: ImagePalette,
  label?: string,
): Promise<PreparedImageImport> {
  const sourceBytes = await file.arrayBuffer()
  assertPng(file.name, sourceBytes)
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(new Blob([sourceBytes], { type: 'image/png' }))
  } catch (cause) {
    throw new Error(
      `${file.name}: PNG 解码失败；${cause instanceof Error ? cause.message : String(cause)}`,
    )
  }
  const width = bitmap.width
  const height = bitmap.height
  if (width <= 0 || height <= 0) {
    bitmap.close()
    throw new Error(`${file.name}: 图片尺寸无效`)
  }

  let bytes = sourceBytes.slice(0)
  let effectPreviewBytes: ArrayBuffer | undefined
  if (kind === 'battle-background') {
    if (width !== 320 || height !== 200) {
      bitmap.close()
      throw new Error(`${file.name}: 战场背景必须是 320×200，实际 ${width}×${height}`)
    }
    if (!palette) {
      bitmap.close()
      throw new Error('战场背景导入缺项目标准色彩')
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) {
      bitmap.close()
      throw new Error('浏览器无法创建图片处理画布')
    }
    context.drawImage(bitmap, 0, 0)
    const source = context.getImageData(0, 0, width, height)
    const quantized = quantizeRgbaToPalette(source.data, palette)
    const encodedImage = context.createImageData(width, height)
    encodedImage.data.set(quantized.indexedRgba)
    context.putImageData(encodedImage, 0, 0)
    bytes = await canvasPng(canvas)
    const previewImage = context.createImageData(width, height)
    previewImage.data.set(quantized.previewRgba)
    context.putImageData(previewImage, 0, 0)
    effectPreviewBytes = await canvasPng(canvas)
  }
  bitmap.close()

  const hash = await sha256Hex(bytes)
  return {
    sourceBytes,
    bytes,
    effectPreviewBytes,
    width,
    height,
    hash,
    record: {
      kind,
      path: `assets/authored/${kind}/${hash}.png`,
      mediaType: 'image/png',
      bytes: bytes.byteLength,
      sha256: hash,
      label: label || file.name.replace(/\.png$/i, ''),
      origin: { kind: 'authored', ref: file.name },
    },
  }
}

export function nextAuthoredImageId(
  catalog: AssetCatalogV1,
  kind: StaticImageKind,
  hash: string,
): AssetId {
  const base = `${kind}.authored.${hash.slice(0, 16)}`
  if (!catalog.assets[base]) return base
  for (let suffix = 2; ; suffix++) {
    const id = `${base}-${suffix}`
    if (!catalog.assets[id]) return id
  }
}
