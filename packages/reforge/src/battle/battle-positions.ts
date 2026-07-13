/**
 * 战斗精灵底锚坐标(M4b)—— 移植一阶段 battle-positions.ts(= sdlpal battle.c 真值)。
 * 队员/敌人的落点(脚底中心);present 据此画战斗精灵。坐标系 = 320×200 逻辑屏。
 */

/** 队员战斗位置(sdlpal battle.c:27 g_rgPlayerPos[3][3][2];表只到 3 人,4/5 沿用+加格)。 */
export const PLAYER_POSITIONS_BY_COUNT: ReadonlyArray<ReadonlyArray<{ x: number; y: number }>> = [
  [{ x: 240, y: 170 }],
  [
    { x: 200, y: 176 },
    { x: 256, y: 152 },
  ],
  [
    { x: 180, y: 180 },
    { x: 234, y: 170 },
    { x: 270, y: 146 },
  ],
  [
    { x: 180, y: 180 },
    { x: 234, y: 170 },
    { x: 270, y: 146 },
    { x: 280, y: 130 },
  ],
  [
    { x: 180, y: 180 },
    { x: 234, y: 170 },
    { x: 270, y: 146 },
    { x: 280, y: 130 },
    { x: 290, y: 110 },
  ],
]

/**
 * 敌方按数量的预设站位(原版 ENEMYPOS 表 = DATA.MKF chunk 13 = enemy-pos.json layouts)。
 * layouts[count-1] = count 个敌人时各自的落点(1 敌居中、2 敌左右、3 敌品字…)。
 */
export const ENEMY_POSITIONS_BY_COUNT: ReadonlyArray<ReadonlyArray<{ x: number; y: number }>> = [
  [{ x: 100, y: 110 }],
  [
    { x: 70, y: 130 },
    { x: 140, y: 106 },
  ],
  [
    { x: 70, y: 140 },
    { x: 100, y: 110 },
    { x: 160, y: 100 },
  ],
  [
    { x: 70, y: 140 },
    { x: 100, y: 110 },
    { x: 160, y: 100 },
    { x: 50, y: 100 },
  ],
  [
    { x: 70, y: 140 },
    { x: 100, y: 110 },
    { x: 160, y: 100 },
    { x: 30, y: 110 },
    { x: 90, y: 80 },
  ],
]

/** 队员底锚。idx/layout 越界 → undefined。 */
export function getPlayerBasePos(
  partyCount: number,
  idx: number,
): { x: number; y: number } | undefined {
  const positions =
    PLAYER_POSITIONS_BY_COUNT[Math.min(partyCount - 1, PLAYER_POSITIONS_BY_COUNT.length - 1)]
  return positions?.[idx]
}

/** 敌方底锚(按敌人总数选预设站位 + yPosOffset,battle.c:939)。idx 越界 → undefined。 */
export function getEnemyBasePos(
  enemyCount: number,
  idx: number,
  yPosOffset = 0,
): { x: number; y: number } | undefined {
  const layout =
    ENEMY_POSITIONS_BY_COUNT[Math.min(enemyCount - 1, ENEMY_POSITIONS_BY_COUNT.length - 1)]
  const pos = layout?.[idx]
  return pos ? { x: pos.x, y: pos.y + yPosOffset } : undefined
}
