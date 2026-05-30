/**
 * 法术表(SSS.MKF chunk 2 OBJECT_MAGIC 段 + DATA.MKF chunk 4 MAGIC 结构体)解析。
 *
 * Spell wrapper(SSS chunk 2, OBJECT_MAGIC 段, [296..397]):
 *   wMagicNumber / wReserved1 / wScriptOnSuccess / wScriptOnUse /
 *   wScriptDesc / wReserved2 / wFlags
 * Magic stats(DATA chunk 4, 16 × WORD = 32 字节 / 条):见 MAGIC_OFF 表。
 *
 * 两个文件分别 dump,运行时 `Spell.magicNumber` 索引 Magic[]。
 */
import type { Magic, MagicType, ObjectMagicView, ObjectPoisonView, Spell, SpellFlags } from '@type-pal/shared'
import type { Words } from '../../io/word.js'
import {
  OBJ_SIZE,
  SPELL_COUNT,
  SPELL_OBJ_START,
  s16,
  u16,
} from './_utils.js'

// ── OBJECT_MAGIC 字段偏移 (global.h tagOBJECT_MAGIC, Win9x 7 WORD) ────────
// wMagicNumber(0), wReserved1(2), wScriptOnSuccess(4), wScriptOnUse(6),
// wScriptDesc(8), wReserved2(10), wFlags(12)
const SPELL_OFF = {
  magicNumber: 0,
  scriptOnSuccess: 4,
  scriptOnUse: 6,
  scriptDesc: 8,
  flags: 12,
} as const

// ── MAGICFLAG bitmask (global.h tagMAGICFLAG) ─────────────────────────────
// kMagicFlagUsableOutsideBattle = 1 << 0
// kMagicFlagUsableInBattle      = 1 << 1
// kMagicFlagUsableToEnemy       = 1 << 3   ← bit 2 跳了(sdlpal 真值)
// kMagicFlagApplyToAll          = 1 << 4
function parseSpellFlags(raw: number): SpellFlags {
  return {
    usableOutsideBattle: !!(raw & (1 << 0)),
    usableInBattle: !!(raw & (1 << 1)),
    usableToEnemy: !!(raw & (1 << 3)),
    applyToAll: !!(raw & (1 << 4)),
  }
}

// ── DATA.MKF chunk 4: MAGIC 结构体 (global.h tagMAGIC) ────────────────────
// 共 16×WORD = 32 字节:
//   wEffect(0), wType(2), wXOffset(4), wYOffset(6),
//   rgSpecific(8)*, wSpeed(10)†, wKeepEffect(12), wFireDelay(14),
//   wEffectTimes(16), wShake(18), wWave(20), wUnknown(22),
//   wCostMP(24), wBaseDamage(26), wElemental(28), wSound(30)†
//
// * rgSpecific 是 union(MAGIC_SPECIAL):summon 时是 wSummonEffect(WORD),
//   其他时是 sLayerOffset(SHORT)。M3 raw u16 保存,后续 task 按 type 解读。
// † wSpeed / wSound 在 sdlpal 是 SHORT(signed)。
const MAGIC_SIZE = 32

const MAGIC_OFF = {
  effect: 0,
  type: 2,
  xOffset: 4,
  yOffset: 6,
  special: 8, // rgSpecific (union)
  speed: 10, // SHORT
  keepEffect: 12,
  fireDelay: 14,
  effectTimes: 16,
  shake: 18,
  wave: 20,
  unknown: 22,
  costMP: 24,
  baseDamage: 26,
  elemental: 28,
  sound: 30, // SHORT
} as const

// MAGIC_TYPE map(对照 sdlpal `global.h::tagMAGIC_TYPE`)。
// 注意:6 / 7 / >9 在 sdlpal enum 内未定义 → 'other' 兜底(实测数据偶有出现)。
const MAGIC_TYPE_MAP: Record<number, MagicType> = {
  0: 'normal',
  1: 'attackAll',
  2: 'attackWhole',
  3: 'attackField',
  4: 'applyToPlayer',
  5: 'applyToParty',
  8: 'trance',
  9: 'summon',
}

function toMagicType(raw: number): MagicType {
  return MAGIC_TYPE_MAP[raw] ?? 'other'
}

/**
 * 从 SSS.MKF chunk 2 解析法术 wrapper 列表(OBJECT_MAGIC)。
 *
 * 对照 sdlpal `global.h::tagOBJECT_MAGIC`(Win9x 7 WORD):
 *   wMagicNumber / wReserved1 / wScriptOnSuccess / wScriptOnUse /
 *   wScriptDesc / wReserved2 / wFlags
 *
 * **id 是什么**(2026-05-29 改):`id` = **sdlpal OBJECT 数组全局 wObjectID**(296..397)。
 * 跟 items.json 同口径(统一 wObjectID 体系)。player-roles `rgwMagic` / addMagic opcode
 * operand 都是 spell wObjectID,`spells.find(s => s.id === wObjectID)` 直接命中。
 * 详细 stats 仍走 `magic[spell.magicNumber]`(magicNumber 是 MAGIC 表独立 index,不变)。
 *
 * **`magicNumber`**:指向 Magic[] 详细 stats 表(见 parseMagicTable)。
 *
 * @param objBuf SSS.MKF chunk 2 原始字节
 * @param words  可选;parseWordDat 解出的名称表,用于反向填 `_name`
 */
export function parseSpells(objBuf: Uint8Array, words?: Words): Spell[] {
  const expectedMinBytes = (SPELL_OBJ_START + SPELL_COUNT) * OBJ_SIZE
  if (objBuf.byteLength < expectedMinBytes) {
    throw new Error(
      `parseSpells: SSS.MKF chunk 2 truncated (got ${objBuf.byteLength}B, need ≥ ${expectedMinBytes}B for spells 0..${SPELL_COUNT - 1})`,
    )
  }
  const view = new DataView(objBuf.buffer, objBuf.byteOffset, objBuf.byteLength)
  const out: Spell[] = []
  for (let i = 0; i < SPELL_COUNT; i++) {
    const base = (SPELL_OBJ_START + i) * OBJ_SIZE
    const spell: Spell = {
      id: SPELL_OBJ_START + i, // wObjectID(296..397),见上 id 体系注释

      magicNumber: u16(view, base, SPELL_OFF.magicNumber),
      scriptOnSuccess: u16(view, base, SPELL_OFF.scriptOnSuccess),
      scriptOnUse: u16(view, base, SPELL_OFF.scriptOnUse),
      scriptDesc: u16(view, base, SPELL_OFF.scriptDesc),
      flags: parseSpellFlags(u16(view, base, SPELL_OFF.flags)),
    }
    const nm = words?.spells[i]
    if (nm) spell._name = nm
    out.push(spell)
  }
  return out
}

/**
 * 把**整个** OBJECT 数组(SSS.MKF chunk 2)按 `tagOBJECT_MAGIC` 段解读,dump 出
 * magic-union 视图。
 *
 * 用途:`0x42 SimulateMagic` / `0x66 throw weapon` 把任意 object id 当 magic 解读
 * (`rgObject[id].magic.wMagicNumber` / `.wFlags`)。投掷物(梅花镖/银针/卵 共 26 处)
 * 的 op0 = **24**,在 item 段之下、不在 `parseSpells` 的 [296..397] 范围内,无法用
 * spells.json 解析 → 必须 dump 完整 OBJECT 数组的 magic 视图。
 *
 * 与 `parseSpells` 的区别:不限于法术段,逐 14 字节遍历**所有** object id(0..N),
 * id = OBJECT 数组绝对 index(= sdlpal wObjectID)。非法术段的条目是 union 重解读结果,
 * 通常无意义,但 `0x42` 只引用真当 magic 用的 id(24 / 296+),无害。
 *
 * 偏移与 `parseSpells` 同(`SPELL_OFF`,Win9x `tagOBJECT_MAGIC`)。
 *
 * @param objBuf SSS.MKF chunk 2 原始字节
 */
export function parseObjectMagics(objBuf: Uint8Array): ObjectMagicView[] {
  const view = new DataView(objBuf.buffer, objBuf.byteOffset, objBuf.byteLength)
  const count = Math.floor(objBuf.byteLength / OBJ_SIZE)
  const out: ObjectMagicView[] = []
  for (let id = 0; id < count; id++) {
    const base = id * OBJ_SIZE
    out.push({
      id,
      magicNumber: u16(view, base, SPELL_OFF.magicNumber),
      scriptOnSuccess: u16(view, base, SPELL_OFF.scriptOnSuccess),
      scriptOnUse: u16(view, base, SPELL_OFF.scriptOnUse),
      flags: parseSpellFlags(u16(view, base, SPELL_OFF.flags)),
    })
  }
  return out
}

// ── OBJECT_POISON 字段偏移 (global.h tagOBJECT_POISON) ────────────────────
// wPoisonLevel(0), wColor(2), wPlayerScript(4), wReserved(6), wEnemyScript(8)
const POISON_OFF = {
  level: 0,
  color: 2,
  playerScript: 4,
  enemyScript: 8,
} as const

/**
 * 把**整个** OBJECT 数组(SSS.MKF chunk 2)按 `tagOBJECT_POISON` 段解读,dump poison 视图。
 *
 * 用途:`0x28 apply poison` 的 op1 = poison object id(551..562),需该 object 的
 * `wEnemyScript`(敌人中毒每回合脚本)。同 parseObjectMagics,逐 14 字节遍历所有 id。
 *
 * @param objBuf SSS.MKF chunk 2 原始字节
 */
export function parseObjectPoisons(objBuf: Uint8Array): ObjectPoisonView[] {
  const view = new DataView(objBuf.buffer, objBuf.byteOffset, objBuf.byteLength)
  const count = Math.floor(objBuf.byteLength / OBJ_SIZE)
  const out: ObjectPoisonView[] = []
  for (let id = 0; id < count; id++) {
    const base = id * OBJ_SIZE
    out.push({
      id,
      level: u16(view, base, POISON_OFF.level),
      color: u16(view, base, POISON_OFF.color),
      playerScript: u16(view, base, POISON_OFF.playerScript),
      enemyScript: u16(view, base, POISON_OFF.enemyScript),
    })
  }
  return out
}

/**
 * 从 DATA.MKF chunk 4 解析法术详细 stats 列表。
 * 对照 sdlpal `global.h::tagMAGIC`(16×WORD = 32 字节 / 条),
 * 由 sdlpal `global.c:296 LOAD_DATA(... fpDATA 4)` 加载。
 *
 * **id 是什么**:`id` = 该 magic 在 magic.json 数组里的索引,等于 sdlpal
 * 数组下标(index 0 通常为空 placeholder)。`Spell.magicNumber` 字段直接
 * 用作此数组下标。
 *
 * **signed 字段**:`speed` 与 `sound` 是 SHORT(`tagMAGIC` 真值)。
 *
 * @param magicBuf DATA.MKF chunk 4 原始字节
 */
export function parseMagicTable(magicBuf: Uint8Array): Magic[] {
  if (magicBuf.byteLength % MAGIC_SIZE !== 0) {
    throw new Error(
      `parseMagicTable: DATA.MKF chunk 4 size ${magicBuf.byteLength} 不能被 MAGIC_SIZE=${MAGIC_SIZE} 整除`,
    )
  }
  const view = new DataView(magicBuf.buffer, magicBuf.byteOffset, magicBuf.byteLength)
  const count = magicBuf.byteLength / MAGIC_SIZE
  const out: Magic[] = []
  for (let i = 0; i < count; i++) {
    const base = i * MAGIC_SIZE
    out.push({
      id: i,
      effect: u16(view, base, MAGIC_OFF.effect),
      type: toMagicType(u16(view, base, MAGIC_OFF.type)),
      xOffset: u16(view, base, MAGIC_OFF.xOffset),
      yOffset: u16(view, base, MAGIC_OFF.yOffset),
      special: u16(view, base, MAGIC_OFF.special),
      speed: s16(view, base, MAGIC_OFF.speed),
      keepEffect: u16(view, base, MAGIC_OFF.keepEffect),
      fireDelay: u16(view, base, MAGIC_OFF.fireDelay),
      effectTimes: u16(view, base, MAGIC_OFF.effectTimes),
      shake: u16(view, base, MAGIC_OFF.shake),
      wave: u16(view, base, MAGIC_OFF.wave),
      unknown: u16(view, base, MAGIC_OFF.unknown),
      costMP: u16(view, base, MAGIC_OFF.costMP),
      baseDamage: u16(view, base, MAGIC_OFF.baseDamage),
      elemental: u16(view, base, MAGIC_OFF.elemental),
      sound: s16(view, base, MAGIC_OFF.sound),
    })
  }
  return out
}
