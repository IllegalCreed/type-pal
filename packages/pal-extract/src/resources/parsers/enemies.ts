/**
 * 敌人表(DATA.MKF chunk 1 ENEMY 结构体)+ OBJECT_ENEMY 名字反查解析。
 *
 * ENEMY 结构(global.h tagENEMY,35 × WORD = 70 字节):见下文 offset 注释。
 * 实测 chunk 1 = 10780 字节 / 70 = 154 条。
 */
import type { Enemy } from '@type-pal/shared'
import type { Words } from '../../io/word.js'
import {
  ENEMY_OBJ_COUNT,
  ENEMY_OBJ_ID_OFF,
  ENEMY_OBJ_ON_BATTLE_END_OFF,
  ENEMY_OBJ_ON_READY_OFF,
  ENEMY_OBJ_ON_TURN_START_OFF,
  ENEMY_OBJ_RESIST_OFF,
  ENEMY_OBJ_START,
  OBJ_SIZE,
  s16,
  u16,
} from './_utils.js'

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
const ENEMY_SIZE = 70

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
export function parseEnemies(enemyBuf: Uint8Array, objBuf?: Uint8Array, words?: Words): Enemy[] {
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
 * M5.B-w2.a:dump OBJECT_ENEMY 段全 5 字段(sdlpal global.h tagOBJECT_ENEMY)。
 *
 * SSS.MKF chunk 2 OBJECT 表中 ENEMY_OBJ_START (398) 起 153 条 OBJECT_ENEMY,
 * 每条 5 字段 × 2 字节:
 *   wEnemyID / wResistanceToSorcery / wScriptOnTurnStart /
 *   wScriptOnBattleEnd / wScriptOnReady
 *
 * EnemyTeam.slots[i] 是 OBJECT 绝对 index(398+),通过本 dump 反查 OBJECT_ENEMY
 * 5 字段。游戏侧 battle-system enemy turn 真做 scripted AI(B-w2.a)时,从此表
 * 取 scriptOnReady 喂 runScript。
 *
 * @returns 数组 length 153,index = 段内偏移(0..152),objectIndex 字段填 OBJECT 表绝对 index
 */
export interface EnemyObject {
  /** OBJECT 表绝对 index(398+);EnemyTeam.slots[i] 直接对应。 */
  objectIndex: number
  /** wEnemyID,指向 chunk 1 ENEMY 数组(enemies[].id)。0 = 空槽。 */
  enemyId: number
  /** wResistanceToSorcery(0..10)。 */
  resistanceToSorcery: number
  /** wScriptOnTurnStart:每回合开始 bytecode entry ip;0 = 无。 */
  scriptOnTurnStart: number
  /** wScriptOnBattleEnd:战斗结束 bytecode entry ip。 */
  scriptOnBattleEnd: number
  /** wScriptOnReady:enemy 准备出招 bytecode entry ip(classic 模式 ActionQueue 跑到时调用)。 */
  scriptOnReady: number
  /** 名字注释(reverse from words.enemies);引擎不读。 */
  _name?: string
}

export function parseEnemyObjects(objBuf: Uint8Array, words?: Words): EnemyObject[] {
  const need = (ENEMY_OBJ_START + ENEMY_OBJ_COUNT) * OBJ_SIZE
  if (objBuf.byteLength < need) {
    throw new Error(
      `parseEnemyObjects: SSS chunk 2 byte length ${objBuf.byteLength} < required ${need}`,
    )
  }
  const view = new DataView(objBuf.buffer, objBuf.byteOffset, objBuf.byteLength)
  const out: EnemyObject[] = []
  for (let i = 0; i < ENEMY_OBJ_COUNT; i++) {
    const objectIndex = ENEMY_OBJ_START + i
    const base = objectIndex * OBJ_SIZE
    const entry: EnemyObject = {
      objectIndex,
      enemyId: u16(view, base, ENEMY_OBJ_ID_OFF),
      resistanceToSorcery: u16(view, base, ENEMY_OBJ_RESIST_OFF),
      scriptOnTurnStart: u16(view, base, ENEMY_OBJ_ON_TURN_START_OFF),
      scriptOnBattleEnd: u16(view, base, ENEMY_OBJ_ON_BATTLE_END_OFF),
      scriptOnReady: u16(view, base, ENEMY_OBJ_ON_READY_OFF),
    }
    const nm = words?.enemies[i]
    if (nm && entry.enemyId > 0) entry._name = nm
    out.push(entry)
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
 * 反向索引:OBJECT 数组中的绝对 index(OBJECT_ENEMY 段)→ enemies.json 的 id(= wEnemyID)。
 *
 * 给 `parseEnemyTeams` 翻译 enemy-teams.json 槽位用 —— M3.30 Bug 1 修复(implementation discovery):
 * enemy-teams.json 之前 dump 出来是 OBJECT 绝对 index(398-550),与 enemies.json 的 0..153 id
 * 范围不匹配,运行时 `enemies.find(e => e.id === slot)` 全部 miss,导致 dev panel 触发战斗时
 * enemy 不显示。修法:dump 时翻译 → enemy-teams.json 槽位变 enemies.json id。
 *
 * 实现与 `buildEnemyObjectNameMap` 同结构:遍历 OBJECT_ENEMY 段(ENEMY_OBJ_START + i,
 * i in [0..ENEMY_OBJ_COUNT)),读该 OBJECT 的 `wEnemyID`(= OBJECT_ENEMY 字段 0),
 * 建立 `objIndex → wEnemyID` 映射。
 *
 * @param objBuf SSS.MKF chunk 2 原始字节
 */
export function buildObjectIndexToEnemyIdMap(objBuf: Uint8Array): Map<number, number> {
  const map = new Map<number, number>()
  const need = (ENEMY_OBJ_START + ENEMY_OBJ_COUNT) * OBJ_SIZE
  if (objBuf.byteLength < need) return map
  const view = new DataView(objBuf.buffer, objBuf.byteOffset, objBuf.byteLength)
  for (let i = 0; i < ENEMY_OBJ_COUNT; i++) {
    const objIndex = ENEMY_OBJ_START + i
    const enemyId = u16(view, objIndex * OBJ_SIZE, ENEMY_OBJ_ID_OFF)
    if (enemyId > 0) {
      map.set(objIndex, enemyId)
    }
  }
  return map
}
