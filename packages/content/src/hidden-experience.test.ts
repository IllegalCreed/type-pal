/** The Word-sized persisted hidden-experience pool. */
import { describe, expect, test } from 'vitest'
import { actorWithPortraitsAndBattler } from './__tests__/actor-fixtures.js'
import { instantiate } from './character.js'
import { applyHiddenExp } from './rewards.js'
import { validateActors } from './validate.js'

describe('applyHiddenExp：池经验 WORD 截断', () => {
  test('池 exp 超 0xffff 时按位与截断（100000 → 34464），未截断值不可能出现', () => {
    const actor = actorWithPortraitsAndBattler('hero', '英雄')
    const battler = actor.battler
    if (!battler) throw new Error('Missing battler fixture')
    battler.baseStats.level = 5
    const table = Array.from({ length: 100 }, (_, index) => (index === 5 ? 1_000_000_000 : 10))
    battler.leveling = { expTable: table }
    validateActors([actor])
    const c = instantiate(actor)
    // High authored thresholds leave the 100,000 award entirely in the pool remainder.
    const ups = applyHiddenExp(c, { attack: 1 }, 50000, table, () => 0)
    expect(ups).toEqual([])
    expect(c.hiddenExp?.attack).toEqual({ exp: 34_464, level: 5 })
    expect(c.attack).toBe(20)
  })
})
