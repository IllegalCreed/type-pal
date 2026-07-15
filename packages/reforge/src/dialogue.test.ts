import type { Dialogue } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { advanceCue, currentCue, startDialogue } from './dialogue.js'

// 5 句对话(分页归渲染层 layout;状态机只管逐句推进)
const d: Dialogue = {
  id: 'x',
  cues: [
    { rows: [{ text: 't0' }] },
    { rows: [{ text: 't1' }] },
    { rows: [{ text: 't2' }] },
    { rows: [{ text: 't3' }] },
    { rows: [{ text: 't4' }] },
  ],
}

describe('dialogue 序列指针', () => {
  test('startDialogue → 当前是首句', () => {
    expect(currentCue(startDialogue(d))?.rows[0]?.text).toBe('t0')
  })

  test('advanceLine → 推进到下一句', () => {
    const s1 = advanceCue(startDialogue(d))
    expect(s1 && currentCue(s1)?.rows[0]?.text).toBe('t1')
  })

  test('推进到末句后再 advanceLine → null(对话结束)', () => {
    let s: ReturnType<typeof startDialogue> | null = startDialogue(d)
    for (let i = 0; i < 4; i++) s = advanceCue(s as NonNullable<typeof s>)
    expect(s && currentCue(s)?.rows[0]?.text).toBe('t4') // 第 5 个 cue(末项)
    expect(advanceCue(s as NonNullable<typeof s>)).toBeNull() // 再推进 → 结束
  })
})
