import {
  type AssetRecordV1,
  FRAME_SEQUENCE_MEDIA_TYPE,
  parseFrameSequence,
} from '@type-pal/content'
import {
  AssetResolver,
  type FileSource,
  FrameSequenceReader,
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import { act, createElement, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, vi } from 'vitest'
import { fixtureSource } from '../../core/__tests__/battle-trial-project.js'
import { EditSession } from '../../core/edit-session.js'
import { createEditorAssetReader } from '../../core/editor-asset-reader.js'
import { encodeFrameAnimationRequest } from '../../core/frame-animation-codec.js'
import { toEditorState } from '../../core/project-io.js'
import { buildBlankProject } from '../../core/seed.js'
import { FrameAnimationEditor, type FrameAnimationMetadata } from '../FrameAnimationEditor.js'

const cleanups: Array<() => void | Promise<void>> = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

export function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

export const framePixels = [
  new Uint8Array([120, 120, 120, 255, 120, 120, 120, 255]),
  new Uint8Array([230, 230, 230, 255, 20, 20, 20, 255]),
  new Uint8Array([90, 80, 70, 255, 60, 50, 40, 255]),
]
export const animationId = 'frame-animation.fixture'
export const otherId = 'frame-animation.other'
export const owned = (bytes: Uint8Array): ArrayBuffer => new Uint8Array(bytes).buffer
export async function digest(bytes: ArrayBuffer) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')
}
function property(target: object, name: string, descriptor: PropertyDescriptor) {
  const previous = Object.getOwnPropertyDescriptor(target, name)
  Object.defineProperty(target, name, { configurable: true, ...descriptor })
  cleanups.push(() => {
    if (previous) Object.defineProperty(target, name, previous)
    else Reflect.deleteProperty(target, name)
  })
}

export async function frameEditor(
  options: {
    frameCount?: number
    frames?: readonly Uint8Array[]
    corruptPayload?: boolean
    initialFailure?: unknown
    deferInitial?: Promise<void>
  } = {},
) {
  const nodeBuffer = 'node:buffer'
  const native: { Blob: typeof Blob } = await import(nodeBuffer)
  vi.stubGlobal('Blob', native.Blob)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  // Browser ports only: observe exact pixels delivered by production drawFrame.
  vi.stubGlobal(
    'ImageData',
    class {
      constructor(
        readonly data: Uint8ClampedArray,
        readonly width: number,
        readonly height: number,
      ) {}
    },
  )
  const pixels = new Map<HTMLCanvasElement, Uint8ClampedArray>()
  const bitmapPixels = new WeakMap<ImageBitmap, Uint8ClampedArray>()
  const draws: HTMLCanvasElement[] = []
  property(HTMLCanvasElement.prototype, 'getContext', {
    value: function (this: HTMLCanvasElement, kind: string) {
      if (kind !== '2d') throw new Error(`unexpected canvas context ${kind}`)
      return {
        clearRect: () => undefined,
        drawImage: (bitmap: ImageBitmap) => {
          const rgba = bitmapPixels.get(bitmap)
          if (!rgba) throw new Error('unregistered test image bitmap')
          pixels.set(this, rgba.slice())
        },
        getImageData: () => {
          const rgba = pixels.get(this)
          if (!rgba) throw new Error('image canvas has no decoded pixels')
          return { data: rgba.slice(), width: this.width, height: this.height }
        },
        putImageData: (image: ImageData, x: number, y: number) => {
          expect([x, y]).toEqual([0, 0])
          expect([image.width, image.height]).toEqual([this.width, this.height])
          pixels.set(this, image.data.slice())
          draws.push(this)
        },
      }
    },
  })
  const observers: Array<ResizeObserver & { callback: ResizeObserverCallback }> = []
  const disconnected = vi.fn()
  vi.stubGlobal(
    'ResizeObserver',
    class implements ResizeObserver {
      constructor(readonly callback: ResizeObserverCallback) {
        observers.push(this)
      }
      observe() {}
      unobserve() {}
      disconnect() {
        disconnected()
      }
    },
  )
  property(HTMLElement.prototype, 'scrollTo', {
    value: function (this: HTMLElement, options: ScrollToOptions) {
      if (options.left !== undefined) this.scrollLeft = options.left
      if (options.top !== undefined) this.scrollTop = options.top
    },
  })
  property(HTMLElement.prototype, 'clientWidth', {
    get: function (this: HTMLElement) {
      return this.classList.contains('fa-timeline') ? 600 : 100
    },
  })
  const captures = new Map<HTMLElement, Set<number>>()
  property(HTMLElement.prototype, 'setPointerCapture', {
    value: function (this: HTMLElement, id: number) {
      const ids = captures.get(this) ?? new Set<number>()
      ids.add(id)
      captures.set(this, ids)
    },
  })
  property(HTMLElement.prototype, 'hasPointerCapture', {
    value: function (this: HTMLElement, id: number) {
      return captures.get(this)?.has(id) ?? false
    },
  })
  property(HTMLElement.prototype, 'releasePointerCapture', {
    value: function (this: HTMLElement, id: number) {
      captures.get(this)?.delete(id)
    },
  })
  const rafs: FrameRequestCallback[] = []
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    rafs.push(callback)
    return rafs.length
  })
  const files = await buildBlankProject('frame-editor-fixture')
  const initial = await loadCurrentProjectFrom(fixtureSource(files))
  const catalog = structuredClone(initial.assetCatalog)
  const colorId = initial.manifest.assets.roles['visual.standardColorTable']!
  const palette = {
    colors: Array.from({ length: 256 }, (_, i) => (i === 1 ? [255, 255, 255] : [0, 0, 0])),
    cycles: [],
  }
  const paletteBytes = new TextEncoder().encode(`${JSON.stringify(palette, null, 2)}\n`).buffer
  catalog.assets[colorId] = {
    ...catalog.assets[colorId]!,
    bytes: paletteBytes.byteLength,
    sha256: await digest(paletteBytes),
  }
  files[catalog.assets[colorId]!.path] = palette
  for (const [id, count] of [
    [animationId, options.frameCount ?? 3],
    [otherId, 2],
  ] as const) {
    const encoded = await encodeFrameAnimationRequest({
      width: 2,
      height: 1,
      defaultFrameMs: 40,
      colorTreatment: 'preserve',
      frames: (options.frames ?? framePixels)
        .slice(0, count)
        .map((rgba, i) => ({ rgba: owned(rgba), ...(i === 1 ? { durationMs: 70 } : {}) })),
    })
    expect(parseFrameSequence(encoded).index.frames).toHaveLength(count)
    if (id === animationId && options.corruptPayload) {
      parseFrameSequence(encoded).payload[0] = 0
      expect(parseFrameSequence(encoded).index.frames).toHaveLength(count)
    }
    const record: AssetRecordV1 = {
      kind: 'frame-animation',
      path: `assets/authored/${id}.tpfs`,
      mediaType: FRAME_SEQUENCE_MEDIA_TYPE,
      bytes: encoded.byteLength,
      sha256: await digest(owned(encoded)),
      label: id,
      origin: { kind: 'authored', ref: id },
    }
    catalog.assets[id] = record
    files[record.path] = owned(encoded)
  }
  files['assets/index.json'] = catalog
  const rawSource = fixtureSource(files)
  const project = await loadCurrentProjectFrom(rawSource)
  const initialState = toEditorState(project, [project.authorContent.entryScene], {}, {}, [])
  const before = structuredClone(initialState),
    filesBefore = structuredClone(files)
  const session = new EditSession(initialState)
  const io: { beforeRead?: (path: string) => Promise<void>; failure?: unknown } = {
    failure: options.initialFailure,
  }
  const reads: string[] = []
  const source: FileSource = {
    ...rawSource,
    readBytes: async (path: string) => {
      reads.push(path)
      if (path === catalog.assets[animationId]!.path && options.deferInitial)
        await options.deferInitial
      if (io.beforeRead) await io.beforeRead(path)
      if (io.failure !== undefined) throw io.failure
      return rawSource.readBytes(path)
    },
    readText: async (path: string) => new TextDecoder().decode(await source.readBytes(path)),
  }
  const reader = createEditorAssetReader(source, () => session.getState())
  const assetBase = {
    source,
    assetResolver: new AssetResolver(
      project.manifest.id,
      project.assetCatalog,
      project.manifest.assets.roles,
      source,
    ),
  }
  const metadata = vi.fn<(value?: FrameAnimationMetadata) => void>(),
    dirty = vi.fn<(value: boolean) => void>()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  let selected = animationId,
    mounted = true
  function Harness() {
    useSyncExternalStore(
      (listener) => session.subscribe(listener),
      () => session.getVersion(),
    )
    const record = session.getState().assetCatalog.assets[selected]!
    return createElement(FrameAnimationEditor, {
      asset: { id: selected, record },
      reader,
      assetBase,
      session,
      onMetadata: metadata,
      onDirtyChange: dirty,
    })
  }
  async function render(id = selected) {
    selected = id
    await act(async () => root.render(createElement(Harness)))
  }
  async function unmount() {
    if (!mounted) return
    mounted = false
    await act(async () => root.unmount())
    host.remove()
  }
  cleanups.push(unmount)
  await render()
  const cards = () => [...host.querySelectorAll<HTMLButtonElement>('.fa-frame')]
  const canvas = () => host.querySelector<HTMLCanvasElement>('.fa-preview-surface canvas')!
  const stage = () => host.querySelector<HTMLElement>('.fa-preview-stage')!
  const counter = () => host.querySelector('.fa-counter')?.textContent
  function button(label: string) {
    const b = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent === label || b.getAttribute('aria-label') === label,
    )
    if (!b) throw new Error(`missing frame button ${label}`)
    return b
  }
  const click = async (label: string) => {
    await act(async () => button(label).click())
  }
  const select = async (index: number, mods: MouseEventInit = {}) => {
    const card = cards()[index]
    if (!card) throw Error('missing frame')
    await act(async () => card.dispatchEvent(new MouseEvent('click', { bubbles: true, ...mods })))
  }
  const checkbox = async (label: string) => {
    const input = [...host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].find(
      (candidate) => candidate.closest('label')?.textContent?.includes(label),
    )
    if (!input) throw new Error(`missing frame checkbox ${label}`)
    await act(async () => input.click())
  }
  const key = async (value: string) => {
    await act(async () =>
      stage().dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true })),
    )
  }
  const pointer = async (
    type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
    options: MouseEventInit & { pointerId: number },
  ) => {
    const event = new MouseEvent(type, { bubbles: true, ...options })
    Object.defineProperty(event, 'pointerId', { value: options.pointerId })
    await act(async () => stage().dispatchEvent(event))
  }
  const resize = async () => {
    await act(async () => {
      for (const observer of observers) observer.callback([], observer)
    })
  }
  const geometry = () => {
    property(stage(), 'getBoundingClientRect', {
      value: () => new DOMRect(100, 50, 100, 80),
    })
    property(canvas(), 'getBoundingClientRect', {
      value: () =>
        new DOMRect(
          120 - stage().scrollLeft,
          60 - stage().scrollTop,
          Number.parseFloat(canvas().style.width) || 8,
          Number.parseFloat(canvas().style.height) || 4,
        ),
    })
  }
  const unchanged = () => {
    expect(initialState).toEqual(before)
    expect(files).toEqual(filesBefore)
  }
  const draftOnly = () => {
    unchanged()
    expect(session.getState()).toBe(initialState)
    expect(session.getHistoryVersion()).toBe(0)
    expect(session.isDirty()).toBe(false)
  }
  const wait = async (condition: () => void) => {
    await vi.waitFor(
      async () => {
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0))
        })
        condition()
      },
      { timeout: 3000, interval: 5 },
    )
  }
  const ready = () =>
    wait(() => {
      expect(metadata.mock.lastCall?.[0]).toBeDefined()
      expect(cards().length).toBeGreaterThan(0)
      expect(pixels.get(canvas())).toBeDefined()
      for (const c of cards()) expect(pixels.get(c.querySelector('canvas')!)).toBeDefined()
    })
  const latest = () => metadata.mock.lastCall?.[0]
  async function number(label: string, value: string, blur = false) {
    const labelElement = [...host.querySelectorAll('label')].find((e) => e.textContent === label)
    const field = [...host.querySelectorAll<HTMLInputElement>('input')].find(
      (e) => e.id === labelElement?.htmlFor,
    )
    if (!field) throw Error(`missing number ${label}`)
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      set.call(field, value)
      field.dispatchEvent(new Event('input', { bubbles: true }))
      if (blur) field.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
  }
  const snapshot = () => ({
    ...latest(),
    counter: counter(),
    selected: cards()
      .filter((e) => e.getAttribute('aria-pressed') === 'true')
      .map((e) => e.dataset.frameId),
  })
  async function reopened() {
    const r = new FrameSequenceReader(reader)
    const seq = await r.sequence(selected)
    const frames = []
    for (let i = 0; i < seq.index.frames.length; i++)
      frames.push([...(await r.frame(selected, i)).rgba])
    return { index: seq.index, frames }
  }
  async function saved() {
    await wait(() => {
      expect(session.getHistoryVersion()).toBeGreaterThan(0)
      expect(button('保存动画').disabled).toBe(true)
      expect(latest()).toBeDefined()
    })
    await ready()
    unchanged()
    return reopened()
  }
  const flushRaf = async () => {
    await act(async () => {
      for (const cb of rafs.splice(0)) cb(16)
    })
  }
  return {
    files,
    catalog,
    project,
    initialState,
    before,
    session,
    reader,
    io,
    reads,
    host,
    metadata,
    dirty,
    pixels,
    bitmapPixels,
    draws,
    captures,
    observers,
    disconnected,
    render,
    unmount,
    cards,
    canvas,
    stage,
    counter,
    button,
    click,
    select,
    checkbox,
    key,
    pointer,
    resize,
    geometry,
    unchanged,
    draftOnly,
    wait,
    ready,
    latest,
    number,
    snapshot,
    reopened,
    saved,
    flushRaf,
  }
}
