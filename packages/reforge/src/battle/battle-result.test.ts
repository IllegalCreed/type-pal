import { describe, expect, test } from 'vitest'
import {
  battleResultHasVictoryRewards,
  battleResultRunsOnFlee,
  battleResultRunsOnLose,
  isBattleResult,
  normalizeLegacyBattleResult,
} from './battle-result.js'

describe('BattleResult boundary', () => {
  test('recognizes exactly the five public terminal states', () => {
    for (const result of ['victory', 'defeat', 'playerFled', 'enemyFled', 'terminated'] as const)
      expect(isBattleResult(result)).toBe(true)
    expect(isBattleResult('win')).toBe(false)
    expect(isBattleResult('flee')).toBe(false)
  })

  test('maps legacy results only at the explicit adapter boundary', () => {
    expect(normalizeLegacyBattleResult('win')).toBe('victory')
    expect(normalizeLegacyBattleResult('win', true)).toBe('enemyFled')
    expect(normalizeLegacyBattleResult('lose')).toBe('defeat')
    expect(normalizeLegacyBattleResult('flee')).toBe('playerFled')
    expect(normalizeLegacyBattleResult('terminated')).toBe('terminated')
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
