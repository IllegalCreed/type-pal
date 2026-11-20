import { ENGINE_CHROME } from '../engine-chrome/registry.js'

/** 文本没有可用字模时仍保留一个全宽字符的间距。 */
export const FALLBACK_GLYPH_WIDTH = 16

export interface Glyph {
  width: number
  height: number
  bitmap: Uint8Array
}

export interface GlyphTable {
  /** 真实解析表提供；轻量测试/调用方实现可省略。 */
  readonly size?: number
  has(codepoint: number): boolean
  get(codepoint: number): Glyph | undefined
}

/** 点阵逐行按最高位在前解码。亮点使用指定 RGB，未置位的像素保持透明。 */
export function decodeGlyph(glyph: Glyph, rgb: readonly [number, number, number]): Uint8Array {
  const out = new Uint8Array(glyph.width * glyph.height * 4)
  const bytesPerRow = Math.ceil(glyph.width / 8)
  for (let row = 0; row < glyph.height; row++) {
    for (let col = 0; col < glyph.width; col++) {
      const byteIdx = row * bytesPerRow + Math.floor(col / 8)
      const bit = ((glyph.bitmap[byteIdx] ?? 0) >> (7 - (col % 8))) & 1
      if (bit) {
        const o = (row * glyph.width + col) * 4
        out[o] = rgb[0]
        out[o + 1] = rgb[1]
        out[o + 2] = rgb[2]
        out[o + 3] = 255
      }
    }
  }
  return out
}

/** 从引擎自带的 Unifont 取字形。编码 0 和未分配码点不进入显示表。 */
export function parseBdfGlyphs(text: string, source = 'BDF'): GlyphTable {
  const lines = text.split(/\r?\n/)
  const map = new Map<number, Glyph>()
  for (let index = 0; index < lines.length; index++) {
    if (!lines[index]?.trim().startsWith('STARTCHAR')) continue
    let codepoint = -1
    let width = 16
    let height = 16
    while (index < lines.length) {
      const line = lines[index]?.trim() ?? ''
      if (line.startsWith('ENCODING')) codepoint = Number.parseInt(line.split(/\s+/)[1] ?? '', 10)
      else if (line.startsWith('BBX')) {
        const parts = line.split(/\s+/)
        width = Number.parseInt(parts[1] ?? '16', 10)
        height = Number.parseInt(parts[2] ?? '16', 10)
      } else if (line === 'BITMAP') {
        index++
        break
      }
      index++
    }
    const bytesPerRow = Math.ceil(width / 8)
    const bitmap = new Uint8Array(bytesPerRow * height)
    for (let row = 0; row < height && index < lines.length; row++, index++) {
      const hexRow = lines[index]?.trim() ?? ''
      if (hexRow === 'ENDCHAR') break
      for (let byte = 0; byte < bytesPerRow; byte++)
        bitmap[row * bytesPerRow + byte] =
          Number.parseInt(hexRow.slice(byte * 2, byte * 2 + 2), 16) || 0
    }
    while (index < lines.length && lines[index]?.trim() !== 'ENDCHAR') index++
    if (codepoint > 0) map.set(codepoint, { width, height, bitmap })
  }
  if (map.size === 0) throw new Error(`引擎 chrome 字形为空:${source}`)
  return {
    size: map.size,
    has: (cp) => map.has(cp),
    get: (cp) => map.get(cp),
  }
}

export async function loadGlyphs(url = ENGINE_CHROME.fontBdf): Promise<GlyphTable> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`引擎 chrome 字形加载失败(${res.status}):${url}`)
  return parseBdfGlyphs(await res.text(), url)
}

const cache = new WeakMap<Glyph, Map<string, HTMLCanvasElement>>()

/** 缓存归字形对象。同一字符在不同字形表中可以有不同点阵。 */
export function bakeGlyph(glyph: Glyph, rgb: readonly [number, number, number]): HTMLCanvasElement {
  const key = rgb.join(',')
  const colors = cache.get(glyph)
  const hit = colors?.get(key)
  if (hit) return hit
  const cvs = document.createElement('canvas')
  cvs.width = glyph.width
  cvs.height = glyph.height
  const ctx = cvs.getContext('2d')
  if (!ctx) throw new Error('reforge: glyph 2d context 不可用')
  const img = ctx.createImageData(glyph.width, glyph.height)
  img.data.set(decodeGlyph(glyph, rgb))
  ctx.putImageData(img, 0, 0)
  if (colors) colors.set(key, cvs)
  else cache.set(glyph, new Map([[key, cvs]]))
  return cvs
}
