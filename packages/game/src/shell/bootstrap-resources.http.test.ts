import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bytesToBase64, twoFrameChunk } from '../__tests__/asset-fixtures.js'
import { createBootstrapResourceOwner } from './__tests__/bootstrap-resource-load.js'

let resources: ReturnType<typeof createBootstrapResourceOwner>
beforeEach(() => {
  resources = createBootstrapResourceOwner()
})
afterEach(async () => {
  try {
    await resources.close()
  } finally {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  }
})
describe('Default resource HTTP ports', () => {
  /** 只挂起四个初始资源请求；收尾以真实 Response 终结它们，scene 的 503 阻止后续加载。 */
  function heldResourceResponse(url: string): Promise<Response> {
    let response: Response
    if (url === '/extracted/data/scene/12.json') {
      response = new Response(null, { status: 503 })
    } else if (url === '/extracted/data/font/glyphs.json') {
      response = Response.json({ glyphs: [] })
    } else if (url === '/extracted/data/portraits.json') {
      response = Response.json({ count: 0, portraits: [] })
    } else if (url === '/extracted/data/dialog-icons-raw.json') {
      const bytes = twoFrameChunk()
      response = Response.json({
        source: 'synthetic',
        size: bytes.length,
        base64: bytesToBase64(bytes),
      })
    } else {
      throw new Error(`unexpected bootstrap resource URL: ${url}`)
    }
    return resources.deferred(response).promise
  }

  async function flush(): Promise<void> {
    await Promise.resolve()
    await Promise.resolve()
  }
  it('默认端口用真实 Response 读出 soundfont 字节，且真实加载器已发出请求', async () => {
    const seen: string[] = []
    const payload = new Uint8Array([9, 8, 7, 6])
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      const url = String(input)
      seen.push(url)
      if (url === '/soundfont.sf3') return Promise.resolve(new Response(payload))
      return heldResourceResponse(url)
    })

    const load = resources.start(12)
    const bytes = new Uint8Array(await load.soundfontData)
    expect(Array.from(bytes)).toEqual([9, 8, 7, 6])
    expect(seen).toEqual([
      '/soundfont.sf3',
      '/extracted/data/scene/12.json',
      '/extracted/data/font/glyphs.json',
      '/extracted/data/portraits.json',
      '/extracted/data/dialog-icons-raw.json',
    ])
    let ready = false
    void load.resourcesReady.then(
      () => {
        ready = true
      },
      () => {
        ready = true
      },
    )
    await flush()
    expect(ready).toBe(false)
  })
  it('默认 soundfont HTTP 503 保留原文，settle 完成且资源仍未就绪', async () => {
    const seen: string[] = []
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      const url = String(input)
      seen.push(url)
      if (url === '/soundfont.sf3') return Promise.resolve(new Response(null, { status: 503 }))
      return heldResourceResponse(url)
    })

    const load = resources.start(12)
    await expect(load.soundfontData).rejects.toThrow('soundfont HTTP 503')
    await expect(load.soundfontSettled).resolves.toBeUndefined()
    expect(seen).toContain('/extracted/data/scene/12.json')
    let ready = false
    void load.resourcesReady.then(
      () => {
        ready = true
      },
      () => {
        ready = true
      },
    )
    await flush()
    expect(ready).toBe(false)
  })
})
