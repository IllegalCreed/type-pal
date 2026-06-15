import { describe, expect, it } from 'vitest'
import { getSceneName, hasSceneName } from './scene-names.js'

describe('scene-names', () => {
  it('已知场景返回考据地名', () => {
    expect(getSceneName(1)).toBe('余杭镇')
    expect(getSceneName(65)).toBe('将军冢')
    expect(getSceneName(144)).toBe('锁妖塔·七星磐龙柱')
  })
  it('未知场景回退 场景N', () => {
    expect(getSceneName(9999)).toBe('场景9999')
    expect(hasSceneName(9999)).toBe(false)
    expect(hasSceneName(1)).toBe(true)
  })
})
