/**
 * TEST-COVERAGE85-GLM-GAME-1 — battle-system.ts tickBattle 路由/相位分支合同(276-1099 为主)。
 *
 * 公开 caller:tryStartBattle(=startBattle)/tickBattle/tickEnemyIdleGestures(mode.ts 每帧调)。
 * 输入全部经公开 startBattle 工厂 + typed BattleState 公开字段;不 mock 业务核心。
 * 旧证去重:不重复 battle-system.test.ts 已证的 startBattle 构造/introFade 门/敌逃出屏/
 * lost/won/flee 主线/stall>1500(其 fixture 已证一臂)。
 */
import type {
  BattleField,
  Command,
  Enemy,
  EnemyTeam,
  InputSnapshot,
  Item,
  Magic,
  ObjectMagicView,
  ObjectPlayerView,
  ObjectPoisonView,
  PlayerRole,
  PlayerRoles,
  Spell,
} from '@type-pal/shared'
import { describe, expect, it, vi } from 'vitest'
import { makeEnemy, makeField, makeRole } from '../../__tests__/coverage85-glm-game/harness.js'
import { type CommandBus, createCommandBus } from '../command-bus.js'
import { createInitialGameState, type GameState } from '../game-state.js'
import { startBattle, tickBattle, tickEnemyIdleGestures } from './battle-system.js'

const emptyInput = (): InputSnapshot => ({ held: new Set(), pressed: new Set(), frameNum: 0 })

interface BootOpts {
  roles?: PlayerRole[]
  partyMembers?: number[]
  enemies?: Enemy[]
  teamSlots?: [number, number, number, number, number]
  commands?: Command[]
}

interface Boot {
  gs: GameState
  bus: CommandBus
  playerRoles: PlayerRoles
}

function boot(opts: BootOpts = {}): Boot {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = opts.partyMembers ?? [0]
  const roles = opts.roles ?? gs.partyMembers.map((id) => makeRole(id))
  const playerRoles: PlayerRoles = { roles }
  const enemies = opts.enemies ?? [makeEnemy()]
  const teamSlots = opts.teamSlots ?? [100, 0xffff, 0xffff, 0xffff, 0xffff]
  const enemyTeams: EnemyTeam[] = [{ id: 0, enemies: teamSlots }]
  const field: BattleField = makeField()
  const commands = opts.commands ?? [{ op: 'end' }]
  const bus = createCommandBus()
  startBattle({
    gs,
    enemyTeamId: 0,
    battleFieldId: 0,
    isBoss: false,
    enemies,
    enemyTeams,
    battleFields: [field],
    playerRoles,
    items: [] as Item[],
    spells: [] as Spell[],
    magics: [] as Magic[],
    objectMagics: [] as ObjectMagicView[],
    objectPoisons: [] as ObjectPoisonView[],
    objectPlayers: [] as ObjectPlayerView[],
    commands,
    rngSeed: 42,
  })
  return { gs, bus, playerRoles }
}

describe('cov85 startBattle 倒地队员复活(276-277)', () => {
  it('hp=0 队员进战斗 → 复活到 1(roles+runtime)且傀儡态清 0', () => {
    const role = makeRole(0, { hp: 0 })
    const { gs, playerRoles } = boot({ roles: [role] })
    expect(playerRoles.roles[0]!.hp).toBe(1)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(1)
    expect(gs.rgPlayerStatus[0]![4]).toBe(0)
    expect(gs.mode).toBe('battle')
    expect(gs.battleState).toBeDefined()
  })

  it('屏波交接:prevWaveLevel/wScreenWave 写入 + sWaveProgression 清 0(299-305)', () => {
    const gs0 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs0.partyMembers = [0]
    gs0.wScreenWave = 7
    gs0.sWaveProgression = 3
    const playerRoles: PlayerRoles = { roles: [makeRole(0)] }
    startBattle({
      gs: gs0,
      enemyTeamId: 0,
      battleFieldId: 0,
      isBoss: false,
      enemies: [makeEnemy()],
      enemyTeams: [{ id: 0, enemies: [100, 0xffff, 0xffff, 0xffff, 0xffff] }],
      battleFields: [makeField({ screenWave: 4 })],
      playerRoles,
      items: [],
      spells: [],
      magics: [],
      objectMagics: [],
      objectPoisons: [],
      objectPlayers: [],
      commands: [{ op: 'end' }],
      rngSeed: 42,
    })
    const st = gs0.battleState!
    expect(st.prevWaveLevel).toBe(7)
    expect(st.prevWaveProgression).toBe(3)
    expect(gs0.wScreenWave).toBe(4)
    expect(gs0.sWaveProgression).toBe(0)
  })
})

describe('cov85 tickEnemyIdleGestures(370-390)', () => {
  it('defeated / health<=0 敌不推进;sleep/paralyzed 定格 idleFrame=0 且计数不动', () => {
    const { gs } = boot({
      enemies: [makeEnemy({ id: 100, health: 0 }), makeEnemy({ id: 101 }), makeEnemy({ id: 102 })],
      teamSlots: [100, 101, 102, 0xffff, 0xffff],
    })
    const st = gs.battleState!
    st.enemies[0]!.defeated = true
    st.enemies[0]!.idleFrame = 5
    st.enemies[1]!.e.health = 0
    st.enemies[1]!.idleFrame = 5
    st.enemies[2]!.status.sleep = 2
    st.enemies[2]!.idleFrame = 4
    st.enemies[2]!.idleTick = 1
    tickEnemyIdleGestures(st)
    expect(st.enemies[0]!.idleFrame).toBe(5) // defeated 冻结
    expect(st.enemies[1]!.idleFrame).toBe(5) // 血 0 冻结
    expect(st.enemies[2]!.idleFrame).toBe(0) // sleep 归零定格
    expect(st.enemies[2]!.idleTick).toBe(1) // 计数不动
  })

  it('idleAnimSpeed 倒数:到 0 → idleFrame++ 并恢复计数;帧数到顶回绕 0', () => {
    const { gs } = boot({ enemies: [makeEnemy({ id: 100, idleAnimSpeed: 2, idleFrames: 2 })] })
    const st = gs.battleState!
    const e = st.enemies[0]!
    e.idleTick = 1
    tickEnemyIdleGestures(st) // 1→0 → 步进 idleFrame 0→1,计数回 2
    expect(e.idleFrame).toBe(1)
    expect(e.idleTick).toBe(2)
    e.idleTick = 1
    tickEnemyIdleGestures(st) // idleFrame 1→2 → 回绕 0
    expect(e.idleFrame).toBe(0)
  })

  it('currentFrame 链帧敌:推 currentFrame 并按 idleFrames 回绕(不动 idleFrame)', () => {
    const { gs } = boot({ enemies: [makeEnemy({ id: 100, idleAnimSpeed: 1, idleFrames: 4 })] })
    const st = gs.battleState!
    const e = st.enemies[0]!
    e.currentFrame = 2
    e.idleFrame = 0
    tickEnemyIdleGestures(st)
    expect(e.currentFrame).toBe(3)
    tickEnemyIdleGestures(st) // >= idleFrames(3) → 回绕 0
    expect(e.currentFrame).toBe(0)
    expect(e.idleFrame).toBe(0)
  })
})

describe('cov85 tickBattle 顶层守卫(392-418)', () => {
  it('无 battleState → no-op;资源缺失 → 强制退出 explore + console.error', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(() => tickBattle(gs, emptyInput(), createCommandBus())).not.toThrow() // L394

    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { gs: gs2 } = boot()
    const st = gs2.battleState!
    // 抹资源:startBattle 后资源挂在 gs 私有 __battleResources;构造缺资源态用清 battleState 后重挂
    // 公开等价路径:直接构造 gs.mode='battle' + battleState 而不经 startBattle(生产不可能,防御臂)
    const gs3 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs3.mode = 'battle'
    gs3.battleState = st
    tickBattle(gs3, emptyInput(), createCommandBus())
    expect(gs3.mode).toBe('explore')
    expect(gs3.battleState).toBeUndefined()
    expect(err).toHaveBeenCalled()
    void st
  })

  it('phase stall 兜底:phaseStallTicks 超 1500 → 强制 finalize 回 explore(selectAction 不计)', () => {
    const { gs, bus } = boot()
    const st = gs.battleState!
    tickBattle(gs, emptyInput(), bus) // preBattle → selectAction
    expect(st.phase).toBe('selectAction')
    expect(st.phaseStallTicks).toBe(0) // selectAction 重置(407-408)
    st.phase = 'performAction'
    st.phaseStallTicks = 1501 // > PHASE_STALL_TICKS_LIMIT(1500,battle-system.ts:98)
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    tickBattle(gs, emptyInput(), bus)
    expect(err).toHaveBeenCalled()
    expect(gs.mode).toBe('explore')
    expect(gs.battleState).toBeUndefined()
  })
})

describe('cov85 tickBattle phase 路由(496-533)', () => {
  it('roundEndDelayTicks>0 → 递减且不起菜单;归零后 selectionStartedForTurn 帧起菜单', () => {
    const { gs, bus } = boot()
    const st = gs.battleState!
    tickBattle(gs, emptyInput(), bus) // → selectAction(turnStart 无脚本)
    expect(st.phase).toBe('selectAction')
    st.roundEndDelayTicks = 2
    st.selectionStartedForTurn = st.turn + 1 // 屏蔽已起菜单
    tickBattle(gs, emptyInput(), bus)
    expect(st.roundEndDelayTicks).toBe(1)
    expect(st.selectionStartedForTurn).toBe(st.turn + 1) // 仍没起
    tickBattle(gs, emptyInput(), bus)
    expect(st.roundEndDelayTicks).toBe(0)
    tickBattle(gs, emptyInput(), bus) // 归零后起菜单
    expect(st.selectionStartedForTurn).toBe(st.turn)
    expect(st.uiState).toBe('selectMove')
  })

  it('全员失能(睡)→ 起手落空(无手动选择)+ 自动占位 action 填满进 perform(583-595)', () => {
    const { gs, bus } = boot({ roles: [makeRole(0)] })
    const st = gs.battleState!
    tickBattle(gs, emptyInput(), bus) // → selectAction
    st.players[0]!.status.sleep = 5
    st.selectionStartedForTurn = st.turn + 99 // 逼下一 tick 重新起手
    tickBattle(gs, emptyInput(), bus)
    expect(st.selectionStartedForTurn).toBe(st.turn)
    expect(st.pendingActions.has(0)).toBe(true) // 失能自动占位
    expect(st.selectingPlayerIdx).toBeUndefined() // 手动选择未起(落空臂)
  })

  it('活队员全死 → selectAction 兜底转 lost(651-655)', () => {
    const { gs, bus, playerRoles } = boot({ roles: [makeRole(0, { hp: 0 })] })
    const st = gs.battleState!
    tickBattle(gs, emptyInput(), bus) // → selectAction(startBattle 已复活到 1)
    expect(st.phase).toBe('selectAction')
    playerRoles.roles[0]!.hp = 0 // 复活后打死
    tickBattle(gs, emptyInput(), bus)
    expect(st.phase).toBe('lost')
  })

  it('won:无 settlement → 建;已有 → 不重建(523-527)', () => {
    const { gs, bus } = boot()
    const st = gs.battleState!
    st.phase = 'won'
    tickBattle(gs, emptyInput(), bus)
    expect(st.settlement).toBeDefined()
    const first = st.settlement
    tickBattle(gs, emptyInput(), bus) // settlement hold 接管;不重建
    expect(st.settlement).toBe(first)
  })
})

describe('cov85 tickBattle hold 守卫(420-449)', () => {
  it('战斗调色板 fade 进行中 → 暂停推进(426)', () => {
    const { gs, bus } = boot()
    const st = gs.battleState!
    tickBattle(gs, emptyInput(), bus) // → selectAction
    gs.paletteFadeState = {
      startColors: [],
      targetColors: [],
      startTimeMs: 0,
      totalMs: 100000,
      mode: 'lerp',
      steps: 10,
      increment: 4,
    }
    st.phase = 'performAction'
    st.phaseStallTicks = 0
    tickBattle(gs, emptyInput(), bus)
    expect(st.phase).toBe('performAction') // 被 hold,未推进
  })
})
