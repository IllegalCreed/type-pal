import { describe, expect, it } from 'vitest'
import { palCharWidth, palWordWidth } from './font.js'

// 按当前TS静态近似核布局；0x7F/0x80例固定其边界，不宣称逐码点对齐SDLPal字体表。
describe('static PAL layout widths', () => {
  it('palCharWidth:ASCII<0x80=8,CJK=16', () => {
    expect(palCharWidth('A'.codePointAt(0)!)).toBe(8)
    expect(palCharWidth('9'.codePointAt(0)!)).toBe(8)
    expect(palCharWidth('新'.codePointAt(0)!)).toBe(16)
    expect(palCharWidth('中'.codePointAt(0)!)).toBe(16)
  })

  it("palWordWidth:'新的故事'(4 CJK)→ (64+8)>>4 = 4", () => {
    expect(palWordWidth('新的故事')).toBe(4)
  })

  it('palWordWidth:5 CJK → (80+8)>>4 = 5;6 CJK → (96+8)>>4 = 6', () => {
    expect(palWordWidth('读取上次存档')).toBe(6) // 6 CJK
    expect(palWordWidth('新新新新新')).toBe(5) // 5 CJK
  })

  it('palWordWidth:8 ASCII → (64+8)>>4 = 4(ASCII 半宽,不等于 length)', () => {
    expect(palWordWidth('NEWGAME!')).toBe(4) // 8×8=64 → 4,而非 length 8
  })
})

describe('static layout edge cases', () => {
  it('palCharWidth 在 0x7F 仍是 8，0x80 起是 16', () => {
    expect(palCharWidth(0x7f)).toBe(8)
    expect(palCharWidth(0x80)).toBe(16)
  })

  it('空串的 palWordWidth 是 0', () => {
    expect(palWordWidth('')).toBe(0)
  })

  it('两个 ASCII 加一个全角的 palWordWidth 是 2，不是 3', () => {
    expect(palWordWidth('AA金')).toBe(2)
  })
})
