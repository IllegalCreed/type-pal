/**
 * 数据表条目类型 —— 物品 / 法术 / 怪物。
 * 字段以 sdlpal global.h::OBJECT_* / ENEMY 为准。
 */

/**
 * ITEMFLAG bitmask 拆具名(对照 sdlpal `global.h::tagITEMFLAG`)。
 *
 * sdlpal 真值:
 *   kItemFlagUsable                      = 1 << 0
 *   kItemFlagEquipable                   = 1 << 1
 *   kItemFlagThrowable                   = 1 << 2
 *   kItemFlagConsuming                   = 1 << 3
 *   kItemFlagApplyToAll                  = 1 << 4
 *   kItemFlagSellable                    = 1 << 5
 *   kItemFlagEquipableByPlayerRole_First = 1 << 6   ← 之后每 bit 一个 role
 *
 * `equipableBy` 长度 = MAX_PLAYER_ROLES(sdlpal palcommon.h = 6),
 * `uigame.c:1931` 用 `kItemFlagEquipableByPlayerRole_First << wPlayerRole`,
 * wPlayerRole 在 [0, MAX_PLAYER_ROLES) 范围内,所以 6 bit。
 */
export interface ItemFlags {
  /** kItemFlagUsable —— 可使用(战斗或地图上使用) */
  usable: boolean
  /** kItemFlagEquipable —— 可装备 */
  equipable: boolean
  /** kItemFlagThrowable —— 可投掷(向敌人投出) */
  throwable: boolean
  /** kItemFlagConsuming —— 消耗品(使用后数量 -1;sdlpal 原拼写 `Consuming`) */
  consuming: boolean
  /** kItemFlagApplyToAll —— 作用于全队 */
  applyToAll: boolean
  /** kItemFlagSellable —— 可卖给商人 */
  sellable: boolean
  /**
   * kItemFlagEquipableByPlayerRole_First + N(6 个 role 各一 bit)。
   * 长度 = MAX_PLAYER_ROLES = 6(sdlpal palcommon.h:45)。
   */
  equipableBy: [boolean, boolean, boolean, boolean, boolean, boolean]
}

/**
 * 物品。对照 sdlpal `global.h::tagOBJECT_ITEM`(Win9x 版 = 7×WORD)。
 *
 * sdlpal 字段顺序(`tagOBJECT_ITEM` Win9x 版):
 *   wBitmap / wPrice / wScriptOnUse / wScriptOnEquip /
 *   wScriptOnThrow / wScriptDesc / wFlags
 *
 * 数据源:SSS.MKF chunk 2(OBJECT 数组)索引 61..295,共 235 条。
 */
export interface Item {
  /** 在 items.json 数组里的索引(= OBJECT 段内偏移,不是绝对 OBJECT index)。 */
  id: number
  /** 名字注释(WORD.DAT;引擎不读,只为人读 JSON 时认得出)。 */
  _name?: string
  /** BALL.MKF bitmap 索引(物品图标)。 */
  bitmap: number
  /** 售卖价。 */
  price: number
  /** 使用时跑的脚本 entry(SSS.MKF chunk 4 中的偏移)。0 = 不可用。 */
  scriptOnUse: number
  /** 装备时跑的脚本。0 = 不可装备。 */
  scriptOnEquip: number
  /** 投掷时跑的脚本(M3 不消费,留作 schema 完整)。 */
  scriptOnThrow: number
  /** 描述脚本(M3 不消费;原 wScriptDesc)。 */
  scriptDesc: number
  /** 拆 bit 的 flags。 */
  flags: ItemFlags
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
