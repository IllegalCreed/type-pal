/**
 * 战斗精灵底锚坐标真值(单一来源)—— core + present 共用,杜绝两层漂移。
 *
 * D17a 把坐标表从 present `draw-battle-sprites.ts` 提到 core,理由:
 *   createBattleState 要初始化 fighter `pos/posOriginal`(动画时间线驱动),
 *   必须与渲染层用同一坐标源(sdlpal `g_Battle.rg{Player,Enemy}[i].pos` 由
 *   PAL_BattleMakeScene 同一表算出)。
 */

import type { EnemyPosTable } from '@type-pal/shared'

/**
 * 队员战斗位置(sdlpal `battle.c:27 g_rgPlayerPos[3][3][2]` 真值)。
 *   1 player : (240, 170)
 *   2 players: (200, 176), (256, 152)
 *   3 players: (180, 180), (234, 170), (270, 146)
 * sdlpal 表只到 3 人;4/5 人(party 可有 5,但战斗 layout 只 3 位)沿用 3 人 + 加格兜底。
 */
export const PLAYER_POSITIONS_BY_COUNT: ReadonlyArray<ReadonlyArray<{ x: number; y: number }>> = [
  // 1 player
  [{ x: 240, y: 170 }],
  // 2 players
  [
    { x: 200, y: 176 },
    { x: 256, y: 152 },
  ],
  // 3 players
  [
    { x: 180, y: 180 },
    { x: 234, y: 170 },
    { x: 270, y: 146 },
  ],
  // 4+ players(sdlpal 表只到 3 人,4 人沿用 3 人 + 加一格)
  [
    { x: 180, y: 180 },
    { x: 234, y: 170 },
    { x: 270, y: 146 },
    { x: 280, y: 130 },
  ],
  // 5 players(罕见)
  [
    { x: 180, y: 180 },
    { x: 234, y: 170 },
    { x: 270, y: 146 },
    { x: 280, y: 130 },
    { x: 290, y: 110 },
  ],
]

/**
 * 敌方位置 fallback(EnemyPosTable 缺时兜底)。优先 EnemyPosTable
 * (DATA.MKF chunk 13 真值,sdlpal `global.h ENEMYPOS`)。
 */
export const ENEMY_POSITIONS_FALLBACK: ReadonlyArray<{ x: number; y: number }> = [
  { x: 160, y: 80 },
  { x: 100, y: 60 },
  { x: 220, y: 60 },
  { x: 70, y: 90 },
  { x: 250, y: 90 },
]

/**
 * 队员底锚(sdlpal `g_rgPlayerPos[maxPartyMemberIndex][i]`)。
 * @returns idx 越界 / 无 layout → undefined。
 */
export function getPlayerBasePos(
  partyCount: number,
  idx: number,
): { x: number; y: number } | undefined {
  const positions =
    PLAYER_POSITIONS_BY_COUNT[Math.min(partyCount - 1, PLAYER_POSITIONS_BY_COUNT.length - 1)]
  const pos = positions?.[idx]
  return pos ? { x: pos.x, y: pos.y } : undefined
}

/**
 * 敌方底锚(sdlpal `battle.c:936-939`:EnemyPos.pos[i][maxEnemyIndex] + wYPosOffset)。
 * @param enemyPos   EnemyPosTable(缺则 fallback)
 * @param enemyCount 当前敌人数(选 layouts[count-1])
 * @param idx        敌人 raw index
 * @param yPosOffset enemy.e.yPosOffset(battle.c:939)
 * @returns idx 越界 / 无 layout → undefined。
 */
export function getEnemyBasePos(
  enemyPos: EnemyPosTable | undefined,
  enemyCount: number,
  idx: number,
  yPosOffset: number,
): { x: number; y: number } | undefined {
  const layout = enemyPos?.layouts[enemyCount - 1] ?? ENEMY_POSITIONS_FALLBACK
  const pos = layout[idx]
  return pos ? { x: pos.x, y: pos.y + yPosOffset } : undefined
}
