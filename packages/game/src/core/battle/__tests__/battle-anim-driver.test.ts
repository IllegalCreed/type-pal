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
import {
  applyAnimFrame,
  resetFightersAfterAction,
  startBattleAnim,
  stepBattleAnimRender,
} from '../battle-anim-driver.js'
import type { BattleAnimFrame, BattleEnemy, BattlePlayer, BattleState } from '../battle-state.js'

function mkPlayer(roleId: number, opts: Partial<BattlePlayer> = {}): BattlePlayer {
  return {
    roleId,
    prevHp: 200,
    prevMp: 30,
    defending: false,
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
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
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
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
    menuState: 'main',
    selectedAction: 0,
    miscMenuCursor: 0,
    miscSubMenuCursor: 0,
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

  it('player spriteNumOverride 可按帧切换或清除', () => {
    const state = mkState([mkPlayer(0, { spriteNumOverride: 1 })], [mkEnemy()])
    state.battleAnim = { frames: [], idx: 0, frameElapsedMs: 0 }
    const bus = createCommandBus()

    applyAnimFrame(
      state,
      {
        durationMs: 40,
        fighters: [{ side: 'player', idx: 0, spriteNumOverride: 295 }],
      },
      bus,
    )
    expect(state.players[0]!.spriteNumOverride).toBe(295)

    applyAnimFrame(
      state,
      {
        durationMs: 40,
        fighters: [{ side: 'player', idx: 0, spriteNumOverride: null }],
      },
      bus,
    )
    expect(state.players[0]!.spriteNumOverride).toBeUndefined()
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

  it('W4 keepEffect 帧 → overlays 烙进 persistentBgBlits(fight.c:2757-2762)', () => {
    const state = mkState([mkPlayer(0)], [mkEnemy()])
    state.battleAnim = { frames: [], idx: 0, frameElapsedMs: 0 }
    const bus = createCommandBus()
    // 非 keepEffect 帧 → 不烙
    applyAnimFrame(
      state,
      { durationMs: 40, overlays: [{ kind: 'magic', spriteChunk: 7, frameIdx: 3, x: 160, y: 80 }] },
      bus,
    )
    expect(state.persistentBgBlits ?? []).toHaveLength(0)
    // keepEffect 帧 → overlays 追加到 persistentBgBlits
    applyAnimFrame(
      state,
      {
        durationMs: 40,
        keepEffect: true,
        overlays: [{ kind: 'magic', spriteChunk: 7, frameIdx: 5, x: 160, y: 80 }],
      },
      bus,
    )
    expect(state.persistentBgBlits).toEqual([{ spriteChunk: 7, frameIdx: 5, x: 160, y: 80 }])
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

  // M6 帧同步 SFX:frame.sound>0 → emit playSound;0/缺 → 不 emit。
  it('frame.sound → emit playSound(0/缺不 emit)', () => {
    const state = mkState([mkPlayer(0)], [mkEnemy()])
    state.battleAnim = { frames: [], idx: 0, frameElapsedMs: 0 }
    const bus = createCommandBus()
    applyAnimFrame(state, { durationMs: 40, sound: 90 }, bus)
    const drained = bus.drain()
    expect(drained).toHaveLength(1)
    expect(drained[0]!.cmd).toEqual({ op: 'playSound', soundId: 90 })
    // sound=0 / 无 sound → 不 emit
    applyAnimFrame(state, { durationMs: 40, sound: 0 }, bus)
    applyAnimFrame(state, { durationMs: 40 }, bus)
    expect(bus.drain()).toHaveLength(0)
  })

  it('frame.battleMessage → emit showBattleMessage', () => {
    const state = mkState([mkPlayer(0)], [mkEnemy()])
    state.battleAnim = { frames: [], idx: 0, frameElapsedMs: 0 }
    const bus = createCommandBus()
    applyAnimFrame(
      state,
      {
        durationMs: 40,
        battleMessage: { text: '逃跑失败', durationMs: 320 },
      },
      bus,
    )
    expect(bus.drain()[0]!.cmd).toEqual({
      op: 'showBattleMessage',
      text: '逃跑失败',
      durationMs: 320,
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

describe('stepBattleAnimRender — present wall-clock 视觉帧细分(修"施法慢"拍频)', () => {
  // 50ms/帧 = speed=0 普通仙术(45/104 法术),40ms 逻辑 tick 下抖成拍频的最坏例。
  function mk50msMagicFrames(): BattleAnimFrame[] {
    return [0, 1, 2, 3, 4].map((k) => ({
      durationMs: 50,
      overlays: [{ kind: 'magic', spriteChunk: 7, frameIdx: k, x: 160, y: 80 }],
    }))
  }
  function mkAnimState(
    frames: BattleAnimFrame[],
    over: Partial<BattleState['battleAnim'] & object> = {},
  ): BattleState {
    const state = mkState([mkPlayer(0)], [mkEnemy()])
    state.battleAnim = { frames, idx: 0, frameElapsedMs: 0, ...over }
    return state
  }

  it('按真实时间推进 renderIdx(50ms 帧:t0→0, +50→1, +130→2),与逻辑 idx 解耦', () => {
    const state = mkAnimState(mk50msMagicFrames())
    const a = state.battleAnim!
    stepBattleAnimRender(state, 1000) // 惰性锚点 = 1000(idx=0,已播 0)
    expect(a.renderIdx).toBe(0)
    expect(a.overlays?.[0]!.frameIdx).toBe(0)
    stepBattleAnimRender(state, 1050) // elapsed 50 → frame1
    expect(a.renderIdx).toBe(1)
    expect(a.overlays?.[0]!.frameIdx).toBe(1)
    stepBattleAnimRender(state, 1130) // elapsed 130 → frame2([100,150))
    expect(a.renderIdx).toBe(2)
    expect(a.overlays?.[0]!.frameIdx).toBe(2)
  })

  it('renderIdx 不回退、不落后逻辑 idx(present 比 tick 细但绝不慢)', () => {
    const state = mkAnimState(mk50msMagicFrames())
    const a = state.battleAnim!
    stepBattleAnimRender(state, 1000)
    stepBattleAnimRender(state, 1130) // → 2
    expect(a.renderIdx).toBe(2)
    // wall-clock 回退(不该发生,但鲁棒)→ 不回退
    stepBattleAnimRender(state, 1010)
    expect(a.renderIdx).toBe(2)
    // 逻辑 idx 跳到 4(carryover 多 tick)→ renderIdx 至少跟到 4
    a.idx = 4
    stepBattleAnimRender(state, 1140)
    expect(a.renderIdx).toBe(4)
  })

  it('惰性锚点对齐逻辑进度:present 中途接管(idx=2,frameElapsed=20)→ renderIdx 从 2 起', () => {
    const state = mkAnimState(mk50msMagicFrames(), { idx: 2, frameElapsedMs: 20 })
    const a = state.battleAnim!
    stepBattleAnimRender(state, 5000) // 锚点 = 5000 − (50+50+20)=4880
    expect(a.renderIdx).toBe(2)
    stepBattleAnimRender(state, 5050) // elapsed(from anchor)=170 → frame3([150,200))
    expect(a.renderIdx).toBe(3)
  })

  it('末帧前停住(完成判定归逻辑 advanceBattleAnimFrames,不靠 renderIdx 越界)', () => {
    const state = mkAnimState(mk50msMagicFrames())
    const a = state.battleAnim!
    stepBattleAnimRender(state, 1000)
    stepBattleAnimRender(state, 99999) // 远超总时长
    expect(a.renderIdx).toBe(a.frames.length - 1) // 钳在末帧,不越界
  })

  it('召唤 loop 帧(summon.loop)早退 → 交 stepSummonLoopRender,renderIdx 保持 undefined', () => {
    // 真实流程:applyAnimFrame(logic tick)已把 battleAnim.summon 设为当前帧的 summon(present 前)。
    const loopSummon = {
      spriteKey: 'g',
      frame: 0,
      pos: { x: 0, y: 0 },
      bgColorShift: 1,
      loop: { count: 5, frameTimeMs: 50 },
    }
    const state = mkAnimState([{ durationMs: 250, summon: loopSummon }], {
      summon: { ...loopSummon },
    })
    const a = state.battleAnim!
    stepBattleAnimRender(state, 1000)
    stepBattleAnimRender(state, 1200)
    expect(a.renderIdx).toBeUndefined() // loop 不被本函数细分
  })

  it('召唤 fade 帧(summon.fadeStep)早退 → 交 applySummonFade', () => {
    const fadeSummon = {
      spriteKey: 'g',
      frame: 0,
      pos: { x: 0, y: 0 },
      bgColorShift: 1,
      fadeStep: 0,
      fadeDir: 'in' as const,
    }
    const state = mkAnimState([{ durationMs: 16, summon: fadeSummon }], {
      summon: { ...fadeSummon },
    })
    const a = state.battleAnim!
    stepBattleAnimRender(state, 1000)
    expect(a.renderIdx).toBeUndefined()
  })

  it('召唤神攻击的 OffMagic 帧(summon 在场但无 loop/fadeStep)照常细分,召唤神定格 lastFrame', () => {
    const god = { spriteKey: 'god', frame: 9, pos: { x: 240, y: 165 }, bgColorShift: 2 }
    const frames: BattleAnimFrame[] = [0, 1, 2].map((k) => ({
      durationMs: 50,
      summon: { ...god },
      overlays: [{ kind: 'magic', spriteChunk: 7, frameIdx: k, x: 100, y: 80 }],
    }))
    const state = mkAnimState(frames, { summon: { ...god } })
    const a = state.battleAnim!
    stepBattleAnimRender(state, 1000)
    stepBattleAnimRender(state, 1100) // elapsed 100 → frame2
    expect(a.renderIdx).toBe(2)
    expect(a.overlays?.[0]!.frameIdx).toBe(2) // 特效平滑推进
    expect(a.summon?.frame).toBe(9) // 召唤神仍定格 lastFrame(只平滑特效,不动神)
  })

  it('视觉-only:细分只刷 fighters/overlay,不碰逻辑副作用(无 bus 参数即结构性保证)', () => {
    const state = mkAnimState([
      {
        durationMs: 50,
        fighters: [{ side: 'enemy', idx: 0, pos: { x: 5, y: 6 } }],
        overlays: [{ kind: 'magic', spriteChunk: 7, frameIdx: 0, x: 1, y: 1 }],
      },
      {
        durationMs: 50,
        fighters: [{ side: 'enemy', idx: 0, pos: { x: 9, y: 9 } }],
        overlays: [{ kind: 'magic', spriteChunk: 7, frameIdx: 1, x: 2, y: 2 }],
      },
    ])
    const a = state.battleAnim!
    stepBattleAnimRender(state, 1000)
    stepBattleAnimRender(state, 1060) // → frame1
    expect(state.enemies[0]!.pos).toEqual({ x: 9, y: 9 }) // fighter 视觉已刷
    expect(a.overlays?.[0]!.frameIdx).toBe(1)
  })

  it('无 battleAnim → 纯 no-op', () => {
    const state = mkState([mkPlayer(0)], [mkEnemy()])
    expect(() => stepBattleAnimRender(state, 1000)).not.toThrow()
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
    const sleepState = mkState(
      [
        mkPlayer(0, {
          currentFrame: 0,
          status: { sleep: 3, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
        }),
      ],
      [],
    )
    resetFightersAfterAction(sleepState, mkRoles({ hp: 200, maxHP: 200 }))
    expect(sleepState.players[0]!.currentFrame).toBe(1)

    const puppetState = mkState(
      [
        mkPlayer(0, {
          currentFrame: 4,
          status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0, puppet: 2 },
        }),
      ],
      [],
    )
    resetFightersAfterAction(puppetState, mkRoles({ hp: 0, maxHP: 200 }))
    expect(puppetState.players[0]!.currentFrame).toBe(0)
  })
})
