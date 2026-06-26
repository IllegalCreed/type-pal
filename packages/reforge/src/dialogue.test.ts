import type { Dialogue } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { advancePage, pageLines, startDialogue } from './dialogue.js'

// 5 行(text 用 textId;此处单测只关心分页/翻页,值无所谓)
const d: Dialogue = {
  id: 'x',
  lines: [{ text: 't0' }, { text: 't1' }, { text: 't2' }, { text: 't3' }, { text: 't4' }],
}

describe('dialogue 状态机', () => {
  test('默认每页 1 行 → pageLines 返回首行', () => {
    expect(pageLines(startDialogue(d))).toEqual([{ text: 't0' }])
  })

  test('linesPerPage=2 → pageLines 返回前两行', () => {
    expect(pageLines(startDialogue(d, 2))).toEqual([{ text: 't0' }, { text: 't1' }])
  })

  test('advancePage 翻到下一页(每页 1 行)', () => {
    const s = advancePage(startDialogue(d))
    expect(s && pageLines(s)).toEqual([{ text: 't1' }])
  })

  test('linesPerPage=4:第 1 页 4 行,第 2 页剩 1 行,再翻 → null', () => {
    const p0 = startDialogue(d, 4)
    expect(pageLines(p0)).toEqual([{ text: 't0' }, { text: 't1' }, { text: 't2' }, { text: 't3' }])
    const p1 = advancePage(p0)
    expect(p1 && pageLines(p1)).toEqual([{ text: 't4' }])
    expect(advancePage(p1 as NonNullable<typeof p1>)).toBeNull()
  })

  test('末页 advancePage → null(对话结束)', () => {
    // 每页 1 行,5 行 → 第 4 页是最后一页
    let s: ReturnType<typeof startDialogue> | null = startDialogue(d)
    for (let i = 0; i < 4; i++) s = advancePage(s as NonNullable<typeof s>)
    expect(s && pageLines(s)).toEqual([{ text: 't4' }])
    expect(advancePage(s as NonNullable<typeof s>)).toBeNull()
  })
})
