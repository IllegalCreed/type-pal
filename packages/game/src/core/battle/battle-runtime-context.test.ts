import { describe, expect, it, vi } from 'vitest'
import { createInitialGameState } from '../game-state.js'
import {
  type BattleResources,
  clearBattleRuntimeContext,
  getBattleLiveRoles,
  getBattleResources,
  getBattleRunScript,
  type RunScriptFn,
  setBattleResources,
  setBattleRunScript,
} from './battle-runtime-context.js'

function fresh() {
  return createInitialGameState({ x: 0, y: 0, facing: 'down' })
}

function resources(): BattleResources {
  return {
    items: [],
    spells: [],
    magics: [],
    objectMagics: [],
    objectPoisons: [],
    objectPlayers: [],
    enemies: [],
    enemyObjects: [],
    playerRoles: { roles: [] },
    commands: [],
  }
}

describe('battle runtime context ownership', () => {
  it('keeps the exact resource and live-role identities installed by startBattle', () => {
    const gs = fresh()
    const installed = resources()

    setBattleResources(gs, installed)

    expect(getBattleResources(gs)).toBe(installed)
    expect(getBattleLiveRoles(gs)).toBe(installed.playerRoles)
    expect((gs as unknown as { __battleResources?: BattleResources }).__battleResources).toBe(
      installed,
    )
  })

  it('prefers the injected runner and preserves it when no new override is supplied', () => {
    const gs = fresh()
    const fallback = vi.fn(() => 1) as RunScriptFn
    const injected = vi.fn(() => 2) as RunScriptFn

    expect(getBattleRunScript(gs, fallback)).toBe(fallback)
    setBattleRunScript(gs, injected)
    setBattleRunScript(gs, undefined)

    expect(getBattleRunScript(gs, fallback)).toBe(injected)
  })

  it('releases resources and runner with the historical hidden-field semantics', () => {
    const gs = fresh()
    const fallback = vi.fn(() => 1) as RunScriptFn
    const injected = vi.fn(() => 2) as RunScriptFn
    setBattleResources(gs, resources())
    setBattleRunScript(gs, injected)

    clearBattleRuntimeContext(gs)

    const stash = gs as unknown as Record<string, unknown>
    expect(getBattleResources(gs)).toBeUndefined()
    expect(Object.hasOwn(stash, '__battleResources')).toBe(true)
    expect(stash.__battleResources).toBeUndefined()
    expect(Object.hasOwn(stash, '__battleRunScript')).toBe(false)
    expect(getBattleRunScript(gs, fallback)).toBe(fallback)
  })
})
