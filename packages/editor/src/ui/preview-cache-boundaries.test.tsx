// @vitest-environment jsdom
// @ts-expect-error Node test-host bridge only; production tsconfig remains DOM-only.
import { Blob as NodeBlob } from 'node:buffer'
// @ts-expect-error Node test-host bridge only.
import { webcrypto } from 'node:crypto'
import { loadFireSprite } from '@type-pal/reforge'
import { act } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { loadEditorSprite } from '../core/sprite-assets.js'
import { deferred, previewCacheFixture } from './__tests__/preview-cache-fixture.js'
import { FireEffectPreview } from './FireEffectPreview.js'
import { SpriteThumb } from './SpriteThumb.js'

// Observe real loader completion only; every call still executes the production loader/decoder.
const trace = vi.hoisted(() => ({ pending: [] as Promise<unknown>[] }))
vi.mock('@type-pal/reforge', async (original) => {
  const actual = await original<typeof import('@type-pal/reforge')>()
  return {
    ...actual,
    loadFireSprite: (...args: Parameters<typeof actual.loadFireSprite>) => {
      const promise = actual.loadFireSprite(...args)
      trace.pending.push(promise)
      return promise
    },
    loadStandardPalette: (...args: Parameters<typeof actual.loadStandardPalette>) => {
      const promise = actual.loadStandardPalette(...args)
      trace.pending.push(promise)
      return promise
    },
  }
})
vi.mock('../core/sprite-assets.js', async (original) => {
  const actual = await original<typeof import('../core/sprite-assets.js')>()
  return {
    ...actual,
    loadEditorSprite: (...args: Parameters<typeof actual.loadEditorSprite>) => {
      const promise = actual.loadEditorSprite(...args)
      trace.pending.push(promise)
      return promise
    },
  }
})

type Fixture = Awaited<ReturnType<typeof previewCacheFixture>>
type Kind = 'fire' | 'thumb'
const RED: [number, number, number] = [240, 20, 20]
const BLUE: [number, number, number] = [20, 90, 240]
let serial = 7000
let roots: Array<{ root: Root; host: HTMLDivElement }> = []
let pixels = new WeakMap<HTMLCanvasElement, number[]>()
let clears = new WeakMap<HTMLCanvasElement, number>()
let baked: number[][] = []

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('Blob', NodeBlob)
  vi.stubGlobal('crypto', webcrypto)
  trace.pending = []
  pixels = new WeakMap()
  clears = new WeakMap()
  baked = []
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(private cb: (entries: Array<{ isIntersecting: boolean }>) => void) {}
      observe() {
        this.cb([{ isIntersecting: true }])
      }
      disconnect() {}
    },
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    return {
      imageSmoothingEnabled: false,
      createImageData: (width: number, height: number) => ({
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: (data: ImageData) => {
        const value = [...data.data.slice(0, 4)]
        pixels.set(this, value)
        baked.push(value)
      },
      clearRect: () => {
        clears.set(this, (clears.get(this) ?? 0) + 1)
        pixels.delete(this)
      },
      drawImage: (image: HTMLCanvasElement) => {
        const value = pixels.get(image)
        if (!value) throw new Error('drawImage received an unbaked frame')
        pixels.set(this, [...value])
      },
    } as unknown as CanvasRenderingContext2D
  })
})
afterEach(async () => {
  for (const { root, host } of roots) {
    await act(async () => root.unmount())
    host.remove()
  }
  roots = []
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function preview(kind: Kind, f: Fixture) {
  return kind === 'fire' ? (
    <FireEffectPreview assetBase={f.base} assetReader={f.reader} anim={{ effectSprite: f.chunk }} />
  ) : (
    <SpriteThumb
      assetBase={f.base}
      assetReader={f.reader}
      asset={f.spriteAsset}
      revision={f.revision()}
    />
  )
}
async function render(root: Root, kind: Kind, f: Fixture, wait = true) {
  const before = trace.pending.length
  await act(async () => {
    flushSync(() => root.render(preview(kind, f)))
    if (wait) await Promise.allSettled(trace.pending.slice(before))
  })
}
async function mount(kind: Kind, f: Fixture, wait = true) {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  roots.push({ root, host })
  await render(root, kind, f, wait)
  return { root, host }
}
async function settled(kind: Kind, host: HTMLDivElement, afterClear = 0) {
  await vi.waitFor(async () => {
    await act(async () => {})
    const canvas = host.querySelector('canvas')
    if (kind === 'fire')
      expect(Boolean(canvas) || host.textContent?.includes('无法加载')).toBe(true)
    else expect(canvas && (clears.get(canvas) ?? 0) > afterClear).toBe(true)
  })
}
const painted = (host: HTMLDivElement) => {
  const canvas = host.querySelector('canvas')
  return canvas ? pixels.get(canvas) : undefined
}

test.each([
  'fire',
  'thumb',
] as const)('%s same metadata in another reader must not hide that readers IO failure', async (kind) => {
  const chunk = serial++
  const a = await previewCacheFixture(`preview-identical-${kind}`, chunk, RED)
  const b = await previewCacheFixture(`preview-identical-${kind}`, chunk, RED)
  expect(b.catalog).toEqual(a.catalog)
  const first = await mount(kind, a)
  await settled(kind, first.host)
  expect(painted(first.host)).toEqual([...RED, 255])
  b.faults.add(kind === 'fire' ? b.firePath : b.spritePath)
  const second = await mount(kind, b)
  await settled(kind, second.host)
  expect(b.injected()).toBe(1)
  expect(painted(second.host)).toBeUndefined()
})

test.each([
  'different-id',
  'same-id',
] as const)('FIRE %s projects with the same chunk render their own bytes and palette', async (ids) => {
  const chunk = serial++
  const a = await previewCacheFixture('preview-a', chunk, RED)
  const b = await previewCacheFixture(ids === 'same-id' ? 'preview-a' : 'preview-b', chunk, BLUE)
  expect((await loadFireSprite(a.base, chunk)).frames[0]?.pixels[0]).toBe(10)
  expect((await loadFireSprite(b.base, chunk)).frames[0]?.pixels[0]).toBe(10)
  const mounted = await mount('fire', a)
  await settled('fire', mounted.host)
  expect(painted(mounted.host)).toEqual([...RED, 255])
  const previousReads = b.reads.get(b.firePath) ?? 0
  await render(mounted.root, 'fire', b)
  await settled('fire', mounted.host)
  expect(painted(mounted.host)).toEqual([...BLUE, 255])
  expect(b.reads.get(b.firePath)).toBe(previousReads + 1)
})

test.each([
  'reader',
  'base',
] as const)('thumbnail isolates the %s identity independently of identical metadata', async (axis) => {
  const chunk = serial++
  const a = await previewCacheFixture('preview-thumb-axis', chunk, RED)
  const b = await previewCacheFixture('preview-thumb-axis', chunk, RED)
  expect(b.catalog).toEqual(a.catalog)
  const first = await mount('thumb', a)
  await settled('thumb', first.host)
  expect(painted(first.host)).toEqual([...RED, 255])
  // Keep the other identity identical: sprite bytes belong to reader, palette bytes to base.
  b.faults.add(axis === 'reader' ? b.spritePath : b.palettePath)
  const other = axis === 'reader' ? { ...b, base: a.base } : { ...b, reader: a.reader }
  const second = await mount('thumb', other)
  await settled('thumb', second.host)
  expect(b.injected()).toBe(1)
  expect(painted(second.host)).toBeUndefined()
})

test('FIRE same base and chunk invalidate on source SHA and on palette revision', async () => {
  const f = await previewCacheFixture('preview-revision', serial++, RED)
  const mounted = await mount('fire', f)
  await settled('fire', mounted.host)
  expect(painted(mounted.host)).toEqual([...RED, 255])
  const original = f.catalog.assets[f.fireAsset]!.sha256
  const paletteBefore = f.catalog.assets['color.preview']!.sha256
  await f.replaceFire(20)
  expect(f.catalog.assets[f.fireAsset]!.sha256).not.toBe(original)
  expect(f.catalog.assets['color.preview']!.sha256).toBe(paletteBefore)
  await render(mounted.root, 'fire', f)
  await settled('fire', mounted.host)
  expect(painted(mounted.host)).toEqual([20, 200, 40, 255])
  await f.replacePalette(BLUE)
  await render(mounted.root, 'fire', f)
  await settled('fire', mounted.host)
  expect(painted(mounted.host)).toEqual([...BLUE, 255])
})

test('FIRE transient failure is not a permanent cached null for the same revision', async () => {
  const f = await previewCacheFixture('preview-fire-retry', serial++, BLUE)
  f.faults.add(f.firePath)
  const failed = await mount('fire', f)
  await settled('fire', failed.host)
  expect(f.injected()).toBe(1)
  expect(failed.host.textContent).toContain('无法加载')
  const recovered = await mount('fire', f)
  await settled('fire', recovered.host)
  expect(painted(recovered.host)).toEqual([...BLUE, 255])
})

test('thumbnail retries after failure even when its lower decoder was already warmed', async () => {
  const f = await previewCacheFixture('preview-thumb-retry', serial++, BLUE)
  f.faults.add(f.spritePath)
  const failed = await mount('thumb', f)
  await settled('thumb', failed.host)
  expect(f.injected()).toBe(1)
  expect(painted(failed.host)).toBeUndefined()
  expect((await loadEditorSprite(f.reader, f.spriteAsset)).frames[0]?.pixels[0]).toBe(10)
  const reads = f.reads.get(f.spritePath)
  const recovered = await mount('thumb', f)
  await settled('thumb', recovered.host)
  expect(painted(recovered.host)).toEqual([...BLUE, 255])
  expect(f.reads.get(f.spritePath)).toBe(reads) // warm lower cache may correctly perform zero reads
})

test('same-id thumbnail readers with identical sprite revision do not share baked colors', async () => {
  const chunk = serial++
  const a = await previewCacheFixture('preview-thumb-same', chunk, RED)
  const b = await previewCacheFixture('preview-thumb-same', chunk, BLUE)
  expect(a.revision()).toBe(b.revision())
  const mounted = await mount('thumb', a)
  await settled('thumb', mounted.host)
  expect(painted(mounted.host)).toEqual([...RED, 255])
  const canvas = mounted.host.querySelector('canvas')!
  const before = clears.get(canvas) ?? 0
  await render(mounted.root, 'thumb', b)
  await settled('thumb', mounted.host, before)
  expect(painted(mounted.host)).toEqual([...BLUE, 255])
})

test.each([
  'fire',
  'thumb',
] as const)('%s successful remounts share the same in-flight load', async (kind) => {
  const f = await previewCacheFixture(`preview-dedup-${kind}`, serial++, RED)
  const entered = deferred<void>(),
    release = deferred<void>()
  const path = kind === 'fire' ? f.firePath : f.spritePath
  f.gates.set(path, { entered, release })
  const first = await mount(kind, f, false)
  await entered.promise
  const second = await mount(kind, f, false)
  try {
    expect(f.reads.get(path)).toBe(1)
  } finally {
    await act(async () => {
      release.resolve()
      await Promise.allSettled(trace.pending)
    })
  }
  await settled(kind, first.host)
  await settled(kind, second.host)
  expect(painted(first.host)).toEqual([...RED, 255])
  expect(painted(second.host)).toEqual([...RED, 255])
  expect(f.reads.get(kind === 'fire' ? f.firePath : f.spritePath)).toBe(1)
})

test('thumbnail same reader and sprite SHA invalidate when the standard color table changes', async () => {
  const f = await previewCacheFixture('preview-thumb-palette', serial++, RED)
  const mounted = await mount('thumb', f)
  await settled('thumb', mounted.host)
  const revision = f.revision()
  expect(painted(mounted.host)).toEqual([...RED, 255])
  await f.replacePalette(BLUE)
  expect(f.revision()).toBe(revision)
  await render(mounted.root, 'thumb', f)
  expect(painted(mounted.host)).toEqual([...BLUE, 255])
})

test.each([
  'fire',
  'thumb',
] as const)('%s late A in the same React root cannot overwrite B', async (kind) => {
  const chunk = serial++
  const a = await previewCacheFixture(`preview-inflight-${kind}`, chunk, RED)
  const b = await previewCacheFixture(`preview-inflight-${kind}`, chunk, BLUE)
  const entered = deferred<void>(),
    release = deferred<void>()
  a.gates.set(kind === 'fire' ? a.firePath : a.spritePath, { entered, release })
  const mounted = await mount(kind, a, false)
  await entered.promise
  try {
    await render(mounted.root, kind, b)
    expect(b.reads.get(kind === 'fire' ? b.firePath : b.spritePath)).toBe(1)
    await settled(kind, mounted.host)
    expect(painted(mounted.host)).toEqual([...BLUE, 255])
  } finally {
    await act(async () => {
      release.resolve()
      await Promise.allSettled(trace.pending)
    })
    expect(baked).toContainEqual([...RED, 255])
  }
  expect(painted(mounted.host)).toEqual([...BLUE, 255])
})
