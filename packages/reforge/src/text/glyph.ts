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
  /** 真实解析表提供；轻量测试/调用方实现可省略。 */
  readonly size?: number
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

// ── loadGlyphs(browser 环境,bundler-owned Unifont BDF) ───────────────

/** BDF 纯解析核；codepoint 0 是 .notdef，沿用一阶段口径不进入可显示字形表。 */
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

import { ENGINE_CHROME } from '../engine-chrome/registry.js'
