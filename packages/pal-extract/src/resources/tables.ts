/**
 * 数据表解析 —— 物品 / 法术 wrapper / 法术 stats / 敌人。
 *
 * 数据来源:
 *   物品 / 法术 wrapper / 敌人对象 —— SSS.MKF chunk 2 (OBJECT 数组, WIN95 版每条 7×WORD = 14 字节)
 *   敌人基础数据                     — DATA.MKF chunk 1 (ENEMY 结构体数组, 每条 35×WORD = 70 字节)
 *   法术细节数据                     — DATA.MKF chunk 4 (MAGIC 结构体数组, 每条 16×WORD = 32 字节)
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

import type {
  BattleField,
  Enemy,
  EnemyTeam,
  Item,
  ItemFlags,
  Magic,
  MagicType,
  PlayerRole,
  PlayerRoles,
  Spell,
  SpellFlags,
} from '@type-pal/shared'
import { openMkf, readChunk } from '../io/mkf.js'
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

// 敌人对象段(OBJECT_ENEMY)— 用于反向 _name 索引
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
  scriptDesc: 10,
  flags: 12,
} as const

// ── ITEMFLAG bitmask 拆位 (global.h tagITEMFLAG) ──────────────────────────
// bit 0..5 = Usable / Equipable / Throwable / Consuming / ApplyToAll / Sellable
// bit 6.. = EquipableByPlayerRole_First + N(MAX_PLAYER_ROLES=6,sdlpal palcommon.h:45)
const PLAYER_ROLES = 6 // MAX_PLAYER_ROLES
const ITEM_FLAG_EQUIPABLE_BY_PLAYER_ROLE_FIRST_BIT = 6

function parseItemFlags(raw: number): ItemFlags {
  const equipableBy: boolean[] = []
  for (let i = 0; i < PLAYER_ROLES; i++) {
    equipableBy.push(!!(raw & (1 << (ITEM_FLAG_EQUIPABLE_BY_PLAYER_ROLE_FIRST_BIT + i))))
  }
  return {
    usable: !!(raw & (1 << 0)),
    equipable: !!(raw & (1 << 1)),
    throwable: !!(raw & (1 << 2)),
    consuming: !!(raw & (1 << 3)),
    applyToAll: !!(raw & (1 << 4)),
    sellable: !!(raw & (1 << 5)),
    equipableBy: equipableBy as ItemFlags['equipableBy'],
  }
}

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

// ── DATA.MKF chunk 1: ENEMY 结构体 (global.h tagENEMY) ────────────────────
// 35×WORD = 70 字节。M3 D28:全字段 dump + signed 语义 + 元素抗具名。
//
// 字段顺序 / 偏移按 reference/sdlpal/global.h tagENEMY 真值(实施时 verify 过):
//   wIdleFrames(0),  wMagicFrames(2),  wAttackFrames(4),  wIdleAnimSpeed(6),
//   wActWaitFrames(8), wYPosOffset(10),
//   wAttackSound(12), wActionSound(14), wMagicSound(16), wDeathSound(18), wCallSound(20),
//   wHealth(22),  wExp(24),  wCash(26),  wLevel(28),
//   wMagic(30),   wMagicRate(32),  wAttackEquivItem(34), wAttackEquivItemRate(36),
//   wStealItem(38), nStealItem(40),
//   wAttackStrength(42)*,  wMagicStrength(44)*,  wDefense(46)*,  wDexterity(48)*,
//   wFleeRate(50),  wPoisonResistance(52),
//   wElemResistance[5]: wind(54), thunder(56), water(58), fire(60), earth(62),
//   wPhysicalResistance(64),  wDualMove(66),  wCollectValue(68)
//
// * = signed 语义(sdlpal fight.c:4634 `(SHORT)g_Battle.rgEnemy[i].e.wAttackStrength`)。
//   声音 5 个字段也在 tagENEMY 中定义为 SHORT。
// 实测 DATA.MKF chunk 1 = 10780 字节 / 70 = 154 条 enemy
const ENEMY_SIZE = 70

// ── OBJECT_ENEMY 字段偏移 (global.h tagOBJECT_ENEMY) ────────────────────
// wEnemyID(0) — 指向 DATA.MKF chunk 1 ENEMY 数组的 1-based 索引
const ENEMY_OBJ_ID_OFF = 0

// ── DATA.MKF chunk 2: ENEMYTEAM 数组 (global.h tagENEMYTEAM) ─────────────
// sdlpal `global.c:294 LOAD_DATA(... fpDATA 2)`,每条 = MAX_ENEMIES_IN_TEAM × WORD
// = 5 × 2 = 10 字节(palcommon.h:60 MAX_ENEMIES_IN_TEAM=5)。
//
// 槽位语义(battle.c:1602):
//   w = lprgEnemyTeam[wEnemyTeam].rgwEnemy[j];
//   if (w == 0xFFFF) continue;       ← 空槽位
//   if (w != 0) { ... 装载 ... }    ← 0 也跳过,只是没显式判
// 非空 slot 是 OBJECT 数组的绝对 index(指向 OBJECT_ENEMY 段)。
const TEAM_SLOT_COUNT = 5 // MAX_ENEMIES_IN_TEAM
const TEAM_RECORD_SIZE = TEAM_SLOT_COUNT * 2

// ── DATA.MKF chunk 5: BATTLEFIELD 数组 (global.h tagBATTLEFIELD) ────────
// sdlpal `global.c:297 LOAD_DATA(... fpDATA 5)`,每条 = WORD + SHORT × NUM_MAGIC_ELEMENTAL
// = (1 + 5) × 2 = 12 字节(palcommon.h:57 NUM_MAGIC_ELEMENTAL=5)。
//
// 字段顺序(global.h:378-381):
//   wScreenWave(0,WORD)
//   rgsMagicEffect[5](2..10,SHORT × 5):wind(2), thunder(4), water(6), fire(8), earth(10)
//
// rgsMagicEffect 是 SHORT(signed)— 元素 buff 可正可负。
const FIELD_RECORD_SIZE = (1 + 5) * 2 // = 12

// ── DATA.MKF chunk 3: PLAYERROLES (global.h tagPLAYERROLES) ──────────────
// sdlpal `global.c LOAD_DATA(... fpDATA 3)` 把整个 PLAYERROLES 结构体作为单条
// 读入。布局是 **SoA(struct of arrays)**:每个 `PLAYERS = WORD[MAX_PLAYER_ROLES]`
// 6 个角色的同字段连续存放,再下个字段又一行;3 个 2D 字段(equipment / elemRes /
// magic)按 sdlpal 真值占 N × MAX_PLAYER_ROLES × 2 字节。
//
// 字段顺序(对照 reference/sdlpal/global.h tagPLAYERROLES 真值,2025 verified):
//   [PLAYERS × 11] rgwAvatar / rgwSpriteNumInBattle / rgwSpriteNum / rgwName /
//                  rgwAttackAll / rgwUnknown1 / rgwLevel / rgwMaxHP / rgwMaxMP /
//                  rgwHP / rgwMP
//   [WORD[6][6]]    rgwEquipment[MAX_PLAYER_EQUIPMENTS=6][MAX_PLAYER_ROLES=6]
//   [PLAYERS × 6]  rgwAttackStrength* / rgwMagicStrength* / rgwDefense* /
//                  rgwDexterity* / rgwFleeRate / rgwPoisonResistance
//   [WORD[5][6]]    rgwElementalResistance[NUM_MAGIC_ELEMENTAL=5][6]
//   [PLAYERS × 4]  rgwUnknown2 / rgwUnknown3 / rgwUnknown4 / rgwCoveredBy
//   [WORD[32][6]]   rgwMagic[MAX_PLAYER_MAGICS=32][6]
//   [PLAYERS × 4]  rgwWalkFrames / rgwCooperativeMagic / rgwUnknown5 / rgwUnknown6
//   [PLAYERS × 5]  rgwDeathSound* / rgwAttackSound* / rgwWeaponSound* /
//                  rgwCriticalSound* / rgwMagicSound*
//   [PLAYERS × 2]  rgwCoverSound / rgwDyingSound
//
// * = signed 语义(同 Enemy D28 + 5 个 sound;sdlpal 内部 SHORT cast)。
//
// 实测 sizeof(PLAYERROLES):
//   32 PLAYERS × (6 × 2)   = 384
//   + WORD[6][6]            = 72
//   + WORD[5][6]            = 60
//   + WORD[32][6]           = 384
//   = 900 字节(DATA.MKF chunk 3 size 实测 = 900 B,匹配)
//
// M2 实施过程发现 #5:`rgwSpriteNum[0] = 2`(leader,M2 切片硬编码,T9 才删)。
// 实测 6 个 spriteNum = [2, 3, 7, 525, 5, 26]。
const PLAYER_ROLES_NUM = 6 // MAX_PLAYER_ROLES, palcommon.h:45
const PLAYER_FIELD_SIZE = PLAYER_ROLES_NUM * 2 // 一个 PLAYERS = 12 字节
const PLAYER_EQUIPMENTS = 6 // MAX_PLAYER_EQUIPMENTS, palcommon.h
const PLAYER_MAGICS = 32 // MAX_PLAYER_MAGICS, palcommon.h
const ELEM_COUNT = 5 // NUM_MAGIC_ELEMENTAL, palcommon.h
const PLAYER_ROLES_BYTES =
  (32 * PLAYER_FIELD_SIZE) +
  (PLAYER_EQUIPMENTS * PLAYER_FIELD_SIZE) +
  (ELEM_COUNT * PLAYER_FIELD_SIZE) +
  (PLAYER_MAGICS * PLAYER_FIELD_SIZE) // = 900

const FIELD_OFF = {
  screenWave: 0,
  wind: 2,
  thunder: 4,
  water: 6,
  fire: 8,
  earth: 10,
} as const

// ── 工具函数 ─────────────────────────────────────────────────────────────
function u16(view: DataView, base: number, fieldOff: number): number {
  return view.getUint16(base + fieldOff, true)
}

function s16(view: DataView, base: number, fieldOff: number): number {
  return view.getInt16(base + fieldOff, true)
}

// ── 公开导出 ──────────────────────────────────────────────────────────────

/**
 * 从 SSS.MKF chunk 2 的原始字节解析物品列表。
 *
 * M3 T5 重构:flags 从 u16 raw 拆为 `ItemFlags` 具名 bool;`scriptDesc` 字段补齐;
 * 名字改 `_name?`(可选,注释用,引擎不读)与 parseEnemies pattern 一致。
 *
 * **id 是什么**:`id` = 该 item 在 items.json 数组里的索引(0..234),
 * 不是 OBJECT 数组里的绝对 index(那是 61..295)。M3 战斗 / dev panel
 * 选物品时直接 `items[id]`。
 *
 * @param objBuf SSS.MKF chunk 2 的原始字节(openMkf + readChunk 取出,不需要解压)
 * @param words  可选;parseWordDat 解出的名称表,用于反向填 `_name`
 */
export function parseItems(objBuf: Uint8Array, words?: Words): Item[] {
  // T5 review #1:与 parseEnemies / parseMagicTable 统一,截断时显式 throw 而不是软退出。
  const expectedMinBytes = (ITEM_OBJ_START + ITEM_COUNT) * OBJ_SIZE
  if (objBuf.byteLength < expectedMinBytes) {
    throw new Error(
      `parseItems: SSS.MKF chunk 2 truncated (got ${objBuf.byteLength}B, need ≥ ${expectedMinBytes}B for items 0..${ITEM_COUNT - 1})`,
    )
  }
  const view = new DataView(objBuf.buffer, objBuf.byteOffset, objBuf.byteLength)
  const out: Item[] = []
  for (let i = 0; i < ITEM_COUNT; i++) {
    const base = (ITEM_OBJ_START + i) * OBJ_SIZE
    const item: Item = {
      id: i,
      bitmap: u16(view, base, ITEM_OFF.bitmap),
      price: u16(view, base, ITEM_OFF.price),
      scriptOnUse: u16(view, base, ITEM_OFF.scriptOnUse),
      scriptOnEquip: u16(view, base, ITEM_OFF.scriptOnEquip),
      scriptOnThrow: u16(view, base, ITEM_OFF.scriptOnThrow),
      scriptDesc: u16(view, base, ITEM_OFF.scriptDesc),
      flags: parseItemFlags(u16(view, base, ITEM_OFF.flags)),
    }
    const nm = words?.items[i]
    if (nm) item._name = nm
    out.push(item)
  }
  return out
}

/**
 * 从 SSS.MKF chunk 2 解析法术 wrapper 列表(OBJECT_MAGIC)。
 *
 * 对照 sdlpal `global.h::tagOBJECT_MAGIC`(Win9x 7 WORD):
 *   wMagicNumber / wReserved1 / wScriptOnSuccess / wScriptOnUse /
 *   wScriptDesc / wReserved2 / wFlags
 *
 * **id 是什么**:`id` = 该 spell 在 spells.json 数组里的索引(0..101),
 * 不是 OBJECT 数组里的绝对 index(那是 296..397)。M3 战斗 / dev panel
 * 选法术时直接 `spells[id]`,详细 stats 走 `magic[spell.magicNumber]`。
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
      id: i,
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

/**
 * 把 DATA.MKF chunk 1(ENEMY 数组)解析为 Enemy[]。
 * 对照 sdlpal `global.h::tagENEMY` —— 35×WORD = 70 字节 / 条。
 *
 * **关键语义**(D28 / M3):
 * - `attackStrength / magicStrength / defense / dexterity` 用 `getInt16`(signed),
 *   sdlpal `fight.c:4634` 真实是 `int str = (SHORT)g_Battle.rgEnemy[i].e.wAttackStrength`。
 *   `0xFFFF` 表示 `-1`(modifier),M1 简化版误把这些当 unsigned 直接 dump,会得到 65535。
 * - 5 个 SHORT 声音字段(attackSound 等)同样 signed dump(`-1` 表示"无声音")。
 * - `elemResistance[5]` 拆 wind/thunder/water/fire/earth 5 个具名字段。
 *
 * **id 是什么**:`id` = 该 enemy 在 DATA.MKF chunk 1 数组里的索引,直接 = sdlpal
 * `OBJECT_ENEMY.wEnemyID` 指向的位置(直接索引,index 0 是空 placeholder,sdlpal 数据
 * 从 index 1 起算 —— 见 fight.c:516 `lprgEnemy[obj.enemy.wEnemyID]`,没减 1)。
 * M3 战斗代码拿 `OBJECT_ENEMY.wEnemyID` 直接索引 `enemies[]` 即可。
 *
 * **_name**:可选,反向通过 OBJECT_ENEMY 段 + WORD.DAT enemies 表填(本函数会做)。
 * 若没找到映射 → 留 undefined,引擎不读 `_name`,只是注释用。
 *
 * @param enemyBuf DATA.MKF chunk 1 原始字节(未压缩,实测 10780B / 70 = 154 条)
 * @param objBuf   可选;SSS.MKF chunk 2 原始字节,用于反向填 `_name`
 * @param words    可选;parseWordDat 解出的名称表
 */
export function parseEnemies(
  enemyBuf: Uint8Array,
  objBuf?: Uint8Array,
  words?: Words,
): Enemy[] {
  if (enemyBuf.byteLength % ENEMY_SIZE !== 0) {
    throw new Error(
      `parseEnemies: DATA.MKF chunk 1 size ${enemyBuf.byteLength} 不能被 ENEMY_SIZE=${ENEMY_SIZE} 整除`,
    )
  }
  const view = new DataView(enemyBuf.buffer, enemyBuf.byteOffset, enemyBuf.byteLength)
  const count = enemyBuf.byteLength / ENEMY_SIZE

  // 反向索引:enemyId(chunk 1 index) → _name(从 WORD.DAT 经 OBJECT_ENEMY 段)
  const nameByEnemyId = new Map<number, string>()
  if (objBuf && words) {
    const objView = new DataView(objBuf.buffer, objBuf.byteOffset, objBuf.byteLength)
    for (let i = 0; i < ENEMY_OBJ_COUNT; i++) {
      const objBase = (ENEMY_OBJ_START + i) * OBJ_SIZE
      const enemyId = u16(objView, objBase, ENEMY_OBJ_ID_OFF)
      const nm = words.enemies[i]
      if (enemyId > 0 && nm && !nameByEnemyId.has(enemyId)) {
        nameByEnemyId.set(enemyId, nm)
      }
    }
  }

  const out: Enemy[] = []
  for (let i = 0; i < count; i++) {
    const base = i * ENEMY_SIZE
    const e: Enemy = {
      id: i,
      idleFrames: u16(view, base, 0),
      magicFrames: u16(view, base, 2),
      attackFrames: u16(view, base, 4),
      idleAnimSpeed: u16(view, base, 6),
      actWaitFrames: u16(view, base, 8),
      yPosOffset: u16(view, base, 10),
      attackSound: s16(view, base, 12),
      actionSound: s16(view, base, 14),
      magicSound: s16(view, base, 16),
      deathSound: s16(view, base, 18),
      callSound: s16(view, base, 20),
      health: u16(view, base, 22),
      exp: u16(view, base, 24),
      cash: u16(view, base, 26),
      level: u16(view, base, 28),
      magic: u16(view, base, 30),
      magicRate: u16(view, base, 32),
      attackEquivItem: u16(view, base, 34),
      attackEquivItemRate: u16(view, base, 36),
      stealItem: u16(view, base, 38),
      stealItemCount: u16(view, base, 40),
      // signed modifier 字段
      attackStrength: s16(view, base, 42),
      magicStrength: s16(view, base, 44),
      defense: s16(view, base, 46),
      dexterity: s16(view, base, 48),
      fleeRate: u16(view, base, 50),
      poisonResistance: u16(view, base, 52),
      elemResistance: {
        wind: u16(view, base, 54),
        thunder: u16(view, base, 56),
        water: u16(view, base, 58),
        fire: u16(view, base, 60),
        earth: u16(view, base, 62),
      },
      physicalResistance: u16(view, base, 64),
      dualMove: u16(view, base, 66),
      collectValue: u16(view, base, 68),
    }
    const nm = nameByEnemyId.get(i)
    if (nm) e._name = nm
    out.push(e)
  }
  return out
}

/**
 * 反向索引:OBJECT 数组中的绝对 index(OBJECT_ENEMY 段)→ 敌人显示名。
 * 给 parseEnemyTeams 做 `_names` 反查用。
 *
 * 实现:遍历 OBJECT_ENEMY 段(ENEMY_OBJ_START..),拿到该 OBJECT 的
 * `wEnemyID`(指向 DATA.MKF chunk 1 ENEMY 数组),再去 words.enemies[i] 拿名字。
 * 注意:返回的 Map key 是 OBJECT 数组的绝对 index(398..550),不是 enemyID。
 *
 * @param objBuf SSS.MKF chunk 2 原始字节
 * @param words  parseWordDat 解出的名称表
 */
export function buildEnemyObjectNameMap(objBuf: Uint8Array, words: Words): Map<number, string> {
  const map = new Map<number, string>()
  const need = (ENEMY_OBJ_START + ENEMY_OBJ_COUNT) * OBJ_SIZE
  if (objBuf.byteLength < need) return map
  const view = new DataView(objBuf.buffer, objBuf.byteOffset, objBuf.byteLength)
  for (let i = 0; i < ENEMY_OBJ_COUNT; i++) {
    const objIndex = ENEMY_OBJ_START + i
    const enemyId = u16(view, objIndex * OBJ_SIZE, ENEMY_OBJ_ID_OFF)
    const nm = words.enemies[i]
    if (enemyId > 0 && nm) {
      map.set(objIndex, nm)
    }
  }
  return map
}

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

/**
 * 从 DATA.MKF chunk 5 解析战场列表(BATTLEFIELD 数组)。
 *
 * 对照 sdlpal `global.h::tagBATTLEFIELD`(WORD + SHORT × 5 = 12 字节 / 条),
 * 由 sdlpal `global.c:297 LOAD_DATA(... fpDATA 5)` 加载。
 *
 * **id 是什么**:`id` = 该 field 在 battle-fields.json 数组里的索引,
 * = sdlpal `lprgBattleField[wBattleField]` 的下标。M3 dev panel 选战斗 fixture 时用。
 *
 * **signed 字段**:`magicEffect` 五维 是 SHORT(sdlpal `rgsMagicEffect[NUM_MAGIC_ELEMENTAL]`),
 * 元素 buff 可正可负。
 *
 * @param fieldBuf DATA.MKF chunk 5 原始字节(未压缩)
 */
export function parseBattleFields(fieldBuf: Uint8Array): BattleField[] {
  if (fieldBuf.byteLength % FIELD_RECORD_SIZE !== 0) {
    throw new Error(
      `parseBattleFields: DATA.MKF chunk 5 size ${fieldBuf.byteLength} 不能被 FIELD_RECORD_SIZE=${FIELD_RECORD_SIZE} 整除`,
    )
  }
  const view = new DataView(fieldBuf.buffer, fieldBuf.byteOffset, fieldBuf.byteLength)
  const count = fieldBuf.byteLength / FIELD_RECORD_SIZE
  const out: BattleField[] = []
  for (let i = 0; i < count; i++) {
    const base = i * FIELD_RECORD_SIZE
    out.push({
      id: i,
      screenWave: u16(view, base, FIELD_OFF.screenWave),
      magicEffect: {
        wind: s16(view, base, FIELD_OFF.wind),
        thunder: s16(view, base, FIELD_OFF.thunder),
        water: s16(view, base, FIELD_OFF.water),
        fire: s16(view, base, FIELD_OFF.fire),
        earth: s16(view, base, FIELD_OFF.earth),
      },
    })
  }
  return out
}

/**
 * 从 DATA.MKF chunk 3 解析角色组(PLAYERROLES,M2 半解扩到 M3 战斗子集)。
 *
 * 对照 sdlpal `global.h::tagPLAYERROLES`(SoA 布局,sizeof = 900 B),
 * 由 sdlpal `global.c LOAD_DATA(... fpDATA 3)` 加载为一整条 PLAYERROLES 记录。
 *
 * **数据布局 SoA**(非 AoS):每个 PLAYERS 字段是 6 个 u16 一行(同字段连续),
 * 然后下一个字段又一行。`readPlayers(offset, signed)` 在固定 cursor 处提取一个
 * NUM_ROLES 长的数组。3 个 2D 矩阵(equipment / elemRes / magic)占
 * `N × MAX_PLAYER_ROLES × 2` 字节,本函数仅消费 elemRes(战斗用),其他跳过。
 *
 * **M3 dump 字段子集**(对照 PlayerRole interface):
 * - 战斗 stats / 显示 / 抗性 / 5 个 sound / walkFrames / attackAll
 * - **跳过**:equipment / magic learned / coveredBy / cooperativeMagic /
 *   6 个 sdlpal FIXME unknown / coverSound / dyingSound(留 M5)
 *
 * **leader spriteNum=2 实证**:M2 实施过程发现 #5,parser 实测 6 个 spriteNum =
 * `[2, 3, 7, 525, 5, 26]`(测试断言)。T9 删 cli.ts 里的 `PARTY_LEADER_SPRITE=2`
 * 硬编码后接此 dump。
 *
 * **signed 字段**:`attackStrength / magicStrength / defense / dexterity` 与
 * 5 个 sound 字段(`attackSound / weaponSound / criticalSound / magicSound /
 * deathSound`)按 SHORT 处理,与 Enemy D28 一致。
 *
 * @param dataMkfBytes DATA.MKF 整个 .MKF 字节(本函数内部 openMkf + readChunk 3)
 * @param words        可选;parseWordDat 解出的名称表,用于反向填 `_name`
 *                     (从 `words.persons[i]` 取角色名)
 */
export function parsePlayerRoles(dataMkfBytes: Uint8Array, words?: Words): PlayerRoles {
  const mkf = openMkf(dataMkfBytes)
  const raw = readChunk(mkf, 3)
  if (raw.byteLength !== PLAYER_ROLES_BYTES) {
    throw new Error(
      `parsePlayerRoles: DATA.MKF chunk 3 size ${raw.byteLength} ≠ sizeof(PLAYERROLES)=${PLAYER_ROLES_BYTES} ` +
        `(检查 MAX_PLAYER_ROLES/MAX_PLAYER_EQUIPMENTS/MAX_PLAYER_MAGICS/NUM_MAGIC_ELEMENTAL 是否对)`,
    )
  }
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)

  function readPlayers(offset: number, signed = false): number[] {
    const arr: number[] = []
    for (let i = 0; i < PLAYER_ROLES_NUM; i++) {
      arr.push(
        signed
          ? view.getInt16(offset + i * 2, true)
          : view.getUint16(offset + i * 2, true),
      )
    }
    return arr
  }

  // **按 sdlpal `tagPLAYERROLES` 真字段顺序** cursor(2025 verified):
  let cursor = 0
  const avatar = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const spriteNumInBattle = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const spriteNum = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const name = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const attackAll = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  /* rgwUnknown1 (sdlpal FIXME ???) */
  cursor += PLAYER_FIELD_SIZE
  const level = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const maxHP = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const maxMP = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const hp = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const mp = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE

  // 跳 rgwEquipment[MAX_PLAYER_EQUIPMENTS=6][MAX_PLAYER_ROLES=6](72 B,M5 才 dump)
  cursor += PLAYER_EQUIPMENTS * PLAYER_FIELD_SIZE

  const attackStrength = readPlayers(cursor, true)
  cursor += PLAYER_FIELD_SIZE
  const magicStrength = readPlayers(cursor, true)
  cursor += PLAYER_FIELD_SIZE
  const defense = readPlayers(cursor, true)
  cursor += PLAYER_FIELD_SIZE
  const dexterity = readPlayers(cursor, true)
  cursor += PLAYER_FIELD_SIZE
  const fleeRate = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  const poisonResistance = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE

  // rgwElementalResistance[NUM_MAGIC_ELEMENTAL=5][MAX_PLAYER_ROLES=6]
  // 布局:5 行(每行一个元素),每行 6 个 u16(每个角色)。
  // 元素顺序与 Enemy.elemResistance 一致:wind / thunder / water / fire / earth
  const elemResRows: number[][] = []
  for (let e = 0; e < ELEM_COUNT; e++) {
    elemResRows.push(readPlayers(cursor))
    cursor += PLAYER_FIELD_SIZE
  }

  // 跳 rgwUnknown2 / rgwUnknown3 / rgwUnknown4 / rgwCoveredBy(4 PLAYERS = 48 B,M5)
  cursor += 4 * PLAYER_FIELD_SIZE

  // 跳 rgwMagic[MAX_PLAYER_MAGICS=32][MAX_PLAYER_ROLES=6](384 B,M5 才 dump 已学法术)
  cursor += PLAYER_MAGICS * PLAYER_FIELD_SIZE

  const walkFrames = readPlayers(cursor)
  cursor += PLAYER_FIELD_SIZE
  // 跳 rgwCooperativeMagic / rgwUnknown5 / rgwUnknown6(3 PLAYERS = 36 B,M5)
  cursor += 3 * PLAYER_FIELD_SIZE

  // 5 个 sound 字段(sdlpal 注释为 PLAYERS,但 fight.c/sound.c 内部按 SHORT 处理,-1 = 无声音)
  const deathSound = readPlayers(cursor, true)
  cursor += PLAYER_FIELD_SIZE
  const attackSound = readPlayers(cursor, true)
  cursor += PLAYER_FIELD_SIZE
  const weaponSound = readPlayers(cursor, true)
  cursor += PLAYER_FIELD_SIZE
  const criticalSound = readPlayers(cursor, true)
  cursor += PLAYER_FIELD_SIZE
  const magicSound = readPlayers(cursor, true)
  cursor += PLAYER_FIELD_SIZE

  // 剩余 rgwCoverSound + rgwDyingSound(2 PLAYERS = 24 B,M5)— 不消费,但 cursor
  // 应该指向 = PLAYER_ROLES_BYTES - 24。sanity check 见下面。
  // cursor + 24 应等于 PLAYER_ROLES_BYTES = 900

  // sanity check:cursor 走法对应 sdlpal global.h tagPLAYERROLES 真值
  if (cursor + 2 * PLAYER_FIELD_SIZE !== PLAYER_ROLES_BYTES) {
    throw new Error(
      `parsePlayerRoles: cursor 走偏 — 实际 ${cursor + 2 * PLAYER_FIELD_SIZE},应等于 sizeof(PLAYERROLES)=${PLAYER_ROLES_BYTES}`,
    )
  }

  const roles: PlayerRole[] = []
  for (let i = 0; i < PLAYER_ROLES_NUM; i++) {
    const role: PlayerRole = {
      id: i,
      avatar: avatar[i]!,
      spriteNumInBattle: spriteNumInBattle[i]!,
      spriteNum: spriteNum[i]!,
      name: name[i]!,
      attackAll: attackAll[i]!,
      level: level[i]!,
      maxHP: maxHP[i]!,
      maxMP: maxMP[i]!,
      hp: hp[i]!,
      mp: mp[i]!,
      attackStrength: attackStrength[i]!,
      magicStrength: magicStrength[i]!,
      defense: defense[i]!,
      dexterity: dexterity[i]!,
      fleeRate: fleeRate[i]!,
      poisonResistance: poisonResistance[i]!,
      elemResistance: {
        wind: elemResRows[0]![i]!,
        thunder: elemResRows[1]![i]!,
        water: elemResRows[2]![i]!,
        fire: elemResRows[3]![i]!,
        earth: elemResRows[4]![i]!,
      },
      walkFrames: walkFrames[i]!,
      attackSound: attackSound[i]!,
      weaponSound: weaponSound[i]!,
      criticalSound: criticalSound[i]!,
      magicSound: magicSound[i]!,
      deathSound: deathSound[i]!,
    }
    const nm = words?.persons[i]
    if (nm) role._name = nm
    roles.push(role)
  }
  return { roles }
}
