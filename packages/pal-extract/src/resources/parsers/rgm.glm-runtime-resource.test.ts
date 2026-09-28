/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R03（pal-extract/resources/parsers/rgm.ts）。
 * 该文件此前无任何测试。合同：空槽 null、标记头剥离后 2×2 帧的 PNG 真解码
 * （透明位 alpha 0 / opaque palette-0 alpha 255 / 实心位 RGB 复制）、chunkIndex 透传。
 * 与 ball.ts 为同构克隆函数，分别作为公开入口各自被测，不互相引用。
 */
import { PNG } from 'pngjs'
import { describe, expect, test } from 'vitest'
import { decodeRgmPortrait } from './rgm.js'

describe('R03 decodeRgmPortrait', () => {
  test('空槽：0 字节与 3 字节均 null', () => {
    expect(decodeRgmPortrait(0, new Uint8Array(0))).toBeNull()
    expect(decodeRgmPortrait(1, new Uint8Array([0x02, 0x00, 0x00]))).toBeNull()
  })

  test('标记头剥离：2×2 帧逐像素 PNG 真解码（透明/opaque-0/实心 0xAA）', () => {
    const buf = new Uint8Array([
      0x02,
      0x00,
      0x00,
      0x00, // RGM file header
      0x02,
      0x00,
      0x02,
      0x00, // 2×2
      0x81, // 跳 1 透明
      0x02,
      0xaa,
      0x00, // 实心 2：0xAA、palette-0
      0x81, // 跳 1 透明
    ])
    const portrait = decodeRgmPortrait(17, buf)
    expect(portrait!.chunkIndex).toBe(17)
    expect(portrait!.width).toBe(2)
    expect(portrait!.height).toBe(2)
    const png = PNG.sync.read(Buffer.from(portrait!.pngBytes))
    expect(png.width).toBe(2)
    expect(png.height).toBe(2)
    expect([...png.data]).toEqual([
      0,
      0,
      0,
      0, // px0 RLE-skip：alpha 0
      0xaa,
      0xaa,
      0xaa,
      255, // px1 实心 0xAA
      0,
      0,
      0,
      255, // px2 opaque palette-0：alpha 255
      0,
      0,
      0,
      0, // px3 RLE-skip
    ])
  })

  test('非标记输入从 0 直解，不因缺 0x02000000 头报 null', () => {
    const portrait = decodeRgmPortrait(2, new Uint8Array([0x01, 0x00, 0x01, 0x00, 0x01, 0x5a]))
    expect(portrait!.width).toBe(1)
    expect(portrait!.height).toBe(1)
    const png = PNG.sync.read(Buffer.from(portrait!.pngBytes))
    expect([...png.data]).toEqual([0x5a, 0x5a, 0x5a, 255])
  })
})
