/**
 * 对话资产加载(② 外观 Task 5 光标 + Task 6 头像)。
 * 端口自 packages/game/src/assets/dialog-assets.ts。
 * Canvas2D 适配:光标 sprite → tint bake(6 步轮转);头像 → index PNG + palette 着色 bake。
 */
import { type Palette, parseSpriteChunk, type RleFrame } from '@type-pal/shared'

/** base64 → bytes(浏览器 atob)。 */
function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

interface DialogIconsRaw {
  source: string
  size: number
  base64: string
}

interface IndexedImage {
  width: number
  height: number
  indices: Uint8Array // palette index(R=G=B,见 game/png.ts 注释)
  opaque: Uint8Array // 1=不透明,0=透明
}

/** 单个光标 frame → 离屏 canvas,不透明像素染成指定 rgba(透明背景)。
 *  6 色轮转:DialogBox 对同一 frame 用 palette[0xF9+step] 6 色 bake 出 6 个 canvas,缓存 by step。 */
export function bakeCursorTinted(
  frame: RleFrame,
  rgba: readonly [number, number, number],
): HTMLCanvasElement {
  const { width, height, opaque } = frame
  const cvs = document.createElement('canvas')
  cvs.width = width
  cvs.height = height
  const ctx = cvs.getContext('2d')
  if (!ctx) throw new Error('reforge: cursor 2d context 不可用')
  const img = ctx.createImageData(width, height)
  const n = width * height
  for (let i = 0; i < n; i++) {
    if (opaque[i]) {
      const o = i * 4
      img.data[o] = rgba[0]
      img.data[o + 1] = rgba[1]
      img.data[o + 2] = rgba[2]
      img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return cvs
}

/** palette 0xF9-0xFE 6 色(spec §3 光标闪烁色轮转起始)。 */
export const CURSOR_COLOR_START = 0xf9
export const CURSOR_COLOR_COUNT = 6

/** 解码光标 sprite frames(DATA chunk12),bake 推迟到 DialogBox(它持 palette,按 step bake+缓存)。 */
export async function loadCursorFrames(baseUrl = '/extracted'): Promise<RleFrame[]> {
  const res = await fetch(`${baseUrl}/data/dialog-icons-raw.json`)
  if (!res.ok) throw new Error(`dialog-assets: dialog-icons-raw.json fetch failed (${res.status})`)
  const entry = (await res.json()) as DialogIconsRaw
  return parseSpriteChunk(base64ToBytes(entry.base64))
}

/**
 * 端口自 packages/game/src/assets/png.ts:decodePngToIndices。
 * portraits PNG 是「index 位图」(R=G=B=palette index,A=opaque mask),
 * 不能直接 drawImage(会黑白),需解回 indices + opaque 再用 palette 着色 bake。
 */
async function decodePngToIndices(blob: Blob): Promise<IndexedImage> {
  const bitmap = await createImageBitmap(blob).catch((cause: unknown) => {
    throw new Error(`decodePngToIndices: PNG decode 失败 (${blob.size}B)`, { cause })
  })
  try {
    const cvs = document.createElement('canvas')
    cvs.width = bitmap.width
    cvs.height = bitmap.height
    const ctx = cvs.getContext('2d')
    if (!ctx) throw new Error('decodePngToIndices: 2d context 不可用')
    ctx.drawImage(bitmap, 0, 0)
    const img = ctx.getImageData(0, 0, cvs.width, cvs.height)
    const total = cvs.width * cvs.height
    const indices = new Uint8Array(total)
    const opaque = new Uint8Array(total)
    for (let i = 0; i < total; i++) {
      indices[i] = img.data[i * 4] ?? 0
      opaque[i] = (img.data[i * 4 + 3] ?? 0) > 0 ? 1 : 0
    }
    return { width: cvs.width, height: cvs.height, indices, opaque }
  } finally {
    bitmap.close()
  }
}

/** indexed 图 → 用 palette 着色 bake 成 canvas(同 render.ts bakeFrame 思路)。 */
function bakeIndexedImage(img: IndexedImage, palette: Palette): HTMLCanvasElement {
  const cvs = document.createElement('canvas')
  cvs.width = img.width
  cvs.height = img.height
  const ctx = cvs.getContext('2d')
  if (!ctx) throw new Error('bakeIndexedImage: 2d context 不可用')
  const out = ctx.createImageData(img.width, img.height)
  const n = img.width * img.height
  for (let i = 0; i < n; i++) {
    if (img.opaque[i]) {
      const c = palette.colors[img.indices[i] ?? 0] ?? [0, 0, 0]
      const o = i * 4
      out.data[o] = c[0] ?? 0
      out.data[o + 1] = c[1] ?? 0
      out.data[o + 2] = c[2] ?? 0
      out.data[o + 3] = 255
    }
  }
  ctx.putImageData(out, 0, 0)
  return cvs
}

/**
 * 加载头像 PNG(`/extracted/images/portraits/XX.png`)。
 * ⚠ portraits 是 index 位图(灰度=palette index),不能直接 drawImage,需 decodePngToIndices +
 * palette 着色 bake。鬼魂无原版头像,用原版某 chunk 占位。
 * 返回 Map<chunkIndex, HTMLCanvasElement>。失败项跳过(降级无头像)。
 */
export async function loadPortraits(
  chunkIndices: readonly number[],
  palette: Palette,
  baseUrl = '/extracted',
): Promise<Map<number, HTMLCanvasElement>> {
  const map = new Map<number, HTMLCanvasElement>()
  await Promise.all(
    chunkIndices.map(async (chunk) => {
      try {
        const res = await fetch(
          `${baseUrl}/images/portraits/${chunk.toString().padStart(2, '0')}.png`,
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const indexed = await decodePngToIndices(await res.blob())
        map.set(chunk, bakeIndexedImage(indexed, palette))
      } catch (err) {
        console.warn(`dialog-assets: portrait ${chunk} 加载失败,跳过:`, err)
      }
    }),
  )
  return map
}
