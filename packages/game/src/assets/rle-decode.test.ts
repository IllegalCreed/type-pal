import { describe, expect, it } from 'vitest'
import { base64ToBytes } from './rle-decode.js'

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
