/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R03（pal-extract/resources/parsers/fire.ts）。
 * 该文件此前无任何测试。合同：空 chunk 0 帧、已知输出的 YJ2 压缩 sprite chunk
 * （fixture 注释手推明文，派生工具见 wave 目录 tools/）→ 1 帧真 PNG、
 * 退化 raw（<4B 抛错回退 → count=0）、压缩标记 uncompLen<2 → 0 帧。
 * 不声称覆盖「原始分支成功解析多帧」：计数与 uncompLen 双用使该组合在
 * 公开入口不可达，已在回执登记未证项。
 */
import { PNG } from 'pngjs'
import { describe, expect, test } from 'vitest'
import { YJ2_SPRITE_CHUNK_2X2 } from '../../__tests__/glm-runtime-resource/yj2-sprite-chunk-vector.js'
import { parseFirSprite } from './fire.js'

describe('R03 parseFirSprite', () => {
  test('空 chunk：frameCount=0、frames=[]、chunkIndex 透传', () => {
    expect(parseFirSprite(7, new Uint8Array(0))).toEqual({
      chunkIndex: 7,
      frameCount: 0,
      frames: [],
    })
  })

  test('YJ2 压缩 chunk（已知输出 2×2）：1 帧、PNG 真解码透明/实心/opaque-0', () => {
    const out = parseFirSprite(3, YJ2_SPRITE_CHUNK_2X2)
    expect(out.chunkIndex).toBe(3)
    expect(out.frameCount).toBe(1)
    expect(out.frames).toHaveLength(1)
    const frame = out.frames[0]!
    expect(frame.index).toBe(0)
    expect(frame.width).toBe(2)
    expect(frame.height).toBe(2)
    const png = PNG.sync.read(Buffer.from(frame.pngBytes))
    expect(png.width).toBe(2)
    expect(png.height).toBe(2)
    expect([...png.data]).toEqual([
      0,
      0,
      0,
      0, // px0 跳段透明
      0xaa,
      0xaa,
      0xaa,
      255, // px1 实心 0xAA
      0,
      0,
      0,
      255, // px2 opaque palette-0
      0,
      0,
      0,
      0, // px3 跳段透明
    ])
  })

  test('退化 raw（2 字节 count=0，YJ2 拒 <4B 回退 raw）：frameCount=0', () => {
    expect(parseFirSprite(1, new Uint8Array([0x00, 0x00]))).toEqual({
      chunkIndex: 1,
      frameCount: 0,
      frames: [],
    })
  })

  test('压缩标记 uncompLen=1：解压 1 字节 < 2 → frameCount=0（不抛错）', () => {
    const buf = new Uint8Array([0x01, 0x00, 0x00, 0x00, 0x43, 0x28, 0x38, 0x01])
    expect(parseFirSprite(2, buf)).toMatchObject({ chunkIndex: 2, frameCount: 0, frames: [] })
  })
})
