import { describe, expect, test, vi } from 'vitest'
import { SfxReadinessResourceError } from '../audio/sfx.js'
import type { BattleState } from './battle-core.js'
import battleSessionSource from './battle-session.ts?raw'
import {
  BattleTurnReadinessGate,
  type BattleTurnReadinessSnapshot,
  createBattleTurnReadinessSnapshot,
} from './battle-turn-readiness.js'
import readinessSource from './battle-turn-readiness.ts?raw'

function deferred<T>(): {
  promise: Promise<T>
  resolve(value: T): void
  reject(reason?: unknown): void
} {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const snapshot = (): BattleTurnReadinessSnapshot => ({
  turn: 3,
  actions: new Map([[0, { kind: 'attack', targetEnemyIdx: 1 }]]),
  activePlayerPoisons: [{ poisonId: 561, tickIndex: 2 }],
  activeEnemyPoisons: [{ poisonId: 562, tickIndex: 4 }],
})

function port() {
  return { isCurrent: vi.fn(() => true), enterActionPhase: vi.fn() }
}

describe('BattleTurnReadinessGate', () => {
  test('freezes the current actions map and poison progress without retaining mutable collections', () => {
    const playerPoison = { poisonId: 561, tickIndex: 2 }
    const enemyPoison = { poisonId: 562, tickIndex: 4 }
    const state = {
      turn: 7,
      pendingActions: new Map([[0, { kind: 'defend' }]]),
      players: [{ poisons: [playerPoison] }],
      enemies: [null, { poisons: [enemyPoison] }],
    } as unknown as BattleState

    const frozen = createBattleTurnReadinessSnapshot(state)
    state.pendingActions.clear()
    playerPoison.tickIndex = 9
    enemyPoison.tickIndex = 10

    expect([...frozen.actions]).toEqual([[0, { kind: 'defend' }]])
    expect(frozen.activePlayerPoisons).toEqual([{ poisonId: 561, tickIndex: 2 }])
    expect(frozen.activeEnemyPoisons).toEqual([{ poisonId: 562, tickIndex: 4 }])
  })

  test('without a prepare callback enters the action phase synchronously', () => {
    const gate = new BattleTurnReadinessGate()
    const target = port()
    gate.begin(snapshot(), target)
    expect(target.enterActionPhase).toHaveBeenCalledOnce()
    expect(gate.phase).toBe('idle')
  })

  test('classifies a synchronous resource throw and degrades in the same call stack', () => {
    const error = new SfxReadinessResourceError([new Error('bad.wav')])
    const reportError = vi.fn()
    const gate = new BattleTurnReadinessGate({
      prepare: () => {
        throw error
      },
      reportError,
    })
    const target = port()

    gate.begin(snapshot(), target)

    expect(reportError).toHaveBeenCalledWith(error, { turn: 3, fatal: false })
    expect(target.enterActionPhase).toHaveBeenCalledOnce()
    expect(gate.phase).toBe('idle')
  })

  test('publishes one pending token and enters exactly once after it resolves', async () => {
    const pending = deferred<void>()
    const prepare = vi.fn(() => pending.promise)
    const gate = new BattleTurnReadinessGate({ prepare })
    const target = port()
    gate.begin(snapshot(), target)
    gate.begin(snapshot(), target)
    expect(prepare).toHaveBeenCalledOnce()
    expect(gate.phase).toBe('preparing')

    pending.resolve()
    await pending.promise
    await Promise.resolve()
    expect(target.isCurrent).toHaveBeenCalledOnce()
    expect(target.enterActionPhase).toHaveBeenCalledOnce()
    expect(gate.phase).toBe('idle')
  })

  test('reports a resource failure once and degrades into the action phase', async () => {
    const error = new SfxReadinessResourceError([new Error('missing.wav')])
    const reportError = vi.fn()
    const gate = new BattleTurnReadinessGate({
      prepare: async () => {
        throw error
      },
      reportError,
    })
    const target = port()
    gate.begin(snapshot(), target)
    await Promise.resolve()
    await Promise.resolve()

    expect(reportError).toHaveBeenCalledWith(error, { turn: 3, fatal: false })
    expect(target.enterActionPhase).toHaveBeenCalledOnce()
    expect(gate.phase).toBe('idle')
  })

  test('holds an unknown failure in the fatal phase and preserves the original error', async () => {
    const error = new Error('collector failed')
    const reportError = vi.fn()
    const gate = new BattleTurnReadinessGate({
      prepare: async () => {
        throw error
      },
      reportError,
    })
    const target = port()
    gate.begin(snapshot(), target)
    await Promise.resolve()
    await Promise.resolve()

    expect(reportError).toHaveBeenCalledWith(error, { turn: 3, fatal: true })
    expect(target.enterActionPhase).not.toHaveBeenCalled()
    expect(gate.phase).toBe('readinessError')
    expect(gate.error).toBe(error)
  })

  test('invalidate makes a late resolution inert while retaining read-only phase evidence', async () => {
    const pending = deferred<void>()
    const gate = new BattleTurnReadinessGate({ prepare: () => pending.promise })
    const target = port()
    gate.begin(snapshot(), target)
    gate.invalidate()
    pending.resolve()
    await pending.promise
    await Promise.resolve()

    expect(target.isCurrent).not.toHaveBeenCalled()
    expect(target.enterActionPhase).not.toHaveBeenCalled()
    expect(gate.phase).toBe('preparing')
  })
})

describe('BattleTurnReadiness ownership boundary', () => {
  test('the gate owns token, phase and error while BattleSession supplies only narrow callbacks', () => {
    expect(readinessSource).toContain('private serial = 0')
    expect(readinessSource).toContain('private currentPhase: BattleTurnReadinessPhase')
    expect(readinessSource).toContain('private currentError: Error | null')
    expect(readinessSource).not.toContain("from './battle-session")
    expect(readinessSource).not.toMatch(/\bthis\.(state|ui|closed|doneSettled)\b/)

    expect(battleSessionSource).not.toContain('private preparationSerial')
    expect(battleSessionSource).not.toContain('private readinessError')
    expect(battleSessionSource).not.toContain('settleTurnPreparation(')
    expect(battleSessionSource.match(/new BattleTurnReadinessGate\(/g)).toHaveLength(1)
    expect(battleSessionSource).toContain('isCurrent: () =>')
    expect(battleSessionSource).toContain('enterActionPhase: () => this.enterActionPhase()')
  })
})
