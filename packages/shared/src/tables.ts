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

/**
 * Spell flags 拆 bit(对照 sdlpal `global.h::tagMAGICFLAG`)。
 *
 * sdlpal 真值:
 *   kMagicFlagUsableOutsideBattle = 1 << 0
 *   kMagicFlagUsableInBattle      = 1 << 1
 *   kMagicFlagUsableToEnemy       = 1 << 3   ← bit 2 跳了
 *   kMagicFlagApplyToAll          = 1 << 4
 */
export interface SpellFlags {
  /** kMagicFlagUsableOutsideBattle —— 战斗外可用(地图上 / 菜单)。 */
  usableOutsideBattle: boolean
  /** kMagicFlagUsableInBattle —— 战斗中可用。 */
  usableInBattle: boolean
  /** kMagicFlagUsableToEnemy —— 可对敌使用。 */
  usableToEnemy: boolean
  /** kMagicFlagApplyToAll —— 作用于全队 / 全体敌人。 */
  applyToAll: boolean
}

/**
 * 法术 wrapper。对照 sdlpal `global.h::tagOBJECT_MAGIC`(Win9x 版 = 7×WORD = 14 字节)。
 *
 * 数据源:SSS.MKF chunk 2(OBJECT 数组)索引 296..397,共 102 条。
 *
 * sdlpal 字段顺序(`tagOBJECT_MAGIC` Win9x 版):
 *   wMagicNumber / wReserved1 / wScriptOnSuccess / wScriptOnUse /
 *   wScriptDesc / wReserved2 / wFlags
 *
 * **`magicNumber` 指向 Magic 详细 stats 表的索引**(见下面 Magic interface)。
 */
export interface Spell {
  /** 在 spells.json 数组里的索引(0..101),不是 OBJECT 数组里的绝对 index(那是 296..397)。 */
  id: number
  /** 名字注释(WORD.DAT;引擎不读,只为人读 JSON 时认得出)。 */
  _name?: string
  /** 指向 Magic 详细 stats 表(Magic[]) 的索引。0 = 占位。 */
  magicNumber: number
  /** 法术成功时跑的脚本 entry。 */
  scriptOnSuccess: number
  /** 使用法术时跑的脚本 entry。 */
  scriptOnUse: number
  /** 描述脚本(M3 不消费,留作 schema 完整)。 */
  scriptDesc: number
  /** 拆 bit 的 flags。 */
  flags: SpellFlags
}

/**
 * 法术详细 stats 中的 type 字段具名(对照 sdlpal `global.h::tagMAGIC_TYPE`)。
 *
 * sdlpal 真值:
 *   kMagicTypeNormal        = 0
 *   kMagicTypeAttackAll     = 1   // 对每个敌人单独绘制
 *   kMagicTypeAttackWhole   = 2   // 对整个敌方队伍绘制
 *   kMagicTypeAttackField   = 3   // 对战场绘制
 *   kMagicTypeApplyToPlayer = 4   // 用在单个队友身上
 *   kMagicTypeApplyToParty  = 5   // 用在全队
 *   kMagicTypeTrance        = 8
 *   kMagicTypeSummon        = 9
 *
 * `other` 兜底:type 6 / 7 / >9 等未在 sdlpal enum 内定义的值
 * (实测数据偶有出现,M5 可能补全)。
 */
export type MagicType =
  | 'normal'
  | 'attackAll'
  | 'attackWhole'
  | 'attackField'
  | 'applyToPlayer'
  | 'applyToParty'
  | 'trance'
  | 'summon'
  | 'other'

/**
 * 法术详细 stats。对照 sdlpal `global.h::tagMAGIC`(16×WORD = 32 字节)。
 *
 * 数据源:DATA.MKF chunk 4(sdlpal `global.c:296` LOAD_DATA fpDATA 4)。
 *
 * sdlpal 字段顺序:
 *   wEffect / wType / wXOffset / wYOffset /
 *   rgSpecific (union) / wSpeed (SHORT) / wKeepEffect / wFireDelay /
 *   wEffectTimes / wShake / wWave / wUnknown /
 *   wCostMP / wBaseDamage / wElemental / wSound (SHORT)
 *
 * **signed 字段**:`wSpeed` 与 `wSound` 在 sdlpal 是 SHORT。
 */
export interface Magic {
  /** 在 magic.json 数组里的索引,等同 Spell.magicNumber。 */
  id: number
  /** 特效精灵编号(F.MKF)。 */
  effect: number
  /** 法术类型(对照 sdlpal `tagMAGIC_TYPE`)。 */
  type: MagicType
  xOffset: number
  yOffset: number
  /**
   * rgSpecific 联合(原 `MAGIC_SPECIAL`):
   * - summon 类型 → `wSummonEffect`(召唤特效精灵)
   * - 其他类型 → `sLayerOffset`(SHORT,图层偏移)
   *
   * M3 不解(union 字段,raw u16 保存),M5 / 后续 task 按 type 解读。
   */
  special: number
  /** SHORT(signed) —— 特效速度。 */
  speed: number
  keepEffect: number
  /** 火属性 fire 阶段起始帧。 */
  fireDelay: number
  /** 特效总次数。 */
  effectTimes: number
  /** 震屏。 */
  shake: number
  /** 波纹。 */
  wave: number
  /** sdlpal 注释 FIXME:??? */
  unknown: number
  /** MP 消耗。 */
  costMP: number
  /** 基础伤害。 */
  baseDamage: number
  /**
   * 元素属性:0 = 无属性,1..NUM_MAGIC_ELEMENTAL = 各属性,最后一个 = 毒。
   * sdlpal `NUM_MAGIC_ELEMENTAL = 5` → 0 无 / 1 风 / 2 雷 / 3 水 / 4 火 / 5 土 / 6 毒。
   */
  elemental: number
  /** SHORT(signed) —— 使用法术时播放的音效编号。 */
  sound: number
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

/**
 * 一组敌人(对照 sdlpal `global.h::tagENEMYTEAM` + `palcommon.h::MAX_ENEMIES_IN_TEAM=5`)。
 *
 * 数据源:DATA.MKF chunk 2(sdlpal `global.c:294`
 * `LOAD_DATA(p->lprgEnemyTeam, p->nEnemyTeam * sizeof(ENEMYTEAM), 2, fpDATA)`)。
 *
 * sdlpal 结构:
 * ```c
 * typedef struct tagENEMYTEAM {
 *   WORD rgwEnemy[MAX_ENEMIES_IN_TEAM];  // 5 个槽位
 * } ENEMYTEAM;
 * ```
 *
 * **槽位含义(对照 `battle.c:1602`):**
 * - `0xFFFF` = 空槽位(`if (w == 0xFFFF) continue;`)
 * - `0`      = 也跳过(sdlpal 行内判 `if (w != 0)` 后才装载)
 * - 其他    = OBJECT 数组的绝对 index(`gpGlobals->g.rgObject[w].enemy.wEnemyID`),
 *             落在 OBJECT_ENEMY 段(实测 398-550)
 */
export interface EnemyTeam {
  /** 在 enemy-teams.json 数组里的索引。 */
  id: number
  /**
   * 5 个 slot,每个是 OBJECT 数组的绝对 index(指向 OBJECT_ENEMY 段)。
   * `0xFFFF` = 空槽位,`0` = 也跳过(见 sdlpal `battle.c:1602`)。
   */
  enemies: [number, number, number, number, number]
  /**
   * 5 个槽位对应的敌人名注释(WORD.DAT;引擎不读,只为人读 JSON 时认得出)。
   * 数组长度 ≤ 5;空槽位 / 找不到名字的 slot 不收入。可选。
   */
  _names?: string[]
}

/**
 * 战场背景 + 元素 buff(对照 sdlpal `global.h::tagBATTLEFIELD` + `palcommon.h::NUM_MAGIC_ELEMENTAL=5`)。
 *
 * 数据源:DATA.MKF chunk 5(sdlpal `global.c:297`
 * `LOAD_DATA(p->lprgBattleField, p->nBattleField * sizeof(BATTLEFIELD), 5, fpDATA)`)。
 *
 * sdlpal 结构:
 * ```c
 * typedef struct tagBATTLEFIELD {
 *   WORD  wScreenWave;                          // 屏幕波纹强度
 *   SHORT rgsMagicEffect[NUM_MAGIC_ELEMENTAL];  // 5 元素 buff(signed)
 * } BATTLEFIELD;
 * ```
 *
 * 每条 = 1 WORD + 5 SHORT = 6 u16 = 12 bytes。
 *
 * **signed**:`rgsMagicEffect` 是 SHORT,元素 buff 可正可负(`global.h:380`)。
 */
export interface BattleField {
  /** 在 battle-fields.json 数组里的索引。 */
  id: number
  /** 屏幕波纹强度(sdlpal `wScreenWave`,WORD)。 */
  screenWave: number
  /**
   * 5 元素 buff(对照 sdlpal `rgsMagicEffect[NUM_MAGIC_ELEMENTAL=5]`,SHORT)。
   * 元素顺序与 Enemy.elemResistance 一致(对照 sdlpal `wElemResistance[5]`):
   * wind / thunder / water / fire / earth。
   */
  magicEffect: {
    wind: number
    thunder: number
    water: number
    fire: number
    earth: number
  }
}
