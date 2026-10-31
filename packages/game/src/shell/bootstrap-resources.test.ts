import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { legalLoadedAssets } from '../__tests__/asset-fixtures.js'
import type { DialogAssets } from '../assets/dialog-assets.js'
import type { LoadedAssets } from '../assets/loader.js'
import type { Glyph, GlyphTable } from '../present/font.js'
import { createBootstrapResourceOwner } from './__tests__/bootstrap-resource-load.js'
import type { BootstrapResourcePorts } from './bootstrap-resources.js'

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
describe('Startup order and music source', () => {
  const assets: LoadedAssets = legalLoadedAssets('bootstrap-main')

  const glyphs: GlyphTable = { has: () => false, get: () => undefined }

  const dialogAssets: DialogAssets = { portraitFrames: new Map(), iconFrames: new Map() }

  function ports(overrides: Partial<BootstrapResourcePorts> = {}): BootstrapResourcePorts {
    return {
      fetchSoundfont: async () => new ArrayBuffer(1),
      loadAssets: async () => assets,
      loadGlyphs: async () => glyphs,
      loadDialogAssets: async () => dialogAssets,
      warn: vi.fn(),
      ...overrides,
    }
  }
  it('FM boot loads the game resources without requesting or waiting for the MIDI soundfont', async () => {
    const fetchSoundfont = vi.fn(async () => new ArrayBuffer(1))
    const load = resources.start(7, ports({ fetchSoundfont }), false)
    expect(fetchSoundfont).not.toHaveBeenCalled()
    await expect(load.soundfontData).resolves.toHaveProperty('byteLength', 0)
    await expect(load.resourcesReady).resolves.toEqual({ assets, glyphs, dialogAssets })
    await expect(load.soundfontSettled).resolves.toBeUndefined()
  })
  it('starts soundfont first and all resource loaders before awaiting any result', async () => {
    const order: string[] = []
    const soundfont = resources.deferred<ArrayBuffer>(new ArrayBuffer(0))
    const load = resources.start(
      7,
      ports({
        fetchSoundfont: () => {
          order.push('soundfont')
          return soundfont.promise
        },
        loadAssets: async (sceneId) => {
          order.push(`assets:${sceneId}`)
          return assets
        },
        loadGlyphs: async () => {
          order.push('glyphs')
          return glyphs
        },
        loadDialogAssets: async () => {
          order.push('dialog')
          return dialogAssets
        },
      }),
    )

    expect(order).toEqual(['soundfont', 'assets:7', 'glyphs', 'dialog'])
    await expect(load.resourcesReady).resolves.toEqual({ assets, glyphs, dialogAssets })
    let settled = false
    void load.soundfontSettled.then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)
    soundfont.resolve(new ArrayBuffer(2))
    await expect(load.soundfontSettled).resolves.toBeUndefined()
  })
  it('keeps the original soundfont rejection while its settle barrier still resolves', async () => {
    const soundfont = resources.deferred<ArrayBuffer>(new ArrayBuffer(0))
    const load = resources.start(0, ports({ fetchSoundfont: () => soundfont.promise }))

    const originalError = new Error('soundfont failed')
    soundfont.reject(originalError)
    await expect(load.soundfontData).rejects.toBe(originalError)
    await expect(load.soundfontSettled).resolves.toBeUndefined()
    await expect(load.resourcesReady).resolves.toEqual({ assets, glyphs, dialogAssets })
  })
  it('场景资源拒绝不会升级成字形警告', async () => {
    const error = new Error('scene 4 missing')
    const warn = vi.fn()
    const load = resources.start(
      4,
      ports({
        loadAssets: async () => Promise.reject(error),
        warn,
      }),
    )
    let caught: unknown
    try {
      await load.resourcesReady
    } catch (err) {
      caught = err
    }
    expect(caught).toBe(error)
    expect(warn).toHaveBeenCalledTimes(0)
    await expect(load.soundfontSettled).resolves.toBeUndefined()
  })
})

describe('Resource readiness and failure isolation', () => {
  const bootGlyph: Glyph = { width: 8, height: 16, bitmap: new Uint8Array(16) }

  const glyphs: GlyphTable = {
    has: (codepoint) => codepoint === 0x41,
    get: (codepoint) => (codepoint === 0x41 ? bootGlyph : undefined),
  }

  const dialogAssets: DialogAssets = { portraitFrames: new Map(), iconFrames: new Map() }

  const sharedAssets = legalLoadedAssets('shared')

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
  it('loadAssets 拒绝保持原错误对象，soundfont 仍可成功且 settle 独立', async () => {
    const assetsError = new Error('assets down')
    const soundfont = resources.deferred<ArrayBuffer>(new ArrayBuffer(0))
    const bytes = new ArrayBuffer(4)
    const warn = vi.fn()
    const load = resources.start(
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
    const soundfont = resources.deferred<ArrayBuffer>(new ArrayBuffer(0))
    const bytes = new ArrayBuffer(2)
    let fulfilled = false
    const load = resources.start(
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
    const soundfont = resources.deferred<ArrayBuffer>(new ArrayBuffer(0))
    const assetsGate = resources.deferred<LoadedAssets>(sharedAssets)
    const glyphsGate = resources.deferred<GlyphTable>(glyphs)
    const dialogGate = resources.deferred<DialogAssets>(dialogAssets)
    const lateAssets = legalLoadedAssets('late-assets')
    const bytes = new ArrayBuffer(3)
    const load = resources.start(
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
    const dialogGate = resources.deferred<DialogAssets>(dialogAssets)
    const load = resources.start(5, ports({ loadDialogAssets: () => dialogGate.promise }))
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
    const assetsGate = resources.deferred<LoadedAssets>(sharedAssets)
    const lateAssets = legalLoadedAssets('held-assets')
    const load = resources.start(6, ports({ loadAssets: () => assetsGate.promise }))
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
    const assetsGate = resources.deferred<LoadedAssets>(sharedAssets)
    const dialogGate = resources.deferred<DialogAssets>(dialogAssets)
    const lateAssets = legalLoadedAssets('after-glyph')
    const load = resources.start(
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
  it('两轮 boot 的拒绝与成功资产互不穿越', async () => {
    const assetsB = legalLoadedAssets('boot-b')
    const soundA = resources.deferred<ArrayBuffer>(new ArrayBuffer(0))
    const soundB = resources.deferred<ArrayBuffer>(new ArrayBuffer(0))
    const bytesB = new ArrayBuffer(8)
    const bootA = resources.start(
      1,
      ports({
        fetchSoundfont: () => soundA.promise,
        loadAssets: async () => Promise.reject(new Error('boot A assets')),
      }),
    )
    const bootB = resources.start(
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
