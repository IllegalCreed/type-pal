/** Parallel publication, repeated entries and independent manifest failure ownership. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bytesToBase64, indexedPng, twoFrameChunk } from '../__tests__/asset-fixtures.js'
import { loadDialogAssets } from './dialog-assets.js'

const PORTRAITS = '/extracted/data/portraits.json'

const ICONS = '/extracted/data/dialog-icons-raw.json'

function portraitUrl(chunkIndex: number): string {
  return `/extracted/images/portraits/${chunkIndex.toString().padStart(2, '0')}.png`
}

function encodedPngResponse(bytes: Uint8Array): Response {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Response(copy, { headers: { 'Content-Type': 'image/png' } })
}

function iconResponse(first: number, second: number): Response {
  const bytes = twoFrameChunk(first, second)
  return Response.json({ source: 'synthetic', size: bytes.length, base64: bytesToBase64(bytes) })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('parallel dialog loading and repeated entries', () => {
  it('单张头像失败仍保留成功头像与图标第 0 帧', async () => {
    const kept = await indexedPng(1, 1, [0x44, 0, 0, 255])
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === PORTRAITS) {
        return Promise.resolve(
          Response.json({
            count: 2,
            portraits: [
              { chunkIndex: 4, width: 1, height: 1 },
              { chunkIndex: 8, width: 1, height: 1 },
            ],
          }),
        )
      }
      if (url === portraitUrl(4)) return Promise.resolve(new Response(null, { status: 404 }))
      if (url === portraitUrl(8)) return Promise.resolve(encodedPngResponse(kept))
      if (url === ICONS) return Promise.resolve(iconResponse(0x31, 0x32))
      return Promise.reject(new Error(`unexpected ${url}`))
    })

    const assets = await loadDialogAssets()
    expect(Array.from(assets.iconFrames.get(0)?.indices ?? [])).toEqual([0x31])
    expect(assets.iconFrames.get(0)?.width).toBe(1)
    expect(assets.iconFrames.get(0)?.opaque[0]).toBe(1)
    expect(Array.from(assets.iconFrames.get(1)?.indices ?? [])).toEqual([0x32])
    expect(Array.from(assets.portraitFrames.get(8)?.indices ?? [])).toEqual([0x44])
    expect(assets.portraitFrames.has(4)).toBe(false)
    expect(warn.mock.calls).toStrictEqual([
      ['dialog-assets: portrait 4 load failed, skip:', new Error('HTTP 404')],
    ])
  })

  it('头像清单与图标清单在任一响应前都已发出', async () => {
    const kept = await indexedPng(1, 1, [0x15, 0, 0, 255])
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const urls: string[] = []
    const pending = new Map<string, (response: Response) => void>()
    let draining = false
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      const url = String(input)
      urls.push(url)
      if (draining) return Promise.resolve(new Response(null, { status: 503 }))
      return new Promise<Response>((resolve) => {
        pending.set(url, (response) => {
          pending.delete(url)
          resolve(response)
        })
      })
    })

    const pendingLoad = loadDialogAssets()
    try {
      expect(urls).toEqual([PORTRAITS, ICONS])
      const releasePortraits = pending.get(PORTRAITS)
      const releaseIcons = pending.get(ICONS)
      if (!releasePortraits || !releaseIcons) throw new Error('manifest fetches were not issued')
      releasePortraits(
        Response.json({ count: 1, portraits: [{ chunkIndex: 8, width: 1, height: 1 }] }),
      )
      await vi.waitFor(() => expect(pending.has(portraitUrl(8))).toBe(true))
      expect(pending.has(ICONS)).toBe(true)
      const releasePng = pending.get(portraitUrl(8))
      if (!releasePng) throw new Error('portrait png was not requested')
      releasePng(encodedPngResponse(kept))
      releaseIcons(iconResponse(0x11, 0x22))
      const assets = await pendingLoad
      expect(Array.from(assets.portraitFrames.get(8)?.indices ?? [])).toEqual([0x15])
      expect(assets.iconFrames.size).toBe(2)
      expect(warn.mock.calls).toStrictEqual([])
    } finally {
      // 断言失败也要释放当前和后继请求，避免把未完成的加载留给下个测试。
      draining = true
      for (const release of pending.values()) release(new Response(null, { status: 503 }))
      await pendingLoad
    }
  })

  it('重复 chunk 的第二次失败不删第一次精灵', async () => {
    const kept = await indexedPng(1, 1, [0x21, 0, 0, 255])
    let pngHits = 0
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === PORTRAITS) {
        return Promise.resolve(
          Response.json({
            count: 2,
            portraits: [
              { chunkIndex: 6, width: 1, height: 1 },
              { chunkIndex: 6, width: 1, height: 1 },
            ],
          }),
        )
      }
      if (url === portraitUrl(6)) {
        pngHits += 1
        if (pngHits === 1) return Promise.resolve(encodedPngResponse(kept))
        return Promise.resolve(new Response(null, { status: 404 }))
      }
      if (url === ICONS) return Promise.resolve(iconResponse(0x41, 0x42))
      return Promise.reject(new Error(`unexpected ${url}`))
    })

    const assets = await loadDialogAssets()
    expect(pngHits).toBe(2)
    expect(Array.from(assets.portraitFrames.get(6)?.indices ?? [])).toEqual([0x21])
    expect(assets.portraitFrames.size).toBe(1)
    expect(assets.iconFrames.size).toBe(2)
    expect(warn.mock.calls).toStrictEqual([
      ['dialog-assets: portrait 6 load failed, skip:', new Error('HTTP 404')],
    ])
  })

  it('portraits.json 的 count 不决定 PNG 请求次数', async () => {
    const kept = await indexedPng(2, 1, [7, 0, 0, 255, 9, 0, 0, 255])
    const urls: string[] = []
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      const url = String(input)
      urls.push(url)
      if (url === PORTRAITS) {
        return Promise.resolve(
          Response.json({
            count: 9,
            portraits: [{ chunkIndex: 3, width: 2, height: 1 }],
          }),
        )
      }
      if (url === portraitUrl(3)) return Promise.resolve(encodedPngResponse(kept))
      if (url === ICONS) return Promise.resolve(new Response(null, { status: 404 }))
      return Promise.reject(new Error(`unexpected ${url}`))
    })

    const assets = await loadDialogAssets()
    expect(urls.filter((url) => url.includes('/images/portraits/'))).toEqual([portraitUrl(3)])
    expect(Array.from(assets.portraitFrames.get(3)?.indices ?? [])).toEqual([7, 9])
    expect(assets.iconFrames.size).toBe(0)
    expect(warn.mock.calls).toStrictEqual([
      [
        '[dialog-assets] icons failed, skip:',
        new Error('dialog-assets: dialog-icons-raw.json fetch failed (404)'),
      ],
    ])
  })
})

describe('independent manifest failures', () => {
  it('两路清单均失败时，返回两个空 map 并分别报告原因', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/extracted/data/portraits.json') return new Response(null, { status: 503 })
      if (url === '/extracted/data/dialog-icons-raw.json')
        return new Response(null, { status: 404 })
      throw new Error(`unmocked ${url}`)
    })
    const assets = await loadDialogAssets()
    expect(assets.portraitFrames.size).toBe(0)
    expect(assets.iconFrames.size).toBe(0)
    expect(
      Array.from(warn.mock.calls).sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    ).toStrictEqual([
      [
        '[dialog-assets] icons failed, skip:',
        new Error('dialog-assets: dialog-icons-raw.json fetch failed (404)'),
      ],
      [
        '[dialog-assets] portraits failed, skip:',
        new Error('dialog-assets: portraits.json fetch failed (503)'),
      ],
    ])
  })
})
