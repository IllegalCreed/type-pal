import type { Command } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { startDialogLine } from '../../present/dialog-box.js'
import {
  makeBattleField,
  makeEnemy,
  makePlayerRoles,
} from '../__tests__/stats/stats-test-fixtures.js'
import {
  createInitialGameState,
  type GameState,
  hydratePlayerRolesRuntime,
  projectRuntimeToBattleRoles,
} from '../game-state.js'
import { createSeedableRng } from '../rng.js'
import { finalizeBattle, finalizeBattleCleanup } from './battle-finalization.js'
import {
  type BattleResources,
  getBattleResources,
  getBattleRunScript,
  type RunScriptFn,
  setBattleResources,
  setBattleRunScript,
} from './battle-runtime-context.js'
import { type BattleState, createBattleState } from './battle-state.js'

function battleFixture(partyMembers = [0]) {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  const baseline = makePlayerRoles()
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, baseline)
  gs.partyMembers = partyMembers
  const enemies = [makeEnemy()]
  const resources: BattleResources = {
    items: [],
    spells: [],
    magics: [],
    objectMagics: [],
    objectPoisons: [],
    objectPlayers: [],
    enemies,
    enemyObjects: [],
    playerRoles: projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, baseline, gs.rgEquipmentEffect),
    commands: [],
  }
  const state = createBattleState({
    gs,
    playerRoles: resources.playerRoles,
    enemies,
    field: makeBattleField(),
    isBoss: false,
    rng: createSeedableRng(1),
  })
  gs.mode = 'battle'
  gs.battleState = state
  setBattleResources(gs, resources)
  return { gs, state, resources }
}

function installResume(gs: GameState): void {
  // 有效命令域覆盖三个续跑IP；本片只接回，不执行命令。
  const commands: Command[] = Array.from({ length: 34 }, () => ({ op: 'end' }))
  gs.postBattleResume = {
    wonIp: 11,
    lostIp: 22,
    fledIp: 33,
    commands,
    currentEventObjectId: 7,
    triggerOwnerId: 7,
  }
}

describe('battle finalization ownership', () => {
  it('clears all nine temporary status slots and world transients while preserving equipment counters', () => {
    const { gs, state } = battleFixture()
    state.phase = 'won'
    for (const enemy of state.enemies) {
      enemy.e.health = 0
      enemy.defeated = true
    }
    state.prevWaveLevel = 7
    state.prevWaveProgression = -3
    // CLASSIC九状态；>999只放在可由装备授予的好状态上，含未在队角色。
    gs.rgPlayerStatus[0] = [8, 999, 1, 0, 0, 1000, 32760, 2, 999]
    gs.rgPlayerStatus[5] = [0, 1, 0, 0, 0, 0, 0, 0, 0]
    gs.fAutoBattle = true
    gs.dialogBox = startDialogLine('战斗对话', { style: 'bottom', now: 0 })
    gs.dialogBoxKept = startDialogLine('保留对话', { style: 'bottom', now: 0 })
    gs.shakeTime = 9
    gs.shakeLevel = 4
    gs.wScreenWave = 128
    gs.sWaveProgression = 5
    const fallback: RunScriptFn = () => 1
    setBattleRunScript(gs, () => 2)

    finalizeBattleCleanup(gs, 'won')

    expect(gs.rgPlayerStatus[0]).toEqual([0, 0, 0, 0, 0, 1000, 32760, 0, 0])
    expect(gs.rgPlayerStatus[5]).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0])
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

  it('observes released battle resources and runner at the actual 0x07 cursor handoff', () => {
    const { gs, state } = battleFixture()
    state.phase = 'fleed'
    state.prevWaveLevel = 0
    state.prevWaveProgression = 0
    installResume(gs)
    const fallback: RunScriptFn = () => 1
    setBattleRunScript(gs, () => 2)
    let cursor = gs.eventCursor
    const handoffs: Array<{
      cursor: GameState['eventCursor']
      state: BattleState | undefined
      resources: BattleResources | undefined
      runner: RunScriptFn
      mode: GameState['mode']
    }> = []
    // 只观察公开输出字段的真实赋值，保留读写值；不替换resume或cleanup核心。
    Object.defineProperty(gs, 'eventCursor', {
      configurable: true,
      get: () => cursor,
      set: (next: GameState['eventCursor']) => {
        cursor = next
        handoffs.push({
          cursor: next,
          state: gs.battleState,
          resources: getBattleResources(gs),
          runner: getBattleRunScript(gs, fallback),
          mode: gs.mode,
        })
      },
    })

    finalizeBattleCleanup(gs, 'fled')

    expect(handoffs).toEqual([
      {
        cursor: gs.eventCursor,
        state: undefined,
        resources: undefined,
        runner: fallback,
        mode: 'explore',
      },
    ])
    expect(gs.mode).toBe('event')
    expect(gs.eventCursor).toMatchObject({
      ip: 33,
      currentEventObjectId: 7,
      triggerOwnerId: 7,
      startedExecution: true,
    })
    expect(gs.battleState).toBeUndefined()
    expect(getBattleResources(gs)).toBeUndefined()
    expect(gs.postBattleResume).toBeUndefined()
  })

  it('lost finalizer writes party HP/MP by role and resumes the lost branch without revival', () => {
    const { gs, state, resources } = battleFixture([2, 0])
    state.phase = 'lost'
    for (const role of resources.playerRoles.roles) {
      if (role.id === 2 || role.id === 0) {
        role.hp = 0
        role.mp = role.id === 2 ? 7 : 11
      }
    }
    installResume(gs)

    finalizeBattle(gs, state, resources, false)

    expect(gs.PlayerRolesRuntime.rgwHP.slice(0, 3)).toEqual([0, 100, 0])
    expect(gs.PlayerRolesRuntime.rgwMP.slice(0, 3)).toEqual([11, 50, 7])
    expect(gs.eventCursor?.ip).toBe(22)
    expect(gs.mode).toBe('event')
    expect(gs.battleState).toBeUndefined()
    expect(gs.postBattleResume).toBeUndefined()
  })

  // 三个不同生产出口：玩家逃跑、敌逃终止、TS自有watchdog；不是换数字重复resume helper。
  it.each([
    { name: 'player escape', phase: 'fleed', forced: false, enemyEscape: false, expectedIp: 33 },
    { name: 'enemy termination', phase: 'fleed', forced: false, enemyEscape: true, expectedIp: 11 },
    { name: 'watchdog', phase: 'performAction', forced: true, enemyEscape: false, expectedIp: 11 },
  ] satisfies Array<{
    name: string
    phase: BattleState['phase']
    forced: boolean
    enemyEscape: boolean
    expectedIp: number
  }>)('$name finalizer selects the real resume branch', ({
    phase,
    forced,
    enemyEscape,
    expectedIp,
  }) => {
    const { gs, state, resources } = battleFixture()
    state.phase = phase
    state.terminatedByEnemyEscape = enemyEscape
    if (forced) state.battleDialogQueue = [{ text: '尚未播放', style: 'bottom' }]
    installResume(gs)

    finalizeBattle(gs, state, resources, forced)

    expect(gs.eventCursor?.ip).toBe(expectedIp)
    if (forced) expect(state.battleDialogQueue).toBeUndefined()
    expect(gs.mode).toBe('event')
    expect(gs.postBattleResume).toBeUndefined()
  })
})
