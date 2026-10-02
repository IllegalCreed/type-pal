/**
 * TEST-GROK-BOOT-RESOURCES-MEDIUM-1 G4。
 * 不重复 glm L23 的空图标 map，也不重复原 400 已分开证明的单侧降级。
 * 本文件只有「单张头像失败仍保留成功头像与图标第 0 帧」断言 iconFrames.get(0)。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bytesToBase64, indexedPng, twoFrameChunk } from '../__tests__/grok-boot-mid-1/legal.js'
import { loadDialogAssets } from './dialog-assets.js'

const PORTRAITS = '/extracted/data/portraits.json'
const ICONS = '/extracted/data/dialog-icons-raw.json'

function portraitUrl(chunkIndex: number): string {
  return `/extracted/images/portraits/${chunkIndex.toString().padStart(2, '0')}.png`
}

function pngResponse(bytes: Uint8Array): Response {
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

describe('grok-mid-1 dialog parallel degradation', () => {
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
      if (url === portraitUrl(8)) return Promise.resolve(pngResponse(kept))
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
    expect(warn).toHaveBeenCalledWith(
      'dialog-assets: portrait 4 load failed, skip:',
      expect.any(Error),
    )
    expect(warn.mock.calls.map((call) => call[0])).not.toContain(
      '[dialog-assets] all assets failed:',
    )
  })

  it('头像清单与图标清单在任一响应前都已发出', async () => {
    const kept = await indexedPng(1, 1, [0x15, 0, 0, 255])
    const urls: string[] = []
    const pending = new Map<string, (response: Response) => void>()
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      const url = String(input)
      urls.push(url)
      return new Promise<Response>((resolve) => {
        pending.set(url, resolve)
      })
    })

    const pendingLoad = loadDialogAssets()
    expect(urls).toEqual([PORTRAITS, ICONS])

    const releasePortraits = pending.get(PORTRAITS)
    const releaseIcons = pending.get(ICONS)
    if (!releasePortraits || !releaseIcons) throw new Error('manifest fetches were not issued')
    releasePortraits(
      Response.json({
        count: 1,
        portraits: [{ chunkIndex: 8, width: 1, height: 1 }],
      }),
    )
    for (let step = 0; step < 20; step++) await Promise.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(urls).toContain(portraitUrl(8))
    expect(pending.has(ICONS)).toBe(true)

    const releasePng = pending.get(portraitUrl(8))
    if (!releasePng) throw new Error('portrait png was not requested')
    releasePng(pngResponse(kept))
    releaseIcons(iconResponse(0x11, 0x22))
    const assets = await pendingLoad
    expect(Array.from(assets.portraitFrames.get(8)?.indices ?? [])).toEqual([0x15])
    expect(assets.iconFrames.size).toBe(2)
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
        if (pngHits === 1) return Promise.resolve(pngResponse(kept))
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
    expect(warn).toHaveBeenCalledWith(
      'dialog-assets: portrait 6 load failed, skip:',
      expect.any(Error),
    )
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
      if (url === portraitUrl(3)) return Promise.resolve(pngResponse(kept))
      if (url === ICONS) return Promise.resolve(new Response(null, { status: 404 }))
      return Promise.reject(new Error(`unexpected ${url}`))
    })

    const assets = await loadDialogAssets()
    expect(urls.filter((url) => url.includes('/images/portraits/'))).toEqual([portraitUrl(3)])
    expect(Array.from(assets.portraitFrames.get(3)?.indices ?? [])).toEqual([7, 9])
    expect(assets.iconFrames.size).toBe(0)
    expect(warn).toHaveBeenCalledWith('[dialog-assets] icons failed, skip:', expect.any(Error))
  })
})
