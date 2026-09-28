/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R03（pal-extract/resources/parsers/ball.ts）。
 * 该文件此前无任何测试（targets existingTestPointers 为空）。合同：空槽 null、
 * 0x02000000 标记头剥离与非标记直解、半标记不剥离、零尺寸 null、chunkIndex 透传、
 * PNG 以 pngjs 真解码核对尺寸/像素/alpha（不以魔数冒充）。
 */
import { PNG } from 'pngjs'
import { describe, expect, test } from 'vitest'
import { decodeBallIcon } from './ball.js'

describe('R03 decodeBallIcon 空槽与标记头', () => {
  test('byteLength < 4 → null（0 字节空槽）', () => {
    expect(decodeBallIcon(0, new Uint8Array(0))).toBeNull()
    expect(decodeBallIcon(3, new Uint8Array([0x02, 0x00, 0x00]))).toBeNull()
  })

  test('0x02000000 标记头剥离：2×1 帧（跳1 + opaque palette-0）→ PNG 真解码 alpha 0/255', () => {
    const buf = new Uint8Array([
      0x02,
      0x00,
      0x00,
      0x00, // BALL file header
      0x02,
      0x00,
      0x01,
      0x00, // 2×1
      0x81, // 跳 1 透明
      0x01,
      0x00, // 实心 1：palette-0（不透明）
    ])
    const icon = decodeBallIcon(5, buf)
    expect(icon).not.toBeNull()
    expect(icon!.chunkIndex).toBe(5)
    expect(icon!.width).toBe(2)
    expect(icon!.height).toBe(1)
    const png = PNG.sync.read(Buffer.from(icon!.pngBytes))
    expect(png.width).toBe(2)
    expect(png.height).toBe(1)
    // px0 透明：RGB 0、alpha 0；px1 opaque palette-0：RGB 0、alpha 255
    expect([...png.data]).toEqual([0, 0, 0, 0, 0, 0, 0, 255])
  })

  test('无标记：同帧字节从 0 直解（独立手算期望，不相对带标记版）', () => {
    const bare = decodeBallIcon(1, new Uint8Array([0x02, 0x00, 0x01, 0x00, 0x02, 0x33, 0x44]))
    expect(bare).not.toBeNull()
    expect(bare!.width).toBe(2)
    expect(bare!.height).toBe(1)
    const png = PNG.sync.read(Buffer.from(bare!.pngBytes))
    expect([...png.data]).toEqual([
      0x33, 0x33, 0x33, 255,
      0x44, 0x44, 0x44, 255, // 全实心 2 px
    ])
  })

  test('前缀形似但非 02 00 00 00：不剥离（02 00 01 00 → w=2,h=1 从 0 读）', () => {
    const icon = decodeBallIcon(1, new Uint8Array([0x02, 0x00, 0x01, 0x00, 0x02, 0x33, 0x44]))
    expect(icon!.width).toBe(2)
    expect(icon!.height).toBe(1)
  })

  test('零尺寸帧 → null（空槽语义），标记与非标记各一', () => {
    expect(
      decodeBallIcon(9, new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])),
    ).toBeNull()
    expect(decodeBallIcon(9, new Uint8Array([0x00, 0x00, 0x00, 0x00]))).toBeNull()
  })
})
