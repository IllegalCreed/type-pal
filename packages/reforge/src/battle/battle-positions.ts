/**
 * 战斗精灵底锚坐标(M4b)—— 移植一阶段 battle-positions.ts(= sdlpal battle.c 真值)。
 * 队员/敌人的落点(脚底中心);present 据此画战斗精灵。坐标系 = 320×200 逻辑屏。
 */

/** 队员战斗位置(sdlpal battle.c:27 g_rgPlayerPos[3][3][2];表只到 3 人,4/5 沿用+加格)。 */
export const PLAYER_POSITIONS_BY_COUNT: ReadonlyArray<ReadonlyArray<{ x: number; y: number }>> = [
  [{ x: 240, y: 170 }],
  [{ x: 200, y: 176 }, { x: 256, y: 152 }],
  [{ x: 180, y: 180 }, { x: 234, y: 170 }, { x: 270, y: 146 }],
  [{ x: 180, y: 180 }, { x: 234, y: 170 }, { x: 270, y: 146 }, { x: 280, y: 130 }],
  [{ x: 180, y: 180 }, { x: 234, y: 170 }, { x: 270, y: 146 }, { x: 280, y: 130 }, { x: 290, y: 110 }],
]

/** 敌方位置 fallback(EnemyPosTable 缺时;优先原版 ENEMYPOS 表)。 */
export const ENEMY_POSITIONS_FALLBACK: ReadonlyArray<{ x: number; y: number }> = [
  { x: 160, y: 80 },
  { x: 100, y: 60 },
  { x: 220, y: 60 },
  { x: 70, y: 90 },
  { x: 250, y: 90 },
]

/** 队员底锚。idx/layout 越界 → undefined。 */
export function getPlayerBasePos(partyCount: number, idx: number): { x: number; y: number } | undefined {
  const positions = PLAYER_POSITIONS_BY_COUNT[Math.min(partyCount - 1, PLAYER_POSITIONS_BY_COUNT.length - 1)]
  return positions?.[idx]
}

/** 敌方底锚(+ yPosOffset,battle.c:939)。idx 越界 → undefined。 */
export function getEnemyBasePos(
  layout: ReadonlyArray<{ x: number; y: number }> | undefined,
  idx: number,
  yPosOffset = 0,
): { x: number; y: number } | undefined {
  const pos = (layout ?? ENEMY_POSITIONS_FALLBACK)[idx]
  return pos ? { x: pos.x, y: pos.y + yPosOffset } : undefined
}
