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
    const otherGs = fresh()
    const otherResources = resources()
    expect(getBattleResources(otherGs)).toBeUndefined()
    setBattleResources(otherGs, otherResources)
    expect(getBattleResources(gs)).toBe(installed)
    expect(getBattleLiveRoles(gs)).toBe(installed.playerRoles)
    expect(getBattleResources(otherGs)).toBe(otherResources)
    expect(getBattleLiveRoles(otherGs)).toBe(otherResources.playerRoles)
  })

  it('prefers the injected runner and preserves it when no new override is supplied', () => {
    const gs = fresh()
    const fallback = vi.fn<RunScriptFn>(() => 1)
    const injected = vi.fn<RunScriptFn>(() => 2)

    expect(getBattleRunScript(gs, fallback)).toBe(fallback)
    setBattleRunScript(gs, injected)
    setBattleRunScript(gs, undefined)

    expect(getBattleRunScript(gs, fallback)).toBe(injected)
  })

  it('releases both public resource views and restores the fallback runner', () => {
    const gs = fresh()
    const fallback = vi.fn<RunScriptFn>(() => 1)
    const injected = vi.fn<RunScriptFn>(() => 2)
    setBattleResources(gs, resources())
    setBattleRunScript(gs, injected)

    clearBattleRuntimeContext(gs)

    expect(getBattleResources(gs)).toBeUndefined()
    expect(getBattleLiveRoles(gs)).toBeUndefined()
    expect(getBattleRunScript(gs, fallback)).toBe(fallback)
  })
})
