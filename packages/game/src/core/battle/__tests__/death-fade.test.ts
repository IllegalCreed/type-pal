/**
 * death-fade.test.ts —— D17 敌人死亡淡出(PAL_BattleFadeScene)数据级断言。
 *
 * 覆盖(对照 sdlpal fight.c:740-764 + battle.c:608-682):
 *  - checkEnemyDeaths(经 tickPerformAction 触发):health<=0 的敌立即累计奖励、标 defeated 空槽、
 *    deathFadeStep 0→开,battleFade 开启 + emit playEnemyDeath;无死敌不开。
 *  - 驱动暂停:battleFade active 时连续 N tick currentActionIndex 不变;step 随
 *    elapsedMs/16 递增;step>=72 后清 battleFade + currentActionIndex++。
 *  - 向后兼容:无死敌的 action(defend)不开 battleFade,即时推进(沿用 D17a)。
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
import {
  startBattle,
  stepDeathFadeRender,
  stepSummonLoopRender,
  tickBattle,
} from '../battle-system.js'

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
    deathSound: 7,
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
  const enemies = opts.enemies ?? [makeEnemy({ id: 100, health: 99999 })]
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

describe('D17 死亡淡出 — checkEnemyDeaths + battleFade hold', () => {
  it('物理攻击秒杀:敌 deathFadeStep 从 0 开,battleFade 开启 + emit playEnemyDeath', () => {
    const drained: { op: string; enemyIdx?: number }[] = []
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 1 })],
      roles: [makeRole({ id: 0, attackStrength: 9999 })],
    })
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    const state = gs.battleState!
    state.pendingActions.set(0, { type: 'attack', target: 0 })
    tickBattle(gs, emptyInput, bus) // → performAction

    // 推进直到 battleFade 开启(物理攻击时间线播完 → checkEnemyDeaths)
    let safety = 80
    while (
      !gs.battleState?.battleFade &&
      safety-- > 0 &&
      gs.battleState?.phase === 'performAction'
    ) {
      tickBattle(gs, emptyInput, bus)
      for (const { cmd } of bus.drain()) drained.push(cmd as { op: string; enemyIdx?: number })
    }
    const s = gs.battleState!
    expect(s.battleFade, 'battleFade 应开启').toBeDefined()
    expect(s.expGained, '死敌奖励应在 checkEnemyDeaths 即时累计,避免后续召唤复用槽位覆盖旧敌').toBe(
      50,
    )
    expect(s.cashGained).toBe(30)
    expect(s.enemies[0]!.defeated, '死亡确认后应等价原版 wObjectID=0 空槽').toBe(true)
    expect(s.enemies[0]!.deathFadeStep, '死敌 deathFadeStep 应已开始(>=0)').toBeGreaterThanOrEqual(
      0,
    )
    expect(s.enemies[0]!.deathFadeStep).toBeLessThanOrEqual(72)
    expect(
      drained.some((c) => c.op === 'playEnemyDeath' && c.enemyIdx === 0),
      '应 emit playEnemyDeath',
    ).toBe(true)
  })

  it('驱动暂停:battleFade active 期 currentActionIndex 不变;step 随 elapsedMs/16 递增', () => {
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 1 })],
      roles: [makeRole({ id: 0, attackStrength: 9999 })],
    })
    tickBattle(gs, emptyInput, bus)
    const st0 = gs.battleState!
    st0.pendingActions.set(0, { type: 'attack', target: 0 })
    tickBattle(gs, emptyInput, bus)

    // 进 battleFade
    let safety = 80
    while (
      !gs.battleState?.battleFade &&
      safety-- > 0 &&
      gs.battleState?.phase === 'performAction'
    ) {
      tickBattle(gs, emptyInput, bus)
      bus.drain()
    }
    const s = gs.battleState!
    expect(s.battleFade).toBeDefined()
    const idxAtFadeStart = s.currentActionIndex
    let prevStep = s.enemies[0]!.deathFadeStep ?? 0

    // 淡出期间:currentActionIndex 不变,step 单调不减
    let guard = 200
    let sawIncrease = false
    while (s.battleFade && guard-- > 0) {
      tickBattle(gs, emptyInput, bus)
      bus.drain()
      if (!s.battleFade) break
      expect(s.currentActionIndex, '淡出中不推进 action queue').toBe(idxAtFadeStart)
      const step = s.enemies[0]!.deathFadeStep ?? 0
      expect(step).toBeGreaterThanOrEqual(prevStep)
      if (step > prevStep) sawIncrease = true
      prevStep = step
    }
    expect(sawIncrease, 'deathFadeStep 应随 tick 递增过').toBe(true)
    // 淡完:battleFade 清空 + 死敌 step==72。currentActionIndex 在 action **完成时**已推进
    //   (淡出前),phase-agnostic hold 只暂停不再推进 → 仍 === idxAtFadeStart。
    expect(s.battleFade).toBeUndefined()
    expect(s.currentActionIndex).toBe(idxAtFadeStart)
    expect(s.enemies[0]!.deathFadeStep).toBe(72)
  })

  it('约 72 步(72×16=1152ms,40ms/tick → ~29 tick)淡完后才推进', () => {
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 1 })],
      roles: [makeRole({ id: 0, attackStrength: 9999 })],
    })
    tickBattle(gs, emptyInput, bus)
    gs.battleState!.pendingActions.set(0, { type: 'attack', target: 0 })
    tickBattle(gs, emptyInput, bus)
    let safety = 80
    while (
      !gs.battleState?.battleFade &&
      safety-- > 0 &&
      gs.battleState?.phase === 'performAction'
    ) {
      tickBattle(gs, emptyInput, bus)
      bus.drain()
    }
    const s = gs.battleState!
    expect(s.battleFade).toBeDefined()
    // 计淡出 tick 数:elapsedMs 从 0 起,每 tick +40;step=floor(elapsedMs/16)>=72 时止。
    // 72*16=1152ms,需 elapsedMs>=1152 → ceil(1152/40)=29 tick。
    let fadeTicks = 0
    let guard = 200
    while (s.battleFade && guard-- > 0) {
      tickBattle(gs, emptyInput, bus)
      bus.drain()
      fadeTicks++
    }
    expect(fadeTicks).toBeGreaterThanOrEqual(28)
    expect(fadeTicks).toBeLessThanOrEqual(31)
  })

  it('向后兼容:无死敌的 defend action 不开 battleFade,即时推进', () => {
    const { gs, bus, emptyInput } = bootstrap() // enemy health 99999 不死
    tickBattle(gs, emptyInput, bus)
    const state = gs.battleState!
    state.pendingActions.set(0, { type: 'defend', target: -1 })
    tickBattle(gs, emptyInput, bus)

    let guard = 30
    let observedDefend = false
    while (gs.battleState?.phase === 'performAction' && guard-- > 0) {
      const before = gs.battleState.currentActionIndex
      tickBattle(gs, emptyInput, bus)
      bus.drain()
      const st = gs.battleState
      if (!st) break
      if (st.players[0]!.defending && st.phase === 'performAction') {
        observedDefend = true
        expect(st.battleFade, 'defend 不应开 battleFade').toBeUndefined()
        expect(st.currentActionIndex).toBe(before + 1) // 即时推进
        break
      }
    }
    expect(observedDefend).toBe(true)
  })

  it('整场战斗(秒杀)不卡死:淡出后转 postAction → won → explore', () => {
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 1 })],
      roles: [makeRole({ id: 0, attackStrength: 9999 })],
    })
    tickBattle(gs, emptyInput, bus)
    gs.battleState!.pendingActions.set(0, { type: 'attack', target: 0 })
    let guard = 400
    while (gs.mode === 'battle' && guard-- > 0) {
      const st = gs.battleState
      if (st?.phase === 'selectAction') st.pendingActions.set(0, { type: 'attack', target: 0 })
      tickBattle(gs, emptyInput, bus)
      bus.drain()
    }
    expect(gs.mode, 'won → finalize 回 explore').toBe('explore')
    // exp/cash 仍入账(淡出不影响 postAction 累计)
    expect(gs.Exp.rgPrimaryExp[0]?.wExp ?? 0).toBeGreaterThan(0)
    expect(gs.dwCash).toBeGreaterThan(0)
  })

  it('毒 / postAction 死亡也触发淡出(sdlpal fight.c:1664 毒后 PostActionCheck→FadeScene)', () => {
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 100 })],
    })
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    const s = gs.battleState!
    // 模拟毒 tick 在 postAction 把敌人扣到 0(prevHp 仍 >0 = 新死,deathFadeStep 未开)
    s.enemies[0]!.e.health = 0
    s.enemies[0]!.prevHp = 100
    s.enemies[0]!.deathFadeStep = undefined
    s.phase = 'postAction'
    s.phaseStallTicks = 0
    tickBattle(gs, emptyInput, bus) // tickPostAction → checkEnemyDeaths 开淡出
    expect(s.battleFade, '毒杀也开淡出 hold(非瞬隐)').toBeDefined()
    expect(s.enemies[0]!.defeated, '毒杀后也清为空槽').toBe(true)
    expect(s.expGained).toBe(50)
    expect(s.cashGained).toBe(30)
    expect(s.enemies[0]!.deathFadeStep, '毒杀敌 deathFadeStep 从 0 开始').toBe(0)
  })
})

describe('D17 死亡淡出 — stepDeathFadeRender 渲染细分(wall-clock 62.5fps 平滑)', () => {
  // present 每 rAF 调 stepDeathFadeRender(state, performance.now()),按 wall-clock 把 deathFadeStep
  //   推到比 40ms 逻辑 tick 更细的值(对齐 sdlpal PAL_BattleFadeScene 16ms/步 = 62.5fps)。
  //   逻辑 tickBattleFade 仍按 BATTLE_DT 推进(确定性 + headless 兜底),用 max 不回退 present 细值。
  function openFade(): {
    gs: GameState
    bus: CommandBus
    emptyInput: InputSnapshot
    s: NonNullable<GameState['battleState']>
  } {
    const { gs, bus, emptyInput } = bootstrap({ enemies: [makeEnemy({ id: 100, health: 100 })] })
    tickBattle(gs, emptyInput, bus) // preBattle → selectAction
    const s = gs.battleState!
    s.enemies[0]!.e.health = 0
    s.enemies[0]!.prevHp = 100
    s.enemies[0]!.deathFadeStep = undefined
    s.phase = 'postAction'
    s.phaseStallTicks = 0
    tickBattle(gs, emptyInput, bus) // checkEnemyDeaths 开淡出(deathFadeStep=0, battleFade.elapsedMs=0)
    return { gs, bus, emptyInput, s }
  }

  it('startMs 惰性初始化:逻辑层不设(不碰 wall-clock),present 首帧设', () => {
    const { s } = openFade()
    expect(s.battleFade).toBeDefined()
    expect(s.battleFade!.startMs, '逻辑 checkEnemyDeaths 不碰 performance.now').toBeUndefined()
    stepDeathFadeRender(s, 1000)
    expect(s.battleFade!.startMs).toBe(1000)
    expect(s.enemies[0]!.deathFadeStep, '(1000-1000)/16 = 0').toBe(0)
  })

  it('wall-clock 比逻辑 tick 更细:+80ms → step 5(逻辑单 40ms tick 只到 2)', () => {
    const { s } = openFade()
    stepDeathFadeRender(s, 1000)
    stepDeathFadeRender(s, 1080)
    expect(s.enemies[0]!.deathFadeStep, 'floor(80/16)=5').toBe(5)
  })

  it('max 不回退:已 step5 再喂更小 nowMs 不降级(防闪烁)', () => {
    const { s } = openFade()
    stepDeathFadeRender(s, 1000)
    stepDeathFadeRender(s, 1080) // step 5
    stepDeathFadeRender(s, 1032) // floor(32/16)=2 < 5
    expect(s.enemies[0]!.deathFadeStep).toBe(5)
  })

  it('逻辑 tickBattleFade 不回退 present 已推进的细值(max)', () => {
    const { gs, bus, emptyInput, s } = openFade()
    stepDeathFadeRender(s, 1000)
    stepDeathFadeRender(s, 1000 + 16 * 10) // present 推到 step 10
    expect(s.enemies[0]!.deathFadeStep).toBe(10)
    tickBattle(gs, emptyInput, bus) // 一个逻辑 tick:elapsedMs 0→40 → floor(40/16)=2,max 保留 10
    expect(s.enemies[0]!.deathFadeStep, '逻辑粗值 2 不得打回 present 细值 10').toBe(10)
  })

  it('cap 72:超长 nowMs 封顶 72(不越界)', () => {
    const { s } = openFade()
    stepDeathFadeRender(s, 1000)
    stepDeathFadeRender(s, 1000 + 99 * 16)
    expect(s.enemies[0]!.deathFadeStep).toBe(72)
  })

  it('无 battleFade → no-op(战斗非淡出期不误改)', () => {
    const { s } = openFade()
    s.battleFade = undefined
    s.enemies[0]!.deathFadeStep = 3
    stepDeathFadeRender(s, 9999)
    expect(s.enemies[0]!.deathFadeStep).toBe(3)
  })
})

// 召唤 loop wall-clock 渲染细分(stepSummonLoopRender)—— 修 user 2026-06-17 报"天剑刚完全变成剑的前几帧卡顿"。
//   召唤 loop 塌缩成单一时间线帧后,present 每 rAF 按真实时间精确推进 iSummonFrame,绕开 40ms 逻辑 tick 对
//   (speed+5)*10=50ms 召唤帧的拍频离散(40ms tick 下 frame0 停 80ms)。同 stepDeathFadeRender 模式。
describe('召唤 loop wall-clock 渲染细分(stepSummonLoopRender)', () => {
  const mkState = (loop: { count: number; frameTimeMs: number } | undefined) =>
    ({
      battleAnim: {
        frames: [],
        idx: 0,
        frameElapsedMs: 0,
        summon: {
          spriteKey: 'player-30',
          frame: 0,
          pos: { x: 240, y: 160 },
          bgColorShift: 0,
          ...(loop ? { loop } : {}),
        },
      },
    }) as unknown as Parameters<typeof stepSummonLoopRender>[0]

  it('loop 帧:startMs 惰性记 + frame=floor((now-start)/frameTimeMs)(wall-clock 精确 50ms/帧)', () => {
    const s = mkState({ count: 5, frameTimeMs: 50 })
    stepSummonLoopRender(s, 1000) // 首调:startMs=1000, frame=0
    expect(s.battleAnim!.summonLoopStartMs).toBe(1000)
    expect(s.battleAnim!.summon!.frame).toBe(0)
    stepSummonLoopRender(s, 1050) // 50/50=1
    expect(s.battleAnim!.summon!.frame).toBe(1)
    stepSummonLoopRender(s, 1175) // 175/50=3.5→3
    expect(s.battleAnim!.summon!.frame).toBe(3)
  })

  it('cap 在 count-1(末帧),不越界', () => {
    const s = mkState({ count: 5, frameTimeMs: 50 })
    stepSummonLoopRender(s, 1000)
    stepSummonLoopRender(s, 9999) // 远超 → cap count-1=4
    expect(s.battleAnim!.summon!.frame).toBe(4)
  })

  it('max 不回退:nowMs 倒退(rAF 抖动)不让 iSummonFrame 倒退', () => {
    const s = mkState({ count: 5, frameTimeMs: 50 })
    stepSummonLoopRender(s, 1000)
    stepSummonLoopRender(s, 1150) // frame=3
    expect(s.battleAnim!.summon!.frame).toBe(3)
    stepSummonLoopRender(s, 1050) // 倒退 → 保持 3
    expect(s.battleAnim!.summon!.frame).toBe(3)
  })

  it('非 loop 帧(summon.loop 缺):清 summonLoopStartMs,不动 frame', () => {
    const s = mkState(undefined)
    s.battleAnim!.summonLoopStartMs = 1234
    s.battleAnim!.summon!.frame = 2
    stepSummonLoopRender(s, 5000)
    expect(s.battleAnim!.summonLoopStartMs).toBeUndefined()
    expect(s.battleAnim!.summon!.frame).toBe(2)
  })
})
