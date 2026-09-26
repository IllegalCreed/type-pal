import { describe, expect, it, vi } from 'vitest'
import type { DialogAssets } from '../assets/dialog-assets.js'
import type { LoadedAssets } from '../assets/loader.js'
import type { GlyphTable } from '../present/font.js'
import { type BootstrapResourcePorts, startBootstrapResourceLoad } from './bootstrap-resources.js'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}

const assets = {} as LoadedAssets
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

describe('bootstrap resource lifecycle', () => {
  it('starts soundfont first and all resource loaders before awaiting any result', async () => {
    const order: string[] = []
    const soundfont = deferred<ArrayBuffer>()
    const load = startBootstrapResourceLoad(
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

  it('degrades a glyph failure without blocking the other initial resources', async () => {
    const error = new Error('glyph unavailable')
    const warn = vi.fn()
    const load = startBootstrapResourceLoad(
      0,
      ports({ loadGlyphs: async () => Promise.reject(error), warn }),
    )

    const loaded = await load.resourcesReady
    expect(loaded).toEqual({
      assets,
      glyphs: undefined,
      dialogAssets,
    })
    expect(warn).toHaveBeenCalledWith(
      '[bootstrap] loadGlyphs failed, text will render as tofu:',
      error,
    )
  })

  it('keeps the original soundfont rejection while its settle barrier still resolves', async () => {
    const soundfont = deferred<ArrayBuffer>()
    const load = startBootstrapResourceLoad(0, ports({ fetchSoundfont: () => soundfont.promise }))

    soundfont.reject(new Error('soundfont failed'))

    let rejection: unknown
    try {
      await load.soundfontData
    } catch (error) {
      rejection = error
    }
    expect(rejection).toBeInstanceOf(Error)
    expect((rejection as Error).message).toBe('soundfont failed')
    await expect(load.soundfontSettled).resolves.toBeUndefined()
  })
})
