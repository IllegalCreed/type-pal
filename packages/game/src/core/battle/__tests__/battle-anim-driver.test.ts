/**
 * battle-anim-driver.test.ts —— D17a 时间线驱动 + fighter 复位(数据级断言)。
 *
 * 覆盖:
 *  - applyAnimFrame:fighter pos/currentFrame/iColorShift mutate + overlay 落 battleAnim + damageNum emit
 *  - startBattleAnim:set battleAnim + 立即应用 frame[0]
 *  - resetFightersAfterAction:port PAL_BattleUpdateFighters(fight.c:940-1019)
 */

import type { PlayerRole, PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createCommandBus } from '../../command-bus.js'
import { createSeedableRng } from '../../rng.js'
import { applyAnimFrame, resetFightersAfterAction, startBattleAnim } from '../battle-anim-driver.js'
import type { BattleAnimFrame, BattleEnemy, BattlePlayer, BattleState } from '../battle-state.js'

function mkPlayer(roleId: number, opts: Partial<BattlePlayer> = {}): BattlePlayer {
  return {
    roleId,
    prevHp: 200,
    prevMp: 30,
    defending: false,
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false },
    pos: { x: 240, y: 170 },
    posOriginal: { x: 240, y: 170 },
    currentFrame: 0,
    iColorShift: 0,
    ...opts,
  }
}

function mkEnemy(opts: Partial<BattleEnemy> = {}): BattleEnemy {
  return {
    e: { health: 100, id: 50, idleFrames: 2, idleAnimSpeed: 1 } as BattleEnemy['e'],
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false },
    prevHp: 100,
    scriptOnTurnStart: 0,
    scriptOnBattleEnd: 0,
    scriptOnReady: 0,
    pos: { x: 160, y: 80 },
    posOriginal: { x: 160, y: 80 },
    currentFrame: 0,
    iColorShift: 0,
    ...opts,
  }
}

function mkState(players: BattlePlayer[], enemies: BattleEnemy[]): BattleState {
  return {
    players,
    enemies,
    field: {
      id: 0,
      screenWave: 0,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    },
    isBoss: false,
    phase: 'performAction',
    turn: 1,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'hidden',
    uiCursor: 0,
    expGained: 0,
    cashGained: 0,
    rng: createSeedableRng(1),
    phaseStallTicks: 0,
  }
}

function mkRoles(...roles: Array<Partial<PlayerRole>>): PlayerRoles {
  return {
    roles: roles.map(
      (r, i) =>
        ({
          id: i,
          hp: 200,
          maxHP: 200,
          ...r,
        }) as PlayerRole,
    ),
  }
}

describe('applyAnimFrame', () => {
  it('mutate fighter pos/currentFrame/iColorShift', () => {
    const state = mkState([mkPlayer(0)], [mkEnemy()])
    state.battleAnim = { frames: [], idx: 0, frameElapsedMs: 0 }
    const bus = createCommandBus()
    const frame: BattleAnimFrame = {
      durationMs: 40,
      fighters: [
        { side: 'player', idx: 0, currentFrame: 8, pos: { x: 224, y: 100 } },
        { side: 'enemy', idx: 0, iColorShift: 6 },
      ],
    }
    applyAnimFrame(state, frame, bus)
    expect(state.players[0]!.currentFrame).toBe(8)
    expect(state.players[0]!.pos).toEqual({ x: 224, y: 100 })
    expect(state.enemies[0]!.iColorShift).toBe(6)
    // enemy pos 未列入 delta → 不变
    expect(state.enemies[0]!.pos).toEqual({ x: 160, y: 80 })
  })

  it('overlay 落到 battleAnim.overlay;无 overlay → 清空', () => {
    const state = mkState([mkPlayer(0)], [mkEnemy()])
    state.battleAnim = {
      frames: [],
      idx: 0,
      frameElapsedMs: 0,
      overlay: { kind: 'effect', spriteChunk: 10, frameIdx: 1, x: 1, y: 2 },
    }
    const bus = createCommandBus()
    applyAnimFrame(state, { durationMs: 40 }, bus) // 无 overlay
    expect(state.battleAnim.overlay).toBeUndefined()
    applyAnimFrame(
      state,
      { durationMs: 40, overlay: { kind: 'effect', spriteChunk: 10, frameIdx: 3, x: 5, y: 6 } },
      bus,
    )
    expect(state.battleAnim.overlay).toEqual({
      kind: 'effect',
      spriteChunk: 10,
      frameIdx: 3,
      x: 5,
      y: 6,
    })
  })

  it('damageNum → emit showDamageNum', () => {
    const state = mkState([mkPlayer(0)], [mkEnemy()])
    state.battleAnim = { frames: [], idx: 0, frameElapsedMs: 0 }
    const bus = createCommandBus()
    applyAnimFrame(
      state,
      {
        durationMs: 40,
        damageNum: { target: { kind: 'enemy', idx: 0 }, value: 37, color: 'blue' },
      },
      bus,
    )
    const drained = bus.drain()
    expect(drained).toHaveLength(1)
    expect(drained[0]!.cmd).toEqual({
      op: 'showDamageNum',
      target: { kind: 'enemy', idx: 0 },
      value: 37,
      color: 'blue',
    })
  })
})

describe('startBattleAnim', () => {
  it('set battleAnim(idx=0)+ 立即应用 frame[0]', () => {
    const state = mkState([mkPlayer(0)], [mkEnemy()])
    const bus = createCommandBus()
    const frames: BattleAnimFrame[] = [
      {
        durationMs: 80,
        fighters: [{ side: 'player', idx: 0, currentFrame: 8, pos: { x: 224, y: 100 } }],
      },
      { durationMs: 40, fighters: [{ side: 'player', idx: 0, pos: { x: 214, y: 98 } }] },
    ]
    startBattleAnim(state, frames, bus)
    expect(state.battleAnim).toBeDefined()
    expect(state.battleAnim!.idx).toBe(0)
    expect(state.battleAnim!.frameElapsedMs).toBe(0)
    expect(state.players[0]!.currentFrame).toBe(8) // frame[0] 已应用
    expect(state.players[0]!.pos).toEqual({ x: 224, y: 100 })
  })

  it('空 frames → 不建 battleAnim', () => {
    const state = mkState([mkPlayer(0)], [mkEnemy()])
    startBattleAnim(state, [], createCommandBus())
    expect(state.battleAnim).toBeUndefined()
  })
})

describe('resetFightersAfterAction (fight.c:940-1019)', () => {
  it('player 非 defending:pos=posOriginal,iColorShift=0,currentFrame=0(站立)', () => {
    const state = mkState(
      [
        mkPlayer(0, {
          pos: { x: 1, y: 2 },
          posOriginal: { x: 240, y: 170 },
          currentFrame: 8,
          iColorShift: 6,
        }),
      ],
      [],
    )
    resetFightersAfterAction(state, mkRoles({ hp: 200, maxHP: 200 }))
    const p = state.players[0]!
    expect(p.pos).toEqual({ x: 240, y: 170 })
    expect(p.iColorShift).toBe(0)
    expect(p.currentFrame).toBe(0)
  })

  it('player hp=0 → currentFrame=2(死)', () => {
    const state = mkState([mkPlayer(0, { currentFrame: 4 })], [])
    resetFightersAfterAction(state, mkRoles({ hp: 0, maxHP: 200 }))
    expect(state.players[0]!.currentFrame).toBe(2)
  })

  it('player 濒死(hp < min(100,maxHP/5)) → currentFrame=1', () => {
    // maxHP=200 → min(100,40)=40;hp=30 < 40 → 濒死
    const state = mkState([mkPlayer(0)], [])
    resetFightersAfterAction(state, mkRoles({ hp: 30, maxHP: 200 }))
    expect(state.players[0]!.currentFrame).toBe(1)
  })

  it('player defending(且活)→ currentFrame=3 + pos 不复位(sdlpal fDefending 不还原 pos)', () => {
    const state = mkState(
      [mkPlayer(0, { defending: true, pos: { x: 99, y: 99 }, posOriginal: { x: 240, y: 170 } })],
      [],
    )
    resetFightersAfterAction(state, mkRoles({ hp: 200, maxHP: 200 }))
    const p = state.players[0]!
    expect(p.currentFrame).toBe(3)
    expect(p.pos).toEqual({ x: 99, y: 99 }) // defending → pos 不还原(fight.c:944)
  })

  it('enemy:pos=posOriginal,iColorShift=0,currentFrame=undefined(idle 时钟接管)', () => {
    const state = mkState(
      [],
      [
        mkEnemy({
          pos: { x: 1, y: 2 },
          posOriginal: { x: 160, y: 80 },
          currentFrame: 5,
          iColorShift: 6,
        }),
      ],
    )
    resetFightersAfterAction(state, mkRoles())
    const e = state.enemies[0]!
    expect(e.pos).toEqual({ x: 160, y: 80 })
    expect(e.iColorShift).toBe(0)
    // 复位回 undefined → draw idle 时钟轮播(置 0 会冻结,回归 D17c)。
    expect(e.currentFrame).toBeUndefined()
  })

  it('player 睡眠(sleep>0,活)→ currentFrame=1(睡倒);puppet 死后 → 0(站立)', () => {
    // fight.c:957-960 sleep→帧1;fight.c:965-972 hp0&&puppet→帧0
    const sleepState = mkState([mkPlayer(0, { currentFrame: 0, status: { sleep: 3, paralyzed: 0, confused: 0, haste: false, slow: false } })], [])
    resetFightersAfterAction(sleepState, mkRoles({ hp: 200, maxHP: 200 }))
    expect(sleepState.players[0]!.currentFrame).toBe(1)

    const puppetState = mkState([mkPlayer(0, { currentFrame: 4, status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false, puppet: 2 } })], [])
    resetFightersAfterAction(puppetState, mkRoles({ hp: 0, maxHP: 200 }))
    expect(puppetState.players[0]!.currentFrame).toBe(0)
  })
})
