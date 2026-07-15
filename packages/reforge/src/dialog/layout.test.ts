import type { DialogueRow } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { GlyphTable } from '../text/glyph.js'
import { type DisplayLine, layoutLines } from './layout.js'

// mock glyphs:CJK 全宽 16px,ASCII 半宽 8px(对应真实 Unifont)
const glyphs: GlyphTable = {
  has: (cp) => cp < 0x80 || cp > 0x4e00,
  get: (cp) => ({
    width: cp < 0x80 ? 8 : 16,
    height: 16,
    bitmap: new Uint8Array(cp < 0x80 ? 16 : 32),
  }),
}
const resolveText = (id: string) => id // 测试用:id 即文本
const MAX_RIGHT = 308 // 正文 x=44,右边距 12 → 可用 264px = 16 全宽字
const START_X = 44

describe('layoutLines', () => {
  test('短句(≤16字)→ 单 DisplayLine,isLineStart', () => {
    const lines: DialogueRow[] = [{ text: '一二三四五六七八九' }] // 9 全宽字 = 144px
    const out = layoutLines(lines, glyphs, resolveText, MAX_RIGHT, START_X)
    expect(out).toHaveLength(1)
    expect(out[0]?.isRowStart).toBe(true)
    expect(out[0]?.srcRowIdx).toBe(0)
  })

  test('长句(17字)→ 折成 2 DisplayLine(16+1),第二行 isLineStart=false', () => {
    const lines: DialogueRow[] = [{ text: '一二三四五六七八九十一二三四五六七' }] // 17 字
    const out = layoutLines(lines, glyphs, resolveText, MAX_RIGHT, START_X)
    expect(out).toHaveLength(2)
    expect(out[0]?.isRowStart).toBe(true)
    expect(out[1]?.isRowStart).toBe(false)
    expect(out[0]?.spans[0]?.text).toHaveLength(16) // 首行 16 字
    expect(out[1]?.spans[0]?.text).toHaveLength(1) // 次行 1 字
  })

  test('显式换行强制另起一行，并保留下一行缩进', () => {
    const lines: DialogueRow[] = [{ text: '既然落在你的手里，\n  要杀要剐不用多说！' }]
    const out = layoutLines(lines, glyphs, resolveText, MAX_RIGHT, START_X)

    expect(out).toHaveLength(2)
    expect(out.map((line) => line.spans.map((span) => span.text).join(''))).toEqual([
      '既然落在你的手里，',
      '  要杀要剐不用多说！',
    ])
    expect(out.map((line) => line.isRowStart)).toEqual([true, false])
  })

  test('多个 DialogueRow → srcRowIdx 递增,各自 isRowStart=true', () => {
    const lines: DialogueRow[] = [
      { text: '甲' }, // 1 字,单行
      { text: '乙' },
    ]
    const out = layoutLines(lines, glyphs, resolveText, MAX_RIGHT, START_X)
    expect(out).toHaveLength(2)
    expect(out[0]?.srcRowIdx).toBe(0)
    expect(out[0]?.isRowStart).toBe(true)
    expect(out[1]?.srcRowIdx).toBe(1)
    expect(out[1]?.isRowStart).toBe(true)
  })

  test('跨 span 折行:前 span 满 + 后 span 接下一行', () => {
    // 16 字无色 span(满行 256px)+ 1 字 cyan span
    const text = '一'.repeat(16)
    const lines: DialogueRow[] = [{ text: `${text}<cyan>二</cyan>` }]
    const out = layoutLines(lines, glyphs, resolveText, MAX_RIGHT, START_X)
    expect(out).toHaveLength(2)
    // 第二行的 span 应带 cyan 色(跨 span 折行保留色)
    expect(out[1]?.spans.some((s) => s.color === 'cyan')).toBe(true)
  })

  test('空句 → 单个空 DisplayLine(不崩)', () => {
    const lines: DialogueRow[] = [{ text: '' }]
    const out = layoutLines(lines, glyphs, resolveText, MAX_RIGHT, START_X)
    expect(out).toHaveLength(1)
  })
})

// 帮 TS 收窄类型(避免 unused)
export type { DisplayLine }
