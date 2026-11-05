import { describe, expect, it } from 'vitest'
import {
  makeBattleFieldRecord,
  makeEnemyRecord,
  makeRoleRecord,
} from '../__tests__/battle-records.js'
import { type BattleState, createBattleState } from '../core/battle/battle-state.js'
import type { BusEntry } from '../core/command-bus.js'
import { createInitialGameState, hydratePlayerRolesRuntime } from '../core/game-state.js'
import { createSeedableRng } from '../core/rng.js'
import type { AudioManager } from './audio.js'
import { syncShellAudio } from './bootstrap.js'

function makeAudioSpy(): AudioManager & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    sync(pendingSounds, music) {
      calls.push(`sync ${music.track} ${music.loop} sounds ${JSON.stringify(pendingSounds)}`)
      if (pendingSounds) pendingSounds.length = 0
    },
    playSound(soundId) {
      calls.push(`sound ${soundId}`)
    },
    resume() {},
    setSfxEnabled(on) {
      calls.push(`sfx ${on}`)
    },
    setMusicEnabled(on) {
      calls.push(`music ${on}`)
    },
    setMusicBackend() {},
  }
}

/** Real base records and hydrated players; this suite observes audio policy, not combat progression. */
function prepareBattleAudio(phase: BattleState['phase']) {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  const playerRoles = { roles: [makeRoleRecord(0)] }
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, playerRoles)
  gs.wNumMusic = 16
  gs.wNumBattleMusic = 7
  gs.pendingSounds = []
  gs.battleState = createBattleState({
    gs,
    playerRoles,
    enemies: [makeEnemyRecord({ deathSound: 51 })],
    field: makeBattleFieldRecord(),
    isBoss: false,
    rng: createSeedableRng(1),
  })
  gs.battleState.phase = phase
  return { gs, playerRoles, battle: gs.battleState }
}

describe('syncShellAudio', () => {
  it('suspendRaf=true 的世界仍把当前 BGM 和 SFX 交给 AudioManager', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.suspendRaf = true
    gs.wNumMusic = 16
    gs.musicLoop = true
    gs.pendingSounds = [47]
    const audio = makeAudioSpy()

    syncShellAudio(audio, gs, [], { roles: [] })

    expect(audio.calls).toEqual(['music true', 'sfx true', 'sync 16 true sounds [47]'])
    expect(gs.pendingSounds).toEqual([])
  })

  it('胜利结算曲覆盖场景和战斗曲，且不循环', () => {
    const audio = makeAudioSpy()
    const { gs, playerRoles, battle } = prepareBattleAudio('won')
    battle.expGained = 100
    syncShellAudio(audio, gs, [], playerRoles)
    expect(audio.calls.filter((call) => call.startsWith('sync '))).toEqual([
      'sync 3 false sounds []',
    ])
    expect(audio.calls.filter((call) => call.startsWith('sound '))).toEqual([])
  })

  it('揭场期间静默，揭场结束后循环播放战斗曲', () => {
    const audio = makeAudioSpy()
    const { gs, playerRoles, battle } = prepareBattleAudio('preBattle')
    battle.introFade = { step: 0, total: 18 }
    syncShellAudio(audio, gs, [], playerRoles)
    delete battle.introFade
    battle.phase = 'selectAction'
    syncShellAudio(audio, gs, [], playerRoles)
    expect(audio.calls.filter((call) => call.startsWith('sync '))).toEqual([
      'sync 0 true sounds []',
      'sync 7 true sounds []',
    ])
  })

  it('战斗帧路由固定声和敌人死亡声，探索不消费这些通知', () => {
    const drained: BusEntry[] = [
      { cmd: { op: 'playSound', soundId: 12 } },
      { cmd: { op: 'playSound', soundId: 0 } },
      { cmd: { op: 'playEnemyDeath', enemyIdx: 0 } },
      { cmd: { op: 'showDamageNum', target: { kind: 'enemy', idx: 0 }, value: 7, color: 'blue' } },
    ]
    const { gs, playerRoles } = prepareBattleAudio('selectAction')
    const battleAudio = makeAudioSpy()
    // The loose shell boundary also permits an absent soundId; it must remain silent.
    const defensiveInput = { cmd: { op: 'playSound' } }
    syncShellAudio(battleAudio, gs, [...drained, defensiveInput], playerRoles)
    expect(battleAudio.calls.filter((call) => call.startsWith('sound '))).toEqual([
      'sound 12',
      'sound 51',
    ])

    const exploreAudio = makeAudioSpy()
    delete gs.battleState
    syncShellAudio(exploreAudio, gs, [...drained, defensiveInput], playerRoles)
    expect(exploreAudio.calls.filter((call) => call.startsWith('sound '))).toEqual([])
  })
})
