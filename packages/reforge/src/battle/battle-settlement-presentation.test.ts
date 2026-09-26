import { describe, expect, test, vi } from 'vitest'
import battleSessionSource from './battle-session.ts?raw'
import { BattleSettlementPresentation } from './battle-settlement-presentation.js'
import settlementSource from './battle-settlement-presentation.ts?raw'

const noKeys = new Set<string>()

describe('BattleSettlementPresentation', () => {
  test.each([
    { phase: 'won' as const, enemyFled: false, result: 'victory' as const },
    { phase: 'won' as const, enemyFled: true, result: 'enemyFled' as const },
    { phase: 'lost' as const, enemyFled: false, result: 'defeat' as const },
    { phase: 'fled' as const, enemyFled: false, result: 'playerFled' as const },
  ])('maps $phase / enemyFled=$enemyFled to $result', ({ phase, enemyFled, result }) => {
    const presentation = new BattleSettlementPresentation()
    presentation.observeCorePhase(phase, enemyFled)
    expect(presentation.result).toBe(result)
  })

  test('keeps an exact scripted result instead of replacing it with the coarse core phase', () => {
    const presentation = new BattleSettlementPresentation()
    presentation.recordResult('terminated')
    presentation.observeCorePhase('won', false)
    expect(presentation.result).toBe('terminated')
  })

  test('builds victory screens once and enforces 300ms before each synchronous advance', () => {
    const first = { kind: 'exp-cash' as const, exp: 5, cash: 3 }
    const second = { kind: 'exp-cash' as const, exp: 1, cash: 1 }
    const buildSettlement = vi.fn(() => [first, second])
    const presentation = new BattleSettlementPresentation({ buildSettlement })
    presentation.recordResult('victory')

    expect(presentation.advance(299, new Set([' ']))).toBeNull()
    expect(presentation.currentScreen).toBe(first)
    expect(presentation.advance(1, noKeys)).toBeNull()
    expect(presentation.advance(0, new Set(['Enter']))).toBeNull()
    expect(presentation.currentScreen).toBe(second)
    expect(presentation.advance(300, new Set([' ']))).toBe('victory')
    expect(buildSettlement).toHaveBeenCalledOnce()
  })

  test.each([
    'victory',
    'defeat',
  ] as const)('holds an empty-screen %s result for 1200ms', (result) => {
    const buildSettlement = vi.fn(() => [])
    const presentation = new BattleSettlementPresentation({ buildSettlement })
    presentation.recordResult(result)
    expect(presentation.advance(1199, noKeys)).toBeNull()
    expect(presentation.advance(1, noKeys)).toBe(result)
    expect(buildSettlement).toHaveBeenCalledTimes(result === 'victory' ? 1 : 0)
  })

  test.each([
    'playerFled',
    'enemyFled',
    'terminated',
  ] as const)('completes %s in the same admitted tick without building reward screens', (result) => {
    const buildSettlement = vi.fn(() => [])
    const presentation = new BattleSettlementPresentation({ buildSettlement })
    presentation.recordResult(result)
    expect(presentation.advance(0, noKeys)).toBe(result)
    expect(buildSettlement).not.toHaveBeenCalled()
  })
})

describe('BattleSettlementPresentation ownership boundary', () => {
  test('owns result, screens, cursor and timer without importing the session or core state aggregate', () => {
    for (const field of ['currentResult', 'screens', 'screenIndex', 'elapsedMs'])
      expect(settlementSource).toContain(`private ${field}`)
    expect(settlementSource).not.toContain("from './battle-session")
    expect(settlementSource).not.toContain('BattleState')

    for (const stale of ['terminalResult', 'private settlement:', 'settleIdx', 'overTimer'])
      expect(battleSessionSource).not.toContain(stale)
    expect(battleSessionSource.match(/new BattleSettlementPresentation\(/g)).toHaveLength(1)
    expect(battleSessionSource).toContain('this.settlementPresentation.advance(dtMs, pressed)')
    expect(battleSessionSource).toContain('this.settlementPresentation.currentScreen')
  })
})
