/**
 * 数据表解析 —— 物品 / 法术 / 敌人。
 *
 * 数据来源:
 *   物品/法术 ——  SSS.MKF chunk 2 (OBJECT 数组, WIN95 版每条 7×WORD = 14 字节)
 *   敌人基础数据 — DATA.MKF chunk 1 (ENEMY 结构体数组, 每条 35×WORD = 70 字节)
 *   法术细节数据 — DATA.MKF chunk 4 (MAGIC 结构体数组, 每条 16×WORD = 32 字节)
 *
 * 参考 reference/sdlpal/global.h (OBJECT_ITEM / OBJECT_MAGIC / OBJECT_ENEMY / ENEMY / MAGIC)
 * 与 reference/sdlpal/global.c::PAL_InitGameData / PAL_LoadDefaultGame。
 *
 * 对象索引段划分(实测 1998 Win9x 版 WIN95, 565 条对象):
 *   [0..35]   系统/UI 文字 (36)
 *   [36..41]  人物 (6)
 *   [42..60]  战斗 UI (19)
 *   [61..295] 物品 (235) ← ITEM_OBJ_START / ITEM_COUNT
 *   [296..397]法术 (102) ← SPELL_OBJ_START / SPELL_COUNT
 *   [398..550]敌人 (153) ← ENEMY_OBJ_START / ENEMY_COUNT
 *   [551..564]毒素/杂项 (14)
 */

import type { Enemy, Item, Spell } from '@type-pal/shared'
import type { Words } from '../io/word.js'

// ── OBJECT 数组 (SSS.MKF chunk 2) ──────────────────────────────────────────
// WIN95 版:OBJECT = union of 7 WORDs = 14 字节
const OBJ_SIZE = 14 // bytes per OBJECT

// 物品段在 OBJECT 数组中的起始索引与数量(同 WORD.DAT 的 ITEMS_OFFSET/ITEMS_COUNT)
const ITEM_OBJ_START = 61
const ITEM_COUNT = 235

// 法术段
const SPELL_OBJ_START = 296
const SPELL_COUNT = 102

// 敌人对象段(OBJECT_ENEMY)
const ENEMY_OBJ_START = 398
const ENEMY_OBJ_COUNT = 153

// ── OBJECT_ITEM 字段偏移 (global.h tagOBJECT_ITEM) ────────────────────────
// wBitmap(0), wPrice(2), wScriptOnUse(4), wScriptOnEquip(6),
// wScriptOnThrow(8), wScriptDesc(10), wFlags(12)
const ITEM_OFF = {
  bitmap: 0,
  price: 2,
  scriptOnUse: 4,
  scriptOnEquip: 6,
  scriptOnThrow: 8,
  // scriptDesc = 10 (unused in Item interface)
  flags: 12,
} as const

// ── OBJECT_MAGIC 字段偏移 (global.h tagOBJECT_MAGIC) ──────────────────────
// wMagicNumber(0), wReserved1(2), wScriptOnSuccess(4), wScriptOnUse(6),
// wScriptDesc(8), wReserved2(10), wFlags(12)
const MAGIC_OBJ_OFF = {
  magicNumber: 0,
  flags: 12,
} as const

// ── DATA.MKF chunk 4: MAGIC 结构体 (global.h tagMAGIC) ────────────────────
// 共 16×WORD = 32 字节:
//   wEffect(0), wType(2), wXOffset(4), wYOffset(6),
//   rgSpecific(8), wSpeed(10), wKeepEffect(12), wFireDelay(14),
//   wEffectTimes(16), wShake(18), wWave(20), wUnknown(22),
//   wCostMP(24), wBaseDamage(26), wElemental(28), wSound(30)
const MAGIC_SIZE = 32

const MAGIC_OFF = {
  mp: 24, // wCostMP
  base: 26, // wBaseDamage
  effect: 28, // wElemental  (0 = 无属性, 1-4 = 各属性)
} as const

// ── DATA.MKF chunk 1: ENEMY 结构体 (global.h tagENEMY) ────────────────────
// 35×WORD = 70 字节:
//   wIdleFrames(0), wMagicFrames(2), wAttackFrames(4), wIdleAnimSpeed(6),
//   wActWaitFrames(8), wYPosOffset(10),
//   wAttackSound(12), wActionSound(14), wMagicSound(16), wDeathSound(18), wCallSound(20),
//   wHealth(22), wExp(24), wCash(26),
//   wLevel(28),
//   wMagic(30), wMagicRate(32), wAttackEquivItem(34), wAttackEquivItemRate(36),
//   wStealItem(38), nStealItem(40),
//   wAttackStrength(42), wMagicStrength(44), wDefense(46),
//   wDexterity(48), wFleeRate(50), wPoisonResistance(52),
//   wElemResistance[5](54..63), wPhysicalResistance(64),
//   wDualMove(66), wCollectValue(68)
const ENEMY_SIZE = 70

const ENEMY_OFF = {
  hp: 22, // wHealth
  level: 28, // wLevel
  attack: 42, // wAttackStrength
  defense: 46, // wDefense
  // NOTE: ENEMY 结构体无 MP 字段;Enemy.mp 填 0(TODO: 确认是否有隐含字段)
} as const

// ── OBJECT_ENEMY 字段偏移 (global.h tagOBJECT_ENEMY) ────────────────────
// wEnemyID(0) — 指向 DATA.MKF chunk 1 ENEMY 数组的 1-based 索引
const ENEMY_OBJ_ID_OFF = 0

// ── 工具函数 ─────────────────────────────────────────────────────────────
function u16(view: DataView, base: number, fieldOff: number): number {
  return view.getUint16(base + fieldOff, true)
}

// ── 公开导出 ──────────────────────────────────────────────────────────────

/**
 * 从 SSS.MKF chunk 2 的原始字节解析物品列表。
 *
 * @param objBuf SSS.MKF chunk 2 的原始字节(openMkf + readChunk 取出,不需要解压)
 * @param words  parseWordDat 解出的名称表
 */
export function parseItems(objBuf: Uint8Array, words: Words): Item[] {
  const view = new DataView(objBuf.buffer, objBuf.byteOffset, objBuf.byteLength)
  const out: Item[] = []
  for (let i = 0; i < ITEM_COUNT; i++) {
    const base = (ITEM_OBJ_START + i) * OBJ_SIZE
    out.push({
      id: i,
      name: words.items[i] ?? `_item_${i}`,
      bitmap: u16(view, base, ITEM_OFF.bitmap),
      price: u16(view, base, ITEM_OFF.price),
      scriptOnUse: u16(view, base, ITEM_OFF.scriptOnUse),
      scriptOnEquip: u16(view, base, ITEM_OFF.scriptOnEquip),
      scriptOnThrow: u16(view, base, ITEM_OFF.scriptOnThrow),
      flags: u16(view, base, ITEM_OFF.flags),
    })
  }
  return out
}

/**
 * 从 SSS.MKF chunk 2 + DATA.MKF chunk 4 解析法术列表。
 *
 * 法术对象(OBJECT_MAGIC)的 wMagicNumber 指向 DATA.MKF #4 中的 MAGIC 结构体,
 * mp / base / effect 均来自 MAGIC;flags 来自 OBJECT_MAGIC.wFlags。
 *
 * @param objBuf   SSS.MKF chunk 2 原始字节
 * @param magicBuf DATA.MKF chunk 4 原始字节
 * @param words    parseWordDat 解出的名称表
 */
export function parseSpells(
  objBuf: Uint8Array,
  magicBuf: Uint8Array,
  words: Words,
): Spell[] {
  const objView = new DataView(objBuf.buffer, objBuf.byteOffset, objBuf.byteLength)
  const magicView = new DataView(magicBuf.buffer, magicBuf.byteOffset, magicBuf.byteLength)
  const magicCount = Math.floor(magicBuf.byteLength / MAGIC_SIZE)
  const out: Spell[] = []

  for (let i = 0; i < SPELL_COUNT; i++) {
    const objBase = (SPELL_OBJ_START + i) * OBJ_SIZE
    const magicNum = u16(objView, objBase, MAGIC_OBJ_OFF.magicNumber)
    const flags = u16(objView, objBase, MAGIC_OBJ_OFF.flags)

    let mp = 0
    let base = 0
    let effect = 0

    if (magicNum > 0 && magicNum < magicCount) {
      const mBase = magicNum * MAGIC_SIZE
      mp = u16(magicView, mBase, MAGIC_OFF.mp)
      base = u16(magicView, mBase, MAGIC_OFF.base)
      effect = u16(magicView, mBase, MAGIC_OFF.effect)
    }

    out.push({
      id: i,
      name: words.spells[i] ?? `_spell_${i}`,
      mp,
      base,
      effect,
      flags,
    })
  }
  return out
}

/**
 * 从 SSS.MKF chunk 2 + DATA.MKF chunk 1 解析敌人列表。
 *
 * 敌人对象(OBJECT_ENEMY)的 wEnemyID 是 1-based 索引指向 DATA.MKF #1 的 ENEMY 结构体。
 * 名称来自 words.enemies(按对象段位置, 0-based)。
 *
 * NOTE: ENEMY 结构体无 mp 字段,Enemy.mp 恒为 0。
 *       (sdlpal global.h tagENEMY 无 wMP/wMaxMP 字段)
 *
 * @param objBuf   SSS.MKF chunk 2 原始字节
 * @param enemyBuf DATA.MKF chunk 1 原始字节
 * @param words    parseWordDat 解出的名称表
 */
export function parseEnemies(
  objBuf: Uint8Array,
  enemyBuf: Uint8Array,
  words: Words,
): Enemy[] {
  const objView = new DataView(objBuf.buffer, objBuf.byteOffset, objBuf.byteLength)
  const enemyView = new DataView(enemyBuf.buffer, enemyBuf.byteOffset, enemyBuf.byteLength)
  const enemyCount = Math.floor(enemyBuf.byteLength / ENEMY_SIZE)
  const out: Enemy[] = []

  for (let i = 0; i < ENEMY_OBJ_COUNT; i++) {
    const objBase = (ENEMY_OBJ_START + i) * OBJ_SIZE
    const enemyId = u16(objView, objBase, ENEMY_OBJ_ID_OFF) // 1-based

    let level = 0
    let hp = 0
    let attack = 0
    let defense = 0

    if (enemyId > 0 && enemyId < enemyCount) {
      const eBase = enemyId * ENEMY_SIZE
      hp = u16(enemyView, eBase, ENEMY_OFF.hp)
      level = u16(enemyView, eBase, ENEMY_OFF.level)
      attack = u16(enemyView, eBase, ENEMY_OFF.attack)
      defense = u16(enemyView, eBase, ENEMY_OFF.defense)
    }

    out.push({
      id: i,
      name: words.enemies[i] ?? `_enemy_${i}`,
      level,
      hp,
      mp: 0, // TODO: ENEMY struct has no mp field; always 0
      attack,
      defense,
    })
  }
  return out
}
