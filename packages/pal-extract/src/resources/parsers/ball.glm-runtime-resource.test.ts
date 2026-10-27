/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R03（pal-extract/resources/parsers/ball.ts）。
 * 与misc-mkf真实原盘回归分工。合同：短空槽null、坏尺寸warn+null、
 * 02 00 00 00 标记头剥离与非标记直解、零尺寸 null、chunkIndex 透传、
 * PNG 以 pngjs 真解码核对尺寸/像素/alpha（不以魔数冒充）。
 */
import { PNG } from 'pngjs'
import { assert, describe, expect, test } from 'vitest'
import { withParserWarnings } from '../../__tests__/parser-diagnostics.js'
import { decodeBallIcon } from './ball.js'

describe('R03 decodeBallIcon 空槽与标记头', () => {
  test('byteLength < 4 → null（0 字节空槽）', () => {
    expect(decodeBallIcon(0, new Uint8Array(0))).toBeNull()
    expect(decodeBallIcon(3, new Uint8Array([0x02, 0x00, 0x00]))).toBeNull()
  })

  test('02 00 00 00 标记头剥离：2×1 帧（跳1 + opaque palette-0）→ PNG 真解码 alpha 0/255', () => {
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
    assert(icon !== null)
    expect(icon.chunkIndex).toBe(5)
    expect(icon.width).toBe(2)
    expect(icon.height).toBe(1)
    const png = PNG.sync.read(Buffer.from(icon.pngBytes))
    expect(png.width).toBe(2)
    expect(png.height).toBe(1)
    // px0 透明：RGB 0、alpha 0；px1 opaque palette-0：RGB 0、alpha 255
    expect([...png.data]).toEqual([0, 0, 0, 0, 0, 0, 0, 255])
  })

  test('无标记：同帧字节从 0 直解（独立手算期望，不相对带标记版）', () => {
    const bare = decodeBallIcon(1, new Uint8Array([0x02, 0x00, 0x01, 0x00, 0x02, 0x33, 0x44]))
    assert(bare !== null)
    expect(bare.width).toBe(2)
    expect(bare.height).toBe(1)
    const png = PNG.sync.read(Buffer.from(bare.pngBytes))
    expect([...png.data]).toEqual([
      0x33,
      0x33,
      0x33,
      255,
      0x44,
      0x44,
      0x44,
      255, // 全实心 2 px
    ])
  })

  test('零尺寸帧是坏输入：标记与非标记均报告原始RLE错误并返回null', () => {
    const errorFrom = {
      functionName: 'decodeBallIcon',
      moduleUrl: new URL('./ball.ts', import.meta.url),
    }
    const result = withParserWarnings(
      [
        {
          message: '[ball] chunk 9 RLE decode fail, skip: Error: RLE: invalid frame dimensions 0x0',
          errorFrom,
        },
        {
          message: '[ball] chunk 9 RLE decode fail, skip: Error: RLE: invalid frame dimensions 0x0',
          errorFrom,
        },
      ],
      () => [
        decodeBallIcon(9, new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])),
        decodeBallIcon(9, new Uint8Array([0x00, 0x00, 0x00, 0x00])),
      ],
    )
    expect(result).toEqual([null, null])
  })
})
