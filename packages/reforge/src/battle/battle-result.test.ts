import { describe, expect, test } from 'vitest'
import {
  battleResultHasVictoryRewards,
  battleResultRunsOnFlee,
  battleResultRunsOnLose,
  isBattleResult,
} from './battle-result.js'

describe('BattleResult boundary', () => {
  test('recognizes exactly the five public terminal states', () => {
    for (const result of ['victory', 'defeat', 'playerFled', 'enemyFled', 'terminated'] as const)
      expect(isBattleResult(result)).toBe(true)
    expect(isBattleResult('win')).toBe(false)
    expect(isBattleResult('flee')).toBe(false)
  })

  test('keeps reward and continuation policies unambiguous', () => {
    expect(battleResultHasVictoryRewards('victory')).toBe(true)
    for (const result of ['defeat', 'playerFled', 'enemyFled', 'terminated'] as const)
      expect(battleResultHasVictoryRewards(result)).toBe(false)
    expect(battleResultRunsOnLose('defeat')).toBe(true)
    expect(battleResultRunsOnFlee('playerFled')).toBe(true)
    expect(battleResultRunsOnLose('playerFled')).toBe(false)
    expect(battleResultRunsOnFlee('victory')).toBe(false)
  })
})
