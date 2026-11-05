/** Enemy summon, transformation and division gestures for battle opcodes. Data-level contracts; not browser or visual acceptance. */
import { describe, expect, it } from 'vitest'
import {
  buildEnemyDivisionTimeline,
  buildEnemySummonTimeline,
  buildEnemyTransformTimeline,
} from '../anim-timeline.js'

const FRAME_MS = 40 // SDLPal battle.h: BATTLE_FPS=25.

describe('enemy summon/transform opcode timelines (script.c:009E/009F)', () => {
  it('buildEnemySummonTimeline:召唤起手仅手势(原地不动)+ 新召唤敌 iColorShift=8 + 音效 212 + 全敌复位', () => {
    const frames = buildEnemySummonTimeline({
      casterIdx: 0,
      casterPos: { x: 160, y: 80 },
      caster: { idleFrames: 1, magicFrames: 2, attackFrames: 3, actWaitFrames: 2 },
      summonedIdxs: [1, 2],
      activeEnemyIdxs: [0, 1, 2],
    })

    // 召唤起手仅 magicFrames 手势帧(currentFrame=idleFrames+i),施法者**原地不动**(script.c:2874-2879);
    //   不复用敌人放普通魔法的前移起手(fight.c:4683 +12,6/+4,2),故 frames[0] 是手势帧、无 pos 位移。
    expect(frames[0]!.fighters).toEqual([{ side: 'enemy', idx: 0, currentFrame: 1 }])
    expect(frames[1]!.fighters).toEqual([{ side: 'enemy', idx: 0, currentFrame: 2 }])
    const summonFrame = frames.find((f) => f.sound === 212)!
    expect(summonFrame.fighters).toEqual([
      { side: 'enemy', idx: 1, iColorShift: 8 },
      { side: 'enemy', idx: 2, iColorShift: 8 },
    ])
    expect(frames.at(-1)!.fighters).toEqual([
      { side: 'enemy', idx: 0, iColorShift: 0 },
      { side: 'enemy', idx: 1, iColorShift: 0 },
      { side: 'enemy', idx: 2, iColorShift: 0 },
    ])
  })

  it('buildEnemyTransformTimeline:0..5 闪色后复位并在末帧播 47', () => {
    const frames = buildEnemyTransformTimeline(2)
    expect(frames.slice(0, 6).map((f) => f.fighters?.[0])).toEqual([
      { side: 'enemy', idx: 2, iColorShift: 0 },
      { side: 'enemy', idx: 2, iColorShift: 1 },
      { side: 'enemy', idx: 2, iColorShift: 2 },
      { side: 'enemy', idx: 2, iColorShift: 3 },
      { side: 'enemy', idx: 2, iColorShift: 4 },
      { side: 'enemy', idx: 2, iColorShift: 5 },
    ])
    expect(frames.at(-1)).toEqual({
      durationMs: FRAME_MS,
      fighters: [{ side: 'enemy', idx: 2, iColorShift: 0 }],
      sound: 47,
    })
  })

  it('buildEnemyDivisionTimeline:副本从原敌位 10 帧缓动散开 + 末帧归位(原敌不动)', () => {
    const frames = buildEnemyDivisionTimeline({
      startPos: { x: 240, y: 120 },
      targets: [
        { idx: 0, pos: { x: 240, y: 120 } }, // 原敌:target==startPos → 全程不动
        { idx: 1, pos: { x: 200, y: 120 } }, // 副本:从 240 缓动到 200
      ],
    })
    expect(frames).toHaveLength(11) // 10 缓动 + 1 归位
    // 原敌每帧都在 startPos
    for (const f of frames) {
      expect(f.fighters?.find((d) => d.idx === 0)?.pos).toEqual({ x: 240, y: 120 })
    }
    // 副本逐帧 pos=(pos+target)/2:240→220→210→...→200
    expect(frames[0]!.fighters?.find((d) => d.idx === 1)?.pos).toEqual({ x: 220, y: 120 })
    expect(frames[1]!.fighters?.find((d) => d.idx === 1)?.pos).toEqual({ x: 210, y: 120 })
    // 末帧精确归位阵型位
    expect(frames.at(-1)!.fighters?.find((d) => d.idx === 1)?.pos).toEqual({ x: 200, y: 120 })
  })
})
