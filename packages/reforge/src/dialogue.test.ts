import type { Dialogue } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { advance, currentLine, startDialogue } from './dialogue.js'

const d: Dialogue = { id: 'x', lines: [{ text: 'a' }, { text: 'b' }] }

describe('dialogue', () => {
  test('start → 停在第 0 页', () => {
    expect(currentLine(startDialogue(d))).toEqual({ text: 'a' })
  })

  test('advance → 翻到下一页', () => {
    const s = advance(startDialogue(d))
    expect(s && currentLine(s)).toEqual({ text: 'b' })
  })

  test('最后一页 advance → null（对话结束）', () => {
    const last = advance(startDialogue(d)) // 第 1 页（最后）
    expect(advance(last as NonNullable<typeof last>)).toBeNull()
  })
})
