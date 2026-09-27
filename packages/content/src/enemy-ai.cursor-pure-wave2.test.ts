/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C2：pickAiTarget highestHp。
 * enemy-ai.test.ts 已证 random / lowestHp / lowestMp / strongest。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap } from './__tests__/cursor-pure-wave2-fixtures.js'
import { pickAiTarget } from './enemy-ai.js'

describe('C2 enemy-ai 剩余合同', () => {
  test('highestHp 取最高血；并列取槽序靠前，旁队员不改', () => {
    const players = [
      { index: 0, hpPercent: 40, hp: 80, mp: 30, attack: 50, role: 'hero.li' },
      { index: 2, hpPercent: 90, hp: 200, mp: 10, attack: 20, role: 'hero.zhao' },
      { index: 3, hpPercent: 90, hp: 200, mp: 99, attack: 80, role: 'hero.lin' },
    ]
    const snap = inputSnap(players)
    expect(pickAiTarget('highestHp', players, () => 0.99)).toBe(2)
    expect(players).toEqual(snap)
    expect(players[0]?.hp).toBe(80)
    expect(players[2]?.index).toBe(3)
  })
})
