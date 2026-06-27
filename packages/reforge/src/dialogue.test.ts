import type { Dialogue } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { advanceLine, currentLine, startDialogue } from './dialogue.js'

// 5 句对话(分页归渲染层 layout;状态机只管逐句推进)
const d: Dialogue = {
  id: 'x',
  lines: [{ text: 't0' }, { text: 't1' }, { text: 't2' }, { text: 't3' }, { text: 't4' }],
}

describe('dialogue 序列指针', () => {
  test('startDialogue → 当前是首句', () => {
    expect(currentLine(startDialogue(d))?.text).toBe('t0')
  })

  test('advanceLine → 推进到下一句', () => {
    const s1 = advanceLine(startDialogue(d))
    expect(s1 && currentLine(s1)?.text).toBe('t1')
  })

  test('推进到末句后再 advanceLine → null(对话结束)', () => {
    let s: ReturnType<typeof startDialogue> | null = startDialogue(d)
    for (let i = 0; i < 4; i++) s = advanceLine(s as NonNullable<typeof s>)
    expect(s && currentLine(s)?.text).toBe('t4') // 第 5 句(末句)
    expect(advanceLine(s as NonNullable<typeof s>)).toBeNull() // 再推进 → 结束
  })
})
