import { IDBFactory, IDBKeyRange, IDBObjectStore } from 'fake-indexeddb'
import { vi } from 'vitest'
import cursorJson from '../../engine-chrome/assets/dialog-icons-raw.json?raw'

export const chromePng = () =>
  Uint8Array.from(
    atob(
      'iVBORw0KGgoAAAANSUhEUgAAAAUAAAAICAYAAAAx8TU7AAAAO0lEQVR4AW3BURUAUQRAwUsbAVQRUhUBxLE+9zhvRlhdOSzzYIl25XCoeXApIBzKg/IgXTn8mAcCDMcHXOMNDOadqmUAAAAASUVORK5CYII=',
    ),
    (c) => c.charCodeAt(0),
  )
const bdf =
  'STARTFONT 2.1\nFONT fixture\nSIZE 8 75 75\nFONTBOUNDINGBOX 8 8 0 0\nSTARTPROPERTIES 2\nFONT_ASCENT 8\nFONT_DESCENT 0\nENDPROPERTIES\nCHARS 1\nSTARTCHAR A\nENCODING 65\nSWIDTH 500 0\nDWIDTH 8 0\nBBX 8 8 0 0\nBITMAP\n00\n18\n24\n42\n7E\n42\n42\n00\nENDCHAR\nENDFONT\n'

/** External browser IO only. No production business module is mocked here. */
export async function installShellHost(query = '') {
  vi.resetModules()
  const { Blob: NativeBlob } = await vi.importActual<{ Blob: typeof Blob }>('node:buffer')
  const { webcrypto } = await vi.importActual<{ webcrypto: Crypto }>('node:crypto')
  const { setImmediate } = await vi.importActual<{ setImmediate(cb: () => void): unknown }>(
    'node:timers',
  )
  vi.stubGlobal('Blob', NativeBlob)
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('indexedDB', new IDBFactory())
  vi.stubGlobal('IDBKeyRange', IDBKeyRange)
  localStorage.clear()
  history.replaceState(null, '', `/${query}`)
  document.body.innerHTML = '<canvas id="screen"></canvas>'
  const frames = new Map<number, FrameRequestCallback>()
  let frameId = 0
  let now = 0
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.set(++frameId, cb)
    return frameId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  const listeners: {
    target: Window | Document
    type: string
    callback: EventListenerOrEventListenerObject
    capture: boolean
  }[] = []
  for (const target of [window, document]) {
    const add = target.addEventListener.bind(target)
    vi.spyOn(target, 'addEventListener').mockImplementation((type, callback, options) => {
      if (callback)
        listeners.push({
          target,
          type,
          callback,
          capture: typeof options === 'boolean' ? options : (options?.capture ?? false),
        })
      add(type, callback, options)
    })
  }
  const draws: { method: string; args: unknown[]; canvas: HTMLCanvasElement }[] = []
  class Pixels implements ImageData {
    readonly colorSpace = 'srgb' as const
    readonly data: Uint8ClampedArray<ArrayBuffer>
    readonly width: number
    readonly height: number
    constructor(width: number, height: number) {
      this.width = width
      this.height = height
      this.data = new Uint8ClampedArray(width * height * 4)
    }
  }
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
    kind,
  ) {
    if (kind !== '2d') return null
    const old = contexts.get(this)
    if (old) return old
    const record =
      (method: string) =>
      (...args: unknown[]) => {
        draws.push({ method, args, canvas: this })
      }
    const stub: Partial<CanvasRenderingContext2D> = {
      canvas: this,
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      imageSmoothingEnabled: false,
      save: record('save'),
      restore: record('restore'),
      setTransform: record('setTransform'),
      resetTransform: record('resetTransform'),
      scale: record('scale'),
      translate: record('translate'),
      rotate: record('rotate'),
      drawImage: record('drawImage'),
      fillRect: record('fillRect'),
      clearRect: record('clearRect'),
      strokeRect: record('strokeRect'),
      beginPath: record('beginPath'),
      rect: record('rect'),
      clip: record('clip'),
      fillText: record('fillText'),
      putImageData: record('putImageData'),
      createImageData: (value: number | ImageData, height?: number) => {
        if (typeof value !== 'number') return new Pixels(value.width, value.height)
        if (height === undefined) throw new Error('image height missing')
        return new Pixels(value, height)
      },
      getImageData: (_x, _y, w, h) => new Pixels(w, h),
    }
    // Narrow external Canvas IO adapter, not a cast of project/world/business input.
    const ctx = stub as CanvasRenderingContext2D
    contexts.set(this, ctx)
    return ctx
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) =>
    cb(new Blob([chromePng().slice().buffer], { type: 'image/png' })),
  )
  const bitmaps: ImageBitmap[] = []
  vi.stubGlobal('createImageBitmap', async (blob: Blob) => {
    const bytes = new Uint8Array(await blob.arrayBuffer())
    if (bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71)
      throw new Error('host requires PNG')
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const bitmap = { width: view.getUint32(16), height: view.getUint32(20), close: vi.fn() }
    bitmaps.push(bitmap)
    return bitmap
  })
  const fetches: string[] = []
  const overrides = new Map<string, () => Promise<Response>>()
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    const url = String(input)
    fetches.push(url)
    const override = overrides.get(url)
    if (override) return override()
    if (url.endsWith('unifont-cn.bdf')) return new Response(bdf)
    if (url.endsWith('dialog-icons-raw.json')) return new Response(cursorJson)
    if (url.includes('/engine-chrome/assets/') && url.endsWith('.png'))
      return new Response(chromePng().slice().buffer)
    throw new Error(`unexpected external URL: ${url}`)
  })
  // Observe real renderer calls without replacing their implementation; not a pixel oracle.
  const text = vi.spyOn(await import('../../text/text-render.js'), 'renderSpans')
  type HeldRead = {
    entered: boolean
    delivered: boolean
    release: () => void
    consumed: Promise<void>
  }
  const heldReads: HeldRead[] = []
  const get = IDBObjectStore.prototype.get
  let nextRead: { state: HeldRead; gate: Promise<void>; consume: () => void } | undefined
  vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(function (
    this: IDBObjectStore,
    key,
  ) {
    const request = get.call(this, key)
    if (this.name === 'payload' && key === 'quick' && nextRead) {
      const held = nextRead
      nextRead = undefined
      // Hold only delivery of this real IDB request's success event. Its result/transaction
      // still come from fake-indexeddb, and the product SaveStore is never replaced.
      request.addEventListener(
        'success',
        (event) => {
          held.state.entered = true
          event.stopImmediatePropagation()
          void held.gate.then(() => {
            request.onsuccess?.call(request, event)
            held.state.delivered = true
            held.consume()
          })
        },
        { once: true },
      )
    }
    return request
  })
  return {
    frames,
    draws,
    fetches,
    overrides,
    bitmaps,
    text,
    holdNextPayloadRead(): HeldRead {
      if (nextRead) throw new Error('a payload read is already armed')
      let release!: () => void, consume!: () => void
      const gate = new Promise<void>((resolve) => {
        release = resolve
      })
      const consumed = new Promise<void>((resolve) => {
        consume = resolve
      })
      const state = { entered: false, delivered: false, release, consumed }
      nextRead = { state, gate, consume }
      heldReads.push(state)
      return state
    },
    async settleIO() {
      await new Promise<void>((resolve) => {
        setImmediate(resolve)
      })
    },
    frame(dt = 100) {
      now += dt
      const batch = [...frames]
      frames.clear()
      for (const [, cb] of batch) cb(now)
    },
    key(key: string) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    },
    release(key: string) {
      window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }))
    },
    close() {
      for (const held of heldReads) held.release()
      for (const row of listeners)
        row.target.removeEventListener(row.type, row.callback, row.capture)
      frames.clear()
      for (const bitmap of bitmaps) bitmap.close()
      Reflect.deleteProperty(window, '__reforge')
      Reflect.deleteProperty(window, '__tpE2e')
      document.body.replaceChildren()
      vi.restoreAllMocks()
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    },
  }
}
export type ShellHost = Awaited<ReturnType<typeof installShellHost>>
