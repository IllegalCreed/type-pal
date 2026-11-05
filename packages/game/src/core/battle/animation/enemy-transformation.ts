/** Enemy summon, transformation and division gestures for battle opcodes. */
import type { BattleAnimFrame, FighterDelta } from '../battle-state.js'
import { delayMs } from './frames.js'

export function buildEnemySummonTimeline(input: {
  casterIdx: number
  casterPos: { x: number; y: number }
  caster: {
    idleFrames: number
    magicFrames: number
    attackFrames: number
    actWaitFrames: number
  }
  summonedIdxs: number[]
  activeEnemyIdxs: number[]
}): BattleAnimFrame[] {
  // 0x9E 召唤起手:仅 magicFrames 手势循环,施法者**原地不动**(script.c:2874-2879)——
  //   与敌人放普通魔法(fight.c:4683 前移 12,6/4,2 共 16px)不同,召唤者不位移、无 attackFrames。
  const frames: BattleAnimFrame[] = []
  for (let i = 0; i < input.caster.magicFrames; i++) {
    frames.push({
      durationMs: delayMs(input.caster.actWaitFrames),
      fighters: [
        { side: 'enemy', idx: input.casterIdx, currentFrame: input.caster.idleFrames + i },
      ],
    })
  }

  if (input.summonedIdxs.length > 0) {
    frames.push({
      durationMs: delayMs(1),
      fighters: input.summonedIdxs.map((idx) => ({ side: 'enemy' as const, idx, iColorShift: 8 })),
      sound: 212,
    })
    frames.push({ durationMs: delayMs(2) })
  }

  frames.push({
    durationMs: delayMs(1),
    fighters: input.activeEnemyIdxs.map((idx) => ({ side: 'enemy' as const, idx, iColorShift: 0 })),
  })
  return frames
}

export function buildEnemyTransformTimeline(enemyIdx: number): BattleAnimFrame[] {
  const frames: BattleAnimFrame[] = []
  for (let i = 0; i < 6; i++) {
    frames.push({
      durationMs: delayMs(1),
      fighters: [{ side: 'enemy', idx: enemyIdx, iColorShift: i }],
    })
  }
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'enemy', idx: enemyIdx, iColorShift: 0 }],
    sound: 47,
  })
  return frames
}

/**
 * 0x9C 敌人分裂收尾散开动画(sdlpal script.c:009C 末段)。分裂后全部副本 pos 先**叠在原敌位置**(startPos),
 * 再 10 帧每帧 `pos = (pos + posOriginal)/2` 缓动散开到各自阵型位(targets),末帧 PAL_BattleUpdateFighters 归位。
 * 每帧 Delay(1)。startPos = 分裂前唯一活敌(原敌)posOriginal;targets = 分裂后全部活敌 {idx, posOriginal}。
 * 缺此动画 → 副本瞬间出现在阵型位(user 2026-06-08 报"分裂动画没做")。
 */
export function buildEnemyDivisionTimeline(input: {
  startPos: { x: number; y: number }
  targets: { idx: number; pos: { x: number; y: number } }[]
}): BattleAnimFrame[] {
  const frames: BattleAnimFrame[] = []
  // 各敌当前 pos —— 初始全叠在 startPos(sdlpal 把所有副本 pos 设成原敌 pos)。
  const cur = new Map(
    input.targets.map((t) => [t.idx, { x: input.startPos.x, y: input.startPos.y }]),
  )
  for (let step = 0; step < 10; step++) {
    const fighters: FighterDelta[] = input.targets.map((t) => {
      const c = cur.get(t.idx)!
      c.x = Math.trunc((c.x + t.pos.x) / 2)
      c.y = Math.trunc((c.y + t.pos.y) / 2)
      return { side: 'enemy' as const, idx: t.idx, pos: { x: c.x, y: c.y } }
    })
    frames.push({ durationMs: delayMs(1), fighters })
  }
  // 末帧归位 posOriginal(PAL_BattleUpdateFighters)。
  frames.push({
    durationMs: delayMs(1),
    fighters: input.targets.map((t) => ({
      side: 'enemy' as const,
      idx: t.idx,
      pos: { x: t.pos.x, y: t.pos.y },
    })),
  })
  return frames
}
