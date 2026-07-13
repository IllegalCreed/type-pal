/**
 * EnemyPos 抽取(M3.5):DATA.MKF chunk 13。
 *
 * 对照 sdlpal global.c::PAL_LoadDefaultGame line 303-305 + global.h:401-404:
 *   typedef struct tagENEMYPOS { PALPOS pos[MAX_ENEMIES_IN_TEAM][MAX_ENEMIES_IN_TEAM]; } ENEMYPOS;
 *   typedef struct tagPALPOS   { WORD x; WORD y; } PALPOS;
 * MAX_ENEMIES_IN_TEAM = 5(palcommon.h:60)。chunk 13 = 5 × 5 × 4 = 100 bytes。
 *
 * 用法(对照 sdlpal battle.c:936-937):
 *   x = pos[enemyIdx][maxEnemyIndex].x  // enemyIdx in [0, maxEnemyIndex]
 *   y = pos[enemyIdx][maxEnemyIndex].y
 * 即 第二维 = (team enemyCount - 1),决定 5 种 layout(1/2/3/4/5 enemy)。
 *
 * 我方 dump 成 `EnemyPos.layouts[count-1][enemyIdx] = {x, y}` 二维数组,运行时
 * `state.enemies.length` 选 layouts 行,enemyIdx 选 列。
 */

const MAX_ENEMIES_IN_TEAM = 5
const PALPOS_BYTES = 4 // x:u16 + y:u16
const ENEMY_POS_BYTES = MAX_ENEMIES_IN_TEAM * MAX_ENEMIES_IN_TEAM * PALPOS_BYTES // 100

export interface EnemyPosLayout {
  /** 每个 layout 一个数组,长度 = enemyCount;layouts[count-1][enemyIdx] = {x, y} */
  layouts: ReadonlyArray<ReadonlyArray<{ x: number; y: number }>>
}

export function parseEnemyPos(chunk: Uint8Array): EnemyPosLayout {
  if (chunk.byteLength !== ENEMY_POS_BYTES) {
    throw new Error(`parseEnemyPos: expected ${ENEMY_POS_BYTES} bytes, got ${chunk.byteLength}`)
  }
  const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength)
  // sdlpal C struct 内存布局:pos[i][j] 表示 row=i col=j,
  // sizeof(PALPOS) = 4 → pos[i][j] 在 byte offset (i * 5 + j) * 4。
  // 但 sdlpal 用法 pos[enemyIdx][maxEnemyIndex] —— 即 第一维 = enemyIdx,
  // 第二维 = 总数-1。我方 dump 转成 layouts[count-1][enemyIdx]:
  //   for count in 1..5: layouts[count-1] = [pos[0][count-1], pos[1][count-1], ..., pos[count-1][count-1]]
  const layouts: { x: number; y: number }[][] = []
  for (let maxIdx = 0; maxIdx < MAX_ENEMIES_IN_TEAM; maxIdx++) {
    const row: { x: number; y: number }[] = []
    for (let enemyIdx = 0; enemyIdx <= maxIdx; enemyIdx++) {
      const off = (enemyIdx * MAX_ENEMIES_IN_TEAM + maxIdx) * PALPOS_BYTES
      const x = view.getUint16(off, true)
      const y = view.getUint16(off + 2, true)
      row.push({ x, y })
    }
    layouts.push(row)
  }
  return { layouts }
}
