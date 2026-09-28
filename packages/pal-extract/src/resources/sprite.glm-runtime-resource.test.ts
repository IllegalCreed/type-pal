/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R04（pal-extract/resources/sprite.ts）。
 * 去重账：sprite.test 覆盖 PNG 魔数、parseSpriteChunk 基础、framesToOut 首帧、
 * extractCharacterSprites 空 chunk/缺 id warn。本文件只做未占用合同：
 * encodeIndexedPng 的 opaque mask 与缺省 mask 用 pngjs 真解码逐像素核对
 * （透明 alpha 0 / opaque palette-0 alpha 255 / RGB 三通道复制）、
 * framesToOut 多帧 index/尺寸/像素、extractCharacterSprites 多 id 顺序与逐帧 PNG。
 */

import { parseSpriteChunk } from '@type-pal/shared'
import { PNG } from 'pngjs'
import { describe, expect, test } from 'vitest'
import { encodeIndexedPng, extractCharacterSprites, framesToOut } from './sprite.js'

describe('R04 encodeIndexedPng 真解码像素合同', () => {
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

describe('R04 framesToOut 多帧', () => {
  test('3 帧容器：index 0/1/2、逐帧尺寸与真解码像素', () => {
    const chunk = new Uint8Array([
      0x03,
      0x00, // frameCount=3，slot0 word=3 → byte 6
      0x06,
      0x00, // slot1 → byte 12
      0x09,
      0x00, // slot2 → byte 18
      // frame0 @6：1×1 px 0x11
      0x01,
      0x00,
      0x01,
      0x00,
      0x01,
      0x11,
      // frame1 @12：1×1 px 0x22
      0x01,
      0x00,
      0x01,
      0x00,
      0x01,
      0x22,
      // frame2 @18：2×1（跳1 + px 0x33）
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

describe('R04 extractCharacterSprites 多 id', () => {
  test('输入 id 顺序保留；每 sprite 帧独立解码', () => {
    const chunk1 = new Uint8Array([0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x11])
    const chunk2 = new Uint8Array([0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x22])
    const chunks = new Map<number, Uint8Array>([
      [78, chunk1],
      [14, chunk2],
    ])
    const result = extractCharacterSprites([78, 14], chunks)
    expect(result.map((r) => r.spriteId)).toEqual([78, 14])
    const png1 = PNG.sync.read(Buffer.from(result[0]!.frames[0]!.pngBytes))
    const png2 = PNG.sync.read(Buffer.from(result[1]!.frames[0]!.pngBytes))
    expect([...png1.data]).toEqual([0x11, 0x11, 0x11, 255])
    expect([...png2.data]).toEqual([0x22, 0x22, 0x22, 255])
  })
})
