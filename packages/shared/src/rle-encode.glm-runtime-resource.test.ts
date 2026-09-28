/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R01（shared/rle-encode.ts）。
 * 去重账：rle-encode.test 覆盖 roundtrip/全透明/超长分段/128KB 拒绝；rle-encode.boundaries
 * （RESOURCE-TOOLS-COVERAGE-1 R02）覆盖 126/127/128 run 手列 oracle、尾透明、三帧完整 chunk 字节。
 * 本文件只做未占用合同：短游程交错手列 oracle（不透明起头）、view 型 pixels/opaque 的
 * byteOffset 保真、frameCount ≥ 256 的 chunk（u16 计数字段双字节）往返。
 */
import { describe, expect, test } from 'vitest'
import { parseSpriteChunkStrict, type RleFrame } from './rle.js'
import { encodeRleFrame, encodeSpriteChunk } from './rle-encode.js'

const frame = (width: number, height: number, pixels: number[], opaque: number[]): RleFrame => ({
  width,
  height,
  pixels: new Uint8Array(pixels),
  opaque: new Uint8Array(opaque),
})

describe('R01 encodeRleFrame 短游程交错手列 oracle', () => {
  test('不透明起头 2×2 棋盘：lit/透明逐字节精确（旧 oracle 均透明起头）', () => {
    const f = frame(2, 2, [0x33, 0, 0x44, 0], [1, 0, 1, 0])
    expect([...encodeRleFrame(f)]).toEqual([
      2,
      0,
      2,
      0, // 头 w=2 h=2
      0x01,
      0x33, // 实心 1：0x33
      0x81, // 跳 1
      0x01,
      0x44, // 实心 1：0x44
      0x81, // 尾透明补满
    ])
  })

  test('连续单像素实心（透明夹 1px）：逐像素分段不合并', () => {
    const f = frame(5, 1, [0x0a, 0, 0x0b, 0, 0x0c], [1, 0, 1, 0, 1])
    expect([...encodeRleFrame(f)]).toEqual([
      5, 0, 1, 0, 0x01, 0x0a, 0x81, 0x01, 0x0b, 0x81, 0x01, 0x0c,
    ])
  })
})

describe('R01 encodeRleFrame 输入 view 的 byteOffset 保真', () => {
  test('pixels/opaque 为大缓冲奇数偏移 subarray：编码字节与独立缓冲版本相等', () => {
    const standalone = frame(3, 2, [1, 0, 3, 0, 5, 6], [1, 0, 1, 0, 1, 1])
    const parent = new Uint8Array(2 + 6 + 3)
    parent.fill(0x99)
    const pxView = parent.subarray(2, 2 + 6)
    pxView.set([1, 0, 3, 0, 5, 6])
    const maskParent = new Uint8Array(5 + 6 + 1)
    maskParent.fill(0x77)
    const opView = maskParent.subarray(5, 5 + 6)
    opView.set([1, 0, 1, 0, 1, 1])
    const fromViews = encodeRleFrame({
      width: 3,
      height: 2,
      pixels: pxView,
      opaque: opView,
    })
    expect([...fromViews]).toEqual([...encodeRleFrame(standalone)])
  })
})

describe('R01 encodeSpriteChunk frameCount ≥ 256', () => {
  test('300 个 1×1 帧：计数字段双字节、frame0 偏移=600、300 帧全往返且像素按序保真', () => {
    const frames = Array.from({ length: 300 }, (_, i) => frame(1, 1, [i % 256], [1]))
    const chunk = encodeSpriteChunk(frames)
    const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength)
    expect(view.getUint16(0, true)).toBe(300) // 计数 = 0x012C；byte0..1 兼任 slot0 word 偏移 → frame0 @600
    expect(view.getUint16(2, true)).toBe(303) // slot1 word = (600+6)/2
    expect(chunk.byteLength).toBe(600 + 300 * 6) // 表 600B + 每帧 6B（4 头 + 1 指令 + 1 像素）
    const parsed = parseSpriteChunkStrict(chunk)
    expect(parsed).toHaveLength(300)
    parsed.forEach((f, i) => {
      expect(f.width).toBe(1)
      expect(f.height).toBe(1)
      expect(f.pixels[0]).toBe(i % 256)
      expect(f.opaque[0]).toBe(1)
    })
  })
})
