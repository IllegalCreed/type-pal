/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G10-D。
 * 结局默认不可跳、女孩停在 80、下半背景回退、AVI 500ms、POST Request 与场景拒绝。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { legalPalette } from '../__tests__/grok-render-r1/legal-host.js'
import type { DialogAssets } from '../assets/dialog-assets.js'
import type { LoadedAssets } from '../assets/loader.js'
import type { IndexedImage } from '../assets/png.js'
import type { GlyphTable } from '../present/font.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { playAvi } from './avi-player.js'
import { type BootstrapResourcePorts, startBootstrapResourceLoad } from './bootstrap-resources.js'
import { playEndingAnimation } from './ending-player.js'
import { installFetchRetry, uninstallFetchRetryForTest } from './fetch-retry.js'

const N = 320 * 200
const originalFetch = globalThis.fetch

function realCtx(): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 200
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')
  return ctx
}

function dot(fill: number): IndexedImage {
  return {
    width: 1,
    height: 1,
    indices: new Uint8Array([fill]),
    opaque: new Uint8Array([1]),
  }
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

function stubVideo(): void {
  HTMLMediaElement.prototype.play = () => Promise.resolve()
  HTMLMediaElement.prototype.pause = () => {}
}

afterEach(() => {
  uninstallFetchRetryForTest(originalFetch)
  document.body.querySelectorAll('video').forEach((node) => {
    node.remove()
  })
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('G10-D 结局截断与请求归属', () => {
  it('G10-D01 省略跳过键时 Space 不截断结局', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    const pending = playEndingAnimation({
      upperIndices: new Uint8Array(N).fill(60),
      lowerIndices: new Uint8Array(N).fill(50),
      beastFrames: [],
      girlFrames: [],
      fb,
      canvasCtx: realCtx(),
      palette: legalPalette(),
      frameCount: 3,
      frameDelayMs: 10,
    })
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await vi.runAllTimersAsync()
    await pending
    expect(fb.indices[0]).toBe(60)
  })

  it('G10-D02 女孩纵坐标停在 80', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    const pending = playEndingAnimation({
      upperIndices: new Uint8Array(N).fill(60),
      lowerIndices: new Uint8Array(N).fill(50),
      beastFrames: [],
      girlFrames: [dot(99)],
      fb,
      canvasCtx: realCtx(),
      palette: legalPalette(),
      frameCount: 202,
      frameDelayMs: 0,
    })
    await vi.runAllTimersAsync()
    await pending
    expect(fb.indices[80 * 320 + 220]).toBe(99)
    expect(fb.indices[79 * 320 + 220]).toBe(60)
  })

  it('G10-D03 下半背景长度不足时整屏为 0', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    fb.indices.fill(7)
    const pending = playEndingAnimation({
      upperIndices: new Uint8Array(N).fill(60),
      lowerIndices: new Uint8Array(4),
      beastFrames: [],
      girlFrames: [],
      fb,
      canvasCtx: realCtx(),
      palette: legalPalette(),
      frameCount: 1,
      frameDelayMs: 0,
    })
    await vi.runAllTimersAsync()
    await pending
    expect(fb.indices[0]).toBe(0)
    expect(fb.indices[N - 1]).toBe(0)
  })

  it('G10-D04 跳过 AVI 后 499 毫秒仍在，500 毫秒移除', async () => {
    vi.useFakeTimers()
    stubVideo()
    const pending = playAvi({ src: '/extracted/videos/3.mp4' })
    expect(document.body.querySelectorAll('video').length).toBe(1)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await vi.advanceTimersByTimeAsync(499)
    expect(document.body.querySelectorAll('video').length).toBe(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(document.body.querySelectorAll('video').length).toBe(0)
    await pending
  })

  it('G10-D05 POST Request 不重试', async () => {
    vi.useFakeTimers()
    const gateway = new Response('gateway', { status: 503 })
    let calls = 0
    globalThis.fetch = (async () => {
      calls += 1
      return gateway
    }) as typeof fetch
    installFetchRetry({ retries: 1, backoffMs: [1] })
    const pending = globalThis.fetch(new Request('https://x.test/post', { method: 'POST' }))
    await vi.runAllTimersAsync()
    const response = await pending
    expect(calls).toBe(1)
    expect(response.status).toBe(503)
  })

  it('G10-D06 场景资源拒绝不会升级成字形警告', async () => {
    const error = new Error('scene 4 missing')
    const warn = vi.fn()
    const load = startBootstrapResourceLoad(
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
