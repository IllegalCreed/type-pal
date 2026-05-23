/**
 * 数据表 parser —— barrel re-export(T9 拆分)。
 *
 * T8 reviewer mandate:原 tables.ts(802 行)按 parser 切到 `parsers/*.ts`,
 * 本文件保留作为统一 barrel,使所有 caller(`from '../resources/tables.js'`)
 * 导入路径不变。
 *
 * 数据来源(各 parser 自带详细注释):
 *   物品 / 法术 wrapper / 敌人对象 —— SSS.MKF chunk 2 (OBJECT 数组, 14 字节 / 条)
 *   敌人基础数据                     — DATA.MKF chunk 1 (ENEMY,    70 字节 / 条)
 *   敌队                              — DATA.MKF chunk 2 (ENEMYTEAM,10 字节 / 条)
 *   角色组                            — DATA.MKF chunk 3 (PLAYERROLES,900 字节 / 整条)
 *   法术细节数据                      — DATA.MKF chunk 4 (MAGIC,    32 字节 / 条)
 *   战场                              — DATA.MKF chunk 5 (BATTLEFIELD, 12 字节 / 条)
 *
 * 对象索引段划分(实测 1998 Win9x 版 WIN95, 565 条对象):
 *   [0..35]   系统/UI 文字 (36)
 *   [36..41]  人物 (6)
 *   [42..60]  战斗 UI (19)
 *   [61..295] 物品 (235)
 *   [296..397]法术 (102)
 *   [398..550]敌人 (153)
 *   [551..564]毒素/杂项 (14)
 */

export { parseBattleFields } from './parsers/battle-fields.js'
export {
  buildEnemyObjectNameMap,
  buildObjectIndexToEnemyIdMap,
  parseEnemies,
} from './parsers/enemies.js'
export { parseEnemyTeams } from './parsers/enemy-teams.js'
export { parseItems } from './parsers/items.js'
export { parsePlayerRoles } from './parsers/player-roles.js'
export { parseMagicTable, parseSpells } from './parsers/spells.js'
