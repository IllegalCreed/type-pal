import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadGlyphs } from './font.js'

describe('glyph loading', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loadGlyphs 把 bitmapBase64 解成字节，并能按码位取回', async () => {
    const bitmap = new Uint8Array(16)
    bitmap[0] = 0x80
    bitmap[1] = 0x3c
    const bitmapBase64 = btoa(String.fromCharCode(...bitmap))
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
    expect(table.get(0x41)?.height).toBe(16)
    expect(Array.from(table.get(0x41)?.bitmap ?? [])).toEqual(Array.from(bitmap))
    expect(table.has(0x42)).toBe(false)
    expect(table.get(0x42)).toBeUndefined()
  })

  it('loadGlyphs 把调用方给的 baseUrl 接到 /data/font/glyphs.json', async () => {
    const calls: string[] = []
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      calls.push(String(input))
      return Promise.resolve(new Response(JSON.stringify({ glyphs: [] }), { status: 200 }))
    })
    await loadGlyphs('https://cdn.example/pack')
    expect(calls).toEqual(['https://cdn.example/pack/data/font/glyphs.json'])
  })

  it('字形清单 HTTP 失败时，错误文本带上状态码', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('no', { status: 404 })))
    let message = ''
    try {
      await loadGlyphs('/missing')
    } catch (error) {
      message = error instanceof Error ? error.message : ''
    }
    expect(message).toBe('font: fetch glyphs.json failed (404)')
  })

  it('字形清单为空时，has 为假且 get 为 undefined', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(new Response(JSON.stringify({ glyphs: [] }), { status: 200 })),
    )
    const table = await loadGlyphs('/empty')
    expect(table.has(0x41)).toBe(false)
    expect(table.get(0x41)).toBeUndefined()
  })
})
