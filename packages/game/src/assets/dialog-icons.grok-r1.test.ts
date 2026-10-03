/**
 * G02-D。旧对话测试没有成功解码图标。旧 base64 只覆盖 0x00。
 * 本组解真实 icon chunk，并核对头像尺寸来自 PNG 而不是 manifest。
 */

import {
  decodeRle as sharedDecodeRle,
  parseSpriteChunk as sharedParseSpriteChunk,
} from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { indexedPng, twoFrameChunk } from '../__tests__/grok-render-r1/legal-host.js'
import { loadDialogAssets } from './dialog-assets.js'
import { base64ToBytes, decodeRle, parseSpriteChunk } from './rle-decode.js'

function bytesToBase64(bytes: Uint8Array): string {
  let text = ''
  for (const byte of bytes) text += String.fromCharCode(byte)
  return btoa(text)
}

const iconBytes = twoFrameChunk(0x11, 0x22)
const iconBase64 = bytesToBase64(iconBytes)

function iconJson(size = iconBytes.length): string {
  return JSON.stringify({ source: 't', size, base64: iconBase64 })
}

async function pngResponse(rgba: readonly number[]): Promise<Response> {
  const bytes = await indexedPng(2, 1, rgba)
  return new Response(bytes.slice(), { status: 200, headers: { 'content-type': 'image/png' } })
}

describe('G02-D 对话图标与 base64', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('G02-D01 portraits.json 500 时头像为空，两帧图标仍按 0 与 1 入 map', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/data/portraits.json')) return new Response('', { status: 500 })
        if (url.endsWith('/data/dialog-icons-raw.json')) return new Response(iconJson())
        throw new Error(`unmocked ${url}`)
      }),
    )
    const assets = await loadDialogAssets()
    expect(assets.portraitFrames.size).toBe(0)
    expect(assets.iconFrames.size).toBe(2)
    expect(Array.from(assets.iconFrames.get(0)?.indices ?? [])).toEqual([0x11])
    expect(Array.from(assets.iconFrames.get(1)?.indices ?? [])).toEqual([0x22])
    expect(Array.from(assets.iconFrames.get(1)?.opaque ?? [])).toEqual([1])
  })

  it('G02-D02 manifest 写 99×99 时，头像宽高和遮罩以 PNG 为准', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const png = await pngResponse([0, 1, 2, 0, 3, 4, 5, 255])
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/data/portraits.json')) {
          return Response.json({
            count: 1,
            portraits: [{ chunkIndex: 12, width: 99, height: 99 }],
          })
        }
        if (url.endsWith('/images/portraits/12.png')) return png
        if (url.endsWith('/data/dialog-icons-raw.json')) return new Response('', { status: 404 })
        throw new Error(`unmocked ${url}`)
      }),
    )
    const assets = await loadDialogAssets()
    const portrait = assets.portraitFrames.get(12)
    expect(portrait?.width).toBe(2)
    expect(portrait?.height).toBe(1)
    expect(Array.from(portrait?.indices ?? [])).toEqual([0, 3])
    expect(Array.from(portrait?.opaque ?? [])).toEqual([0, 1])
    expect(assets.iconFrames.size).toBe(0)
  })

  it('G02-D03 chunk 0 的头像 URL 补成 portraits/00.png', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const png = await pngResponse([8, 0, 0, 255, 9, 0, 0, 255])
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        calls.push(url)
        if (url.endsWith('/data/portraits.json')) {
          return Response.json({
            count: 1,
            portraits: [{ chunkIndex: 0, width: 2, height: 1 }],
          })
        }
        if (url.endsWith('/images/portraits/00.png')) return png
        if (url.endsWith('/data/dialog-icons-raw.json')) return new Response('', { status: 404 })
        throw new Error(`unmocked ${url}`)
      }),
    )
    const assets = await loadDialogAssets()
    expect(calls.some((url) => url.endsWith('/images/portraits/00.png'))).toBe(true)
    expect(Array.from(assets.portraitFrames.get(0)?.indices ?? [])).toEqual([8, 9])
  })

  it('G02-D04 头像清单为空数组时不请求 PNG，图标照常解码', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        calls.push(url)
        if (url.endsWith('/data/portraits.json')) {
          return Response.json({ count: 0, portraits: [] })
        }
        if (url.endsWith('/data/dialog-icons-raw.json')) return new Response(iconJson())
        throw new Error(`unmocked ${url}`)
      }),
    )
    const assets = await loadDialogAssets()
    expect(calls.some((url) => url.includes('/images/portraits/'))).toBe(false)
    expect(assets.portraitFrames.size).toBe(0)
    expect(Array.from(assets.iconFrames.get(0)?.indices ?? [])).toEqual([0x11])
  })

  it('G02-D05 图标 base64 非法时图标 map 为空，已成功的头像保留', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const png = await pngResponse([6, 0, 0, 255, 7, 0, 0, 255])
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/data/portraits.json')) {
          return Response.json({
            count: 1,
            portraits: [{ chunkIndex: 3, width: 2, height: 1 }],
          })
        }
        if (url.endsWith('/images/portraits/03.png')) return png
        if (url.endsWith('/data/dialog-icons-raw.json')) {
          return Response.json({ source: 't', size: 1, base64: '***' })
        }
        throw new Error(`unmocked ${url}`)
      }),
    )
    const assets = await loadDialogAssets()
    expect(Array.from(assets.portraitFrames.get(3)?.indices ?? [])).toEqual([6, 7])
    expect(assets.iconFrames.size).toBe(0)
  })

  it('G02-D06 两张头像分别以 chunk 8 和 12 为键', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const first = await pngResponse([8, 0, 0, 255, 1, 0, 0, 255])
    const second = await pngResponse([12, 0, 0, 255, 2, 0, 0, 255])
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/data/portraits.json')) {
          return Response.json({
            count: 2,
            portraits: [
              { chunkIndex: 8, width: 2, height: 1 },
              { chunkIndex: 12, width: 2, height: 1 },
            ],
          })
        }
        if (url.endsWith('/images/portraits/08.png')) return first
        if (url.endsWith('/images/portraits/12.png')) return second
        if (url.endsWith('/data/dialog-icons-raw.json')) return new Response('', { status: 404 })
        throw new Error(`unmocked ${url}`)
      }),
    )
    const assets = await loadDialogAssets()
    expect(Array.from(assets.portraitFrames.get(8)?.indices ?? [])).toEqual([8, 1])
    expect(Array.from(assets.portraitFrames.get(12)?.indices ?? [])).toEqual([12, 2])
    expect(assets.portraitFrames.size).toBe(2)
  })

  it('G02-D07 单张头像失败的 warn 带上 chunk 4，成功的 chunk 8 仍在', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const png = await pngResponse([8, 0, 0, 255, 1, 0, 0, 255])
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/data/portraits.json')) {
          return Response.json({
            count: 2,
            portraits: [
              { chunkIndex: 8, width: 2, height: 1 },
              { chunkIndex: 4, width: 2, height: 1 },
            ],
          })
        }
        if (url.endsWith('/images/portraits/08.png')) return png
        if (url.endsWith('/images/portraits/04.png')) return new Response('', { status: 404 })
        if (url.endsWith('/data/dialog-icons-raw.json')) return new Response('', { status: 404 })
        throw new Error(`unmocked ${url}`)
      }),
    )
    const assets = await loadDialogAssets()
    expect(Array.from(assets.portraitFrames.get(8)?.indices ?? [])).toEqual([8, 1])
    expect(assets.portraitFrames.has(4)).toBe(false)
    expect(warn.mock.calls.some((args) => String(args[0]).includes('portrait 4'))).toBe(true)
  })

  it('G02-D08 size 字段与字节数不一致时，仍按 base64 解出两帧', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/data/portraits.json')) return new Response('', { status: 404 })
        if (url.endsWith('/data/dialog-icons-raw.json')) return new Response(iconJson(1))
        throw new Error(`unmocked ${url}`)
      }),
    )
    const assets = await loadDialogAssets()
    expect(assets.iconFrames.size).toBe(2)
    expect(Array.from(assets.iconFrames.get(0)?.indices ?? [])).toEqual([0x11])
  })

  it('G02-D12 图标清单 404 的 warn 写 icons failed，头像像素仍在', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const png = await pngResponse([6, 0, 0, 255, 7, 0, 0, 255])
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/data/portraits.json')) {
          return Response.json({
            count: 1,
            portraits: [{ chunkIndex: 3, width: 2, height: 1 }],
          })
        }
        if (url.endsWith('/images/portraits/03.png')) return png
        if (url.endsWith('/data/dialog-icons-raw.json')) return new Response('', { status: 404 })
        throw new Error(`unmocked ${url}`)
      }),
    )
    const assets = await loadDialogAssets()
    expect(Array.from(assets.portraitFrames.get(3)?.indices ?? [])).toEqual([6, 7])
    expect(assets.iconFrames.size).toBe(0)
    expect(warn.mock.calls.some((args) => String(args[0]).includes('icons failed'))).toBe(true)
  })

  it('G02-D13 图标帧的透明孔写入 opaque 0，宽高来自 RLE', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const mask = Uint8Array.of(0x01, 0x00, 0x02, 0x00, 0x01, 0x00, 0x81, 0x01, 0x22)
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/data/portraits.json')) return new Response('', { status: 404 })
        if (url.endsWith('/data/dialog-icons-raw.json')) {
          return Response.json({ source: 't', size: mask.length, base64: bytesToBase64(mask) })
        }
        throw new Error(`unmocked ${url}`)
      }),
    )
    const assets = await loadDialogAssets()
    const icon = assets.iconFrames.get(0)
    expect(icon?.width).toBe(2)
    expect(icon?.height).toBe(1)
    expect(Array.from(icon?.indices ?? [])).toEqual([0, 0x22])
    expect(Array.from(icon?.opaque ?? [])).toEqual([0, 1])
  })

  it('G02-D14 单张头像 404 不会清掉已经解码的图标', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/data/portraits.json')) {
          return Response.json({
            count: 1,
            portraits: [{ chunkIndex: 4, width: 2, height: 1 }],
          })
        }
        if (url.endsWith('/images/portraits/04.png')) return new Response('', { status: 404 })
        if (url.endsWith('/data/dialog-icons-raw.json')) return new Response(iconJson())
        throw new Error(`unmocked ${url}`)
      }),
    )
    const assets = await loadDialogAssets()
    expect(assets.portraitFrames.size).toBe(0)
    expect(Array.from(assets.iconFrames.get(0)?.indices ?? [])).toEqual([0x11])
    expect(assets.iconFrames.size).toBe(2)
  })

  it('G02-D09 base64 /wCA 解出 [255, 0, 128]', () => {
    expect(Array.from(base64ToBytes('/wCA'))).toEqual([255, 0, 128])
  })

  it('G02-D10 base64 /w== 解出单字节 255', () => {
    expect(Array.from(base64ToBytes('/w=='))).toEqual([255])
  })

  it('G02-D11 game 的 decodeRle 与 parseSpriteChunk 就是 shared 的同一函数', () => {
    expect(decodeRle).toBe(sharedDecodeRle)
    expect(parseSpriteChunk).toBe(sharedParseSpriteChunk)
  })
})
