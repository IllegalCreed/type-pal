import { describe, expect, it } from 'vitest'
import { decodeGbk } from './gbk.js'

describe('decodeGbk', () => {
  it('单字符 ASCII 不动', () => {
    expect(decodeGbk(new Uint8Array([0x41]))).toBe('A')
  })

  it('GBK "李逍遥" → UTF-8', () => {
    // 李 = 0xC0 0xEE, 逍 = 0xE5 0xD0, 遥 = 0xD2 0xA3
    const bytes = new Uint8Array([0xc0, 0xee, 0xe5, 0xd0, 0xd2, 0xa3])
    expect(decodeGbk(bytes)).toBe('李逍遥')
  })

  it('遇到 0x00 截断(C 字符串语义)', () => {
    const bytes = new Uint8Array([0x41, 0x00, 0x42])
    expect(decodeGbk(bytes)).toBe('A')
  })
})
