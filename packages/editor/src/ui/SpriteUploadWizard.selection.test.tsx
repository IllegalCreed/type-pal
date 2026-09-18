// @vitest-environment jsdom
// Real component events and import pipeline; only bitmap/canvas/palette host boundaries are controlled.
// @ts-expect-error Node-only test host; editor production type environment is DOM-only.
import { Blob as NodeBlob } from 'node:buffer'
// @ts-expect-error Node-only test host; no production tsconfig expansion.
import { webcrypto } from 'node:crypto'
// @ts-expect-error Independent test decoder, not a browser product dependency.
import { gunzipSync } from 'node:zlib'
import type { AssetBase, Palette } from '@type-pal/reforge'
import {
  fsaSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  parseSpriteChunkStrict,
} from '@type-pal/reforge'
import { act, StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, type Mock, test, vi } from 'vitest'
import { memoryAuthorDirectory } from '../core/__tests__/author-save-fixture.js'
import { sha256Hex } from '../core/binary-signature.js'
import { EditSession } from '../core/edit-session.js'
import { toEditorState } from '../core/project-io.js'
import { buildBlankProject } from '../core/seed.js'
import { SpriteUploadWizard } from './SpriteUploadWizard.js'

const hostMocks = vi.hoisted(() => ({
  palette: vi.fn(),
  encode: vi.fn(),
  submit: undefined as (() => void) | undefined,
}))
vi.mock('@type-pal/reforge', async (original) => {
  const actual = await original<typeof import('@type-pal/reforge')>()
  hostMocks.encode.mockImplementation(actual.encodeSpriteChunk)
  return {
    ...actual,
    encodeSpriteChunk: hostMocks.encode,
    loadStandardPalette: hostMocks.palette,
    bakeFrame: () => document.createElement('canvas'),
  }
})
vi.mock('./design-system/index.js', async (original) => {
  const actual = await original<typeof import('./design-system/index.js')>()
  const { createElement } = await import('react')
  return {
    ...actual,
    DsButton: (props: import('react').ComponentProps<typeof actual.DsButton>) => {
      if (props.className === 'sprite-upload-submit') hostMocks.submit = props.onClick as () => void
      return createElement(actual.DsButton, props)
    },
  }
})

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function bitmap(width: number, pixel: number) {
  return {
    width,
    height: 1,
    close: vi.fn(),
    rgba: Uint8ClampedArray.from(Array.from({ length: width }, () => [pixel, 0, 0, 255]).flat()),
  }
}
type Bitmap = ReturnType<typeof bitmap>
const palette: Palette = { colors: Array.from({ length: 256 }, (_, i) => [i, 0, 0]), cycles: [] }
let root: Root, host: HTMLDivElement, session: EditSession
let decode: ReturnType<typeof vi.fn>
let gates: Map<string, ReturnType<typeof deferred<Bitmap>>>
let assetBase: AssetBase
let onDone: Mock<(id: string | null) => void>
let done: ReturnType<typeof deferred<string | null>>
let fault: 'context' | 'draw' | 'read' | 'data-url' | undefined
let mounted: boolean

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('Blob', NodeBlob)
  const files = await buildBlankProject('sprite-selection')
  const loaded = await loadCurrentProjectFrom(fsaSource(memoryAuthorDirectory(files).dir))
  session = new EditSession(toEditorState(loaded, await loadAllAuthorScenes(loaded), {}, {}, []))
  assetBase = loaded.assetBase
  hostMocks.palette.mockReset().mockResolvedValue(palette)
  gates = new Map()
  decode = vi.fn((file: File) => gates.get(file.name)!.promise)
  vi.stubGlobal('createImageBitmap', decode)
  const images = new WeakMap<HTMLCanvasElement, Bitmap>()
  fault = undefined
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    if (fault === 'context') return null
    return {
      clearRect: () => {},
      drawImage: (source: Bitmap) => {
        if (fault === 'draw') throw new Error('draw failed')
        images.set(this, source)
      },
      getImageData: () => {
        if (fault === 'read') throw new Error('read failed')
        return { data: images.get(this)!.rgba }
      },
    } as never
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
    if (fault === 'data-url') throw new Error('data URL failed')
    return 'data:image/png;base64,AA=='
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  mounted = true
  done = deferred<string | null>()
  onDone = vi.fn((id: string | null) => done.resolve(id))
  await render()
  await act(async () => {
    ;[...host.querySelectorAll('button')].find((b) => b.textContent?.includes('默认定格'))!.click()
  })
  hostMocks.encode.mockClear()
})
afterEach(async () => {
  if (mounted) await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
async function render() {
  await act(async () =>
    root.render(
      <StrictMode>
        <SpriteUploadWizard
          sprites={session.getState().sprites}
          session={session}
          assetBase={assetBase}
          onDone={onDone}
        />
      </StrictMode>,
    ),
  )
}
async function pick(name: string) {
  const gate = deferred<Bitmap>()
  gates.set(name, gate)
  const input = host.querySelector<HTMLInputElement>('input[type="file"]')!
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [new File(['image'], name, { type: 'image/png' })],
  })
  await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })))
  return gate
}
async function finish(gate: ReturnType<typeof deferred<Bitmap>>, value: Bitmap | Error) {
  await act(async () => {
    if (value instanceof Error) gate.reject(value)
    else gate.resolve(value)
    await gate.promise.catch(() => undefined)
  })
}
function submitButton() {
  return host.querySelector<HTMLButtonElement>('.sprite-upload-submit')!
}
async function editText(id: string, value: string) {
  const input = host.querySelector<HTMLInputElement>(`#${id}`)!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function verifyImport(width: number, pixel: number) {
  await act(async () => {
    submitButton().click()
    await done.promise
  })
  const id = await done.promise
  expect(id).not.toBeNull()
  const state = session.getState(),
    def = state.sprites.find((s) => s.id === id)!
  const record = state.assetCatalog.assets[def.asset]!,
    bytes = state.assetBlobs[record.path]!
  expect(bytes.byteLength).toBe(record.bytes)
  expect(await sha256Hex(bytes)).toBe(record.sha256)
  const frames = parseSpriteChunkStrict(gunzipSync(bytes))
  expect(frames).toHaveLength(1)
  expect(frames[0]!.width).toBe(width)
  expect(frames[0]!.height).toBe(1)
  expect([...frames[0]!.pixels]).toEqual(Array(width).fill(pixel))
  expect([...frames[0]!.opaque]).toEqual(Array(width).fill(1))
  expect(onDone).toHaveBeenCalledTimes(1)
  return { id, def, record, bytes }
}

test.each([
  'A-B',
  'B-A',
])('last selected bitmap owns preview and real stored bytes: %s', async (order) => {
  const a = await pick('a.png'),
    b = await pick('b.png'),
    imageA = bitmap(1, 100),
    imageB = bitmap(2, 200)
  if (order === 'A-B') {
    await finish(a, imageA)
    expect(host.querySelector('.sprite-upload-wizard')?.getAttribute('aria-busy')).toBe('true')
    expect(host.querySelector<HTMLInputElement>('input[type="file"]')!.disabled).toBe(false)
    await finish(b, imageB)
  } else {
    await finish(b, imageB)
    await finish(a, imageA)
  }
  expect(host.textContent).toContain('b.png')
  expect(host.textContent).not.toContain('a.png')
  expect(imageA.close).toHaveBeenCalledTimes(1)
  expect(imageB.close).toHaveBeenCalledTimes(1)
  await verifyImport(2, 200)
})

test('rendered submit handler rejects a stale draft independently of the disabled DOM', async () => {
  const a = await pick('a.png')
  await finish(a, bitmap(1, 100))
  const oldSubmit = hostMocks.submit!
  const b = await pick('b.png')
  expect(submitButton().disabled).toBe(true)
  // Capture the production DsButton prop, not a copied submit implementation or DOM internals.
  await act(async () => oldSubmit())
  expect(hostMocks.encode).not.toHaveBeenCalled()
  await finish(b, bitmap(2, 200))
  await act(async () => oldSubmit())
  expect(hostMocks.encode).not.toHaveBeenCalled()
  await verifyImport(2, 200)
})

test('old failure cannot overwrite the selected successful bitmap', async () => {
  const a = await pick('a.png'),
    b = await pick('b.png')
  await finish(b, bitmap(2, 200))
  await finish(a, new Error('old A failure'))
  expect(host.querySelector('.err')).toBeNull()
  expect(host.textContent).toContain('b.png')
  await verifyImport(2, 200)
})

test('latest failure does not revive an older successful decode; reselect can recover', async () => {
  const a = await pick('a.png'),
    b = await pick('b.png'),
    imageA = bitmap(1, 100)
  await finish(b, new Error('new B failure'))
  await finish(a, imageA)
  expect(host.querySelector('.err')?.textContent).toBe('new B failure')
  expect(host.textContent).not.toContain('a.png')
  expect(imageA.close).toHaveBeenCalledTimes(1)
  const c = await pick('c.png')
  await finish(c, bitmap(3, 150))
  await verifyImport(3, 150)
})

test.each([
  'cancel',
  'unmount',
])('late bitmap is closed without canvas work after %s', async (action) => {
  const a = await pick('a.png'),
    image = bitmap(1, 100)
  const getContext = vi.mocked(HTMLCanvasElement.prototype.getContext)
  const before = getContext.mock.calls.length
  if (action === 'cancel') {
    await act(async () => host.querySelector<HTMLButtonElement>('.sprite-upload-cancel')!.click())
    expect(onDone).toHaveBeenCalledExactlyOnceWith(null)
  } else {
    await act(async () => root.unmount())
    mounted = false
  }
  await finish(a, image)
  expect(image.close).toHaveBeenCalledTimes(1)
  expect(getContext).toHaveBeenCalledTimes(before)
  expect(host.textContent).not.toContain('a.png')
  expect(hostMocks.encode).not.toHaveBeenCalled()
})

test.each([
  'session',
  'assetBase',
])('a replacement %s invalidates old decode but accepts a new pick', async (scope) => {
  const a = await pick('a.png'),
    imageA = bitmap(1, 100)
  if (scope === 'session') session = new EditSession(structuredClone(session.getState()))
  else assetBase = { ...assetBase }
  await render()
  await finish(a, imageA)
  expect(host.textContent).not.toContain('a.png')
  expect(imageA.close).toHaveBeenCalledTimes(1)
  const b = await pick('b.png')
  await finish(b, bitmap(2, 200))
  await verifyImport(2, 200)
})

test('same-scope rerender keeps the pending selection valid', async () => {
  const paletteCalls = hostMocks.palette.mock.calls.length
  const a = await pick('a.png')
  await render()
  await finish(a, bitmap(1, 100))
  expect(submitButton().disabled).toBe(false)
  expect(hostMocks.palette).toHaveBeenCalledTimes(paletteCalls)
  await verifyImport(1, 100)
})

test('old-scope palette rejection cannot overwrite the new scope', async () => {
  const oldPalette = deferred<Palette>()
  hostMocks.palette.mockImplementationOnce(() => oldPalette.promise)
  assetBase = { ...assetBase }
  await render()
  assetBase = { ...assetBase }
  await render()
  const b = await pick('b.png')
  await finish(b, bitmap(2, 200))
  await act(async () => {
    oldPalette.reject(new Error('old palette failed'))
    await oldPalette.promise.catch(() => undefined)
  })
  expect(host.querySelector('.err')).toBeNull()
  await verifyImport(2, 200)
})

test('a new pending or failed pick cannot submit the previously ready draft', async () => {
  const a = await pick('a.png')
  await finish(a, bitmap(1, 100))
  expect(submitButton().disabled).toBe(false)
  const b = await pick('b.png')
  expect(submitButton().disabled).toBe(true)
  await finish(b, new Error('B failed'))
  expect(submitButton().disabled).toBe(true)
  expect(onDone).not.toHaveBeenCalled()
})

test.each([
  'context',
  'draw',
  'read',
  'data-url',
] as const)('decoded bitmap is released on %s failure', async (failure) => {
  const a = await pick('a.png'),
    imageA = bitmap(1, 100)
  fault = failure
  await finish(a, imageA)
  expect(host.querySelector('.err')).not.toBeNull()
  expect(imageA.close).toHaveBeenCalledTimes(1)
  expect(onDone).not.toHaveBeenCalled()
})

test.each([
  'session',
  'assetBase',
])('a ready old draft and its handler cannot enter replacement %s', async (scope) => {
  const a = await pick('a.png')
  await finish(a, bitmap(1, 100))
  const oldSubmit = hostMocks.submit!
  if (scope === 'session') session = new EditSession(structuredClone(session.getState()))
  else assetBase = { ...assetBase }
  await render()
  expect(host.textContent).not.toContain('a.png')
  await act(async () => oldSubmit())
  expect(hostMocks.encode).not.toHaveBeenCalled()
  const b = await pick('b.png')
  await finish(b, bitmap(2, 200))
  await act(async () => oldSubmit())
  expect(hostMocks.encode).not.toHaveBeenCalled()
  await verifyImport(2, 200)
})

test('late old palette success cannot release the current palette wait or failure', async () => {
  const oldPalette = deferred<Palette>(),
    currentPalette = deferred<Palette>()
  hostMocks.palette.mockImplementationOnce(() => oldPalette.promise)
  assetBase = { ...assetBase }
  await render()
  hostMocks.palette.mockImplementationOnce(() => currentPalette.promise)
  assetBase = { ...assetBase }
  await render()
  const b = await pick('b.png')
  await finish(b, bitmap(2, 200))
  expect(submitButton().disabled).toBe(true)
  await act(async () => oldPalette.resolve(palette))
  expect(submitButton().disabled).toBe(true)
  await act(async () => {
    currentPalette.reject(new Error('current palette failed'))
    await currentPalette.promise.catch(() => undefined)
  })
  expect(host.querySelector('.err')?.textContent).toBe('current palette failed')
  await act(async () => hostMocks.submit!())
  expect(hostMocks.encode).not.toHaveBeenCalled()
  expect(onDone).not.toHaveBeenCalled()
  assetBase = { ...assetBase }
  await render()
  const c = await pick('c.png')
  await finish(c, bitmap(3, 150))
  await verifyImport(3, 150)
})

test('author ID and label survive reselection; identical content shares one asset with one history entry per submit', async () => {
  const initial = structuredClone(session.getState())
  const dispatch = vi.spyOn(session, 'dispatch')
  const a = await pick('a.png')
  await finish(a, bitmap(2, 200))
  await editText('sprite-upload-id', 'author-first')
  await editText('sprite-upload-label', '作者标签')
  const b = await pick('b.png')
  await finish(b, bitmap(2, 200))
  const first = await verifyImport(2, 200)
  expect(first.id).toBe('author-first')
  expect(first.def.label).toBe('作者标签')
  const firstState = structuredClone(session.getState())
  done = deferred<string | null>()
  onDone.mockClear()
  await render()
  await editText('sprite-upload-id', 'author-second')
  const c = await pick('c.png')
  await finish(c, bitmap(2, 200))
  const second = await verifyImport(2, 200)
  expect(second.id).toBe('author-second')
  expect(second.def.asset).toBe(first.def.asset)
  expect(second.def.label).toBe('作者标签')
  expect(session.getState().assetCatalog).toEqual(firstState.assetCatalog)
  expect(session.getState().assetBlobs).toEqual(firstState.assetBlobs)
  expect(dispatch).toHaveBeenCalledTimes(2)
  const both = structuredClone(session.getState())
  expect(session.undo()).toBe(true)
  expect(session.getState()).toEqual(firstState)
  expect(session.undo()).toBe(true)
  expect(session.getState()).toEqual(initial)
  expect(session.undo()).toBe(false)
  expect(session.redo()).toBe(true)
  expect(session.redo()).toBe(true)
  expect(session.getState()).toEqual(both)
})
