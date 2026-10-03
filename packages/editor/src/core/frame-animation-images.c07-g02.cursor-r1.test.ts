// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C07-G02：frame-animation-images 合成字节解码与 close。
 * 排重：frame-animation-images.boundaries.test 用 mock bitmap；本组经 installBrowserHardwarePorts 真实 PNG 解码。
 */
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  installBrowserHardwarePorts,
  pngFileOf,
  pngRgba,
  solidRgba,
} from '../__tests__/cursor-asset-r1/image-ports.js'
import { stubNodeTestHost } from '../__tests__/cursor-asset-r1/kit.js'
import {
  installImageDecodePort,
  restoreImageDomPorts,
} from '../ui/__tests__/kimi-editor-workflows/k05-fixtures.js'
import {
  assertFrameImageFile,
  decodeFrameImage,
  decodeFrameImages,
  sortFrameImageFiles,
} from './frame-animation-images.js'

let decodePort: ReturnType<typeof installImageDecodePort>

beforeAll(async () => {
  await stubNodeTestHost()
})

beforeEach(async () => {
  await installBrowserHardwarePorts()
  decodePort = installImageDecodePort()
})

afterEach(() => {
  restoreImageDomPorts()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('C07-G02 合成 PNG 解码与资源关闭', () => {
  test('C07-G02-01 decodeFrameImage 真实像素与尺寸来自合成 PNG', async () => {
    const rgba = solidRgba(3, 2, [10, 20, 30, 255])
    const file = pngFileOf('a.png', pngRgba(3, 2, rgba))
    const frame = await decodeFrameImage(file)
    expect(frame).toMatchObject({ name: 'a.png', width: 3, height: 2 })
    expect(frame.rgba.slice(0, 8)).toEqual(new Uint8Array(rgba.slice(0, 8)))
    expect(decodePort.closes).toBeGreaterThanOrEqual(1)
    expect(decodePort.liveBitmaps()).toBe(0)
  })

  test('C07-G02-02 rgba 为独立副本：改返回值不改画布源', async () => {
    const file = pngFileOf('b.png', pngRgba(1, 1, solidRgba(1, 1, [1, 2, 3, 255])))
    const frame = await decodeFrameImage(file)
    const before = frame.rgba[0]
    frame.rgba[0] = 99
    const again = await decodeFrameImage(file)
    expect(again.rgba[0]).toBe(before)
  })

  test('C07-G02-03 decodeFrameImages 自然排序后批量解码', async () => {
    const mk = (name: string, r: number) =>
      pngFileOf(name, pngRgba(2, 1, solidRgba(2, 1, [r, r, r, 255])))
    const frames = await decodeFrameImages([mk('f10.png', 1), mk('f2.png', 2), mk('f1.png', 3)])
    expect(frames.map((frame) => frame.name)).toEqual(['f1.png', 'f2.png', 'f10.png'])
    expect(frames[0]!.rgba[0]).toBe(3)
    expect(frames[2]!.rgba[0]).toBe(1)
    expect(decodePort.closes).toBeGreaterThanOrEqual(3)
  })

  test('C07-G02-04 preserveOrder 保持输入顺序不排序', async () => {
    const mk = (name: string) => pngFileOf(name, pngRgba(1, 1, solidRgba(1, 1, [5, 5, 5, 255])))
    const frames = await decodeFrameImages([mk('z.png'), mk('a.png')], { preserveOrder: true })
    expect(frames.map((frame) => frame.name)).toEqual(['z.png', 'a.png'])
  })

  test('C07-G02-05 空列表拒绝', async () => {
    await expect(decodeFrameImages([])).rejects.toThrow('至少选择一张图片')
  })

  test('C07-G02-06 尺寸不一致：第二帧拒绝且首帧已 close', async () => {
    const a = pngFileOf('big.png', pngRgba(2, 2, solidRgba(2, 2, [1, 1, 1, 255])))
    const b = pngFileOf('small.png', pngRgba(1, 1, solidRgba(1, 1, [1, 1, 1, 255])))
    await expect(decodeFrameImages([a, b])).rejects.toThrow(/尺寸/)
    expect(decodePort.closes).toBeGreaterThanOrEqual(1)
  })

  test('C07-G02-07 assertFrameImageFile：扩展名 .PNG 无 MIME 仍过门', () => {
    const file = pngFileOf('X.PNG', pngRgba(1, 1, solidRgba(1, 1, [0, 0, 0, 255])))
    expect(() => assertFrameImageFile(file)).not.toThrow()
  })

  test('C07-G02-08 assertFrameImageFile：gif 拒绝且不解码', async () => {
    const bad = {
      name: 'x.gif',
      type: 'image/gif',
      arrayBuffer: async () => new ArrayBuffer(4),
    } as File
    expect(() => assertFrameImageFile(bad)).toThrow('x.gif')
    await expect(decodeFrameImage(bad)).rejects.toThrow('只支持')
    expect(decodePort.entries).toHaveLength(0)
  })

  test('C07-G02-09 sortFrameImageFiles 不 mutate 原数组', () => {
    const input = [{ name: '10.png' } as File, { name: '2.png' } as File]
    const copy = [...input]
    sortFrameImageFiles(input)
    expect(input).toEqual(copy)
    expect(sortFrameImageFiles(input).map((file) => file.name)).toEqual(['2.png', '10.png'])
  })

  test('C07-G02-10 损坏 PNG：解码失败且 live bitmap 归零', async () => {
    const broken = pngFileOf('bad.png', new Uint8Array([0, 1, 2, 3]))
    await expect(decodeFrameImage(broken)).rejects.toThrow()
    expect(decodePort.liveBitmaps()).toBe(0)
  })
})
