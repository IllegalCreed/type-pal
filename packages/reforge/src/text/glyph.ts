/**
 * 字模加载 + 解码(② 外观 Task 1)。
 * 端口自 packages/game/src/present/font.ts 的 Glyph/GlyphTable/loadGlyphs(Unifont CN 简体点阵)。
 * Canvas2D 适配:bit 解码抽纯函数 decodeGlyph(可单测),canvas 涂绘 bakeGlyph 留浏览器验。
 */

export interface Glyph {
  width: number // 8 (ASCII 半宽) or 16 (CJK 全宽)
  height: number // 16
  bitmap: Uint8Array
}

export interface GlyphTable {
  has(codepoint: number): boolean
  get(codepoint: number): Glyph | undefined
}

/** glyph bitmap(MSB-first 按行)→ RGBA Uint8Array;纯函数,不碰 DOM。亮像素=rgba+α255,暗像素=α0。 */
export function decodeGlyph(glyph: Glyph, rgba: readonly [number, number, number]): Uint8Array {
  const out = new Uint8Array(glyph.width * glyph.height * 4)
  const bytesPerRow = Math.ceil(glyph.width / 8)
  for (let row = 0; row < glyph.height; row++) {
    for (let col = 0; col < glyph.width; col++) {
      const byteIdx = row * bytesPerRow + Math.floor(col / 8)
      const bit = ((glyph.bitmap[byteIdx] ?? 0) >> (7 - (col % 8))) & 1
      if (bit) {
        const o = (row * glyph.width + col) * 4
        out[o] = rgba[0]
        out[o + 1] = rgba[1]
        out[o + 2] = rgba[2]
        out[o + 3] = 255
      }
    }
  }
  return out
}

// ── loadGlyphs(browser 环境,fetch glyphs.json) ────────────────────────

export async function loadGlyphs(baseUrl = '/extracted'): Promise<GlyphTable> {
  const res = await fetch(`${baseUrl}/data/font/glyphs.json`)
  if (!res.ok) throw new Error(`font: fetch glyphs.json failed (${res.status})`)
  const data = (await res.json()) as {
    glyphs: { codepoint: number; width: number; height: number; bitmapBase64: string }[]
  }
  const map = new Map<number, Glyph>()
  for (const g of data.glyphs) {
    map.set(g.codepoint, {
      width: g.width,
      height: g.height,
      bitmap: Uint8Array.from(atob(g.bitmapBase64), (c) => c.charCodeAt(0)),
    })
  }
  return {
    has: (cp) => map.has(cp),
    get: (cp) => map.get(cp),
  }
}

// ── bakeGlyph(canvas 涂绘 + 缓存,浏览器验) ────────────────────────────

const cache = new Map<string, HTMLCanvasElement>()

function glyphCacheKey(cp: number, rgba: readonly [number, number, number]): string {
  return `${cp}:${rgba[0]},${rgba[1]},${rgba[2]}`
}

/** decodeGlyph 结果涂到离屏 canvas;按 (cp,色) 缓存。canvas 部分浏览器验。 */
export function bakeGlyph(
  cp: number,
  glyph: Glyph,
  rgba: readonly [number, number, number],
): HTMLCanvasElement {
  const key = glyphCacheKey(cp, rgba)
  const hit = cache.get(key)
  if (hit) return hit
  const cvs = document.createElement('canvas')
  cvs.width = glyph.width
  cvs.height = glyph.height
  const ctx = cvs.getContext('2d')
  if (!ctx) throw new Error('reforge: glyph 2d context 不可用')
  const img = ctx.createImageData(glyph.width, glyph.height)
  img.data.set(decodeGlyph(glyph, rgba))
  ctx.putImageData(img, 0, 0)
  cache.set(key, cvs)
  return cvs
}
