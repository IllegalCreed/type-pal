/**
 * TEST-GROK-BOOT-RESOURCES-MEDIUM-1。
 * 主测试保留启动顺序与原始 soundfont 拒绝身份；本组承接 glyph 降级与独立屏障。
 * 默认端口两例走真实 fetch Response，不替换 loadAll；所有受控请求在 teardown 结局。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bytesToBase64, legalLoadedAssets, twoFrameChunk } from '../__tests__/asset-fixtures.js'
import type { DialogAssets } from '../assets/dialog-assets.js'
import type { LoadedAssets } from '../assets/loader.js'
import type { Glyph, GlyphTable } from '../present/font.js'
import { type BootstrapResourcePorts, startBootstrapResourceLoad } from './bootstrap-resources.js'

const pendingResources: Promise<unknown>[] = []
const releasePending: Array<() => void> = []

function deferred<T>(fallback: T) {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  pendingResources.push(promise)
  releasePending.push(() => resolve(fallback))
  return { promise, resolve, reject }
}

function startResources(...args: Parameters<typeof startBootstrapResourceLoad>) {
  const load = startBootstrapResourceLoad(...args)
  pendingResources.push(load.resourcesReady, load.soundfontData, load.soundfontSettled)
  return load
}

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
  return deferred(response).promise
}

function assetToken(label: string): LoadedAssets {
  return legalLoadedAssets(label)
}

const bootGlyph: Glyph = { width: 8, height: 16, bitmap: new Uint8Array(16) }
const glyphs: GlyphTable = {
  has: (codepoint) => codepoint === 0x41,
  get: (codepoint) => (codepoint === 0x41 ? bootGlyph : undefined),
}
const dialogAssets: DialogAssets = { portraitFrames: new Map(), iconFrames: new Map() }
const sharedAssets = assetToken('shared')

function ports(overrides: Partial<BootstrapResourcePorts> = {}): BootstrapResourcePorts {
  return {
    fetchSoundfont: async () => new ArrayBuffer(1),
    loadAssets: async () => sharedAssets,
    loadGlyphs: async () => glyphs,
    loadDialogAssets: async () => dialogAssets,
    warn: vi.fn(),
    ...overrides,
  }
}

async function flush(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

afterEach(async () => {
  try {
    for (const release of releasePending) release()
    await Promise.allSettled(pendingResources)
  } finally {
    releasePending.length = 0
    pendingResources.length = 0
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  }
})

describe('grok-mid-1 bootstrap barriers', () => {
  it('loadAssets 拒绝保持原错误对象，soundfont 仍可成功且 settle 独立', async () => {
    const assetsError = new Error('assets down')
    const soundfont = deferred<ArrayBuffer>(new ArrayBuffer(0))
    const bytes = new ArrayBuffer(4)
    const warn = vi.fn()
    const load = startResources(
      4,
      ports({
        fetchSoundfont: () => soundfont.promise,
        loadAssets: async () => Promise.reject(assetsError),
        warn,
      }),
    )

    let caught: unknown
    try {
      await load.resourcesReady
    } catch (error) {
      caught = error
    }
    expect(caught).toBe(assetsError)
    expect(warn).not.toHaveBeenCalled()
    soundfont.resolve(bytes)
    await expect(load.soundfontData).resolves.toBe(bytes)
    await expect(load.soundfontSettled).resolves.toBeUndefined()
  })

  it('loadDialogAssets 拒绝保持原错误对象，resourcesReady 的成功回调不跑', async () => {
    const dialogError = new Error('dialog down')
    const soundfont = deferred<ArrayBuffer>(new ArrayBuffer(0))
    const bytes = new ArrayBuffer(2)
    let fulfilled = false
    const load = startResources(
      4,
      ports({
        fetchSoundfont: () => soundfont.promise,
        loadDialogAssets: async () => Promise.reject(dialogError),
      }),
    )

    void load.resourcesReady.then(
      () => {
        fulfilled = true
      },
      () => {},
    )
    await expect(load.resourcesReady).rejects.toBe(dialogError)
    expect(fulfilled).toBe(false)
    soundfont.resolve(bytes)
    await expect(load.soundfontData).resolves.toBe(bytes)
  })

  it('soundfont 先 settle 时 resourcesReady 仍等待，随后装配同一引用', async () => {
    const soundfont = deferred<ArrayBuffer>(new ArrayBuffer(0))
    const assetsGate = deferred<LoadedAssets>(sharedAssets)
    const glyphsGate = deferred<GlyphTable>(glyphs)
    const dialogGate = deferred<DialogAssets>(dialogAssets)
    const lateAssets = assetToken('late-assets')
    const bytes = new ArrayBuffer(3)
    const load = startResources(
      9,
      ports({
        fetchSoundfont: () => soundfont.promise,
        loadAssets: () => assetsGate.promise,
        loadGlyphs: () => glyphsGate.promise,
        loadDialogAssets: () => dialogGate.promise,
      }),
    )

    soundfont.resolve(bytes)
    let settled = false
    void load.soundfontSettled.then(() => {
      settled = true
    })
    let ready = false
    void load.resourcesReady.then(() => {
      ready = true
    })
    await flush()
    expect(settled).toBe(true)
    expect(ready).toBe(false)

    assetsGate.resolve(lateAssets)
    dialogGate.resolve(dialogAssets)
    await Promise.all([assetsGate.promise, dialogGate.promise])
    await flush()
    expect(ready).toBe(false)

    glyphsGate.resolve(glyphs)
    const loaded = await load.resourcesReady
    expect(loaded.assets).toBe(lateAssets)
    expect(loaded.glyphs).toBe(glyphs)
    expect(loaded.dialogAssets).toBe(dialogAssets)
  })

  it('dialog 未兑现时 resourcesReady 保持未就绪', async () => {
    const dialogGate = deferred<DialogAssets>(dialogAssets)
    const load = startResources(5, ports({ loadDialogAssets: () => dialogGate.promise }))
    let ready = false
    void load.resourcesReady.then(() => {
      ready = true
    })
    await flush()
    expect(ready).toBe(false)

    dialogGate.resolve(dialogAssets)
    const loaded = await load.resourcesReady
    expect(loaded.dialogAssets).toBe(dialogAssets)
    expect(loaded.assets).toBe(sharedAssets)
    expect(loaded.glyphs).toBe(glyphs)
  })

  it('assets 未兑现时 resourcesReady 保持未就绪', async () => {
    const assetsGate = deferred<LoadedAssets>(sharedAssets)
    const lateAssets = assetToken('held-assets')
    const load = startResources(6, ports({ loadAssets: () => assetsGate.promise }))
    let ready = false
    void load.resourcesReady.then(() => {
      ready = true
    })
    await flush()
    expect(ready).toBe(false)

    assetsGate.resolve(lateAssets)
    const loaded = await load.resourcesReady
    expect(loaded.assets).toBe(lateAssets)
    expect(loaded.dialogAssets).toBe(dialogAssets)
    expect(loaded.glyphs).toBe(glyphs)
  })

  it('glyph 失败后 resourcesReady 仍等待 assets 与 dialog', async () => {
    const glyphError = new Error('glyph late')
    const warn = vi.fn()
    const assetsGate = deferred<LoadedAssets>(sharedAssets)
    const dialogGate = deferred<DialogAssets>(dialogAssets)
    const lateAssets = assetToken('after-glyph')
    const load = startResources(
      2,
      ports({
        loadAssets: () => assetsGate.promise,
        loadDialogAssets: () => dialogGate.promise,
        loadGlyphs: async () => Promise.reject(glyphError),
        warn,
      }),
    )

    await flush()
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      '[bootstrap] loadGlyphs failed, text will render as tofu:',
      glyphError,
    )
    let ready = false
    void load.resourcesReady.then(() => {
      ready = true
    })
    await flush()
    expect(ready).toBe(false)

    assetsGate.resolve(lateAssets)
    dialogGate.resolve(dialogAssets)
    const loaded = await load.resourcesReady
    expect(loaded.glyphs).toBeUndefined()
    expect(loaded.assets).toBe(lateAssets)
    expect(loaded.dialogAssets).toBe(dialogAssets)
  })

  it('默认端口用真实 Response 读出 soundfont 字节，且真实加载器已发出请求', async () => {
    const seen: string[] = []
    const payload = new Uint8Array([9, 8, 7, 6])
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      const url = String(input)
      seen.push(url)
      if (url === '/soundfont.sf3') return Promise.resolve(new Response(payload))
      return heldResourceResponse(url)
    })

    const load = startResources(12)
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

    const load = startResources(12)
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

  it('两轮 boot 的拒绝与成功资产互不穿越', async () => {
    const assetsB = assetToken('boot-b')
    const soundA = deferred<ArrayBuffer>(new ArrayBuffer(0))
    const soundB = deferred<ArrayBuffer>(new ArrayBuffer(0))
    const bytesB = new ArrayBuffer(8)
    const bootA = startResources(
      1,
      ports({
        fetchSoundfont: () => soundA.promise,
        loadAssets: async () => Promise.reject(new Error('boot A assets')),
      }),
    )
    const bootB = startResources(
      2,
      ports({
        fetchSoundfont: () => soundB.promise,
        loadAssets: async () => assetsB,
      }),
    )

    await expect(bootA.resourcesReady).rejects.toThrow('boot A assets')
    soundB.resolve(bytesB)
    const loadedB = await bootB.resourcesReady
    expect(loadedB.assets).toBe(assetsB)
    await expect(bootB.soundfontData).resolves.toBe(bytesB)

    let fontARejected = false
    void bootA.soundfontData.then(
      () => {},
      () => {
        fontARejected = true
      },
    )
    soundA.reject(new Error('boot A font'))
    await flush()
    expect(fontARejected).toBe(true)
    await expect(bootB.soundfontData).resolves.toBe(bytesB)
    await expect(bootB.soundfontSettled).resolves.toBeUndefined()
  })
})
