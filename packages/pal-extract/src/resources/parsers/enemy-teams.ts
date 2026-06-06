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
//
// dump 时把 OBJECT 绝对 index 翻译到 enemies.json id(= sdlpal OBJECT_ENEMY.wEnemyID),
// 同时把原始槽位保存在 enemyObjectIndexes。运行时用 enemy id 取属性、原始对象号取脚本,
// 避免同一 enemy id 的多个 OBJECT_ENEMY 变体被错误合并。
// 若 caller 不传 `objectIndexToEnemyId`,则保留原始 OBJECT 绝对 index(向后兼容)。
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
 * **enemies tuple 含义**(原始 / 兼容):
 * - `0xFFFF` = 空槽位
 * - `0`      = 也跳过(sdlpal `battle.c:1602` `if (w != 0)`)
 * - 其他    = OBJECT 数组的绝对 index(落在 OBJECT_ENEMY 段,实测 398-550)
 *
 * **M3.30 翻译模式**(`objectIndexToEnemyId` 传入时):
 * - 0 / 0xFFFF 保留(空槽位语义)
 * - 其他 OBJECT 绝对 index → 查 map 得 enemies.json id(= OBJECT_ENEMY.wEnemyID);
 *   找不到映射 → 槽位变 0xFFFF(等于空,运行时 filter 跳过)+ console.warn
 * - 原始 5 槽位同时写入 `enemyObjectIndexes`,供运行时精确反查 OBJECT_ENEMY 脚本
 *
 * **_names 反查**:可选;传入 `enemyObjectNames` 时,对每个非空 / 非 0 槽位反查名字。
 * 调 buildEnemyObjectNameMap(objBuf, words) 得这个 map。**注意**:名字反查的 key 永远是
 * 原始 OBJECT 绝对 index(在翻译之前),所以两个 map 都基于同一原始槽位 lookup。
 *
 * @param teamBuf              DATA.MKF chunk 2 原始字节(未压缩)
 * @param enemyObjectNames     可选;OBJECT 绝对 index → 名字(buildEnemyObjectNameMap 产出)
 * @param objectIndexToEnemyId 可选(M3.30);OBJECT 绝对 index → enemies.json id 的翻译表
 *                              (buildObjectIndexToEnemyIdMap 产出);传入则 enemies tuple
 *                              dump 出来已是 enemies.json id(运行时直接消费)
 */
export function parseEnemyTeams(
  teamBuf: Uint8Array,
  enemyObjectNames?: Map<number, string>,
  objectIndexToEnemyId?: Map<number, number>,
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
    const rawSlots: [number, number, number, number, number] = [
      u16(view, base, 0),
      u16(view, base, 2),
      u16(view, base, 4),
      u16(view, base, 6),
      u16(view, base, 8),
    ]
    // 翻译模式:OBJECT 绝对 index → enemies.json id;空 / 0 保留;失映标 0xFFFF + warn
    const enemies: [number, number, number, number, number] = objectIndexToEnemyId
      ? (rawSlots.map((slot) => {
          if (slot === 0 || slot === 0xffff) return slot
          const enemyId = objectIndexToEnemyId.get(slot)
          if (enemyId === undefined) {
            console.warn(
              `[parseEnemyTeams] team ${i} slot OBJECT index ${slot} 不在 OBJECT_ENEMY 段映射中,标空`,
            )
            return 0xffff
          }
          return enemyId
        }) as [number, number, number, number, number])
      : rawSlots
    const team: EnemyTeam = {
      id: i,
      enemies,
      ...(objectIndexToEnemyId ? { enemyObjectIndexes: rawSlots } : {}),
    }
    if (enemyObjectNames) {
      const names: string[] = []
      // 名字反查走原始 OBJECT 绝对 index(rawSlots),与翻译模式独立
      for (const slot of rawSlots) {
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
