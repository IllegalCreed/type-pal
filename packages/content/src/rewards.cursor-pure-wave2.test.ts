/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C3：applyLevelGrowth 非正次数不掷成长。
 * rewards.test.ts 已证 levels=1 的 99 级钳顶。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap } from './__tests__/cursor-pure-wave2-fixtures.js'
import { applyLevelGrowth } from './rewards.js'

const zeros = {
  level: 0,
  maxHP: 0,
  maxMP: 0,
  attack: 0,
  magicAttack: 0,
  defense: 0,
  speed: 0,
  luck: 0,
}

describe('C3 rewards 剩余合同', () => {
  test('levels<=0 与不足 1 的小数不改目标，delta 全 0', () => {
    const target = {
      level: 7,
      maxHP: 140,
      maxMP: 50,
      attack: 22,
      magicAttack: 18,
      defense: 16,
      speed: 19,
      luck: 11,
    }
    const snap = inputSnap(target)
    expect(applyLevelGrowth(target, 0, () => 0.99)).toEqual(zeros)
    expect(target).toEqual(snap)
    expect(applyLevelGrowth(target, -3, () => 0.99)).toEqual(zeros)
    expect(target).toEqual(snap)
    expect(applyLevelGrowth(target, 0.9, () => 0.99)).toEqual(zeros)
    expect(target).toEqual(snap)
    expect(target.luck).toBe(11)
  })
})
