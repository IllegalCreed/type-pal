/** Enemy and player hit choreography, reused by physical and magic actions. */
import type { BattleAnimFrame, FighterDelta } from '../battle-state.js'
import { delayMs } from './frames.js'

export interface BuildPostMagicInput {
  /**
   * 受伤的敌人(health != prevHP)idx + idle 底锚 pos —— 本帧抖动这些敌人。
   * 调用方过滤好(只传 health != prevHP 的);空 → 无敌人抖,但仍产 3 帧 delay + 复位(忠实 sdlpal)。
   */
  hurtEnemies: Array<{ idx: number; pos: { x: number; y: number } }>
}

/**
 * PostMagic 动画时间线(port fight.c:3189-3246 PAL_BattleShowPostMagicAnim)。
 *
 *   - i=0..2:受伤敌 pos.x-=dist(dist 8→-4→2),iColorShift=(i==1?6:0),各 Delay(1)(fight.c:3216-3237)
 *   - 末:所有敌 pos=posBak 复位,Delay(1)(fight.c:3240-3245)
 *
 * 注:sdlpal y 不变(fight.c:3229 注释掉 y -= dist/2)。
 *     iColorShift 复位由 resetFightersAfterAction 兜底,但末复位帧仍显式带 iColorShift=0
 *     (i=2 帧已 iColorShift=0;复位帧只动 pos)。
 */
export function buildPostMagicTimeline(input: BuildPostMagicInput): BattleAnimFrame[] {
  const { hurtEnemies } = input
  const frames: BattleAnimFrame[] = []

  let dist = 8
  // 累积 x 位移(每帧基于上一帧 pos 再 -=dist,对齐 sdlpal in-place mutate)。
  const curX = new Map<number, number>()
  for (const he of hurtEnemies) curX.set(he.idx, he.pos.x)

  for (let i = 0; i < 3; i++) {
    const fighters: BattleAnimFrame['fighters'] = []
    for (const he of hurtEnemies) {
      const nx = (curX.get(he.idx) ?? he.pos.x) - dist
      curX.set(he.idx, nx)
      fighters.push({
        side: 'enemy',
        idx: he.idx,
        pos: { x: nx, y: he.pos.y },
        iColorShift: i === 1 ? 6 : 0,
      })
    }
    frames.push({
      durationMs: delayMs(1),
      fighters: fighters.length > 0 ? fighters : undefined,
    })
    dist = Math.trunc(dist / -2)
  }

  // —— 末:复位 pos = posBak,Delay(1)(fight.c:3240-3245)——
  const resetFighters: BattleAnimFrame['fighters'] = hurtEnemies.map((he) => ({
    side: 'enemy' as const,
    idx: he.idx,
    pos: { x: he.pos.x, y: he.pos.y },
    iColorShift: 0,
  }))
  frames.push({
    durationMs: delayMs(1),
    fighters: resetFighters.length > 0 ? resetFighters : undefined,
  })

  return frames
}

/**
 * 队员被敌方法术命中的**受击动画**(port fight.c:4861-4899,PAL_BattleEnemyPerformAction 魔法分支)。
 * sdlpal 在 ShowEnemyMagicAnim + 伤害结算 + DisplayStatChange **之后**对**受伤队员**跑 5 帧:
 *   for i=0..4:wCurrentFrame=4(受击姿);i>0 → pos += (8>>i, 4>>i)(递减击退 4,2/2,1/1,0/0,0);
 *   iColorShift=(i<3 ? 6 : 0)(前 3 帧红闪);各 PAL_BattleDelay(1)。
 * 之后 resetFightersAfterAction 复位 pos/frame。**之前 ts 完全没播 → user 实测"我方受击动画还是没有"**。
 *
 * @param affected 受伤队员 + 其复位底锚(posOriginal)。AoE 时多个;单体一个。
 */
export function buildPlayerMagicHitReaction(
  affected: ReadonlyArray<{ idx: number; pos: { x: number; y: number } }>,
): BattleAnimFrame[] {
  if (affected.length === 0) return []
  const cur = affected.map((a) => ({ idx: a.idx, x: a.pos.x, y: a.pos.y }))
  const frames: BattleAnimFrame[] = []
  for (let i = 0; i < 5; i++) {
    const fighters: FighterDelta[] = cur.map((c) => {
      if (i > 0) {
        c.x += 8 >> i
        c.y += 4 >> i
      }
      return {
        side: 'player' as const,
        idx: c.idx,
        currentFrame: 4,
        iColorShift: i < 3 ? 6 : 0,
        pos: { x: c.x, y: c.y },
      }
    })
    frames.push({ durationMs: delayMs(1), fighters })
  }
  return frames
}
