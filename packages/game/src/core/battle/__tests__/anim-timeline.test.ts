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
  buildEnemyPhysicalTimeline,
  buildPlayerAttackTimeline,
  EFFECT_SPRITE_CHUNK,
} from '../anim-timeline.js'

const D = BATTLE_FRAME_TIME // 40ms

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
