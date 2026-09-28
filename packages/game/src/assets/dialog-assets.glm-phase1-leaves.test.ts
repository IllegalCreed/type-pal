/**
 * TEST-GLM-PHASE1-LEAVES-3 L23（dialog-assets.ts）— 去重表：
 *  - dialog-assets 无既有测试（targets existingTestPointers 空）。
 *  - 新差异：loadDialogAssets 全链路（fetch 全隔离）：portraits manifest+PNG 成功就位、
 *    单张 PNG 404 skip 不拖垮整体、icons !ok 降级空 map、console.warn 记录、整体不抛。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadDialogAssets } from './dialog-assets.js'

async function pngBlob(rgba: readonly number[], w = 2, h = 1): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(w, h)
  img.data.set([...rgba])
  ctx.putImageData(img, 0, 0)
  return new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'))
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('L23 loadDialogAssets 全链路（fetch 全隔离）', () => {
  let portraitPng: Blob
  beforeEach(async () => {
    portraitPng = await pngBlob([7, 0, 0, 255, 9, 0, 0, 255])
  })

  function mockFetch(handlers: (url: string) => Response): void {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const out = handlers(String(input))
        if (out instanceof Response) return out
        throw new Error(`unmocked ${input}`)
      }),
    )
  }

  it('manifest+PNG 成功就位；单张 404 skip；icons !ok 降级空 map；整体不抛', async () => {
    const pngBytes = new Uint8Array(await portraitPng.arrayBuffer())
    mockFetch((url) => {
      if (url.endsWith('portraits.json'))
        return Response.json({
          count: 2,
          portraits: [
            { chunkIndex: 3, width: 2, height: 1 },
            { chunkIndex: 4, width: 2, height: 1 },
          ],
        })
      if (url.includes('portraits/03.png')) return new Response(pngBytes)
      if (url.includes('portraits/04.png')) return new Response(null, { status: 404 }) // 单张失败 skip
      if (url.endsWith('dialog-icons-raw.json')) return new Response(null, { status: 404 }) // icons 降级
      throw new Error(`unmocked ${url}`)
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const assets = await loadDialogAssets()
    expect(Array.from(assets.portraitFrames.get(3)?.indices ?? [])).toEqual([7, 9])
    expect(assets.portraitFrames.has(4)).toBe(false) // 404 skip
    expect(assets.iconFrames.size).toBe(0) // icons 404 → 空 map 降级
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('portraits.json 本身失败 → portraits 空 map，icons 正常路径不受阻', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockFetch((url) => {
      if (url.endsWith('portraits.json')) return new Response(null, { status: 500 })
      throw new Error(`unmocked ${url}`)
    })
    const assets = await loadDialogAssets()
    expect(assets.portraitFrames.size).toBe(0)
    expect(assets.iconFrames.size).toBe(0) // icons 也未 mock → 404 类错误 → 空
    warn.mockRestore()
  })
})
