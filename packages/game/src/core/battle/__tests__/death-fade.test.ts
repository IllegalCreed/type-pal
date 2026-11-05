/** Death detection and fade ownership through the real battle host.
 * The completed action advances its queue before fading; the fade holds later work.
 * Render calls refine visual steps, while logic alone releases the hold.
 */
import type { Command, Enemy, InputSnapshot, PlayerRole } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { makeEnemyRecord, makeRoleRecord } from '../../../__tests__/battle-records.js'
import type { BusEntry, CommandBus } from '../../command-bus.js'
import type { GameState } from '../../game-state.js'
import { battleInput, startTestBattle } from '../battle-start.test-fixtures.js'
import { stepDeathFadeRender, tickBattle } from '../battle-system.js'

function makeRole(options: Partial<PlayerRole> = {}): PlayerRole {
  return makeRoleRecord(0, {
    hp: 200,
    maxHP: 200,
    mp: 30,
    maxMP: 30,
    attackStrength: 100,
    magicStrength: 0,
    defense: 50,
    dexterity: 100,
    ...options,
  })
}
function makeEnemy(options: Partial<Enemy> = {}): Enemy {
  return makeEnemyRecord({
    idleFrames: 1,
    idleAnimSpeed: 1,
    deathSound: 7,
    health: 100,
    exp: 50,
    cash: 30,
    attackStrength: 10,
    magicStrength: 0,
    defense: 10,
    ...options,
  })
}
function startFadeBattle(
  options: { enemies?: Enemy[]; roles?: PlayerRole[]; commands?: Command[] } = {},
) {
  return {
    ...startTestBattle({
      roles: options.roles ?? [makeRole()],
      enemies: options.enemies ?? [makeEnemy()],
      commands: options.commands,
    }),
    emptyInput: battleInput(),
  }
}

describe('死亡淡出 — checkEnemyDeaths + battleFade hold', () => {
  it('a killing blow starts one rewarded fade and holds the next action for exactly 29 logic ticks', () => {
    const { gs, bus, emptyInput } = startFadeBattle({
      enemies: [makeEnemy({ health: 1 })],
      roles: [makeRole({ attackStrength: 9999 })],
    })
    tickBattle(gs, emptyInput, bus)
    const state = gs.battleState!
    state.pendingActions.set(0, { type: 'attack', target: 0 })
    tickBattle(gs, emptyInput, bus)
    expect(state.actionQueue[0]).toMatchObject({ isEnemy: false, idx: 0 })
    const drained: BusEntry[] = []
    for (let limit = 0; !state.battleFade && limit < 80; limit++) {
      tickBattle(gs, emptyInput, bus)
      drained.push(...bus.drain())
    }
    expect(state.battleFade).toEqual({ elapsedMs: 0 })
    expect(state.expGained).toBe(50)
    expect(state.cashGained).toBe(30)
    expect(state.enemies[0]!.defeated).toBe(true)
    expect(state.enemies[0]!.deathFadeStep).toBe(0)
    expect(drained.map(({ cmd }) => cmd).filter((cmd) => cmd.op === 'playEnemyDeath')).toEqual([
      { op: 'playEnemyDeath', enemyIdx: 0 },
    ])
    // The completed attack has already advanced the queue. Fade only holds it.
    const index = state.currentActionIndex
    expect(index).toBe(1)
    let ticks = 0
    let previous = 0
    while (state.battleFade && ticks < 100) {
      tickBattle(gs, emptyInput, bus)
      ticks++
      const step = state.enemies[0]!.deathFadeStep!
      expect(step).toBeGreaterThanOrEqual(previous)
      expect(state.currentActionIndex).toBe(index)
      previous = step
    }
    // PAL_BattleFadeScene: 12*6 steps at 16 ms; ceil(1152 / 40) = 29.
    expect(ticks).toBe(29)
    expect(state.battleFade).toBeUndefined()
    expect(state.enemies[0]!.deathFadeStep).toBe(72)
    expect(state.expGained).toBe(50)
    expect(state.cashGained).toBe(30)
    expect(bus.drain().filter(({ cmd }) => cmd.op === 'playEnemyDeath')).toEqual([])
  })

  it('无死敌的 defend action 不开 battleFade,即时推进', () => {
    const { gs, bus, emptyInput } = startFadeBattle() // A living enemy remains.
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
    const { gs, bus, emptyInput } = startFadeBattle({
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
    const { gs, bus, emptyInput } = startFadeBattle({
      enemies: [makeEnemy({ id: 100, health: 100 })],
      commands: [{ op: 'end' }, { op: 'raw', opcode: 0x21, operands: [0, 100, 0] }, { op: 'end' }],
    })
    tickBattle(gs, emptyInput, bus)
    const s = gs.battleState!
    expect(s.enemies[0]!.e.health).toBe(100)
    s.enemies[0]!.poisons = [{ poisonId: 551, scriptEntry: 1 }]
    s.phase = 'postAction'
    s.phaseStallTicks = 0
    tickBattle(gs, emptyInput, bus) // tickPostAction → checkEnemyDeaths 开淡出
    expect(s.enemies[0]!.e.health).toBe(0)
    expect(s.battleFade, '毒杀也开淡出 hold(非瞬隐)').toBeDefined()
    expect(s.enemies[0]!.defeated, '毒杀后也清为空槽').toBe(true)
    expect(s.expGained).toBe(50)
    expect(s.cashGained).toBe(30)
    expect(s.enemies[0]!.deathFadeStep, '毒杀敌 deathFadeStep 从 0 开始').toBe(0)
  })
})

describe('死亡淡出 — stepDeathFadeRender 渲染细分(wall-clock 62.5fps 平滑)', () => {
  // present 每 rAF 调 stepDeathFadeRender(state, performance.now()),按 wall-clock 把 deathFadeStep
  //   推到比 40ms 逻辑 tick 更细的值(对齐 sdlpal PAL_BattleFadeScene 16ms/步 = 62.5fps)。
  //   逻辑 tickBattleFade 仍按 BATTLE_DT 推进(确定性 + headless 兜底),用 max 不回退 present 细值。
  function openFade(): {
    gs: GameState
    bus: CommandBus
    emptyInput: InputSnapshot
    s: NonNullable<GameState['battleState']>
  } {
    const { gs, bus, emptyInput } = startFadeBattle({
      enemies: [makeEnemy({ id: 100, health: 100 })],
    })
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
