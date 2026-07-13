// detectors.ts —— 速通打点检测原语。每个工厂返回一个纯函数 Detector,只读快照。
import type { ProgressSnapshot } from './snapshot.js'

export type DetectorMem = Record<string, unknown>
export type Detector = (
  cur: ProgressSnapshot,
  prev: ProgressSnapshot | null,
  mem: DetectorMem,
) => boolean

/** 进入场景 N(仅进入那一帧)。 */
export function enterScene(n: number): Detector {
  return (cur, prev) => cur.scene === n && (prev == null || prev.scene !== n)
}

/** 离开场景 N(仅离开那一帧)。 */
export function leaveScene(n: number): Detector {
  return (cur, prev) => prev != null && prev.scene === n && cur.scene !== n
}

/** 进入集合 ns 中任一场景(从集合外进入)。 */
export function enterAnyScene(ns: readonly number[]): Detector {
  const set = new Set(ns)
  return (cur, prev) => set.has(cur.scene) && (prev == null || !set.has(prev.scene))
}

/** 在场景 scene 内,队首落在 (x,y) 的 ±tolX/±tolY 矩形容差内。 */
export function atSpot(scene: number, x: number, y: number, tolX = 48, tolY = 24): Detector {
  return (cur) =>
    cur.scene === scene && Math.abs(cur.partyX - x) <= tolX && Math.abs(cur.partyY - y) <= tolY
}

/** atSpot 的多点版:任一格命中即真(见石碑两点)。 */
export function atAnySpot(
  scene: number,
  cells: ReadonlyArray<readonly [number, number]>,
  tolX = 48,
  tolY = 24,
): Detector {
  return (cur) =>
    cur.scene === scene &&
    cells.some(([x, y]) => Math.abs(cur.partyX - x) <= tolX && Math.abs(cur.partyY - y) <= tolY)
}

/** 当前战斗含 boss 且全场敌人血≤0(镜像 PalTimer BossID==X && BattleTotalBlood<=0)。 */
export function bossWon(enemyId: number): Detector {
  return (cur) => {
    const battle = cur.battle
    return battle ? battle.enemyIds.has(enemyId) && battle.totalEnemyHp <= 0 : false
  }
}

/** 背包持有某物品(count>0,已在 snapshot 过滤)。 */
export function hasItem(itemId: number): Detector {
  return (cur) => cur.inventory.has(itemId)
}

/** 当前音乐号 == m。 */
export function bgmIs(musicId: number): Detector {
  return (cur) => cur.music === musicId
}

/** 过彩依两段:第一段等 boss(71)入场置位,第二段等其消失(含战斗结束)或全场血≤0。 */
export function caiyiDetector(enemyId = 71): Detector {
  return (cur, _prev, mem) => {
    // biome-ignore lint/complexity/useOptionalChain: 同 bossWon — `!= null &&` 保 inNow 为 boolean
    const inNow = cur.battle != null && cur.battle.enemyIds.has(enemyId)
    if (!mem.seen) {
      if (inNow) mem.seen = true
      return false
    }
    const gone = cur.battle == null || !cur.battle.enemyIds.has(enemyId)
    const cleared = cur.battle != null && cur.battle.totalEnemyHp <= 0
    return gone || cleared
  }
}
