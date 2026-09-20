/**
 * TEST-EDITOR-IMPORT-CODEC-1 C4：frame-animation-images 边界（frame-animation-images.ts）。
 * 既有 frame-animation-images.test.ts 只覆盖自然排序——不重复。本文件补：
 * MIME/扩展名门、decodeFrameImage 的 finally close 与 rgba 拷贝、空列表、
 * preserveOrder、尺寸一致门、序列中途解码失败。
 */
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  assertFrameImageFile,
  decodeFrameImage,
  decodeFrameImages,
} from './frame-animation-images.js'

const imageFile = (name: string, type: string): File =>
  ({ name, type, size: 8, arrayBuffer: async () => new ArrayBuffer(8) }) as unknown as File

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('C4 assertFrameImageFile MIME/扩展名门', () => {
  test('三类 MIME 直过；无 MIME 时按扩展名（含大写）；两者都不符拒绝', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
      expect(() => assertFrameImageFile(imageFile('a.bin', type))).not.toThrow()
    }
    expect(() => assertFrameImageFile(imageFile('B.PNG', ''))).not.toThrow()
    expect(() => assertFrameImageFile(imageFile('b.jpg', ''))).not.toThrow()
    expect(() => assertFrameImageFile(imageFile('c.webp', ''))).not.toThrow()
    expect(() => assertFrameImageFile(imageFile('d.gif', 'image/gif'))).toThrow(
      'd.gif: 只支持 PNG、JPEG 或 WebP',
    )
  })
})

describe('C4 decodeFrameImage 解码收尾与拷贝', () => {
  test('成功路径 finally close 恰一次；rgba 是独立副本；宽高与名字来自 bitmap/file', async () => {
    const events: string[] = []
    const pixels = new Uint8ClampedArray([1, 2, 3, 4, 5, 6, 7, 8])
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({
        width: 2,
        height: 1,
        close: () => events.push('close'),
      })),
    )
    vi.stubGlobal('document', {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({
          clearRect: () => undefined,
          drawImage: () => events.push('drawImage'),
          getImageData: () => ({ data: pixels }),
        }),
      }),
    })
    const frame = await decodeFrameImage(imageFile('f1.png', 'image/png'))
    expect(events).toEqual(['drawImage', 'close'])
    expect(frame).toMatchObject({ name: 'f1.png', width: 2, height: 1 })
    expect(frame.rgba).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))
    // 独立副本：改返回值不动画布数据
    frame.rgba[0] = (frame.rgba[0] ?? 0) ^ 0xff
    expect(pixels[0]).toBe(1)
  })
  test('画布不可用同样 finally close；MIME 门在解码前拒绝', async () => {
    const events: string[] = []
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 2, height: 1, close: () => events.push('close') })),
    )
    vi.stubGlobal('document', {
      createElement: () => ({ width: 0, height: 0, getContext: () => null }),
    })
    await expect(decodeFrameImage(imageFile('f2.png', 'image/png'))).rejects.toThrow(
      'f2.png: 无法创建 2D 画布',
    )
    expect(events).toEqual(['close'])
    expect(() => assertFrameImageFile(imageFile('x.gif', 'image/gif'))).toThrow('只支持')
  })
})

describe('C4 decodeFrameImages 序列合同', () => {
  function installBitmaps(sizes: Array<{ w: number; h: number }>, events: string[]) {
    let index = 0
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => {
        const size = sizes[Math.min(index++, sizes.length - 1)]!
        return { width: size.w, height: size.h, close: () => events.push('close') }
      }),
    )
    vi.stubGlobal('document', {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({
          clearRect: () => undefined,
          drawImage: () => undefined,
          getImageData: (_x: number, _y: number, w: number, h: number) => ({
            data: new Uint8ClampedArray(w * h * 4),
          }),
        }),
      }),
    })
  }

  test('空列表拒绝；默认自然排序；preserveOrder 保持用户顺序', async () => {
    await expect(decodeFrameImages([])).rejects.toThrow('至少选择一张图片')
    const events: string[] = []
    installBitmaps(
      [
        { w: 2, h: 2 },
        { w: 2, h: 2 },
        { w: 2, h: 2 },
      ],
      events,
    )
    const files = [
      imageFile('frame-10.png', 'image/png'),
      imageFile('frame-2.png', 'image/png'),
      imageFile('frame-1.png', 'image/png'),
    ]
    const sorted = await decodeFrameImages(files)
    expect(sorted.map((frame) => frame.name)).toEqual([
      'frame-1.png',
      'frame-2.png',
      'frame-10.png',
    ])
    const ordered = await decodeFrameImages(files, { preserveOrder: true })
    expect(ordered.map((frame) => frame.name)).toEqual([
      'frame-10.png',
      'frame-2.png',
      'frame-1.png',
    ])
    expect(events.filter((e) => e === 'close').length).toBe(6) // 每次解码都归还 bitmap
  })
  test('非首帧尺寸不一致点名拒绝', async () => {
    installBitmaps(
      [
        { w: 4, h: 4 },
        { w: 4, h: 4 },
        { w: 5, h: 4 },
      ],
      [],
    )
    const files = [
      imageFile('a.png', 'image/png'),
      imageFile('b.png', 'image/png'),
      imageFile('c.png', 'image/png'),
    ]
    await expect(decodeFrameImages(files, { preserveOrder: true })).rejects.toThrow(
      'c.png: 尺寸 5x4，应与首帧 4x4 一致',
    )
  })
  test('序列中途解码失败：整体拒绝且已解码帧的 bitmap 已归还', async () => {
    const events: string[] = []
    let index = 0
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => {
        index += 1
        if (index === 2) throw new Error('corrupt bitmap')
        return { width: 2, height: 2, close: () => events.push('close') }
      }),
    )
    vi.stubGlobal('document', {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({
          clearRect: () => undefined,
          drawImage: () => undefined,
          getImageData: () => ({ data: new Uint8ClampedArray(16) }),
        }),
      }),
    })
    const files = [imageFile('ok.png', 'image/png'), imageFile('bad.png', 'image/png')]
    await expect(decodeFrameImages(files, { preserveOrder: true })).rejects.toThrow(
      'corrupt bitmap',
    )
    expect(events).toEqual(['close']) // 第一帧成功路径已 close；失败帧无 bitmap 可还
  })
})
