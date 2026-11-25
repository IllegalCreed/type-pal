import { describe, expect, test, vi } from 'vitest'
import { wfEnemy, wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { SfxReadinessResourceError } from '../audio/sfx.js'
import { createBattleState } from './battle-core.js'
import {
  BattleTurnReadinessGate,
  type BattleTurnReadinessSnapshot,
  createBattleTurnReadinessSnapshot,
} from './battle-turn-readiness.js'

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
    const state = createBattleState({
      players: [wfPlayer('hero', { poisons: [{ poisonId: 561, tickIndex: 2 }] })],
      enemySlots: [null, wfEnemy('viper')],
    })
    const enemy = state.enemies[1]!
    enemy.poisons.push({ poisonId: 562, tickIndex: 4 })
    state.pendingActions.set(0, { kind: 'defend' })

    const frozen = createBattleTurnReadinessSnapshot(state)
    state.pendingActions.clear()
    state.players[0]!.poisons[0]!.tickIndex = 9
    enemy.poisons[0]!.tickIndex = 10

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
    expect(target.enterActionPhase).toHaveBeenCalledOnce()
    expect(gate.phase).toBe('idle')
  })

  test('reports a resource failure once and degrades into the action phase', async () => {
    const error = new SfxReadinessResourceError([new Error('missing.wav')])
    const reportError = vi.fn()
    const pending = deferred<void>()
    const gate = new BattleTurnReadinessGate({
      prepare: () => pending.promise,
      reportError,
    })
    const target = port()
    gate.begin(snapshot(), target)
    pending.reject(error)
    await expect(pending.promise).rejects.toBe(error)

    expect(reportError).toHaveBeenCalledWith(error, { turn: 3, fatal: false })
    expect(target.enterActionPhase).toHaveBeenCalledOnce()
    expect(gate.phase).toBe('idle')
  })

  test('holds an unknown failure in the fatal phase and preserves the original error', async () => {
    const error = new Error('collector failed')
    const reportError = vi.fn()
    const pending = deferred<void>()
    const gate = new BattleTurnReadinessGate({
      prepare: () => pending.promise,
      reportError,
    })
    const target = port()
    gate.begin(snapshot(), target)
    pending.reject(error)
    await expect(pending.promise).rejects.toBe(error)

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

    expect(target.isCurrent).not.toHaveBeenCalled()
    expect(target.enterActionPhase).not.toHaveBeenCalled()
    expect(gate.phase).toBe('preparing')
  })
})
