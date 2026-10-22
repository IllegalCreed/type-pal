import { describe, expect, it, vi } from 'vitest'
import { legalLoadedAssets } from '../__tests__/grok-boot-mid-1/legal.js'
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

describe('bootstrap resource lifecycle', () => {
  it('FM boot loads the game resources without requesting or waiting for the MIDI soundfont', async () => {
    const fetchSoundfont = vi.fn(async () => new ArrayBuffer(1))
    const load = startBootstrapResourceLoad(7, ports({ fetchSoundfont }), false)
    expect(fetchSoundfont).not.toHaveBeenCalled()
    await expect(load.soundfontData).resolves.toHaveProperty('byteLength', 0)
    await expect(load.resourcesReady).resolves.toEqual({ assets, glyphs, dialogAssets })
    await expect(load.soundfontSettled).resolves.toBeUndefined()
  })
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

    try {
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
    } finally {
      soundfont.resolve(new ArrayBuffer(0))
      await Promise.allSettled([load.resourcesReady, load.soundfontData, load.soundfontSettled])
    }
  })

  it('keeps the original soundfont rejection while its settle barrier still resolves', async () => {
    const soundfont = deferred<ArrayBuffer>()
    const load = startBootstrapResourceLoad(0, ports({ fetchSoundfont: () => soundfont.promise }))

    const originalError = new Error('soundfont failed')
    try {
      soundfont.reject(originalError)
      await expect(load.soundfontData).rejects.toBe(originalError)
      await expect(load.soundfontSettled).resolves.toBeUndefined()
      await expect(load.resourcesReady).resolves.toEqual({ assets, glyphs, dialogAssets })
    } finally {
      soundfont.resolve(new ArrayBuffer(0))
      await Promise.allSettled([load.resourcesReady, load.soundfontData, load.soundfontSettled])
    }
  })
})
