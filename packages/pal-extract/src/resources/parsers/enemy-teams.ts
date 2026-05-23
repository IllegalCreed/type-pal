/**
 * 敌队表(DATA.MKF chunk 2 ENEMYTEAM 数组)解析。
 *
 * 对照 sdlpal `global.h::tagENEMYTEAM`(5 × WORD = 10 字节 / 条),
 * 由 `global.c:294 LOAD_DATA(... fpDATA 2)` 加载。
 */
import type { EnemyTeam } from '@type-pal/shared'
import { u16 } from './_utils.js'

// ── DATA.MKF chunk 2: ENEMYTEAM 数组 (global.h tagENEMYTEAM) ─────────────
// 每条 = MAX_ENEMIES_IN_TEAM × WORD = 5 × 2 = 10 字节(palcommon.h:60 MAX_ENEMIES_IN_TEAM=5)。
//
// 槽位语义(battle.c:1602):
//   w = lprgEnemyTeam[wEnemyTeam].rgwEnemy[j];
//   if (w == 0xFFFF) continue;       ← 空槽位
//   if (w != 0) { ... 装载 ... }    ← 0 也跳过,只是没显式判
// 非空 slot 是 OBJECT 数组的绝对 index(指向 OBJECT_ENEMY 段)。
const TEAM_SLOT_COUNT = 5 // MAX_ENEMIES_IN_TEAM
const TEAM_RECORD_SIZE = TEAM_SLOT_COUNT * 2

/**
 * 从 DATA.MKF chunk 2 解析敌队列表(ENEMYTEAM 数组)。
 *
 * 对照 sdlpal `global.h::tagENEMYTEAM`(5 × WORD = 10 字节 / 条),
 * 由 sdlpal `global.c:294 LOAD_DATA(... fpDATA 2)` 加载。
 *
 * **id 是什么**:`id` = 该 team 在 enemy-teams.json 数组里的索引,
 * = sdlpal `lprgEnemyTeam[wEnemyTeam]` 的下标。M3 dev panel 选战斗 fixture 直接 `teams[id]`。
 *
 * **enemies tuple 含义**(对照 sdlpal `battle.c:1602`):
 * - `0xFFFF` = 空槽位
 * - `0`      = 也跳过(sdlpal `if (w != 0)` 后才装载)
 * - 其他    = OBJECT 数组的绝对 index(落在 OBJECT_ENEMY 段,实测 398-550)
 *
 * **_names 反查**:可选;传入 `enemyObjectNames` 时,对每个非空 / 非 0 槽位反查名字。
 * 调 buildEnemyObjectNameMap(objBuf, words) 得这个 map。
 *
 * @param teamBuf          DATA.MKF chunk 2 原始字节(未压缩)
 * @param enemyObjectNames 可选;OBJECT 绝对 index → 名字 的反向映射(buildEnemyObjectNameMap 产出)
 */
export function parseEnemyTeams(
  teamBuf: Uint8Array,
  enemyObjectNames?: Map<number, string>,
): EnemyTeam[] {
  if (teamBuf.byteLength % TEAM_RECORD_SIZE !== 0) {
    throw new Error(
      `parseEnemyTeams: DATA.MKF chunk 2 size ${teamBuf.byteLength} 不能被 TEAM_RECORD_SIZE=${TEAM_RECORD_SIZE} 整除`,
    )
  }
  const view = new DataView(teamBuf.buffer, teamBuf.byteOffset, teamBuf.byteLength)
  const count = teamBuf.byteLength / TEAM_RECORD_SIZE
  const out: EnemyTeam[] = []
  for (let i = 0; i < count; i++) {
    const base = i * TEAM_RECORD_SIZE
    const enemies: [number, number, number, number, number] = [
      u16(view, base, 0),
      u16(view, base, 2),
      u16(view, base, 4),
      u16(view, base, 6),
      u16(view, base, 8),
    ]
    const team: EnemyTeam = { id: i, enemies }
    if (enemyObjectNames) {
      const names: string[] = []
      for (const slot of enemies) {
        // 0xFFFF = 空,0 = 跳过(对照 sdlpal battle.c:1602)
        if (slot === 0 || slot === 0xffff) continue
        const nm = enemyObjectNames.get(slot)
        if (nm) names.push(nm)
      }
      if (names.length > 0) team._names = names
    }
    out.push(team)
  }
  return out
}
