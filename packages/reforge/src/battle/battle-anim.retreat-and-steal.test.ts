import { describe, expect, test } from 'vitest'
import { PLAYER_PROFILE } from '../__tests__/battle-workflows/catalog.js'
import { buildEnemyEscape, buildFleeFail, buildPartyFlee, buildSteal } from './battle-anim.js'

const PLAYER_FRAMES = PLAYER_PROFILE.frames

describe('战斗撤退和偷窃的呈现', () => {
  test('逃跑成功:16 帧×40ms 全员统一 (+5,+4)(一阶段 fleeStepDelta,作者 2026-05-31 拍板);音效45首帧', () => {
    const frames = buildPartyFlee({
      sound: 'sound.pal.045',
      players: [
        { idx: 0, pos: { x: 200, y: 160 }, idleFrame: PLAYER_FRAMES.idle },
        { idx: 1, pos: { x: 240, y: 170 }, idleFrame: PLAYER_FRAMES.idle },
      ],
    })
    expect(frames.length).toBe(16)
    expect(frames[0]!.sound).toBe('sound.pal.045')
    expect(frames[0]!.fighters).toEqual([
      { side: 'player', idx: 0, frame: 0, pos: { x: 205, y: 164 } },
      { side: 'player', idx: 1, frame: 0, pos: { x: 245, y: 174 } },
    ])
    // 三人同向同速(非 sdlpal 扇形):16 步后各 +80,+64
    expect(frames[15]!.fighters).toEqual([
      { side: 'player', idx: 0, frame: 0, pos: { x: 280, y: 224 } },
      { side: 'player', idx: 1, frame: 0, pos: { x: 320, y: 234 } },
    ])
  })

  test('偷窃冲刺(fight.c:5218,一阶段 buildStealTimeline 1:1):敌前瞬移 frame10 → 5 步滑步 → 末步敌闪白', () => {
    const frames = buildSteal({
      casterIdx: 0,
      targetIdx: 1,
      enemyPos: { x: 100, y: 100 },
      stealFrame: 10,
    })
    expect(frames.length).toBe(7)
    // offset=(1−0)×8=8 → 起点 (100+64−8, 100+22+8) = (156,130)
    expect(frames[0]!.fighters![0]).toEqual({
      side: 'player',
      idx: 0,
      frame: 10,
      pos: { x: 156, y: 130 },
    })
    // 5 步:x −= i+8(8,9,10,11,12)、y −= 4
    expect(frames[1]!.fighters![0]!.pos).toEqual({ x: 148, y: 126 })
    expect(frames[5]!.fighters![0]!.pos).toEqual({ x: 106, y: 110 })
    expect(frames[5]!.fighters![1]).toEqual({ side: 'enemy', idx: 1, colorShift: 6 }) // 末步敌闪白
    // 收尾:再退 1px 定格 3 帧 + 敌复色
    expect(frames[6]!.durationMs).toBe(120)
    expect(frames[6]!.fighters).toEqual([
      { side: 'player', idx: 0, pos: { x: 105, y: 110 } },
      { side: 'enemy', idx: 1, colorShift: 0 },
    ])
  })

  test('逃跑失败(fight.c:4152):3 帧 (+4,+2) 挪步 → frame1 定格 320ms + 「逃跑失败」banner', () => {
    const frames = buildFleeFail({ idx: 1, pos: { x: 240, y: 170 }, frames: PLAYER_FRAMES })
    expect(frames.length).toBe(4)
    expect(frames[0]!.fighters![0]).toEqual({
      side: 'player',
      idx: 1,
      frame: 0,
      pos: { x: 244, y: 172 },
    })
    expect(frames[2]!.fighters![0]!.pos).toEqual({ x: 252, y: 176 })
    expect(frames[3]).toEqual({
      durationMs: 320,
      fighters: [{ side: 'player', idx: 1, frame: 1 }],
      banner: { text: '逃跑失败', durationMs: 320, x: 130, y: 75 }, // 一阶段标签位真值
    })
  })

  test('敌逃(battle.c:1376):每 10ms x−5 至滑出左屏 + 终帧停 500ms;音效45首帧', () => {
    const frames = buildEnemyEscape({
      enemies: [{ idx: 0, pos: { x: 100, y: 110 }, width: 50 }],
      sound: 'sound.pal.045',
    })
    // ceil((100+50)/5) = 30 步 + 终帧
    expect(frames.length).toBe(31)
    expect(frames[0]!.sound).toBe('sound.pal.045')
    expect(frames[0]!.durationMs).toBe(10)
    expect(frames[0]!.fighters![0]!.pos).toEqual({ x: 95, y: 110 })
    expect(frames[29]!.fighters![0]!.pos).toEqual({ x: -50, y: 110 }) // 完全出屏
    expect(frames[30]).toEqual({ durationMs: 500 })
  })
})
