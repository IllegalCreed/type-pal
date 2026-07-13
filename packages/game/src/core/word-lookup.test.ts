import { beforeEach, describe, expect, it } from 'vitest'
import { getWord, setWordTable } from './word-lookup.js'

// sdlpal PAL_GetWord(wNumWord)(text.c)真值:从 WORD.DAT 取第 wNumWord 个词。
//   ts 侧用 extracted/lookup/words.json 的 flat[](= 565 条全 dump,index = 真 WORD id)。
describe('word-lookup(getWord / setWordTable,对 sdlpal PAL_GetWord)', () => {
  beforeEach(() => setWordTable([])) // 隔离:每测从空表起

  it('表未载 → 返回 fallback(缺省 fallback 为空串)', () => {
    expect(getWord(3)).toBe('')
    expect(getWord(3, '状态')).toBe('状态') // resilience:words.json 未载时退化到调用方默认
  })

  it('表已载 → 返回 flat[id](表优先于 fallback)', () => {
    setWordTable(['', '李逍遥:', '', '状态', '仙术', '物品', '系统'])
    expect(getWord(3)).toBe('状态')
    expect(getWord(6)).toBe('系统')
    expect(getWord(3, '不该用的fallback')).toBe('状态') // 表命中 → 忽略 fallback
  })

  it('表已载但 id 越界/为空 → 退回 fallback', () => {
    setWordTable(['', '李逍遥:'])
    expect(getWord(999, '兜底')).toBe('兜底') // 越界
    expect(getWord(0, '兜底')).toBe('兜底') // 空串项也退 fallback
  })
})
