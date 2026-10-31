/** Indexed PNG pixels, frame output and encoder admission. A synthetic legacy container supplies frame data; PAL resource decoding is covered separately. */

import { parseSpriteChunk } from '@type-pal/shared'
import { PNG } from 'pngjs'
import { describe, expect, test } from 'vitest'
import { encodeIndexedPng, framesToOut } from './sprite.js'

describe('indexed PNG pixel transport', () => {
  test('带 mask：透明位 alpha 0、opaque palette-0 与实心位 alpha 255、RGB 复制 index', () => {
    const png = PNG.sync.read(
      Buffer.from(
        encodeIndexedPng(
          2,
          2,
          new Uint8Array([0x00, 0xaa, 0x00, 0xbb]),
          new Uint8Array([0, 1, 1, 1]),
        ),
      ),
    )
    expect(png.width).toBe(2)
    expect(png.height).toBe(2)
    expect([...png.data]).toEqual([
      0,
      0,
      0,
      0, // RLE-skip 透明
      0xaa,
      0xaa,
      0xaa,
      255,
      0,
      0,
      0,
      255, // opaque palette-0 ≠ 透明
      0xbb,
      0xbb,
      0xbb,
      255,
    ])
  })

  test('缺省 mask：全像素 alpha 255', () => {
    const png = PNG.sync.read(Buffer.from(encodeIndexedPng(1, 2, new Uint8Array([0x11, 0x22]))))
    expect([...png.data]).toEqual([0x11, 0x11, 0x11, 255, 0x22, 0x22, 0x22, 255])
  })
})

describe('frame indexing and PNG payloads', () => {
  test('3 帧容器：index 0/1/2、逐帧尺寸与真解码像素', () => {
    const chunk = new Uint8Array([
      0x04,
      0x00, // 4 个表项：3 帧 + 空 sentinel；slot0 → byte 8
      0x07,
      0x00, // slot1 → byte 14
      0x0a,
      0x00, // slot2 → byte 20
      0x00,
      0x00, // sentinel 不产生第 4 帧
      // frame0 @8：1×1 px 0x11
      0x01,
      0x00,
      0x01,
      0x00,
      0x01,
      0x11,
      // frame1 @14：1×1 px 0x22
      0x01,
      0x00,
      0x01,
      0x00,
      0x01,
      0x22,
      // frame2 @20：2×1（跳1 + px 0x33）
      0x02,
      0x00,
      0x01,
      0x00,
      0x81,
      0x01,
      0x33,
    ])
    const out = framesToOut(parseSpriteChunk(chunk))
    expect(out.map((f) => f.index)).toEqual([0, 1, 2])
    expect(out.map((f) => f.width)).toEqual([1, 1, 2])
    expect(out.map((f) => f.height)).toEqual([1, 1, 1])
    const px0 = PNG.sync.read(Buffer.from(out[0]!.pngBytes))
    const px1 = PNG.sync.read(Buffer.from(out[1]!.pngBytes))
    const px2 = PNG.sync.read(Buffer.from(out[2]!.pngBytes))
    expect([...px0.data]).toEqual([0x11, 0x11, 0x11, 255])
    expect([...px1.data]).toEqual([0x22, 0x22, 0x22, 255])
    expect([...px2.data]).toEqual([0, 0, 0, 0, 0x33, 0x33, 0x33, 255])
  })
})

describe('encoder input rejection', () => {
  test('width 必须为正数', () => {
    expect(() => encodeIndexedPng(0, 1, new Uint8Array())).toThrow(
      'encodeIndexedPng: invalid dimensions 0x1',
    )
  })

  test('width 必须为整数', () => {
    expect(() => encodeIndexedPng(1.5, 1, new Uint8Array(2))).toThrow(
      'encodeIndexedPng: invalid dimensions 1.5x1',
    )
  })

  test('height 必须为正数', () => {
    expect(() => encodeIndexedPng(1, 0, new Uint8Array())).toThrow(
      'encodeIndexedPng: invalid dimensions 1x0',
    )
  })

  test('height 必须为整数', () => {
    expect(() => encodeIndexedPng(1, 1.5, new Uint8Array(2))).toThrow(
      'encodeIndexedPng: invalid dimensions 1x1.5',
    )
  })

  test('pixels 短于完整帧时显式失败', () => {
    expect(() => encodeIndexedPng(2, 2, new Uint8Array(3))).toThrow(
      'encodeIndexedPng: pixels length 3 < 4',
    )
  })

  test('opaque 短于完整帧时显式失败', () => {
    expect(() => encodeIndexedPng(2, 2, new Uint8Array(4), new Uint8Array(3))).toThrow(
      'encodeIndexedPng: opaque length 3 < 4',
    )
  })
})
