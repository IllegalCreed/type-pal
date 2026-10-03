/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G05-B。
 * 不重复 font.glm 的逐字色、豆腐框和缺字形 16px 测量。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type Glyph,
  type GlyphTable,
  loadGlyphs,
  measureText,
  palCharWidth,
  palWordWidth,
  renderText,
} from './font.js'
import { createFramebuffer, type Framebuffer } from './framebuffer.js'

function at(fb: Framebuffer, x: number, y: number): number {
  return fb.indices[y * 320 + x] ?? 0
}

function dotGlyph(width: number): Glyph {
  const bytesPerRow = Math.ceil(width / 8)
  const bitmap = new Uint8Array(bytesPerRow * 16)
  bitmap[0] = 0x80
  return { width, height: 16, bitmap }
}

function glyphs(specs: Record<string, number>): GlyphTable {
  const map = new Map<number, Glyph>()
  for (const [ch, width] of Object.entries(specs)) {
    const cp = ch.codePointAt(0)
    if (cp === undefined) continue
    map.set(cp, dotGlyph(width))
  }
  return {
    has: (cp) => map.has(cp),
    get: (cp) => map.get(cp),
  }
}

describe('G05-B font 宽度与字形装载', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('G05-B01 palCharWidth 在 0x7F 仍是 8，0x80 起是 16', () => {
    expect(palCharWidth(0x7f)).toBe(8)
    expect(palCharWidth(0x80)).toBe(16)
  })

  it('G05-B02 空串的 palWordWidth 是 0', () => {
    expect(palWordWidth('')).toBe(0)
  })

  it('G05-B03 四个 ASCII 的 palWordWidth 是 2，不是字符串长度 4', () => {
    expect(palWordWidth('ABCD')).toBe(2)
  })

  it('G05-B04 两个全角字的 palWordWidth 等于 2', () => {
    expect(palWordWidth('金钱')).toBe(2)
  })

  it('G05-B05 两个 ASCII 加一个全角的 palWordWidth 是 2，不是 3', () => {
    expect(palWordWidth('AA金')).toBe(2)
  })

  it('G05-B06 loadGlyphs 把 bitmapBase64 解成字节，并能按码位取回', async () => {
    const bitmapBase64 = btoa(String.fromCharCode(0x80, 0x3c))
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            glyphs: [{ codepoint: 0x41, width: 8, height: 16, bitmapBase64 }],
          }),
          { status: 200 },
        ),
      ),
    )
    const table = await loadGlyphs()
    expect(table.has(0x41)).toBe(true)
    expect(table.get(0x41)?.width).toBe(8)
    expect(Array.from(table.get(0x41)?.bitmap ?? [])).toEqual([0x80, 0x3c])
    expect(table.has(0x42)).toBe(false)
    expect(table.get(0x42)).toBeUndefined()
  })

  it('G05-B07 loadGlyphs 把调用方给的 baseUrl 接到 /data/font/glyphs.json', async () => {
    const calls: string[] = []
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      calls.push(String(input))
      return Promise.resolve(new Response(JSON.stringify({ glyphs: [] }), { status: 200 }))
    })
    await loadGlyphs('https://cdn.example/pack')
    expect(calls).toEqual(['https://cdn.example/pack/data/font/glyphs.json'])
  })

  it('G05-B08 字形清单 HTTP 失败时，错误文本带上状态码', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('no', { status: 404 })))
    let message = ''
    try {
      await loadGlyphs('/missing')
    } catch (error) {
      message = error instanceof Error ? error.message : ''
    }
    expect(message).toBe('font: fetch glyphs.json failed (404)')
  })

  it('G05-B09 字形清单为空时，has 为假且 get 为 undefined', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(new Response(JSON.stringify({ glyphs: [] }), { status: 200 })),
    )
    const table = await loadGlyphs('/empty')
    expect(table.has(0x41)).toBe(false)
    expect(table.get(0x41)).toBeUndefined()
  })

  it('G05-B10 表里有宽 8 的字形时，measureText 返回 8', () => {
    expect(measureText('A', glyphs({ A: 8 }))).toBe(8)
  })

  it('G05-B11 renderText 半角加全角返回 24，第二字落在 x+8', () => {
    const fb = createFramebuffer()
    const width = renderText(fb, 'A乙', 4, 8, 0x22, glyphs({ A: 8, 乙: 16 }), false)
    expect(width).toBe(24)
    expect(at(fb, 4, 8)).toBe(0x22)
    expect(at(fb, 12, 8)).toBe(0x22)
  })

  it('G05-B12 renderText 打开阴影时，右、下、右下三点是 0，原点仍是前景', () => {
    const fb = createFramebuffer()
    fb.indices.fill(77)
    renderText(fb, '甲', 10, 20, 0x11, glyphs({ 甲: 16 }), true)
    expect(at(fb, 10, 20)).toBe(0x11)
    expect(at(fb, 11, 20)).toBe(0)
    expect(at(fb, 10, 21)).toBe(0)
    expect(at(fb, 11, 21)).toBe(0)
  })

  it('G05-B13 renderText 关闭阴影时，右、下、右下保持底色', () => {
    const fb = createFramebuffer()
    fb.indices.fill(77)
    renderText(fb, '甲', 10, 20, 0x11, glyphs({ 甲: 16 }), false)
    expect(at(fb, 10, 20)).toBe(0x11)
    expect(at(fb, 11, 20)).toBe(77)
    expect(at(fb, 10, 21)).toBe(77)
    expect(at(fb, 11, 21)).toBe(77)
  })

  it('G05-B14 空字符串 renderText 返回 0，并且不改像素', () => {
    const fb = createFramebuffer()
    fb.indices.fill(77)
    expect(renderText(fb, '', 4, 8, 0x22, glyphs({}), false)).toBe(0)
    expect(at(fb, 4, 8)).toBe(77)
  })
})
