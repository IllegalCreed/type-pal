/** Summon brightness and scene composition; the renderer owns crossfade and loop playback. Data-level contracts; not browser or visual acceptance. */
import { describe, expect, it } from 'vitest'
import { buildSummonBrightenTimeline, buildSummonGodSequence } from '../anim-timeline.js'
import type { BattleAnimFrame } from '../battle-state.js'

const SUMMON_FADE_STEPS = 72 // PAL_BattleFadeScene: 12 × 6 steps.

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

  it('buildSummonGodSequence:fadeIn 72 + loop 塌缩单帧(wall-clock) + offMagic + fadeOut 72', () => {
    const off: BattleAnimFrame[] = [
      {
        durationMs: 100,
        overlays: [{ kind: 'magic', spriteChunk: 12, frameIdx: 0, x: 120, y: 100 }],
      },
      {
        durationMs: 100,
        overlays: [{ kind: 'magic', spriteChunk: 12, frameIdx: 1, x: 120, y: 100 }],
      },
    ]
    const seq = buildSummonGodSequence({
      spriteKey: 'player-12',
      pos: { x: 240, y: 165 },
      bgColorShift: 5,
      totalFrames: 4,
      frameTimeMs: 100,
      offMagicFrames: off,
    })
    expect(seq.length).toBe(SUMMON_FADE_STEPS + 1 + 2 + SUMMON_FADE_STEPS) // 72 + 1(loop塌缩) + 2 + 72
    // fadeIn:召唤神 frame0,fadeStep 0..71,dir in,背景染色 5
    expect(seq[0]!.summon).toEqual({
      spriteKey: 'player-12',
      frame: 0,
      pos: { x: 240, y: 165 },
      bgColorShift: 5,
      fadeStep: 0,
      fadeDir: 'in',
    })
    expect(seq[71]!.summon!.fadeStep).toBe(71)
    // loop:塌缩成单帧 + wall-clock 元数据 loop{count: totalFrames-1=3, frameTimeMs},durationMs = 3×100(present 按真实时间细分 frame)
    expect(seq[72]!.summon).toEqual({
      spriteKey: 'player-12',
      frame: 0,
      pos: { x: 240, y: 165 },
      bgColorShift: 5,
      loop: { count: 3, frameTimeMs: 100 },
    })
    expect(seq[72]!.durationMs).toBe(300)
    // offMagic:loop 后紧接,召唤神定格 last frame 3,overlays 保留
    expect(seq[73]!.summon!.frame).toBe(3)
    expect(seq[73]!.summon!.loop).toBeUndefined()
    expect(seq[73]!.overlays).toEqual([
      { kind: 'magic', spriteChunk: 12, frameIdx: 0, x: 120, y: 100 },
    ])
    expect(seq[74]!.overlays).toEqual([
      { kind: 'magic', spriteChunk: 12, frameIdx: 1, x: 120, y: 100 },
    ])
    // fadeOut:dir out,召唤神 last frame 3
    const last = seq[seq.length - 1]!
    expect(last.summon!.fadeDir).toBe('out')
    expect(last.summon!.frame).toBe(3)
  })

  // 召唤受击动画顺序(user 2026-06-05 报"天剑敌人受击动画太晚"):sdlpal PostMagic(敌抖,fight.c:4323)在
  //   召唤神**仍在场**时播,神淡出(fight.c:899 cleanup)在 PostMagic **之后**。此前 ts 把 fadeOut bundle 在
  //   god sequence 内、PostMagic 之前 → 神先消失才抖敌。修:postMagicFrames 入参,裹神留场,排在 fadeOut 前。
  it('buildSummonGodSequence:postMagicFrames 在 offMagic 后、fadeOut 前,裹召唤神留场(fight.c:4323 神在场→899 淡出)', () => {
    const off = [{ durationMs: 100, overlays: [] }]
    const post = [
      {
        durationMs: 40,
        fighters: [{ side: 'enemy' as const, idx: 0, pos: { x: 1, y: 2 }, iColorShift: 6 }],
      },
    ]
    const seq = buildSummonGodSequence({
      spriteKey: 'player-12',
      pos: { x: 240, y: 165 },
      bgColorShift: 5,
      totalFrames: 3,
      frameTimeMs: 100,
      offMagicFrames: off,
      postMagicFrames: post,
    })
    // 结构:fadeIn 72 + loop 1(塌缩) + offMagic 1 + postMagic 1 + fadeOut 72
    expect(seq.length).toBe(SUMMON_FADE_STEPS + 1 + 1 + 1 + SUMMON_FADE_STEPS)
    const postIdx = seq.findIndex((f) => f.fighters?.some((d) => d.side === 'enemy'))
    const firstFadeOutIdx = seq.findIndex((f) => f.summon?.fadeDir === 'out')
    expect(postIdx).toBeGreaterThanOrEqual(0)
    expect(firstFadeOutIdx).toBeGreaterThan(postIdx) // PostMagic 在 fadeOut 之前
    // PostMagic 帧裹召唤神留场:frame=lastFrame(=2),无 fadeDir → present summonGodMode 神在场 + 仍画敌(可见抖动)
    const postFrame = seq[postIdx]!
    expect(postFrame.summon).toMatchObject({
      spriteKey: 'player-12',
      frame: 2,
      pos: { x: 240, y: 165 },
      bgColorShift: 5,
    })
    expect(postFrame.summon!.fadeDir).toBeUndefined()
    // 敌受击 delta 保留(裹 summon 不丢 fighters)
    expect(postFrame.fighters).toEqual([
      { side: 'enemy', idx: 0, pos: { x: 1, y: 2 }, iColorShift: 6 },
    ])
  })

  // 天剑变回来(user 2026-06-17 报):召唤淡出应 crossfade 到**复位后的正常主角**(站立帧/不高亮/原位),
  //   但 tp 漏了 sdlpal fight.c:901 在 fadeOut(:911)前的 PAL_BattleUpdateFighters → crossfade 目标是残留的
  //   施法帧(PreMagic currentFrame=5)+高亮(brighten iColorShift=10)+上移(PreMagic pos)。修:resetFighters 挂 fadeOut 首帧。
  it('buildSummonGodSequence:resetFighters 挂 fadeOut 首帧(对齐 fight.c:901 UpdateFighters 在 FadeScene 前)', () => {
    const off = [{ durationMs: 100, overlays: [] }]
    const reset = [
      { side: 'player' as const, idx: 0, pos: { x: 50, y: 100 }, iColorShift: 0, currentFrame: 0 },
      { side: 'player' as const, idx: 1, pos: { x: 80, y: 110 }, iColorShift: 0, currentFrame: 0 },
    ]
    const seq = buildSummonGodSequence({
      spriteKey: 'player-12',
      pos: { x: 240, y: 165 },
      bgColorShift: 5,
      totalFrames: 3,
      frameTimeMs: 100,
      offMagicFrames: off,
      resetFighters: reset,
    })
    const firstFadeOutIdx = seq.findIndex((f) => f.summon?.fadeDir === 'out')
    expect(firstFadeOutIdx).toBeGreaterThanOrEqual(0)
    // fadeOut 首帧带队员复位 delta → crossfade 目标 = 站立帧/不高亮/原位的正常主角
    expect(seq[firstFadeOutIdx]!.fighters).toEqual(reset)
    // 后续 fadeOut 帧不重复带(applyAnimFrame 累积保持,无需逐帧写)
    expect(seq[firstFadeOutIdx + 1]!.fighters).toBeUndefined()
  })

  it('buildSummonGodSequence:无 postMagicFrames(默认 [])→ 结构不变,末帧仍是 fadeOut', () => {
    const seq = buildSummonGodSequence({
      spriteKey: 'player-12',
      pos: { x: 240, y: 165 },
      bgColorShift: 0,
      totalFrames: 3,
      frameTimeMs: 100,
      offMagicFrames: [{ durationMs: 100, overlays: [] }],
    })
    expect(seq.length).toBe(SUMMON_FADE_STEPS + 1 + 1 + SUMMON_FADE_STEPS) // loop 塌缩单帧 + offMagic 1,无 postMagic
    expect(seq[seq.length - 1]!.summon!.fadeDir).toBe('out')
  })
})
