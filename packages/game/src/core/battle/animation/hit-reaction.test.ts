/** Enemy and player hit choreography, reused by physical and magic actions. Data-level contracts; not browser or visual acceptance. */
import { describe, expect, it } from 'vitest'
import { buildPlayerMagicHitReaction, buildPostMagicTimeline } from '../anim-timeline.js'

const FRAME_MS = 40 // SDLPal battle.h: BATTLE_FPS=25.

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
    expect(frames[0]!.durationMs).toBe(1 * FRAME_MS)
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
    expect(frames.every((f) => f.durationMs === 1 * FRAME_MS)).toBe(true)
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
      expect(frame.durationMs).toBe(1 * FRAME_MS)
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
