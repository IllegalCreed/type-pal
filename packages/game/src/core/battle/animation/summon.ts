/** Summon brightness and scene composition; the renderer owns crossfade and loop playback. */
import type { BattleAnimFrame, FighterDelta } from '../battle-state.js'
import { delayMs } from './frames.js'

/** PAL_BattleFadeScene crossfade 步数(battle.c:632 12 outer × 6 inner = 72)。 */
export const SUMMON_FADE_STEPS = 72

/** crossfade 每步时长(battle.c:631 time = SDL_GetTicks()+16)。 */
export const SUMMON_FADE_STEP_MS = 16

/**
 * 召唤全员变亮(sdlpal fight.c:3120-3128):i=1..10,所有队员 iColorShift=i,各 Delay(1)。
 * 召唤神精灵载入前的"聚光"前奏。
 */
export function buildSummonBrightenTimeline(partySize: number): BattleAnimFrame[] {
  const frames: BattleAnimFrame[] = []
  for (let i = 1; i <= 10; i++) {
    const fighters: FighterDelta[] = []
    for (let j = 0; j < partySize; j++) fighters.push({ side: 'player', idx: j, iColorShift: i })
    frames.push({ durationMs: delayMs(1), fighters })
  }
  return frames
}

export interface BuildSummonInput {
  /** 召唤神精灵 key('player-{wSummonEffect+10}',F.MKF chunk)。 */
  spriteKey: string
  /** 召唤神屏幕底锚(posSummon = 240+xOffset, 165+yOffset)。 */
  pos: { x: number; y: number }
  /** 背景染色低 nibble 偏移(= (SHORT)magic.effectTimes)。 */
  bgColorShift: number
  /** 召唤神精灵帧数(F.MKF chunk numFrames)。 */
  totalFrames: number
  /** 召唤神逐帧时长 = (magic.speed + 5) * 10 ms(fight.c:3170-3171)。 */
  frameTimeMs: number
  /** 二次法术效果(FIRE.MKF)时间线 —— 调用方用 buildPlayerOffMagicTimeline(casterIdx=-1)建好传入。 */
  offMagicFrames: BattleAnimFrame[]
  /**
   * PostMagic(敌受击抖动)时间线 —— 调用方用 buildPostMagicTimeline 建好传入(缺/空 = 无)。
   * sdlpal PostMagic(fight.c:4323)在召唤神**仍在场**时播,神淡出(fight.c:899 cleanup)在其**之后**。
   * 故此处把 postMagic 裹召唤神留场(frame=lastFrame)排在 offMagic 后、fadeOut 前 —— 否则神先淡出敌再抖,
   * 受击动画过晚(user 2026-06-05 报"天剑敌人受击动画太晚")。
   */
  postMagicFrames?: BattleAnimFrame[]
  /**
   * 召唤淡出**前**复位的队员 fighter delta —— 对齐 sdlpal fight.c:901 `PAL_BattleUpdateFighters()` 在
   * `PAL_BattleFadeScene()`(:911 fadeOut)**之前**调。挂 fadeOut **首帧** → crossfade 目标场景 = 复位后的
   * 正常主角(站立帧 / iColorShift=0 / pos=posOriginal),而非残留的**施法帧(PreMagic currentFrame=5)+
   * 高亮(brighten iColorShift=10)+ 上移(PreMagic pos)**(user 2026-06-17 报"天剑变回来是施法帧+高亮+迁移")。
   * 缺/空 = 不在此序列复位；生产调用方负责提供复位快照。
   */
  resetFighters?: BattleAnimFrame['fighters']
}

/**
 * 召唤神演出序列(port fight.c:3072-3187 PAL_BattleShowPlayerSummonMagicAnim 主体 + fight.c:897-912 淡出)。
 *
 *  fadeIn(3151-3152 PAL_BattleFadeScene):召唤神 frame0,72 步 dither crossfade(队员→召唤神),各 16ms。
 *  loop(3160-3181):召唤神 frame 0..totalFrames-2,各 (speed+5)*10 ms(隐队员只画召唤神)。
 *  offMagic(3186):二次法术效果落敌;召唤神定格 last frame 仍在场(精灵未释放,PAL_BattleMakeScene 续画)。
 *  postMagic(4323):敌受击抖动;召唤神**仍在场**(fight.c:899 cleanup 淡出在 PostMagic 之后)→ 裹 summon 留场。
 *  fadeOut(897-912 cleanup):72 步 dither crossfade(召唤神→队员),各 16ms;末态清 summon → 队员归位。
 *
 * 全程 summon.bgColorShift 给背景染色(battle.c:63-67)。present 据 summon.fadeDir 决定渲染"召唤神场景"
 * (in/loop,神在场仍画敌)还是"队员场景"(out),并 dither crossfade 对侧快照。
 */
export function buildSummonGodSequence(input: BuildSummonInput): BattleAnimFrame[] {
  const {
    spriteKey,
    pos,
    bgColorShift,
    totalFrames,
    frameTimeMs,
    offMagicFrames,
    postMagicFrames,
  } = input
  const frames: BattleAnimFrame[] = []
  const lastFrame = Math.max(0, totalFrames - 1)

  // —— fadeIn:召唤神 frame0,72 步 crossfade(队员→召唤神)——
  for (let s = 0; s < SUMMON_FADE_STEPS; s++) {
    frames.push({
      durationMs: SUMMON_FADE_STEP_MS,
      summon: { spriteKey, frame: 0, pos, bgColorShift, fadeStep: s, fadeDir: 'in' },
    })
  }
  // —— loop:塌缩成**单一时间线帧**(durationMs = loop 总时长),present 每 rAF 按 wall-clock 细分 iSummonFrame
  //   (stepSummonLoopRender),绕开 40ms 逻辑 tick 对 frameTimeMs(天剑 50ms)的拍频离散 —— 否则 frame0 在
  //   40ms tick 下停 80ms(user 2026-06-17 报"刚完全变成剑的前几帧卡顿")。sdlpal loop 本是独立 50ms blocking
  //   循环(精确 50ms/帧)。loop 帧数 = totalFrames-1(fight.c while iSummonFrame < numFrames-1)。——
  const loopCount = totalFrames - 1
  if (loopCount > 0) {
    frames.push({
      durationMs: loopCount * frameTimeMs,
      summon: { spriteKey, frame: 0, pos, bgColorShift, loop: { count: loopCount, frameTimeMs } },
    })
  }
  // —— offMagic:二次效果落敌,召唤神定格 last frame 在场 ——
  for (const f of offMagicFrames) {
    frames.push({ ...f, summon: { spriteKey, frame: lastFrame, pos, bgColorShift } })
  }
  // —— postMagic:敌受击抖动,召唤神**仍在场**(fight.c:4323 神在场 → 899 后淡出);裹 summon 留场,排 fadeOut 前 ——
  for (const f of postMagicFrames ?? []) {
    frames.push({ ...f, summon: { spriteKey, frame: lastFrame, pos, bgColorShift } })
  }
  // —— fadeOut:72 步 crossfade(召唤神→队员)。**首帧注入 resetFighters** 复位队员(sdlpal fight.c:901
  //   `PAL_BattleUpdateFighters()` 在 :911 `PAL_BattleFadeScene()` 之前调)→ crossfade 目标场景 = 复位后的
  //   正常主角(站立帧/iColorShift=0/原位),而非残留的施法帧+高亮+上移。applyAnimFrame 累积保持,后续帧不必重复。——
  for (let s = 0; s < SUMMON_FADE_STEPS; s++) {
    const frame: BattleAnimFrame = {
      durationMs: SUMMON_FADE_STEP_MS,
      summon: { spriteKey, frame: lastFrame, pos, bgColorShift, fadeStep: s, fadeDir: 'out' },
    }
    if (s === 0 && input.resetFighters && input.resetFighters.length > 0)
      frame.fighters = input.resetFighters
    frames.push(frame)
  }
  return frames
}
