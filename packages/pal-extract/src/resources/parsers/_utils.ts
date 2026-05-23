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

// 物品段在 OBJECT 数组中的起始索引与数量(同 WORD.DAT 的 ITEMS_OFFSET/ITEMS_COUNT)
export const ITEM_OBJ_START = 61
export const ITEM_COUNT = 235

// 法术段
export const SPELL_OBJ_START = 296
export const SPELL_COUNT = 102

// 敌人对象段(OBJECT_ENEMY)— 用于反向 _name 索引
export const ENEMY_OBJ_START = 398
export const ENEMY_OBJ_COUNT = 153

// ── OBJECT_ENEMY 字段偏移 (global.h tagOBJECT_ENEMY) ────────────────────
// wEnemyID(0) — 指向 DATA.MKF chunk 1 ENEMY 数组的 1-based 索引
export const ENEMY_OBJ_ID_OFF = 0

// MAX_PLAYER_ROLES (palcommon.h:45)
export const PLAYER_ROLES_NUM = 6

// ── 字节读取小工具(LE / signed / unsigned)─────────────────────────────
export function u16(view: DataView, base: number, fieldOff: number): number {
  return view.getUint16(base + fieldOff, true)
}

export function s16(view: DataView, base: number, fieldOff: number): number {
  return view.getInt16(base + fieldOff, true)
}
