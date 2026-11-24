import { expect, test } from 'vitest'
import { wfEnemy, wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { expectDefined } from '../defined.js'
import { createBattleState, reviveBattlePlayer } from './battle-core.js'

test('ten percent revival rounds down without granting a minimum hit point', () => {
  const newBattle = (maxHp: number) =>
    createBattleState({
      players: [wfPlayer('fallen', { hp: 0, maxHp })],
      enemySlots: [wfEnemy('opponent')],
    })

  // Native opcode 0x22 expresses the revival fraction in tenths (script.c:1052–1102).
  const nine = newBattle(9)
  const nineTarget = expectDefined(nine.players[0])
  expect(reviveBattlePlayer(nine, nineTarget, 10)).toBe(true)
  expect(nineTarget.hp).toBe(0)

  const ten = newBattle(10)
  const tenTarget = expectDefined(ten.players[0])
  expect(reviveBattlePlayer(ten, tenTarget, 10)).toBe(true)
  expect(tenTarget.hp).toBe(1)
})
