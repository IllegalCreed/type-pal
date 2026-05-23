/**
 * 数据表条目类型 —— 物品 / 法术 / 怪物。
 * 字段以 sdlpal global.h::OBJECT_* / ENEMY 为准。
 */

export interface Item {
  id: number
  name: string
  bitmap: number // 图标精灵号
  price: number
  scriptOnUse: number
  scriptOnEquip: number
  scriptOnThrow: number
  flags: number
}

export interface Spell {
  id: number
  name: string
  mp: number
  base: number
  effect: number
  flags: number
}

/**
 * 战斗中的敌人完整数据,对照 sdlpal `global.h::tagENEMY`。
 * D28(M3 重做):signed 语义 + 缺字段补齐 + Hungarian 去掉 + elemResistance 拆具名。
 *
 * **signed 字段**:`attackStrength / magicStrength / defense / dexterity` 是 stat modifier,
 * 加在玩家等级算出的基础值上(对照 sdlpal `fight.c:4634`:
 * `int str = (SHORT)g_Battle.rgEnemy[i].e.wAttackStrength`)。值可为负。
 */
export interface Enemy {
  /** 在 enemies.json 数组里的 enemy id(= sdlpal `OBJECT_ENEMY.wEnemyID`,DATA.MKF chunk 1 的索引)。 */
  id: number
  /** 名字注释(D20,来自 WORD.DAT;引擎不读)。 */
  _name?: string

  idleFrames: number
  magicFrames: number
  attackFrames: number
  idleAnimSpeed: number
  actWaitFrames: number
  yPosOffset: number

  // 声音(原 SHORT)
  attackSound: number
  actionSound: number
  magicSound: number
  deathSound: number
  callSound: number

  // 战斗数值(unsigned)
  health: number
  exp: number
  cash: number
  level: number
  magic: number
  magicRate: number
  attackEquivItem: number
  attackEquivItemRate: number
  stealItem: number
  stealItemCount: number

  /** **signed 语义** —— stat modifier,可负。 */
  attackStrength: number
  magicStrength: number
  defense: number
  dexterity: number

  fleeRate: number
  poisonResistance: number

  /** 5 元素抗(原 wElemResistance[NUM_MAGIC_ELEMENTAL=5],拆具名)。 */
  elemResistance: {
    wind: number
    thunder: number
    water: number
    fire: number
    earth: number
  }

  physicalResistance: number
  dualMove: number
  collectValue: number
}
