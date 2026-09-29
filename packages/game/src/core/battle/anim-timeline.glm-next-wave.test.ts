/**
 * TEST-GLM-NEW-H-1 / H06 — anim-timeline 当前公开合同补测。
 *
 * 只覆盖既有测试未证明、且有真实生产 caller 的两个导出:
 *  - buildStealTimeline(battle-opcodes.ts 0x6A 偷取动画,fight.c:5218-5246)
 *  - buildPlayerMagicHitReaction(actions/magic.ts 敌方魔法命中队员受击,fight.c:4857-4899)
 * 一手真值:reference/sdlpal/fight.c(下述锚点),非被测实现自证。
 */
import { describe, expect, it } from 'vitest'
import {
  BATTLE_FRAME_TIME,
  buildPlayerMagicHitReaction,
  buildStealTimeline,
} from './anim-timeline.js'

describe('buildStealTimeline(fight.c:5218-5246 PAL_BattleStealFromEnemy 动画段)', () => {
  it('frame10 偷窃姿 + offset=(target-player)*8 冲到敌前 + 5 步逼近(i==4 敌闪白) + 收尾 x-- 敌复色', () => {
    // playerIdx=0, target=1 → offset=+8;敌底锚 (160,80):
    //   起手 x=160+64-8=216, y=80+22+8=110(fight.c:5224-5226)
    const frames = buildStealTimeline(0, 1, { x: 160, y: 80 })
    expect(frames.length).toBe(7) // 1 起手 + 5 逼近 + 1 收尾
    expect(frames[0]).toEqual({
      durationMs: 1 * BATTLE_FRAME_TIME,
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
      durationMs: 3 * BATTLE_FRAME_TIME,
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

describe('buildPlayerMagicHitReaction(fight.c:4857-4899 敌方魔法命中我方 5 帧受击)', () => {
  it('5 帧:frame4 受击姿;前 3 帧 iColorShift=6 后 2 帧复位;位移逐帧累加 (8>>i, 4>>i)', () => {
    // sdlpal:i>0 才 pos += (8>>i, 4>>i);iColorShift=(i<3 ? 6 : 0);各 PAL_BattleDelay(1)。
    const frames = buildPlayerMagicHitReaction([{ idx: 0, pos: { x: 240, y: 170 } }])
    expect(frames.length).toBe(5)
    const xs = [240, 244, 246, 247, 247] // +4,+2,+1,+0(8>>i)
    const ys = [170, 172, 173, 173, 173] // +2,+1,+0,+0(4>>i)
    frames.forEach((frame, i) => {
      expect(frame.durationMs).toBe(1 * BATTLE_FRAME_TIME)
      expect(frame.fighters).toEqual([
        {
          side: 'player',
          idx: 0,
          currentFrame: 4,
          iColorShift: i < 3 ? 6 : 0,
          pos: { x: xs[i], y: ys[i] },
        },
      ])
    })
  })

  it('AoE 多队员同帧各自独立累加位移(不受彼此影响)', () => {
    const frames = buildPlayerMagicHitReaction([
      { idx: 0, pos: { x: 180, y: 180 } },
      { idx: 1, pos: { x: 234, y: 170 } },
    ])
    expect(frames.length).toBe(5)
    expect(frames[2]!.fighters).toEqual([
      { side: 'player', idx: 0, currentFrame: 4, iColorShift: 6, pos: { x: 186, y: 183 } },
      { side: 'player', idx: 1, currentFrame: 4, iColorShift: 6, pos: { x: 240, y: 173 } },
    ])
    expect(frames[4]!.fighters).toEqual([
      { side: 'player', idx: 0, currentFrame: 4, iColorShift: 0, pos: { x: 187, y: 183 } },
      { side: 'player', idx: 1, currentFrame: 4, iColorShift: 0, pos: { x: 241, y: 173 } },
    ])
  })

  it('无受伤队员(affected 空)→ 空时间线(生产 caller 只传掉血队员)', () => {
    expect(buildPlayerMagicHitReaction([])).toEqual([])
  })
})
