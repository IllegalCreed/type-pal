/**
 * 数据表 parser 共享 helper / layout 常量。
 *
 * T9 拆分自原 tables.ts:把 7 个 parser 共享的字面常量(对象数组 layout、
 * OBJECT 段切片、单条记录字节数等)与 u16/s16 helper 集中在此,parsers/*.ts
 * 与外部 caller 都从 tables.ts barrel re-export。
 */

// ── OBJECT 数组 (SSS.MKF chunk 2) ──────────────────────────────────────────
// WIN95 版:OBJECT = union of 7 WORDs = 14 字节
export const OBJ_SIZE = 14 // bytes per OBJECT

// 物品段在 OBJECT 数组中的起始索引与数量(同 WORD.DAT 的 ITEMS_OFFSET/ITEMS_COUNT = 61..295,235 个 word)。
// 注:ITEM_COUNT 是 word 段大小(235);真物品 234 个 —— 末位 object 295=梦蛇 是**法术**(见 MENGSHE_OBJ_ID),
//   parseItems 会跳过它,故 items.json 实际 234 条。
export const ITEM_OBJ_START = 61
export const ITEM_COUNT = 235

/**
 * 梦蛇 = object **295**(巫后/赵灵儿的女娲变身术)。它是**法术**(player rgwMagic 引用、`0x55 addMagic` 授予、
 * OBJECT magic-union 有效),但名字落在 **item word 段末位**(61..295 的最后一个),不在 spell 段(296..397)。
 * 从没被 giveItem / 装备 / 入库当物品。故:**spells.ts 把它补进 spells.json**(magic-union),**items.ts 把它
 * 从 items.json 排除**(不是物品)。原版 magicmenu 不分段、直接读 rgObject[295](magic-union 施法 + item-union
 * wScriptDesc 出说明);我们分段后须这样手工归位。全表唯一落在 spell 段外的玩家法术。
 */
export const MENGSHE_OBJ_ID = 295

// 法术段
export const SPELL_OBJ_START = 296
export const SPELL_COUNT = 102

// 敌人对象段(OBJECT_ENEMY)— 用于反向 _name 索引
export const ENEMY_OBJ_START = 398
export const ENEMY_OBJ_COUNT = 153

// 人物对象段(OBJECT_PLAYER)— WORD.DAT persons / PlayerRoles.rgwName 指向这里
export const PLAYER_OBJ_START = 36
export const PLAYER_OBJ_COUNT = 6

// ── OBJECT_ENEMY 字段偏移 (global.h tagOBJECT_ENEMY,5 字段 × 2 字节)──────
// 0: wEnemyID            — 指向 DATA.MKF chunk 1 ENEMY 数组的 1-based 索引
// 2: wResistanceToSorcery
// 4: wScriptOnTurnStart  — 每回合开始跑(B-w2.a AI hook)
// 6: wScriptOnBattleEnd  — 战斗结束跑
// 8: wScriptOnReady      — enemy 准备出招时跑,classic 模式是 ActionQueue 跑到 enemy 时
export const ENEMY_OBJ_ID_OFF = 0
export const ENEMY_OBJ_RESIST_OFF = 2
export const ENEMY_OBJ_ON_TURN_START_OFF = 4
export const ENEMY_OBJ_ON_BATTLE_END_OFF = 6
export const ENEMY_OBJ_ON_READY_OFF = 8

// MAX_PLAYER_ROLES (palcommon.h:45)
export const PLAYER_ROLES_NUM = 6

// ── 字节读取小工具(LE / signed / unsigned)─────────────────────────────
export function u16(view: DataView, base: number, fieldOff: number): number {
  return view.getUint16(base + fieldOff, true)
}

export function s16(view: DataView, base: number, fieldOff: number): number {
  return view.getInt16(base + fieldOff, true)
}
