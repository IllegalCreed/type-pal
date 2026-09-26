import { describe, expect, it, vi } from 'vitest'
import { createInitialGameState } from '../game-state.js'
import { finalizeBattleCleanup } from './battle-finalization.js'
import {
  type BattleResources,
  getBattleResources,
  getBattleRunScript,
  type RunScriptFn,
  setBattleResources,
  setBattleRunScript,
} from './battle-runtime-context.js'
import type { BattleState } from './battle-state.js'

const emptyResources = (): BattleResources => ({
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
})

describe('battle finalization ownership', () => {
  it('restores world state, clears per-battle state, then releases runtime resources', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const fallback = vi.fn(() => 1) as RunScriptFn
    const injected = vi.fn(() => 2) as RunScriptFn
    gs.partyMembers = [0]
    gs.mode = 'battle'
    gs.battleState = {
      prevWaveLevel: 7,
      prevWaveProgression: -3,
    } as BattleState
    gs.rgPlayerStatus[0] = [8, 999, 1000, 32760, 1, 0, 0]
    gs.fAutoBattle = true
    gs.dialogBox = {} as NonNullable<typeof gs.dialogBox>
    gs.dialogBoxKept = {} as NonNullable<typeof gs.dialogBoxKept>
    gs.shakeTime = 9
    gs.shakeLevel = 4
    gs.wScreenWave = 128
    gs.sWaveProgression = 5
    setBattleResources(gs, emptyResources())
    setBattleRunScript(gs, injected)

    finalizeBattleCleanup(gs, 'won')

    expect(gs.rgPlayerStatus[0]).toEqual([0, 0, 1000, 32760, 0, 0, 0])
    expect(gs.fAutoBattle).toBe(false)
    expect(gs.dialogBox).toBeUndefined()
    expect(gs.dialogBoxKept).toBeUndefined()
    expect(gs.shakeTime).toBe(0)
    expect(gs.shakeLevel).toBe(0)
    expect(gs.wScreenWave).toBe(7)
    expect(gs.sWaveProgression).toBe(-3)
    expect(gs.mode).toBe('explore')
    expect(gs.battleState).toBeUndefined()
    expect(getBattleResources(gs)).toBeUndefined()
    expect(getBattleRunScript(gs, fallback)).toBe(fallback)
  })

  it('resumes a 0x07 event only after battle state and resources have been released', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'battle'
    gs.battleState = { prevWaveLevel: 0, prevWaveProgression: 0 } as BattleState
    gs.postBattleResume = { wonIp: 11, lostIp: 22, fledIp: 33 }
    setBattleResources(gs, emptyResources())

    finalizeBattleCleanup(gs, 'fled')

    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.ip).toBe(33)
    expect(gs.battleState).toBeUndefined()
    expect(getBattleResources(gs)).toBeUndefined()
    expect(gs.postBattleResume).toBeUndefined()
  })
})
