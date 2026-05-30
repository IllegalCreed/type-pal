/**
 * battle-anim-integration.test.ts —— D17a 时间线驱动接入 tickBattle(数据级断言)。
 *
 * 覆盖:
 *  - performAttack(player→enemy)起时间线:连续 N tick currentActionIndex 不变(播放中)
 *    + battleAnim.idx 递增;播完 currentActionIndex++ 且 fighter pos==posOriginal/iColorShift==0
 *  - 向后兼容:defend / pass action 后 state.battleAnim 仍 undefined + currentActionIndex 立刻 ++
 */

import type {
  BattleField,
  Enemy,
  EnemyTeam,
  InputSnapshot,
  PlayerRole,
  PlayerRoles,
} from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { type CommandBus, createCommandBus } from '../../command-bus.js'
import { createInitialGameState, type GameState } from '../../game-state.js'
import { startBattle, tickBattle } from '../battle-system.js'

function makeRole(opts: Partial<PlayerRole> = {}): PlayerRole {
  return {
    id: 0,
    _name: 'R',
    avatar: 0,
    spriteNumInBattle: 0,
    spriteNum: 0,
    name: 0,
    attackAll: 0,
    level: 10,
    maxHP: 200,
    maxMP: 30,
    hp: 200,
    mp: 30,
    attackStrength: 100,
    magicStrength: 0,
    defense: 50,
    dexterity: 50,
    fleeRate: 50,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    walkFrames: 0,
    attackSound: 0,
    weaponSound: 0,
    criticalSound: 0,
    magicSound: 0,
    deathSound: 0,
    ...opts,
  }
}

function makeEnemy(opts: Partial<Enemy> = {}): Enemy {
  return {
    id: 100,
    _name: 'E',
    idleFrames: 1,
    magicFrames: 0,
    attackFrames: 0,
    idleAnimSpeed: 1,
    actWaitFrames: 0,
    yPosOffset: 0,
    attackSound: 0,
    actionSound: 0,
    magicSound: 0,
    deathSound: 0,
    callSound: 0,
    health: 100,
    exp: 50,
    cash: 30,
    level: 5,
    magic: 0,
    magicRate: 0,
    attackEquivItem: 0,
    attackEquivItemRate: 0,
    stealItem: 0,
    stealItemCount: 0,
    attackStrength: 10,
    magicStrength: 0,
    defense: 10,
    dexterity: 20,
    fleeRate: 0,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    physicalResistance: 1,
    dualMove: 0,
    collectValue: 0,
    ...opts,
  }
}

function bootstrap(opts: { enemies?: Enemy[]; roles?: PlayerRole[] } = {}): {
  gs: GameState
  bus: CommandBus
  emptyInput: InputSnapshot
} {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0]
  const roles = opts.roles ?? [makeRole({ id: 0 })]
  const playerRoles: PlayerRoles = { roles }
  const enemies = opts.enemies ?? [makeEnemy({ id: 100, health: 99999 })] // 不秒杀,保持战斗
  const enemyTeams: EnemyTeam[] = [{ id: 0, enemies: [100, 0xffff, 0xffff, 0xffff, 0xffff] }]
  const field: BattleField = {
    id: 0,
    screenWave: 0,
    magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
  }
  startBattle({
    gs,
    enemyTeamId: 0,
    battleFieldId: 0,
    isBoss: false,
    enemies,
    enemyTeams,
    battleFields: [field],
    playerRoles,
    items: [],
    spells: [],
    magics: [],
    commands: [{ op: 'end' }],
    rngSeed: 42,
  })
  return {
    gs,
    bus: createCommandBus(),
    emptyInput: { held: new Set(), pressed: new Set(), frameNum: 0 },
  }
}

describe('D17a 时间线驱动 — player 物理攻击', () => {
  it('攻击后多 tick:currentActionIndex 不变(播放中)+ battleAnim.idx 递增;播完 ++ 且复位', () => {
    const { gs, bus, emptyInput } = bootstrap()
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    const state = gs.battleState!
    state.pendingActions.set(0, { type: 'attack', target: 0 })
    tickBattle(gs, emptyInput, bus) // selectAction → performAction(actionQueue built)

    // 推进到 player action 起始(可能 enemy 先手 / 后手;找到第一个起了 battleAnim 的 tick)
    let started = false
    let safety = 50
    while (!started && safety-- > 0 && gs.battleState?.phase === 'performAction') {
      tickBattle(gs, emptyInput, bus)
      if (gs.battleState?.battleAnim) {
        started = true
        break
      }
    }
    expect(started, 'player 攻击应建时间线').toBe(true)

    const s = gs.battleState!
    const idxAtStart = s.currentActionIndex
    const animIdx0 = s.battleAnim!.idx
    // 记 player fighter posOriginal
    const playerOrig = { ...s.players[0]!.posOriginal! }

    // 播放中:连续 tick → currentActionIndex 不变;battleAnim.idx 单调不减
    let prevAnimIdx = animIdx0
    let sawAdvance = false
    let guard = 60
    while (s.battleAnim && guard-- > 0) {
      tickBattle(gs, emptyInput, bus)
      if (!s.battleAnim) break
      expect(s.currentActionIndex).toBe(idxAtStart) // 播放中不推进
      expect(s.battleAnim.idx).toBeGreaterThanOrEqual(prevAnimIdx)
      if (s.battleAnim.idx > animIdx0) sawAdvance = true
      prevAnimIdx = s.battleAnim.idx
    }
    expect(sawAdvance, 'battleAnim.idx 应递增过').toBe(true)
    // 播完:battleAnim 清空 + currentActionIndex 推进
    expect(s.battleAnim).toBeUndefined()
    expect(s.currentActionIndex).toBe(idxAtStart + 1)
    // 复位:player pos == posOriginal,iColorShift == 0
    expect(s.players[0]!.pos).toEqual(playerOrig)
    expect(s.players[0]!.iColorShift).toBe(0)
    // 目标 enemy 也复位 iColorShift==0 + pos==posOriginal
    expect(s.enemies[0]!.iColorShift).toBe(0)
    expect(s.enemies[0]!.pos).toEqual(s.enemies[0]!.posOriginal)
  })
})

describe('D17a 向后兼容 — 未建时间线的 action 即时推进', () => {
  it('defend action:battleAnim 仍 undefined + currentActionIndex 立刻 ++', () => {
    const { gs, bus, emptyInput } = bootstrap()
    tickBattle(gs, emptyInput, bus) // → selectAction
    const state = gs.battleState!
    state.pendingActions.set(0, { type: 'defend', target: -1 })
    tickBattle(gs, emptyInput, bus) // → performAction

    // 找到 player 的 queue 位,执行 defend 那 tick:battleAnim 必须保持 undefined
    let guard = 30
    let observedDefendTick = false
    while (gs.battleState?.phase === 'performAction' && guard-- > 0) {
      const before = gs.battleState.currentActionIndex
      tickBattle(gs, emptyInput, bus)
      const st = gs.battleState
      if (!st) break
      // defend 不建时间线 → 每个非攻击 action tick 后 battleAnim 仍 undefined
      if (st.players[0]!.defending && st.phase === 'performAction') {
        observedDefendTick = true
        expect(st.battleAnim).toBeUndefined()
        expect(st.currentActionIndex).toBe(before + 1) // 即时推进
        break
      }
    }
    expect(observedDefendTick).toBe(true)
  })

  it('pass action(enemy 死)不卡:phase 正常推进到 postAction', () => {
    // 1 只 enemy hp=1,player attackStrength 巨大 → 一击秒;之后 enemy 行动变 pass(死敌 skip)
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 1 })],
      roles: [makeRole({ id: 0, attackStrength: 9999 })],
    })
    tickBattle(gs, emptyInput, bus) // → selectAction
    gs.battleState!.pendingActions.set(0, { type: 'attack', target: 0 })
    // 跑到战斗结束 — 不应死循环
    let guard = 300
    while (gs.mode === 'battle' && guard-- > 0) {
      const st = gs.battleState
      if (st?.phase === 'selectAction') st.pendingActions.set(0, { type: 'attack', target: 0 })
      tickBattle(gs, emptyInput, bus)
      bus.drain()
    }
    expect(gs.mode).toBe('explore') // won → finalize,没卡死
  })
})
