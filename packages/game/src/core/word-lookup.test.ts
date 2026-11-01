import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useFallbackLanguage } from '../localization/language.js'
import { isolateLanguagePreference } from '../localization/language.test-fixtures.js'
import { getWord, setEnglishWordTable, setWordTable } from './word-lookup.js'

// sdlpal PAL_GetWord(wNumWord)(text.c)真值:从 WORD.DAT 取第 wNumWord 个词。
// 原表、英文覆盖与语言切换共用真实 WORD 身份；不改原表内容。
let restoreLanguage: () => void
beforeEach(() => {
  restoreLanguage = isolateLanguagePreference()
})
afterEach(() => {
  setWordTable([])
  setEnglishWordTable({})
  restoreLanguage()
})

describe('word-lookup(getWord / setWordTable,对 sdlpal PAL_GetWord)', () => {
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
    setEnglishWordTable({ '1': '' })
    useFallbackLanguage('en')
    expect(getWord(1, '兜底')).toBe('李逍遥:') // 空英文条目先回原词表
    expect(getWord(999, '兜底')).toBe('兜底') // 越界
    expect(getWord(0, '兜底')).toBe('兜底') // 空串项也退 fallback
  })
})

it('changes displayed names by true word identity and restores the same Chinese table', () => {
  const words = Array<string>(42).fill('')
  words[39] = '阿奴'
  words[40] = '巫后'
  setWordTable(words)
  setEnglishWordTable({ '39': 'Ah Nu', '40': 'Queen' })
  useFallbackLanguage('en')
  expect([getWord(40), getWord(39)]).toEqual(['Queen', 'Ah Nu'])
  useFallbackLanguage('zh-CN')
  expect([getWord(40), getWord(39)]).toEqual(['巫后', '阿奴'])
  expect(words[40]).toBe('巫后')
})
