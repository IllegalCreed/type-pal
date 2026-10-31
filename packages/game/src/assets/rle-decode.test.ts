/** Browser base64 transport and the actual PAL container entry used by dialog icons. */
import { parseSpriteChunk as parseAuthorSpriteChunk, parsePalSpriteChunk } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { base64ToBytes, parseSpriteChunk } from './rle-decode.js'

describe('base64ToBytes', () => {
  it('空 string → 空 Uint8Array', () => {
    expect(base64ToBytes('').length).toBe(0)
  })
  it('有 padding 的两字节与无 padding 的三字节零值输入', () => {
    // 'AAA=' = [0x00 0x00](2 字节);'AAAA' = [0x00 0x00 0x00](3 字节)
    expect(Array.from(base64ToBytes('AAA='))).toEqual([0, 0])
    expect(Array.from(base64ToBytes('AAAA'))).toEqual([0, 0, 0])
  })
})

describe('base64 transport and PAL binding', () => {
  it('base64 /wCA 解出 [255, 0, 128]', () => {
    expect(Array.from(base64ToBytes('/wCA'))).toEqual([255, 0, 128])
  })

  it('base64 /w== 解出单字节 255', () => {
    expect(Array.from(base64ToBytes('/w=='))).toEqual([255])
  })

  it('原盘对话图标直接使用 shared PAL 入口，排除作者格式入口', () => {
    expect(parseSpriteChunk).toBe(parsePalSpriteChunk)
    expect(parseSpriteChunk).not.toBe(parseAuthorSpriteChunk)
  })
})
