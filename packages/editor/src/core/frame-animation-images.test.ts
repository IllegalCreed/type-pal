// @vitest-environment jsdom

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  installBrowserHardwarePorts,
  pngRgba,
  solidRgba,
} from '../__tests__/cursor-asset-r1/image-ports.js'
import { installImageDecodePort } from '../ui/__tests__/kimi-editor-workflows/k05-fixtures.js'
import {
  assertFrameImageFile,
  decodeFrameImage,
  decodeFrameImages,
  sortFrameImageFiles,
} from './frame-animation-images.js'

const image = (name: string, shade: number, width = 2, mediaType = 'image/png') => {
  const rgba = solidRgba(width, 1, [shade, 2, 3, 255])
  const bytes = pngRgba(width, 1, rgba)
  return { file: new File([bytes.slice().buffer], name, { type: mediaType }), rgba }
}

beforeEach(installBrowserHardwarePorts)
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('sorts a copy of the selected files using numeric filename order', () => {
  const files = ['frame-10.png', 'frame-2.png', 'frame-1.png'].map((name) => image(name, 1).file)
  const sorted = sortFrameImageFiles(files)
  expect(sorted).toEqual([files[2], files[1], files[0]])
  expect(files.map((file) => file.name)).toEqual(['frame-10.png', 'frame-2.png', 'frame-1.png'])
})

test('routes supported media types or extensions to image decoding', () => {
  // This is the routing guard. File content is inspected by the decoder, never by this guard.
  const kinds = ['image/png', 'image/jpeg', 'image/webp']
  const extensions = ['PNG', 'JPG', 'jpeg', 'WebP']
  for (const type of kinds)
    expect(() => assertFrameImageFile(new File([], 'frame', { type }))).not.toThrow()
  for (const extension of extensions)
    expect(() => assertFrameImageFile(new File([], `frame.${extension}`))).not.toThrow()
})

test('rejects unsupported selections and an empty sequence before asking the image decoder', async () => {
  const port = installImageDecodePort()
  await expect(
    decodeFrameImage(new File([], 'frame.gif', { type: 'image/gif' })),
  ).rejects.toMatchObject({ message: 'frame.gif: 只支持 PNG、JPEG 或 WebP' })
  await expect(decodeFrameImages([])).rejects.toMatchObject({ message: '至少选择一张图片' })
  expect(port.entries).toEqual([])
})

test('decodes real PNG pixels when MIME is missing and closes the decoded bitmap', async () => {
  const port = installImageDecodePort()
  const { file, rgba } = image('frame.PNG', 19, 3, '')
  const frame = await decodeFrameImage(file)
  expect(frame).toEqual({ name: 'frame.PNG', width: 3, height: 1, rgba })
  expect(port.completions).toEqual([file.size])
  expect(port.closes).toBe(1)
  expect(port.liveBitmaps()).toBe(0)
})

test('returns RGBA bytes independent of the data read from the canvas', async () => {
  installImageDecodePort()
  const { file, rgba } = image('frame.png', 35)
  const observed: Uint8ClampedArray[] = []
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas fixture does not provide an actual 2D context')
  const getImageData = context.getImageData.bind(context)
  vi.spyOn(context, 'getImageData').mockImplementation((x, y, width, height, settings) => {
    const pixels = getImageData(x, y, width, height, settings)
    observed.push(pixels.data)
    return pixels
  })
  vi.spyOn(document, 'createElement').mockReturnValueOnce(canvas)
  const frame = await decodeFrameImage(file)
  expect(frame.rgba).toEqual(rgba)
  frame.rgba[0] = 255
  expect(observed.map((pixels) => [...pixels])).toEqual([[...rgba]])
})

test('closes a bitmap even if its canvas is unavailable', async () => {
  const port = installImageDecodePort()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  const { file } = image('frame.png', 10)
  await expect(decodeFrameImage(file)).rejects.toMatchObject({
    message: 'frame.png: 无法创建 2D 画布',
  })
  expect(port.completions).toEqual([file.size])
  expect(port.closes).toBe(1)
  expect(port.liveBitmaps()).toBe(0)
})

test('decodes each frame in natural order for imports but preserves order for an edited queue', async () => {
  const port = installImageDecodePort()
  const queued = [image('frame-10.png', 10), image('frame-2.png', 2), image('frame-1.png', 1)]
  const files = queued.map(({ file }) => file)
  for (const [preserveOrder, order] of [
    [false, [2, 1, 0]],
    [true, [0, 1, 2]],
  ] as const) {
    const frames = await decodeFrameImages(files, { preserveOrder })
    expect(frames.map(({ name, rgba }) => ({ name, rgba }))).toEqual(
      order.map((index) => ({
        name: queued[index]!.file.name,
        rgba: queued[index]!.rgba,
      })),
    )
  }
  expect(port.completions).toHaveLength(6)
  expect(port.closes).toBe(6)
  expect(port.liveBitmaps()).toBe(0)
})

test('reports the first mismatched frame by name and dimensions and releases all decoded bitmaps', async () => {
  const port = installImageDecodePort()
  const first = image('first.png', 1, 4).file
  const second = image('second.png', 2, 4).file
  const third = image('third.png', 3, 3).file
  await expect(
    decodeFrameImages([first, second, third], { preserveOrder: true }),
  ).rejects.toMatchObject({ message: 'third.png: 尺寸 3x1，应与首帧 4x1 一致' })
  expect(port.closes).toBe(3)
  expect(port.liveBitmaps()).toBe(0)
})

test('a corrupt PNG stops the batch and leaves no decoded bitmap behind', async () => {
  const port = installImageDecodePort()
  const first = image('first.png', 1, 4).file
  const damaged = new File([Uint8Array.of(0x89, 0x50, 0x4e, 0x47)], 'damaged.png', {
    type: 'image/png',
  })
  const later = image('later.png', 2, 2).file
  await expect(
    decodeFrameImages([first, damaged, later], { preserveOrder: true }),
  ).rejects.toBeInstanceOf(Error)
  expect(port.entries).toEqual([first.size, damaged.size])
  expect(port.completions).toEqual([first.size])
  expect(port.closes).toBe(1)
  expect(port.liveBitmaps()).toBe(0)
})
