/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R03：FIRE空块、压缩像素与短输入输出合同。
 * 两帧raw fallback的合法合成向量、真实全表和FIRE0直解由misc-mkf.test.ts承接。
 * 本文件的YJ2向量明文是2×2，PNG真解码逐像素核透明/实心/opaque-0；
 * 退化raw只验证<4B拒绝后的短容器，不能据此声称raw多帧入口不可达。
 */
import { PNG } from 'pngjs'
import { describe, expect, test } from 'vitest'
import { YJ2_SPRITE_CHUNK_2X2 } from '../../__tests__/glm-runtime-resource/yj2-sprite-chunk-vector.js'
import { parseFirSprite } from './fire.js'

describe('R03 parseFirSprite', () => {
  test('空 chunk：frameCount=0、frames=[]、chunkIndex 透传', () => {
    // 原misc-mkf空块的0与本合同的7一并保留，避免零ID的保真边界丢失。
    for (const chunkIndex of [0, 7]) {
      expect(parseFirSprite(chunkIndex, new Uint8Array(0))).toEqual({
        chunkIndex,
        frameCount: 0,
        frames: [],
      })
    }
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
