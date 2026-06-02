/**
 * anim-timeline.test.ts —— D17a 物理战斗动画时间线 builder(数据级断言)。
 *
 * 对照 sdlpal:
 *   buildPlayerAttackTimeline  ← fight.c:2008-2263
 *   buildEnemyPhysicalTimeline ← fight.c:4910-5149
 */

import { describe, expect, it } from 'vitest'
import {
  BATTLE_FRAME_TIME,
  buildCoopMagicTimeline,
  buildEnemyMagicCastIntro,
  buildEnemyMagicTimeline,
  buildEnemyPhysicalTimeline,
  buildPlayerAttackTimeline,
  buildPlayerDefMagicTimeline,
  buildPlayerOffMagicTimeline,
  buildPostMagicTimeline,
  buildPreMagicTimeline,
  buildSummonBrightenTimeline,
  buildSummonGodSequence,
  EFFECT_SPRITE_CHUNK,
  SUMMON_FADE_STEPS,
} from '../anim-timeline.js'

const D = BATTLE_FRAME_TIME // 40ms

describe('召唤动画 builders (fight.c:3072-3187 / 3120-3128)', () => {
  it('buildSummonBrightenTimeline:10 帧,各帧全员 iColorShift=i(1..10)', () => {
    const f = buildSummonBrightenTimeline(3)
    expect(f.length).toBe(10)
    expect(f[0]!.fighters).toEqual([
      { side: 'player', idx: 0, iColorShift: 1 },
      { side: 'player', idx: 1, iColorShift: 1 },
      { side: 'player', idx: 2, iColorShift: 1 },
    ])
    expect(f[9]!.fighters!.every((d) => d.iColorShift === 10)).toBe(true)
  })

  it('buildSummonGodSequence:fadeIn 72 + loop(totalFrames-1) + offMagic + fadeOut 72', () => {
    const off = [
      { durationMs: 100, overlays: [] },
      { durationMs: 100, overlays: [] },
    ]
    const seq = buildSummonGodSequence({
      spriteKey: 'player-12', pos: { x: 240, y: 165 }, bgColorShift: 5, totalFrames: 4, frameTimeMs: 100, offMagicFrames: off,
    })
    expect(seq.length).toBe(SUMMON_FADE_STEPS + 3 + 2 + SUMMON_FADE_STEPS) // 72+3+2+72
    // fadeIn:召唤神 frame0,fadeStep 0..71,dir in,背景染色 5
    expect(seq[0]!.summon).toEqual({ spriteKey: 'player-12', frame: 0, pos: { x: 240, y: 165 }, bgColorShift: 5, fadeStep: 0, fadeDir: 'in' })
    expect(seq[71]!.summon!.fadeStep).toBe(71)
    // loop:召唤神 frame 0..2,无 fadeStep,durationMs 100
    expect(seq[72]!.summon).toEqual({ spriteKey: 'player-12', frame: 0, pos: { x: 240, y: 165 }, bgColorShift: 5 })
    expect(seq[72]!.durationMs).toBe(100)
    expect(seq[74]!.summon!.frame).toBe(2)
    // offMagic:召唤神定格 last frame 3,overlays 保留
    expect(seq[75]!.summon!.frame).toBe(3)
    expect(seq[75]!.overlays).toEqual([])
    // fadeOut:dir out,召唤神 last frame 3
    const last = seq[seq.length - 1]!
    expect(last.summon!.fadeDir).toBe('out')
    expect(last.summon!.frame).toBe(3)
  })
})

describe('buildCoopMagicTimeline (协力合击,fight.c:3856-4107 CLASSIC)', () => {
  // 3 人队全 healthy,casterIdx=0;原位 caster(240,170)/p1(280,150)/p2(300,130)。
  // magic: effect chunk 5,type normal,target enemy idx0 pos(160,80);n=8。
  const coopMagic = {
    effect: 5, type: 'normal' as const, speed: 5, fireDelay: 2, effectTimes: 1, shake: 0, xOffset: 0, yOffset: 0,
  }
  const frames = buildCoopMagicTimeline({
    casterIdx: 0,
    partySize: 3,
    contributorIdxs: [0, 1, 2],
    originalPositions: [{ x: 240, y: 170 }, { x: 280, y: 150 }, { x: 300, y: 130 }],
    magic: coopMagic,
    n: 8,
    targetIdx: 0,
    targetEnemyPos: { x: 160, y: 80 },
    hurtEnemies: [{ idx: 0, pos: { x: 160, y: 80 } }],
  })

  it('Phase1 滑入:前 6 帧把 3 贡献者插值移向 COOP_POS {208,157}/{234,170}/{260,183}', () => {
    // 第 6 帧(index 5,i=6):caster→COOP_POS[0]=(208,157),p1→[1]=(234,170),p2→[2]=(260,183)。
    const f6 = frames[5]!
    expect(f6.durationMs).toBe(D) // Delay(1)
    const caster = f6.fighters!.find(d => d.idx === 0 && d.side === 'player')!
    expect(caster.pos).toEqual({ x: 208, y: 157 })
    const p1 = f6.fighters!.find(d => d.idx === 1)!
    expect(p1.pos).toEqual({ x: 234, y: 170 })
    const p2 = f6.fighters!.find(d => d.idx === 2)!
    expect(p2.pos).toEqual({ x: 260, y: 183 })
  })

  it('Phase2 贡献者(非发起者)逐个摆施法帧5,Delay(3)', () => {
    // Phase1 占 6 帧;接着 2 个非发起贡献者(slot 2→1 倒序)各一帧 frame5。
    const f7 = frames[6]!
    expect(f7.durationMs).toBe(3 * D)
    expect(f7.fighters).toEqual([{ side: 'player', idx: 2, currentFrame: 5 }])
    const f8 = frames[7]!
    expect(f8.fighters).toEqual([{ side: 'player', idx: 1, currentFrame: 5 }])
  })

  it('Phase3/4 发起者闪白(colorShift6,frame5,Delay5)→ frame6 复色(Delay3)', () => {
    const f9 = frames[8]!
    expect(f9.durationMs).toBe(5 * D)
    expect(f9.fighters).toEqual([{ side: 'player', idx: 0, iColorShift: 6, currentFrame: 5 }])
    const f10 = frames[9]!
    expect(f10.durationMs).toBe(3 * D)
    expect(f10.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 6, iColorShift: 0 }])
  })

  it('Phase5 OffMagic:含 magic chunk overlay(法术效果,casterIdx=-1 不切发起者帧6)', () => {
    // OffMagic 帧带 overlays kind=magic spriteChunk=5。l=(8-2)*1+8+0=14 帧。
    const offStart = 10
    const offFrame = frames[offStart]!
    expect(offFrame.overlays?.[0]?.kind).toBe('magic')
    expect(offFrame.overlays?.[0]?.spriteChunk).toBe(5)
    // casterIdx=-1 → 无 i==fireDelay 的 caster frame6 切换(fight.c:2677-2680 gated)
    const fireDelayFrame = frames[offStart + 2]! // i==fireDelay=2
    expect(fireDelayFrame.fighters ?? []).toEqual([])
  })

  it('Phase7 滑回:末 6 帧贡献者回原位 frame0,最后一帧 caster 回 (240,170)', () => {
    const last = frames[frames.length - 1]!
    expect(last.durationMs).toBe(D)
    const caster = last.fighters!.find(d => d.idx === 0)!
    expect(caster.currentFrame).toBe(0)
    expect(caster.pos).toEqual({ x: 240, y: 170 }) // i=6 → 全回原位
  })
})

describe('buildPlayerAttackTimeline (fight.c:2008-2263)', () => {
  // 攻击者 player idx0 站立 (240,170);目标 enemy idx0 站立 (160,80);enemy_h=0;
  // effectFrameBase = rgwBattleEffectIndex[sprite][1]*3。此处直接传 base=6(sprite=1 → list[3]=1 → *3=3 等
  // 由调用方算;builder 只用传入的 base)。damage=37。
  const frames = buildPlayerAttackTimeline({
    attackerPos: { x: 240, y: 170 },
    attackerIdx: 0,
    targetEnemyPos: { x: 160, y: 80 },
    targetIdx: 0,
    targetEnemyHeight: 0,
    effectFrameBase: 6,
    damage: 37,
  })

  it('总帧数 = 8(frame0 冲刺 + frame1 推进 + 3 特效 + 3 抖动)', () => {
    expect(frames).toHaveLength(8)
  })

  it('frame0:currentFrame=8,冲到敌前 (enemy_x+64, enemy_y+20)=(224,100),Delay(2)', () => {
    const f = frames[0]!
    expect(f.durationMs).toBe(2 * D)
    expect(f.fighters).toEqual([
      { side: 'player', idx: 0, currentFrame: 8, pos: { x: 224, y: 100 } },
    ])
  })

  it('frame1:x-=10,y-=2 → (214,98),Delay(1)', () => {
    const f = frames[1]!
    expect(f.durationMs).toBe(1 * D)
    expect(f.fighters).toEqual([{ side: 'player', idx: 0, pos: { x: 214, y: 98 } }])
  })

  it('frame2(特效 i=0):currentFrame=9 + target.iColorShift=6 + damageNum + overlay chunk10 frame=base+0', () => {
    const f = frames[2]!
    expect(f.durationMs).toBe(1 * D)
    expect(f.fighters).toEqual([
      { side: 'player', idx: 0, currentFrame: 9 },
      { side: 'enemy', idx: 0, iColorShift: 6 },
    ])
    expect(f.overlay).toEqual({
      kind: 'effect',
      spriteChunk: EFFECT_SPRITE_CHUNK,
      frameIdx: 6, // base+0
      x: 160, // enemy_x
      y: 80 - 0 + 10, // enemy_y - enemy_h/3 + 10 = 90
    })
    expect(f.damageNum).toEqual({ target: { kind: 'enemy', idx: 0 }, value: 37, color: 'blue' })
  })

  it('frame3(特效 i=1):overlay frame=base+1 落点 x-=16/y+=16;attacker.pos += (2,1)', () => {
    const f = frames[3]!
    expect(f.overlay).toEqual({
      kind: 'effect',
      spriteChunk: EFFECT_SPRITE_CHUNK,
      frameIdx: 7,
      x: 160 - 16,
      y: 90 + 16,
    })
    // attacker.pos = frame1 pos (214,98) + (2,1) = (216,99)
    expect(f.fighters).toEqual([{ side: 'player', idx: 0, pos: { x: 216, y: 99 } }])
    expect(f.damageNum).toBeUndefined()
  })

  it('frame4(特效 i=2):overlay frame=base+2 落点 (128,122);无 fighter delta', () => {
    const f = frames[4]!
    expect(f.overlay).toEqual({
      kind: 'effect',
      spriteChunk: EFFECT_SPRITE_CHUNK,
      frameIdx: 8,
      x: 160 - 32,
      y: 90 + 32,
    })
    expect(f.fighters).toBeUndefined()
  })

  it('frame5..7:抖动 dist 8→-4→2 → target.pos.x 序列 152/156/154;首帧 iColorShift=0 复位', () => {
    // ex=160. i0: x-=8 → 152, dist=-4, y+=-4 → 76. i1: x-=-4 → 156, dist=2, y+=2 → 78.
    // i2: x-=2 → 154, dist=-1, y+=-1 → 77.
    const f5 = frames[5]!
    expect(f5.durationMs).toBe(1 * D)
    expect(f5.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 152, y: 76 }, iColorShift: 0 }])
    const f6 = frames[6]!
    expect(f6.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 156, y: 78 } }])
    const f7 = frames[7]!
    expect(f7.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 154, y: 77 } }])
  })

  it('effectFrameBase 透传:base=0 → overlay frameIdx 0/1/2', () => {
    const fr = buildPlayerAttackTimeline({
      attackerPos: { x: 240, y: 170 },
      attackerIdx: 0,
      targetEnemyPos: { x: 160, y: 80 },
      targetIdx: 0,
      targetEnemyHeight: 0,
      effectFrameBase: 0,
      damage: 1,
    })
    expect(fr[2]!.overlay!.frameIdx).toBe(0)
    expect(fr[3]!.overlay!.frameIdx).toBe(1)
    expect(fr[4]!.overlay!.frameIdx).toBe(2)
  })

  it('enemy_h>0:overlay 落点 y = enemy_y - enemy_h/3 + 10', () => {
    const fr = buildPlayerAttackTimeline({
      attackerPos: { x: 240, y: 170 },
      attackerIdx: 0,
      targetEnemyPos: { x: 160, y: 80 },
      targetIdx: 0,
      targetEnemyHeight: 60,
      effectFrameBase: 0,
      damage: 1,
    })
    // 80 - 60/3 + 10 = 80 - 20 + 10 = 70
    expect(fr[2]!.overlay!.y).toBe(70)
  })
})

describe('buildEnemyPhysicalTimeline (fight.c:4910-5149)', () => {
  // enemy idx0 站立 (160,80);target player idx0 站立 (240,170);damage=12;未死未濒死。
  // magicFrames=0, attackFrames=2, actWaitFrames=1, idleFrames=4。
  function build(
    opts: {
      magicFrames?: number
      attackFrames?: number
      actWaitFrames?: number
      idleFrames?: number
      targetDied?: boolean
      targetDying?: boolean
    } = {},
  ) {
    return buildEnemyPhysicalTimeline({
      enemyPos: { x: 160, y: 80 },
      enemyIdx: 0,
      targetPlayerPos: { x: 240, y: 170 },
      targetIdx: 0,
      enemy: {
        magicFrames: opts.magicFrames ?? 0,
        attackFrames: opts.attackFrames ?? 2,
        actWaitFrames: opts.actWaitFrames ?? 1,
        idleFrames: opts.idleFrames ?? 4,
      },
      damage: 12,
      targetDied: opts.targetDied ?? false,
      targetDying: opts.targetDying ?? false,
    })
  }

  it('前移帧数 = 3 - magicFrames(magicFrames=0 → 3 帧 pos.x-=2/y-=1)', () => {
    const frames = build()
    // frame0..2 = 前移(magicFrames=0 → 无 magic 帧);pos 从 (160,80) 每帧 -2/-1
    expect(frames[0]!.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 158, y: 79 } }])
    expect(frames[1]!.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 156, y: 78 } }])
    expect(frames[2]!.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 154, y: 77 } }])
    expect(frames[0]!.durationMs).toBe(1 * D)
  })

  it('magicFrames=2:前 2 帧 currentFrame=idleFrames+i,只 1 帧前移', () => {
    const frames = build({ magicFrames: 2, idleFrames: 4 })
    // magic 帧 0/1:currentFrame = 4+0 / 4+1,Delay(2)
    expect(frames[0]!.fighters).toEqual([{ side: 'enemy', idx: 0, currentFrame: 4 }])
    expect(frames[0]!.durationMs).toBe(2 * D)
    expect(frames[1]!.fighters).toEqual([{ side: 'enemy', idx: 0, currentFrame: 5 }])
    // 前移帧 = 3 - 2 = 1 帧
    expect(frames[2]!.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 158, y: 79 } }])
  })

  it('冲刺帧:pos = player.x-44 / player.y-16 = (196,154)(attackFrames 各帧)', () => {
    const frames = build({ attackFrames: 2, actWaitFrames: 1, magicFrames: 0, idleFrames: 4 })
    // frame0..2 前移;frame3 = actionSound Delay(1)(无 fighters);frame4..6 = 冲刺(attackFrames+1=3 帧)
    const chargeFrames = frames.filter((f) =>
      f.fighters?.some((d) => d.side === 'enemy' && d.pos?.x === 196 && d.pos?.y === 154),
    )
    expect(chargeFrames.length).toBe(3) // i=0..attackFrames=2 → 3 帧
    // currentFrame = idleFrames + magicFrames + i - 1 = 4 + 0 + i - 1
    expect(chargeFrames[0]!.fighters).toEqual([
      { side: 'enemy', idx: 0, currentFrame: 3, pos: { x: 196, y: 154 } },
    ])
    expect(chargeFrames[1]!.fighters).toEqual([
      { side: 'enemy', idx: 0, currentFrame: 4, pos: { x: 196, y: 154 } },
    ])
    expect(chargeFrames[2]!.fighters).toEqual([
      { side: 'enemy', idx: 0, currentFrame: 5, pos: { x: 196, y: 154 } },
    ])
    expect(chargeFrames[0]!.durationMs).toBe(1 * D) // actWaitFrames=1
  })

  it('命中帧:target.currentFrame=4 + iColorShift=6 + damageNum(blue, value=12)', () => {
    const frames = build()
    const hit = frames.find((f) =>
      f.fighters?.some((d) => d.side === 'player' && d.currentFrame === 4),
    )!
    expect(hit.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 4, iColorShift: 6 }])
    expect(hit.damageNum).toEqual({ target: { kind: 'player', idx: 0 }, value: 12, color: 'blue' })
  })

  it('命中后:iColorShift=0 + 击退 target.pos += (8,4)=(248,174)', () => {
    const frames = build()
    const knock = frames.find((f) =>
      f.fighters?.some((d) => d.side === 'player' && d.iColorShift === 0),
    )!
    expect(knock.fighters).toEqual([
      { side: 'player', idx: 0, iColorShift: 0, pos: { x: 248, y: 174 } },
    ])
  })

  it('死亡:target frameBak=2(濒死帧之后赋值)', () => {
    const frames = build({ targetDied: true })
    // 倒数第二帧 = target.currentFrame = frameBak;最后一帧 = Delay(4) 空帧
    const last2 = frames[frames.length - 2]!
    expect(last2.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 2 }])
  })

  it('濒死(非死):target frameBak=1', () => {
    const frames = build({ targetDying: true })
    const last2 = frames[frames.length - 2]!
    expect(last2.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 1 }])
  })

  it('未死未濒死:target frameBak=0(站立)', () => {
    const frames = build()
    const last2 = frames[frames.length - 2]!
    expect(last2.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 0 }])
  })

  it('复位帧:enemy.pos=posOriginal(160,80) + currentFrame=0', () => {
    const frames = build()
    const reset = frames.find((f) =>
      f.fighters?.some(
        (d) => d.side === 'enemy' && d.currentFrame === 0 && d.pos?.x === 160 && d.pos?.y === 80,
      ),
    )!
    expect(reset).toBeDefined()
  })

  it('最后一帧 = Delay(4) 空帧(actWaitFrames 收尾)', () => {
    const frames = build()
    const last = frames[frames.length - 1]!
    expect(last.durationMs).toBe(4 * D)
    expect(last.fighters).toBeUndefined()
  })

  it('attackFrames=0:单冲刺帧 currentFrame=idleFrames-1,Delay(2)', () => {
    const frames = build({ attackFrames: 0, idleFrames: 4, magicFrames: 0 })
    const charge = frames.find((f) =>
      f.fighters?.some((d) => d.side === 'enemy' && d.pos?.x === 196),
    )!
    expect(charge.fighters).toEqual([
      { side: 'enemy', idx: 0, currentFrame: 3, pos: { x: 196, y: 154 } },
    ])
    expect(charge.durationMs).toBe(2 * D)
  })
})

// ============================================================================
// D17 PreMagic(fight.c:2337-2445)
// ============================================================================
describe('buildPreMagicTimeline (fight.c:2337-2445)', () => {
  // caster idx0 站立 (240,170);castEffectFrameBase=35(= rgwBattleEffectIndex[sprite][0]*10+15)。
  const frames = buildPreMagicTimeline({
    casterPos: { x: 240, y: 170 },
    casterIdx: 0,
    castEffectFrameBase: 35,
    isSummon: false,
  })

  it('总帧数 = 4 上移 + Delay(2) + 帧5 + 10 cast + Delay(1) = 17', () => {
    expect(frames).toHaveLength(17)
  })

  it('上移 4 帧:pos.x-=(4-i),pos.y-=(4-i)/2(累 (240-10,170-5)=(230,165))', () => {
    // i0: x-=4 → 236, y-=2 → 168. i1: x-=3 → 233, y-=1 → 167. i2: x-=2 → 231, y-=1 → 166. i3: x-=1 → 230, y-=0 → 166.
    expect(frames[0]!.fighters).toEqual([{ side: 'player', idx: 0, pos: { x: 236, y: 168 } }])
    expect(frames[1]!.fighters).toEqual([{ side: 'player', idx: 0, pos: { x: 233, y: 167 } }])
    expect(frames[2]!.fighters).toEqual([{ side: 'player', idx: 0, pos: { x: 231, y: 166 } }])
    expect(frames[3]!.fighters).toEqual([{ side: 'player', idx: 0, pos: { x: 230, y: 166 } }])
    expect(frames[0]!.durationMs).toBe(1 * D)
  })

  it('frame4 = Delay(2) 空帧;frame5 = currentFrame=5 施法手势', () => {
    expect(frames[4]!.durationMs).toBe(2 * D)
    expect(frames[4]!.fighters).toBeUndefined()
    expect(frames[5]!.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 5 }])
  })

  it('10 帧 cast 特效:overlay effect chunk10 frameIdx=base+j 落点上移后 caster (230,166)', () => {
    // frame6..15 = cast 特效 j=0..9
    for (let j = 0; j < 10; j++) {
      const f = frames[6 + j]!
      expect(f.overlay).toEqual({
        kind: 'effect',
        spriteChunk: EFFECT_SPRITE_CHUNK,
        frameIdx: 35 + j,
        x: 230,
        y: 166,
      })
      expect(f.durationMs).toBe(1 * D)
    }
  })

  it('末帧 = Delay(1) 收尾', () => {
    expect(frames[16]!.durationMs).toBe(1 * D)
    expect(frames[16]!.overlay).toBeUndefined()
  })

  it('isSummon=true → 跳过 10 帧 cast 特效(总帧 4+1+1+1=7)', () => {
    const fr = buildPreMagicTimeline({
      casterPos: { x: 240, y: 170 },
      casterIdx: 0,
      castEffectFrameBase: 35,
      isSummon: true,
    })
    expect(fr).toHaveLength(7)
    expect(fr.every((f) => f.overlay === undefined)).toBe(true)
  })
})

// ============================================================================
// D17 OffMagic(fight.c:2608-2844)
// ============================================================================
describe('buildPlayerOffMagicTimeline (fight.c:2608-2844)', () => {
  // n=8, fireDelay=2, effectTimes=1, shake=0 → l = (8-2)*1 + 8 + 0 = 14。
  // speed=2 → durationMs=(2+5)*10=70。type=normal,target enemy pos (160,80),xOff=4,yOff=-6。
  function buildNormal(
    opts: {
      n?: number
      fireDelay?: number
      effectTimes?: number
      shake?: number
      speed?: number
      wave?: number
    } = {},
  ) {
    return buildPlayerOffMagicTimeline({
      casterIdx: 0,
      magic: {
        effect: 12,
        type: 'normal',
        speed: opts.speed ?? 2,
        fireDelay: opts.fireDelay ?? 2,
        effectTimes: opts.effectTimes ?? 1,
        shake: opts.shake ?? 0,
        xOffset: 4,
        yOffset: -6,
        wave: opts.wave,
      },
      n: opts.n ?? 8,
      targetIdx: 1,
      targetEnemyPos: { x: 160, y: 80 },
    })
  }

  it('W4 wWave:magic.wave>0 → 每帧带 screenWave=wave;wave=0/缺 → 无 screenWave(fight.c:2667)', () => {
    const fw = buildNormal({ wave: 5 })
    expect(fw.every((f) => f.screenWave === 5)).toBe(true) // 动画全程屏波
    expect(buildNormal().every((f) => f.screenWave === undefined)).toBe(true) // 默认无 wave → 无屏波
    expect(buildNormal({ wave: 0 }).every((f) => f.screenWave === undefined)).toBe(true)
  })

  it('总帧数 l = (n-fireDelay)*effectTimes + n + shake', () => {
    expect(buildNormal()).toHaveLength((8 - 2) * 1 + 8 + 0) // 14
    expect(buildNormal({ n: 8, fireDelay: 2, effectTimes: 2, shake: 3 })).toHaveLength(
      (8 - 2) * 2 + 8 + 3, // 23
    )
  })

  it('每帧 durationMs = (speed+5)*10', () => {
    const f = buildNormal({ speed: 2 })
    expect(f[0]!.durationMs).toBe(70)
    const f3 = buildNormal({ speed: 3 })
    expect(f3[0]!.durationMs).toBe(80)
  })

  it('caster.currentFrame=6 仅在 i==fireDelay 帧(PAL_CLASSIC)', () => {
    const f = buildNormal({ fireDelay: 2 })
    expect(f[0]!.fighters).toBeUndefined()
    expect(f[1]!.fighters).toBeUndefined()
    expect(f[2]!.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 6 }])
    expect(f[3]!.fighters).toBeUndefined()
  })

  it('帧 index k:i<n → k=i;i>=n → ((i-fireDelay)%(n-fireDelay))+fireDelay', () => {
    // n=8, fireDelay=2, effectTimes=2, shake=0 → l=(8-2)*2+8=20.
    const f = buildPlayerOffMagicTimeline({
      casterIdx: 0,
      magic: {
        effect: 12,
        type: 'normal',
        speed: 2,
        fireDelay: 2,
        effectTimes: 2,
        shake: 0,
        xOffset: 0,
        yOffset: 0,
      },
      n: 8,
      targetIdx: 1,
      targetEnemyPos: { x: 160, y: 80 },
    })
    // i=0..7 → k=i
    expect(f[0]!.overlays![0]!.frameIdx).toBe(0)
    expect(f[7]!.overlays![0]!.frameIdx).toBe(7)
    // i=8 → ((8-2)%(8-2))+2 = (6%6)+2 = 0+2 = 2
    expect(f[8]!.overlays![0]!.frameIdx).toBe(2)
    // i=9 → ((9-2)%6)+2 = (7%6)+2 = 1+2 = 3
    expect(f[9]!.overlays![0]!.frameIdx).toBe(3)
    // i=14 → ((14-2)%6)+2 = (12%6)+2 = 0+2 = 2
    expect(f[14]!.overlays![0]!.frameIdx).toBe(2)
  })

  it('normal 落点 = enemy.pos + (xOff,yOff) = (164,74),overlay kind=magic chunk=effect', () => {
    const f = buildNormal()
    expect(f[0]!.overlays).toEqual([{ kind: 'magic', spriteChunk: 12, frameIdx: 0, x: 164, y: 74 }])
  })

  it('attackAll:三落点 {70,140}{100,110}{160,100} 各 +off → overlays[3] 同帧', () => {
    const f = buildPlayerOffMagicTimeline({
      casterIdx: 0,
      magic: {
        effect: 20,
        type: 'attackAll',
        speed: 0,
        fireDelay: 0,
        effectTimes: 1,
        shake: 0,
        xOffset: 5,
        yOffset: 10,
      },
      n: 4,
      targetIdx: -1,
    })
    expect(f[0]!.overlays).toEqual([
      { kind: 'magic', spriteChunk: 20, frameIdx: 0, x: 75, y: 150 },
      { kind: 'magic', spriteChunk: 20, frameIdx: 0, x: 105, y: 120 },
      { kind: 'magic', spriteChunk: 20, frameIdx: 0, x: 165, y: 110 },
    ])
  })

  it('attackWhole:(120,100)+off ; attackField:(160,200)+off', () => {
    const fw = buildPlayerOffMagicTimeline({
      casterIdx: 0,
      magic: {
        effect: 30,
        type: 'attackWhole',
        speed: 0,
        fireDelay: 0,
        effectTimes: 1,
        shake: 0,
        xOffset: 0,
        yOffset: 0,
      },
      n: 4,
      targetIdx: -1,
    })
    expect(fw[0]!.overlays).toEqual([
      { kind: 'magic', spriteChunk: 30, frameIdx: 0, x: 120, y: 100 },
    ])
    const ff = buildPlayerOffMagicTimeline({
      casterIdx: 0,
      magic: {
        effect: 31,
        type: 'attackField',
        speed: 0,
        fireDelay: 0,
        effectTimes: 1,
        shake: 0,
        xOffset: 0,
        yOffset: 0,
      },
      n: 4,
      targetIdx: -1,
    })
    expect(ff[0]!.overlays).toEqual([
      { kind: 'magic', spriteChunk: 31, frameIdx: 0, x: 160, y: 200 },
    ])
  })

  it('shake 区末 shake 帧:带 shake{time:i,level:3} + 定帧 k=(l-shake-1)%n', () => {
    // n=8, fireDelay=2, effectTimes=1, shake=3 → l=(8-2)*1+8+3=17. shake 区 = 末 3 帧 i=14,15,16.
    const f = buildNormal({ n: 8, fireDelay: 2, effectTimes: 1, shake: 3 })
    expect(f).toHaveLength(17)
    // 非 shake 区末帧 i=13:l-i=4 > shake=3 → 无 shake
    expect(f[13]!.shake).toBeUndefined()
    // shake 区 i=14:l-i=3 <= shake=3 → 带 shake;k=(17-3-1)%8 = 13%8 = 5
    expect(f[14]!.shake).toEqual({ time: 14, level: 3 })
    expect(f[14]!.overlays![0]!.frameIdx).toBe(5)
    expect(f[16]!.shake).toEqual({ time: 16, level: 3 })
  })
})

// ============================================================================
// D17 PostMagic(fight.c:3189-3246)
// ============================================================================
describe('buildPostMagicTimeline (fight.c:3189-3246)', () => {
  it('受伤敌抖 3 帧 + 复位帧:pos.x-=dist(8→-4→2),i==1 帧 iColorShift=6', () => {
    const frames = buildPostMagicTimeline({
      hurtEnemies: [{ idx: 0, pos: { x: 160, y: 80 } }],
    })
    // 3 抖 + 1 复位 = 4 帧
    expect(frames).toHaveLength(4)
    // i0: x-=8 → 152, iColorShift=0
    expect(frames[0]!.fighters).toEqual([
      { side: 'enemy', idx: 0, pos: { x: 152, y: 80 }, iColorShift: 0 },
    ])
    expect(frames[0]!.durationMs).toBe(1 * D)
    // i1: dist=-4 → x-=-4 → 156, iColorShift=6
    expect(frames[1]!.fighters).toEqual([
      { side: 'enemy', idx: 0, pos: { x: 156, y: 80 }, iColorShift: 6 },
    ])
    // i2: dist=2 → x-=2 → 154, iColorShift=0
    expect(frames[2]!.fighters).toEqual([
      { side: 'enemy', idx: 0, pos: { x: 154, y: 80 }, iColorShift: 0 },
    ])
    // 复位:pos = posBak (160,80), iColorShift=0
    expect(frames[3]!.fighters).toEqual([
      { side: 'enemy', idx: 0, pos: { x: 160, y: 80 }, iColorShift: 0 },
    ])
  })

  it('多个受伤敌:每个独立累积位移', () => {
    const frames = buildPostMagicTimeline({
      hurtEnemies: [
        { idx: 0, pos: { x: 160, y: 80 } },
        { idx: 2, pos: { x: 100, y: 60 } },
      ],
    })
    expect(frames[0]!.fighters).toEqual([
      { side: 'enemy', idx: 0, pos: { x: 152, y: 80 }, iColorShift: 0 },
      { side: 'enemy', idx: 2, pos: { x: 92, y: 60 }, iColorShift: 0 },
    ])
    // 复位帧两个敌都回 posBak
    expect(frames[3]!.fighters).toEqual([
      { side: 'enemy', idx: 0, pos: { x: 160, y: 80 }, iColorShift: 0 },
      { side: 'enemy', idx: 2, pos: { x: 100, y: 60 }, iColorShift: 0 },
    ])
  })

  it('无受伤敌:仍产 3 抖 + 复位 = 4 帧(fighters undefined),忠实 sdlpal delay', () => {
    const frames = buildPostMagicTimeline({ hurtEnemies: [] })
    expect(frames).toHaveLength(4)
    expect(frames.every((f) => f.fighters === undefined)).toBe(true)
    expect(frames.every((f) => f.durationMs === 1 * D)).toBe(true)
  })
})

// ============================================================================
// D17 法术补全:player DefMagic(fight.c:2447-2606)
// ============================================================================
describe('buildPlayerDefMagicTimeline (fight.c:2447-2606)', () => {
  // applyToPlayer:target 队员 idx1 站立 (180,150);n=5;speed=2 → magic 帧 (2+5)*10=70。
  // xOff=4, yOff=-6 → 落点 (184,144)。
  function buildToPlayer(opts: { n?: number; speed?: number } = {}) {
    return buildPlayerDefMagicTimeline({
      casterIdx: 0,
      magic: { effect: 15, type: 'applyToPlayer', speed: opts.speed ?? 2, xOffset: 4, yOffset: -6 },
      n: opts.n ?? 5,
      targetPlayerIdx: 1,
      targetPlayerPos: { x: 180, y: 150 },
    })
  }

  it('总帧数 = 1(caster 帧6)+ n + 14(辉光)', () => {
    expect(buildToPlayer({ n: 5 })).toHaveLength(1 + 5 + 14) // 20
    expect(buildToPlayer({ n: 8 })).toHaveLength(1 + 8 + 14) // 23
  })

  it('frame0:caster.currentFrame=6,Delay(1)', () => {
    const f = buildToPlayer()
    expect(f[0]!.durationMs).toBe(1 * D)
    expect(f[0]!.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 6 }])
    expect(f[0]!.overlays).toBeUndefined()
  })

  it('magic 帧:frameIdx=i 直放,落点 target.pos+(xOff,yOff)=(184,144),durationMs=(speed+5)*10', () => {
    const f = buildToPlayer({ n: 5, speed: 2 })
    // frame1..5 = magic sprite i=0..4
    for (let i = 0; i < 5; i++) {
      const mf = f[1 + i]!
      expect(mf.durationMs).toBe(70)
      expect(mf.overlays).toEqual([
        { kind: 'magic', spriteChunk: 15, frameIdx: i, x: 184, y: 144 },
      ])
    }
  })

  it('辉光 14 帧:iColorShift 序列 0..6..0(渐亮 7 + 渐暗 7),设 target 队员,各 Delay(1)', () => {
    const f = buildToPlayer({ n: 5 })
    const glow = f.slice(1 + 5) // 末 14 帧
    expect(glow).toHaveLength(14)
    const expectedShifts = [0, 1, 2, 3, 4, 5, 6, 6, 5, 4, 3, 2, 1, 0]
    glow.forEach((gf, idx) => {
      expect(gf.durationMs).toBe(1 * D)
      expect(gf.fighters).toEqual([{ side: 'player', idx: 1, iColorShift: expectedShifts[idx] }])
    })
  })

  it('applyToParty:落点对每个队员各放一份(overlays 多落点);辉光设全队员', () => {
    const f = buildPlayerDefMagicTimeline({
      casterIdx: 0,
      magic: { effect: 16, type: 'applyToParty', speed: 0, xOffset: 0, yOffset: 0 },
      n: 3,
      targetPlayerIdx: -1,
      partyPlayerPositions: [
        { idx: 0, pos: { x: 240, y: 170 } },
        { idx: 1, pos: { x: 200, y: 150 } },
        { idx: 2, pos: { x: 160, y: 130 } },
      ],
    })
    // frame0=caster帧6; frame1..3 = magic; frame4..17 = 辉光
    const mf = f[1]!
    expect(mf.overlays).toEqual([
      { kind: 'magic', spriteChunk: 16, frameIdx: 0, x: 240, y: 170 },
      { kind: 'magic', spriteChunk: 16, frameIdx: 0, x: 200, y: 150 },
      { kind: 'magic', spriteChunk: 16, frameIdx: 0, x: 160, y: 130 },
    ])
    // 辉光首帧:全队员 iColorShift=0
    const glow0 = f[4]!
    expect(glow0.fighters).toEqual([
      { side: 'player', idx: 0, iColorShift: 0 },
      { side: 'player', idx: 1, iColorShift: 0 },
      { side: 'player', idx: 2, iColorShift: 0 },
    ])
    // 辉光峰值帧(i=6)全队员 iColorShift=6
    const glowPeak = f[4 + 6]!
    expect(glowPeak.fighters).toEqual([
      { side: 'player', idx: 0, iColorShift: 6 },
      { side: 'player', idx: 1, iColorShift: 6 },
      { side: 'player', idx: 2, iColorShift: 6 },
    ])
  })
})

// ============================================================================
// D17 法术补全:敌方 EnemyMagic(fight.c:2846-3069)—— OffMagic 镜像
// ============================================================================
describe('buildEnemyMagicTimeline (fight.c:2846-3069)', () => {
  // n=8, fireDelay=2, effectTimes=1, shake=0 → l=(8-2)*1+8=14。speed=2 → durationMs=70。
  // type=normal,target player pos (240,170),xOff=4,yOff=-6 → 落点 (244,164)。
  // enemy idleFrames=4, magicFrames=2, attackFrames=3。
  function buildNormal(
    opts: {
      n?: number
      fireDelay?: number
      effectTimes?: number
      shake?: number
      speed?: number
      idleFrames?: number
      magicFrames?: number
      attackFrames?: number
    } = {},
  ) {
    return buildEnemyMagicTimeline({
      enemyCasterIdx: 0,
      magic: {
        effect: 12,
        type: 'normal',
        speed: opts.speed ?? 2,
        fireDelay: opts.fireDelay ?? 2,
        effectTimes: opts.effectTimes ?? 1,
        shake: opts.shake ?? 0,
        xOffset: 4,
        yOffset: -6,
      },
      n: opts.n ?? 8,
      enemy: {
        idleFrames: opts.idleFrames ?? 4,
        magicFrames: opts.magicFrames ?? 2,
        attackFrames: opts.attackFrames ?? 3,
      },
      targetPlayerIdx: 1,
      targetPlayerPos: { x: 240, y: 170 },
    })
  }

  it('总帧数 l = (n-fireDelay)*effectTimes + n + shake(OffMagic 镜像公式)', () => {
    expect(buildNormal()).toHaveLength((8 - 2) * 1 + 8 + 0) // 14
    expect(buildNormal({ effectTimes: 2, shake: 3 })).toHaveLength((8 - 2) * 2 + 8 + 3) // 23
  })

  it('每帧 durationMs = (speed+5)*10', () => {
    expect(buildNormal({ speed: 2 })[0]!.durationMs).toBe(70)
    expect(buildNormal({ speed: 3 })[0]!.durationMs).toBe(80)
  })

  it('帧 index k:i<n → k=i;i>=n → ((i-fireDelay)%(n-fireDelay))+fireDelay', () => {
    // n=8, fireDelay=2, effectTimes=2 → l=20.
    const f = buildNormal({ effectTimes: 2 })
    expect(f[0]!.overlays![0]!.frameIdx).toBe(0)
    expect(f[7]!.overlays![0]!.frameIdx).toBe(7)
    // i=8 → ((8-2)%6)+2 = 0+2 = 2
    expect(f[8]!.overlays![0]!.frameIdx).toBe(2)
    // i=9 → ((9-2)%6)+2 = 1+2 = 3
    expect(f[9]!.overlays![0]!.frameIdx).toBe(3)
  })

  it('敌施法帧:fireDelay>0 且 fireDelay<=i<fireDelay+attackFrames → currentFrame=i-fireDelay+idleFrames+magicFrames', () => {
    // fireDelay=2, attackFrames=3, idleFrames=4, magicFrames=2 → 施法帧区 i=2,3,4.
    const f = buildNormal({ fireDelay: 2, attackFrames: 3, idleFrames: 4, magicFrames: 2 })
    // i=2 → currentFrame = 2-2+4+2 = 6
    expect(f[2]!.fighters).toEqual([{ side: 'enemy', idx: 0, currentFrame: 6 }])
    // i=3 → 3-2+4+2 = 7
    expect(f[3]!.fighters).toEqual([{ side: 'enemy', idx: 0, currentFrame: 7 }])
    // i=4 → 4-2+4+2 = 8
    expect(f[4]!.fighters).toEqual([{ side: 'enemy', idx: 0, currentFrame: 8 }])
    // i=1(< fireDelay)无施法帧
    expect(f[1]!.fighters).toBeUndefined()
    // i=5(= fireDelay+attackFrames)无施法帧
    expect(f[5]!.fighters).toBeUndefined()
  })

  it('fireDelay=0:不产敌施法帧(gate fireDelay>0)', () => {
    const f = buildNormal({ fireDelay: 0, attackFrames: 3, n: 8, effectTimes: 1 })
    expect(f.every((fr) => fr.fighters === undefined)).toBe(true)
  })

  it('normal 落点 = player.pos + (xOff,yOff) = (244,164),overlay kind=magic chunk=effect', () => {
    const f = buildNormal()
    expect(f[0]!.overlays).toEqual([{ kind: 'magic', spriteChunk: 12, frameIdx: 0, x: 244, y: 164 }])
  })

  it('attackAll:三落点 {180,180}{234,170}{270,146} 各 +off → overlays[3] 同帧(敌方坐标,异于 OffMagic)', () => {
    const f = buildEnemyMagicTimeline({
      enemyCasterIdx: 0,
      magic: {
        effect: 20,
        type: 'attackAll',
        speed: 0,
        fireDelay: 0,
        effectTimes: 1,
        shake: 0,
        xOffset: 5,
        yOffset: 10,
      },
      n: 4,
      enemy: { idleFrames: 4, magicFrames: 0, attackFrames: 0 },
      targetPlayerIdx: -1,
    })
    expect(f[0]!.overlays).toEqual([
      { kind: 'magic', spriteChunk: 20, frameIdx: 0, x: 185, y: 190 },
      { kind: 'magic', spriteChunk: 20, frameIdx: 0, x: 239, y: 180 },
      { kind: 'magic', spriteChunk: 20, frameIdx: 0, x: 275, y: 156 },
    ])
  })

  it('attackWhole:(240,150)+off ; attackField:(160,200)+off(敌方坐标)', () => {
    const fw = buildEnemyMagicTimeline({
      enemyCasterIdx: 0,
      magic: {
        effect: 30,
        type: 'attackWhole',
        speed: 0,
        fireDelay: 0,
        effectTimes: 1,
        shake: 0,
        xOffset: 0,
        yOffset: 0,
      },
      n: 4,
      enemy: { idleFrames: 4, magicFrames: 0, attackFrames: 0 },
      targetPlayerIdx: -1,
    })
    expect(fw[0]!.overlays).toEqual([
      { kind: 'magic', spriteChunk: 30, frameIdx: 0, x: 240, y: 150 },
    ])
    const ff = buildEnemyMagicTimeline({
      enemyCasterIdx: 0,
      magic: {
        effect: 31,
        type: 'attackField',
        speed: 0,
        fireDelay: 0,
        effectTimes: 1,
        shake: 0,
        xOffset: 0,
        yOffset: 0,
      },
      n: 4,
      enemy: { idleFrames: 4, magicFrames: 0, attackFrames: 0 },
      targetPlayerIdx: -1,
    })
    expect(ff[0]!.overlays).toEqual([
      { kind: 'magic', spriteChunk: 31, frameIdx: 0, x: 160, y: 200 },
    ])
  })

  it('shake 区末 shake 帧:带 shake{time:i,level:3} + 定帧 k=(l-shake-1)%n;施法帧 gate 仅非 shake 区', () => {
    // n=8, fireDelay=2, effectTimes=1, shake=3 → l=17. shake 区 = 末 3 帧 i=14,15,16.
    const f = buildNormal({ n: 8, fireDelay: 2, effectTimes: 1, shake: 3 })
    expect(f).toHaveLength(17)
    expect(f[13]!.shake).toBeUndefined()
    expect(f[14]!.shake).toEqual({ time: 14, level: 3 })
    // k=(17-3-1)%8 = 13%8 = 5
    expect(f[14]!.overlays![0]!.frameIdx).toBe(5)
    expect(f[16]!.shake).toEqual({ time: 16, level: 3 })
    // shake 区不产施法帧(fight.c:2932-2938 在 l-i>shake 分支内)
    expect(f[14]!.fighters).toBeUndefined()
  })
})

describe('buildEnemyMagicCastIntro (fight.c:4680-4717)', () => {
  // 林月如 enemy82:idleFrames=1 / magicFrames=0 / attackFrames=4 / actWaitFrames=1;magic360→鞭击 fireDelay=0。
  // user 2026-05-31:她施法时「完全不动、不位移」—— 真因是漏 port 这段施法起手(前移 + attackFrames 手势)。
  const f = buildEnemyMagicCastIntro({
    enemyCasterIdx: 0,
    enemyPos: { x: 100, y: 80 },
    idleFrames: 1,
    magicFrames: 0,
    attackFrames: 4,
    actWaitFrames: 1,
    fireDelay: 0,
  })

  it('前移 2 帧:pos += (12,6) → += (4,2)(fight.c:4683-4693)', () => {
    expect(f[0]!.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 112, y: 86 } }])
    expect(f[1]!.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 116, y: 88 } }])
    expect(f[0]!.durationMs).toBe(D)
  })

  it('magicFrames==0 → 补 1 帧停顿(fight.c:4704-4707)', () => {
    // 前移 2 帧后,magicFrames=0 → 无手势帧 → 第 3 帧是纯停顿(无 fighters)
    expect(f[2]!.fighters).toBeUndefined()
    expect(f[2]!.durationMs).toBe(D)
  })

  it('fireDelay==0 → attackFrames 手势 currentFrame 0,1,2,3,4(fight.c:4709-4717)', () => {
    // f[3..7] = 5 帧手势(i=0..4),currentFrame = i-1+idleFrames(1)+magicFrames(0) = i
    const gesture = f.slice(3).map((fr) => fr.fighters?.[0]?.currentFrame)
    expect(gesture).toEqual([0, 1, 2, 3, 4]) // ★ 这就是林月如施法时该动的帧
  })

  it('magicFrames>0:用 magicFrames 帧手势 currentFrame=idleFrames+i,且不补停顿帧', () => {
    const g = buildEnemyMagicCastIntro({
      enemyCasterIdx: 1, enemyPos: { x: 0, y: 0 },
      idleFrames: 2, magicFrames: 3, attackFrames: 0, actWaitFrames: 2, fireDelay: 5,
    })
    // 前移 2 帧 + magicFrames=3 手势(currentFrame 2,3,4);fireDelay=5(!=0)→ 无 attackFrames 段;magicFrames!=0 → 无停顿帧
    expect(g).toHaveLength(5)
    expect(g.slice(2).map((fr) => fr.fighters?.[0]?.currentFrame)).toEqual([2, 3, 4])
  })
})
