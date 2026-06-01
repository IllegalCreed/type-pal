/**
 * 法术伤害共享核心 —— E 类 keystone。
 *
 * `applyMagicDamage` 是两条 sdlpal 法术伤害路径的**唯一共享核心**:
 *   1. inline 攻击法术  —— `reference/sdlpal/fight.c:4270-4318`
 *      (PAL_BattleCommitAction kBattleActionMagic offensive 分支)
 *   2. 0x42 SimulateMagic —— `reference/sdlpal/fight.c:5300-5400`
 *      (PAL_BattleSimulateMagic,投掷物 scriptOnThrow 用)
 *
 * 两条路径同一公式骨架,只差两个参数(见 `ApplyMagicDamageInput`):
 *   | path        | magStr 来源                       | minDamage(sDamage clamp) |
 *   |-------------|-----------------------------------|--------------------------|
 *   | inline 法术  | PAL_GetPlayerMagicStrength(role)  | 1  (sDamage<=0 → 1)      |
 *   | SimulateMagic | op1 操作数(投掷物常=0)           | 0  (sDamage<0  → 0)      |
 *
 * 公式骨架(对照 sdlpal):
 *   def = (SHORT)enemy.wDefense + (enemy.wLevel + 6) * 4;  if (def<0) def=0;
 *   sDamage = PAL_CalcMagicDamage(magStr, def, elemRes, poisonRes, mult=1, magic);
 *   sDamage = max(sDamage, minDamage);
 *   enemy.wHealth -= sDamage;
 *
 * 注:`max(dmg, 1)` 等价 sdlpal inline 的 `if(sDamage<=0) sDamage=1`;
 *     `max(dmg, 0)` 等价 SimulateMagic 的 `if(sDamage<0) sDamage=0`。
 */

import type { Magic, ObjectMagicView, PlayerRoles } from '@type-pal/shared'
import { calcMagicDamage } from './formulas.js'
import type { BattleState } from './battle-state.js'

/** SHORT cast(同 formulas.ts 私函)。 */
function asShort(n: number): number {
  return (n << 16) >> 16
}

/**
 * magic.type 强制全体目标的集合 —— 对照 sdlpal `fight.c FIGHT_DetectMagicTargetChange`
 * 的 "force sTarget=-1" 分支:AttackAll / AttackWhole / AttackField / ApplyToParty / Summon。
 * (Normal / ApplyToPlayer / Trance 是单体。)**判定按 magic.type,不是 flags.applyToAll**
 * —— 二者会不一致(如 血魔神功 attackWhole 但 applyToAll=False)。
 */
const ALL_TARGET_MAGIC_TYPES: ReadonlySet<Magic['type']> = new Set([
  'attackAll', 'attackWhole', 'attackField', 'applyToParty', 'summon',
])

/** 该 magic.type 是否强制全体目标(战斗菜单跳过选目标 + 伤害打全体)。 */
export function magicForcesAllTarget(type: Magic['type']): boolean {
  return ALL_TARGET_MAGIC_TYPES.has(type)
}

export interface ApplyMagicDamageInput {
  /** 战斗状态;`state.enemies[].e.health` 会被改,`state.field.magicEffect` 供战场 buff。 */
  state: BattleState
  /** 目标:enemy 索引 | 'all'(全体敌人,对照 sdlpal `sTarget == -1` 循环全 slot)。 */
  target: number | 'all'
  /** 攻击方魔法强度(inline=PAL_GetPlayerMagicStrength;SimulateMagic=op1 操作数)。 */
  magStr: number
  /** 解析后的 magic 详细。`baseDamage` 保留 u16 原值(内部 asShort 处理 SHORT 语义)。 */
  magicData: { baseDamage: number, elemental: number }
  /** rngFactor ∈ [1.0, 1.1)。调用方从 `state.rng` 算(sdlpal `RandomFloat(10,11)/10`)。 */
  rngFactor: number
  /** sDamage 下限:inline=1,SimulateMagic=0。`dmg = max(dmg, minDamage)`。 */
  minDamage: number
}

/** 每个被命中敌人的结算结果(供 caller emit 弹幕 / log 验)。 */
export interface MagicDamageResult {
  enemyIdx: number
  /** 原始计算伤害(钳到 minDamage 后,未减 HP 前)。 */
  damage: number
  /** 减血前 HP(D17b:caller emit showDamageNum 用钳后真实 delta = hpBefore-hpAfter)。 */
  hpBefore: number
  /** 减血后 HP(`max(0, hpBefore-damage)`)。 */
  hpAfter: number
}

/**
 * 对一个或全体敌人结算法术伤害,**原地** mutate `state.enemies[].e.health`。
 *
 * @returns 每个被处理敌人的 { enemyIdx, damage }(target='all' 时含全部敌人,
 *          含已死 slot —— 对齐 sdlpal applyToAll 循环不按 health 过滤)。
 */
export function applyMagicDamage(input: ApplyMagicDamageInput): MagicDamageResult[] {
  const { state, target, magStr, magicData, rngFactor, minDamage } = input
  const field = state.field.magicEffect

  const targetIdxs: number[]
    = target === 'all'
      ? state.enemies.map((_, i) => i)
      : [target]

  const results: MagicDamageResult[] = []
  for (const idx of targetIdxs) {
    const enemy = state.enemies[idx]
    if (!enemy)
      continue

    // sdlpal: def = (SHORT)enemy.wDefense + (wLevel+6)*4; if (def<0) def=0
    let def = asShort(enemy.e.defense) + (enemy.e.level + 6) * 4
    if (def < 0)
      def = 0

    let dmg = calcMagicDamage({
      magStr,
      def,
      elemRes: enemy.e.elemResistance,
      poisonRes: enemy.e.poisonResistance,
      resistMult: 1, // sdlpal 两条路径 wResistanceMultiplier 都传 1
      magicData,
      fieldEffect: field,
      rngFactor,
    })

    // inline: if(sDamage<=0) sDamage=1  ==  max(dmg,1)
    // SimulateMagic: if(sDamage<0) sDamage=0  ==  max(dmg,0)
    if (dmg < minDamage)
      dmg = minDamage

    const hpBefore = enemy.e.health
    enemy.e.health = Math.max(0, enemy.e.health - dmg)
    results.push({ enemyIdx: idx, damage: dmg, hpBefore, hpAfter: enemy.e.health })
  }
  return results
}

/** 敌方攻击魔法伤害结算结果(enemy→player,playerIdx = state.players 索引)。 */
export interface EnemyMagicDamageResult {
  playerIdx: number
  damage: number
  hpBefore: number
  hpAfter: number
}

export interface ApplyEnemyMagicDamageInput {
  state: BattleState
  /** 施法敌人在 state.enemies 的索引(取 magicStrength / level)。 */
  casterEnemyIdx: number
  /** 目标:单体 player idx;或 'all'(magic.type != normal AoE)。 */
  target: number | 'all'
  /** 解析后的 magic(`baseDamage` 保 u16 原值,内部 asShort;`elemental`)。 */
  magicData: { baseDamage: number, elemental: number }
  /** 玩家角色表(取 def / 抗性 / HP,直接 mutate role.hp)。 */
  playerRoles: PlayerRoles
  /** sdlpal RandomFloat(10,11)/10 ∈ [1.0,1.1)。同 applyMagicDamage:每次 perform 取一次,全目标共用。 */
  rngFactor: number
}

/**
 * 敌方攻击魔法伤害结算(enemy→player)—— 对照 sdlpal `fight.c:4772-4853`
 * PAL_BattleEnemyPerformAction 魔法分支。镜像 player→enemy(applyMagicDamage)但有关键差异:
 *   - magStr = (SHORT)enemy.wMagicStrength + (wLevel+6)*6,clamp >=0(fight.c:4673-4678)
 *   - PAL_CalcMagicDamage 用**玩家** def(role.defense+(level+6)*4,clamp>=0)+ 元素抗(`100+mod`)
 *     + 毒抗(`100+mod`),**wResistanceMultiplier=20**(fight.c:4798/4833;player→enemy 是 1)
 *   - 除因子 `((fDefending?2:1)*(Protect?2:1)) + (autoDefend?1:0)`(fight.c:4801-4803/4836-4838):
 *       · autoDefend:该队员**活着 + 非 sleep/paralyzed/confused** 时 RandomLong(0,2)==0(fight.c:4727-4757)
 *       · Protect status ts 未建模 → 恒 ×1(残)
 *   - clamp `if (sDamage>hp) sDamage=hp`(fight.c:4805/4840)——**不钳最小 1**(与 player inline 不同)
 *   - 跳过已死队员(fight.c:4782)
 *
 * caller(performMagic enemy 分支)负责 emit showDamageNum(掉血 → blue)。
 */
export function applyEnemyMagicDamage(input: ApplyEnemyMagicDamageInput): EnemyMagicDamageResult[] {
  const { state, casterEnemyIdx, target, magicData, playerRoles, rngFactor } = input
  const caster = state.enemies[casterEnemyIdx]
  if (!caster)
    return []
  let magStr = asShort(caster.e.magicStrength) + (caster.e.level + 6) * 6
  if (magStr < 0)
    magStr = 0
  const field = state.field.magicEffect

  const targetIdxs: number[] = target === 'all'
    ? state.players.map((_, i) => i)
    : [target]

  const results: EnemyMagicDamageResult[] = []
  for (const pIdx of targetIdxs) {
    const slot = state.players[pIdx]
    const role = slot ? playerRoles.roles[slot.roleId] : undefined
    if (!slot || !role || role.hp <= 0)
      continue // 跳过越界 / 已死队员(sdlpal 4782)

    // def = PAL_GetPlayerDefense = role.defense + (level+6)*4,clamp >=0
    let def = asShort(role.defense) + (role.level + 6) * 4
    if (def < 0)
      def = 0

    // 玩家元素抗 / 毒抗 = 100 + min(100, mod)(sdlpal 4794/4830 调 PAL_GetPlayer*Resistance,
    //   global.c:1969-1971 `if (w>100) w=100` 上限 100 → 倍率 10-(100+w)/20 永 >=5,绝不变负伤)。
    //   **装备抗性加成已含**(D27 W1 核实 2026-06-01):role 来自 projectRuntimeToBattleRoles(game-state.ts:1260-1266),
    //   其 elemResistance/poisonResistance = clamp100(base + Σ rgEquipmentEffect[].rgwElem/PoisonResistance),
    //   即已等价 sdlpal PAL_GetPlayerElementalResistance/PoisonResistance(global.c:1937/1900)。此处再叠装备会双计。
    const clampRes = (v: number): number => 100 + Math.min(100, asShort(v))
    const elemRes = {
      wind: clampRes(role.elemResistance.wind),
      thunder: clampRes(role.elemResistance.thunder),
      water: clampRes(role.elemResistance.water),
      fire: clampRes(role.elemResistance.fire),
      earth: clampRes(role.elemResistance.earth),
    }
    const poisonRes = clampRes(role.poisonResistance)

    let dmg = calcMagicDamage({
      magStr,
      def,
      elemRes,
      poisonRes,
      resistMult: 20, // sdlpal 4798/4833 wResistanceMultiplier=20(player→enemy 是 1)
      magicData,
      fieldEffect: field,
      rngFactor,
    })

    // 除因子(sdlpal fight.c:4801-4803 / 4836-4838):((defending?2:1) * (Protect>0?2:1)) + (autoDefend?1:0)
    const canAutoDefend = (slot.status.sleep ?? 0) === 0
      && (slot.status.paralyzed ?? 0) === 0
      && (slot.status.confused ?? 0) === 0
    const autoDefend = canAutoDefend && state.rng.range(0, 3) === 0 // RandomLong(0,2)==0
    const protectFactor = (slot.status.protect ?? 0) > 0 ? 2 : 1 // B2 c4:护体减半
    const divisor = ((slot.defending ? 2 : 1) * protectFactor) + (autoDefend ? 1 : 0)
    dmg = Math.trunc(dmg / divisor)

    // clamp:if (sDamage>hp) sDamage=hp(不钳最小 1)
    if (dmg > role.hp)
      dmg = role.hp
    const hpBefore = role.hp
    role.hp = Math.max(0, role.hp - dmg)
    results.push({ playerIdx: pIdx, damage: dmg, hpBefore, hpAfter: role.hp })
  }
  return results
}

export interface SimulateMagicInput {
  state: BattleState
  /** magic object id(0x42/0x66 op0)。 */
  magicObjId: number
  /**
   * wMagicStrength —— 0x42=op1(投掷符/卵 常 0);0x66=计算的 w。
   * **同时**是 sdlpal guard `if (magic.wBaseDamage>0 || wBaseDamage>0)` 里的 wBaseDamage。
   */
  magStr: number
  /**
   * 显式目标 enemy 索引;undefined → 自动选首活敌
   * (对齐 sdlpal `sTarget==-1 → PAL_BattleSelectAutoTargetFrom`)。
   */
  targetIdx: number | undefined
  objectMagics: ObjectMagicView[]
  magics: Magic[]
  /** rngFactor ∈ [1.0, 1.1)(caller 从 state.rng 算)。 */
  rngFactor: number
}

/**
 * `PAL_BattleSimulateMagic`(fight.c:5300)的 ts 端口 —— **0x42 SimulateMagic 与
 * 0x66 throw weapon 共用核心**(sdlpal 两个 opcode 都调这一个函数,职责不拆分叉)。
 *
 * 流程:解析 op0 magic object → magic → guard(无符号 `magic.baseDamage>0 || magStr>0`)
 * → 目标(applyToAll flag 优先→全体;否则 targetIdx,undefined→首活敌)→
 * applyMagicDamage(minDamage=0,SimulateMagic `if(sDamage<0)=0`)。
 *
 * caller 各自准备参数:
 *   - 0x42:magStr=op1,targetIdx=op2-1(<0 用 eventObjectID)
 *   - 0x66:magStr=w=op1*5+attackStrength*RandomLong(0,3),targetIdx=eventObjectID
 *
 * @returns 被命中敌人结算结果;magic 解析失败 / guard 不过 → [](no-op,防御)。
 */
export function simulateMagic(input: SimulateMagicInput): MagicDamageResult[] {
  const objMagic = resolveObjectMagic(input.magicObjId, input.objectMagics)
  if (!objMagic)
    return []
  const magic = input.magics.find(m => m.id === objMagic.magicNumber)
  if (!magic)
    return []
  // sdlpal `if (lprgMagic[..].wBaseDamage > 0 || wBaseDamage > 0)` —— 无符号 WORD 比较
  if (!(magic.baseDamage > 0 || input.magStr > 0))
    return []

  let target: number | 'all'
  if (objMagic.flags.applyToAll) {
    target = 'all'
  }
  else {
    let i = input.targetIdx ?? -1
    if (i < 0) {
      // PAL_BattleSelectAutoTargetFrom:首个活敌
      i = input.state.enemies.findIndex(e => e.e.health > 0)
      if (i < 0)
        i = 0
    }
    target = i
  }

  return applyMagicDamage({
    state: input.state,
    target,
    magStr: input.magStr,
    magicData: { baseDamage: magic.baseDamage, elemental: magic.elemental },
    rngFactor: input.rngFactor,
    minDamage: 0, // SimulateMagic:if (sDamage < 0) sDamage = 0(允许 0)
  })
}

/**
 * 把任意 object id 解析成 magic-union 视图(对照 sdlpal `rgObject[id].magic`)。
 *
 * 数据源:object-magics.json(parseObjectMagics dump 的完整 OBJECT 数组 magic 视图)。
 * `0x42` op0 / `0x66` op0 可低至 24(item 段之下,不在 spells.json [296..397]),
 * 故走完整视图而非 spells.json。
 *
 * @returns 命中的 ObjectMagicView;id 未知 → undefined。
 */
export function resolveObjectMagic(
  objId: number,
  objectMagics: ObjectMagicView[],
): ObjectMagicView | undefined {
  // object-magics.json id === 数组绝对 index(dense),优先 O(1) 索引 + id 校验
  const direct = objectMagics[objId]
  if (direct && direct.id === objId)
    return direct
  return objectMagics.find(o => o.id === objId)
}
