import type { DialogueRow } from '@type-pal/content'
import { expect, test } from 'vitest'
import type { GlyphTable } from '../text/glyph.js'
import { layoutLines } from './layout.js'

const ascii = { width: 8, height: 16, bitmap: new Uint8Array(16) }
const wide = { width: 16, height: 16, bitmap: new Uint8Array(32) }
const glyphs: GlyphTable = {
  has: (cp) => cp !== 0x3f,
  get: (cp) => (cp === 0x3f ? undefined : cp < 0x80 ? ascii : wide),
}
const identity = (id: string): string => id

test('解析文本 ID，折行仍关联各自的源对白行', () => {
  const rows: DialogueRow[] = [{ text: 'first' }, { text: 'second' }]
  const resolved = (id: string) => (id === 'first' ? 'ABCDE' : 'Z')
  expect(layoutLines(rows, glyphs, resolved, 64, 32)).toStrictEqual([
    { spans: [{ text: 'ABCD', color: undefined }], srcRowIdx: 0 },
    { spans: [{ text: 'E', color: undefined }], srcRowIdx: 0 },
    { spans: [{ text: 'Z', color: undefined }], srcRowIdx: 1 },
  ])
})

test('混合换行保留显式空行和下一行缩进', () => {
  const lines = layoutLines([{ text: '第一行\r\n\r\n  下一行' }], glyphs, identity, 320, 44)
  expect(lines.map(({ spans }) => spans.map(({ text }) => text).join(''))).toEqual([
    '第一行',
    '',
    '  下一行',
  ])
})

test('相邻同色段合并，换行后的颜色和字符顺序保持', () => {
  const rows: DialogueRow[] = [{ text: '<cyan>甲</cyan><cyan>乙丙</cyan><red>丁</red>' }]
  expect(layoutLines(rows, glyphs, identity, 64, 32)).toEqual([
    { spans: [{ text: '甲乙', color: 'cyan' }], srcRowIdx: 0 },
    {
      spans: [
        { text: '丙', color: 'cyan' },
        { text: '丁', color: 'red' },
      ],
      srcRowIdx: 0,
    },
  ])
})

test('空译文保留源行位置', () => {
  const rows: DialogueRow[] = [{ text: 'blank' }]
  expect(layoutLines(rows, glyphs, () => '', 320, 44)).toStrictEqual([
    { spans: [{ text: '' }], srcRowIdx: 0 },
  ])
})

test('缺字占全宽，窄框中的单个宽字仍占一行', () => {
  const text = (lines: ReturnType<typeof layoutLines>) =>
    lines.map(({ spans }) => spans.map(({ text }) => text).join(''))
  expect(text(layoutLines([{ text: 'A?B' }], glyphs, identity, 24, 0))).toEqual(['A?', 'B'])
  expect(text(layoutLines([{ text: '?' }], glyphs, identity, 16, 8))).toEqual(['?'])
})

test.each([
  ['下侧头像', 20, 18],
  ['上侧头像', 96, 14],
  ['无头像', 44, 17],
  ['居中字幕', 80, 15],
] as const)('%s 使用画布右边缘计算可用宽度', (_slot, startX, columns) => {
  const fullLine = '甲'.repeat(columns)
  const fit = layoutLines([{ text: fullLine }], glyphs, identity, 320, startX)
  const wrapped = layoutLines([{ text: `${fullLine}乙` }], glyphs, identity, 320, startX)
  const text = (lines: typeof fit) => lines.map(({ spans }) => spans[0]?.text)
  expect(text(fit)).toEqual([fullLine])
  expect(text(wrapped)).toEqual([fullLine, '乙'])
})
