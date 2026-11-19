import { afterEach, expect, test, vi } from 'vitest'
import raw from '../engine-chrome/assets/dialog-icons-raw.json?raw'
import { ENGINE_CHROME } from '../engine-chrome/registry.js'
import { bakeCursorTinted, decodeCursorFrames, loadCursorFrames } from './dialog-assets.js'

const entry = { source: 'DATA.MKF#12', size: 2, base64: 'AAA=' } // Container with zero slots.

afterEach(() => vi.unstubAllGlobals())

test('loads three distinct 16×16 frames from the bundled DATA chunk 12 route', async () => {
  vi.stubGlobal('fetch', async (url: string) =>
    url === ENGINE_CHROME.dialogCursor ? new Response(raw) : new Response(null, { status: 404 }),
  )
  expect(JSON.parse(raw)).toMatchObject({ size: 282 })
  const frames = await loadCursorFrames()
  expect(frames.map(({ width, height }) => [width, height])).toEqual([
    [16, 16],
    [16, 16],
    [16, 16],
  ])
  expect(frames.map(({ opaque }) => opaque.reduce((sum, bit) => sum + bit, 0))).toEqual([
    49, 73, 36,
  ])
})

test('length mismatch reports both counts and the source before decoding', () => {
  expect(() => decodeCursorFrames({ ...entry, size: 1 }, entry.source)).toThrow(
    new Error('引擎 chrome 对话光标长度错误:DATA.MKF#12:metadata=1, actual=2'),
  )
})

test('matching lengths do not make a cursor with zero frames usable', () => {
  expect(() => decodeCursorFrames(entry, entry.source)).toThrow(
    new Error('引擎 chrome 对话光标为空:DATA.MKF#12'),
  )
})

test('a failed cursor response reports the URL and status even if it has no JSON body', async () => {
  vi.stubGlobal('fetch', async () => new Response(null, { status: 503 }))
  const url = 'https://fixture.invalid/dialog-cursor.json'
  await expect(loadCursorFrames(url)).rejects.toThrow(
    new Error(`引擎 chrome 对话光标加载失败(503):${url}`),
  )
})

test('tint uses the opacity mask: palette zero can be painted without filling a transparent pixel', () => {
  const putImageData = vi.fn<(image: ImageData, x: number, y: number) => void>()
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      createImageData(width: number, height: number): ImageData {
        return {
          width,
          height,
          data: new Uint8ClampedArray(width * height * 4),
          colorSpace: 'srgb',
        }
      },
      putImageData,
    }),
  }
  vi.stubGlobal('document', { createElement: () => canvas })
  const surface = bakeCursorTinted(
    { width: 3, height: 1, pixels: Uint8Array.of(0, 0, 7), opaque: Uint8Array.of(0, 1, 1) },
    [17, 31, 83],
  )
  expect({ width: surface.width, height: surface.height }).toEqual({ width: 3, height: 1 })
  expect(putImageData.mock.calls).toEqual([
    [
      {
        width: 3,
        height: 1,
        colorSpace: 'srgb',
        data: Uint8ClampedArray.of(0, 0, 0, 0, 17, 31, 83, 255, 17, 31, 83, 255),
      },
      0,
      0,
    ],
  ])
})
