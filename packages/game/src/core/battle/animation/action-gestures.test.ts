/** Flee, steal and item gestures; scripts and inventory remain owned by the action caller. Data-level contracts; not browser or visual acceptance. */
import { describe, expect, it } from 'vitest'
import {
  buildFleeFailTimeline,
  buildStealTimeline,
  buildThrowWindupTimeline,
  buildUseItemTimeline,
} from '../anim-timeline.js'

const FRAME_MS = 40 // SDLPal battle.h: BATTLE_FPS=25.

describe('buildFleeFailTimeline (fight.c:4155-4168)', () => {
  const frames = buildFleeFailTimeline(0, { x: 100, y: 100 })

  it('3 步右下挪后,末帧 frame1 显示 逃跑失败 8 帧', () => {
    expect(frames).toHaveLength(4)
    expect(frames[0]!.fighters).toEqual([
      { side: 'player', idx: 0, currentFrame: 0, pos: { x: 104, y: 102 } },
    ])
    expect(frames[1]!.fighters).toEqual([
      { side: 'player', idx: 0, currentFrame: 0, pos: { x: 108, y: 104 } },
    ])
    expect(frames[2]!.fighters).toEqual([
      { side: 'player', idx: 0, currentFrame: 0, pos: { x: 112, y: 106 } },
    ])
    expect(frames[3]!.durationMs).toBe(8 * FRAME_MS)
    expect(frames[3]!.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 1 }])
    expect(frames[3]!.battleMessage).toEqual({ text: '逃跑失败', durationMs: 8 * FRAME_MS })
  })
})

describe('buildThrowWindupTimeline (投掷挥臂,fight.c:4339-4356)', () => {
  // 队员 idx0 站立 (240,170);magicSound=170。
  const frames = buildThrowWindupTimeline(0, { x: 240, y: 170 }, 170)

  it('总帧数 = 7(4 步前移 + Delay2 + frame5 + frame6)', () => {
    expect(frames).toHaveLength(7)
  })

  it('4 步前移:pos-=(4-i, (4-i)/2),各 Delay(1)', () => {
    // i0: x-=4 y-=2 →(236,168);i1: x-=3 y-=1 →(233,167);i2: x-=2 y-=1 →(231,166);i3: x-=1 y-=0 →(230,166)
    expect(frames[0]!.durationMs).toBe(1 * FRAME_MS)
    expect(frames[0]!.fighters).toEqual([{ side: 'player', idx: 0, pos: { x: 236, y: 168 } }])
    expect(frames[1]!.fighters).toEqual([{ side: 'player', idx: 0, pos: { x: 233, y: 167 } }])
    expect(frames[2]!.fighters).toEqual([{ side: 'player', idx: 0, pos: { x: 231, y: 166 } }])
    expect(frames[3]!.fighters).toEqual([{ side: 'player', idx: 0, pos: { x: 230, y: 166 } }])
  })

  it('Delay(2) hold 帧(fight.c:4348):无 fighter 改', () => {
    expect(frames[4]!.durationMs).toBe(2 * FRAME_MS)
    expect(frames[4]!.fighters).toBeUndefined()
  })

  it('frame5 + magicSound,Delay(8)(fight.c:4350-4353)', () => {
    expect(frames[5]!.durationMs).toBe(8 * FRAME_MS)
    expect(frames[5]!.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 5 }])
    expect(frames[5]!.sound).toBe(170) // 投掷音 rgwMagicSound[role]
  })

  it('frame6,Delay(2)(fight.c:4355-4356)', () => {
    expect(frames[6]!.durationMs).toBe(2 * FRAME_MS)
    expect(frames[6]!.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 6 }])
  })

  it('magicSound=0 → frame5 不带 sound', () => {
    const f = buildThrowWindupTimeline(0, { x: 240, y: 170 }, 0)
    expect(f[5]!.sound).toBeUndefined()
  })

  it('传 itemName → hold 帧 (210,50) 显示物品名,贯穿 12 帧(fight.c:4348)', () => {
    const f = buildThrowWindupTimeline(0, { x: 240, y: 170 }, 170, '天师符')
    expect(f[4]!.battleMessage).toEqual({
      text: '天师符',
      durationMs: 12 * FRAME_MS,
      pos: { x: 210, y: 50 },
    })
  })

  it('不传 itemName → hold 帧无 battleMessage(向后兼容)', () => {
    expect(frames[4]!.battleMessage).toBeUndefined()
  })
})

describe('buildUseItemTimeline L15 物品名 (fight.c:2266-2335)', () => {
  it('传 itemName → colorShift i==0 帧 (210,50) 显示物品名,贯穿 13 帧(fight.c:2316/2333)', () => {
    const f = buildUseItemTimeline({
      casterIdx: 0,
      casterPos: { x: 240, y: 170 },
      targetIdx: 1,
      playerCount: 2,
      itemName: '金创药',
    })
    const msgFrame = f.find((fr) => fr.battleMessage)
    expect(msgFrame?.battleMessage).toEqual({
      text: '金创药',
      durationMs: 13 * FRAME_MS,
      pos: { x: 210, y: 50 },
    })
  })

  it('不传 itemName → 无 battleMessage(向后兼容)', () => {
    const f = buildUseItemTimeline({
      casterIdx: 0,
      casterPos: { x: 240, y: 170 },
      targetIdx: 1,
      playerCount: 2,
    })
    expect(f.some((fr) => fr.battleMessage)).toBe(false)
  })
})

describe('buildStealTimeline(fight.c:5218-5246 PAL_BattleStealFromEnemy 动画段)', () => {
  it('frame10 偷窃姿 + offset=(target-player)*8 冲到敌前 + 5 步逼近(i==4 敌闪白) + 收尾 x-- 敌复色', () => {
    // playerIdx=0, target=1 → offset=+8;敌底锚 (160,80):
    //   起手 x=160+64-8=216, y=80+22+8=110(fight.c:5224-5226)
    const frames = buildStealTimeline(0, 1, { x: 160, y: 80 })
    expect(frames.length).toBe(7) // 1 起手 + 5 逼近 + 1 收尾
    expect(frames[0]).toEqual({
      durationMs: 1 * FRAME_MS,
      fighters: [{ side: 'player', idx: 0, currentFrame: 10, pos: { x: 216, y: 110 } }],
    })
    // 逼近步 i: x -= i+8, y -= 4(fight.c:5233-5234);i==4 敌 iColorShift=6(fight.c:5236-5238)
    expect(frames[1]!.fighters).toEqual([
      { side: 'player', idx: 0, currentFrame: 10, pos: { x: 208, y: 106 } },
    ])
    expect(frames[3]!.fighters).toEqual([
      { side: 'player', idx: 0, currentFrame: 10, pos: { x: 189, y: 98 } },
    ])
    expect(frames[5]!.fighters).toEqual([
      { side: 'player', idx: 0, currentFrame: 10, pos: { x: 166, y: 90 } },
      { side: 'enemy', idx: 1, iColorShift: 6 },
    ])
    // 收尾:敌复色 + x--(166-1=165),y 不再动(fight.c:5241-5246 Delay(3))
    expect(frames[6]).toEqual({
      durationMs: 3 * FRAME_MS,
      fighters: [
        { side: 'player', idx: 0, pos: { x: 165, y: 90 } },
        { side: 'enemy', idx: 1, iColorShift: 0 },
      ],
    })
  })

  it('目标在玩家左(target<player)→ 负 offset 反向落点(同一公式,不分支)', () => {
    // playerIdx=1, target=0 → offset=-8:x=160+64+8=232, y=80+22-8=94
    const frames = buildStealTimeline(1, 0, { x: 160, y: 80 })
    expect(frames[0]!.fighters).toEqual([
      { side: 'player', idx: 1, currentFrame: 10, pos: { x: 232, y: 94 } },
    ])
    // 逼近 5 步共 x-50 / y-20 → 末逼近帧 (182,74),收尾 x-- → (181,74)
    expect(frames[5]!.fighters).toEqual([
      { side: 'player', idx: 1, currentFrame: 10, pos: { x: 182, y: 74 } },
      { side: 'enemy', idx: 0, iColorShift: 6 },
    ])
    expect(frames[6]!.fighters).toEqual([
      { side: 'player', idx: 1, pos: { x: 181, y: 74 } },
      { side: 'enemy', idx: 0, iColorShift: 0 },
    ])
  })
})
