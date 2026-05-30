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

import type { ObjectMagicView } from '@type-pal/shared'
import { calcMagicDamage } from './formulas.js'
import type { BattleState } from './battle-state.js'

/** SHORT cast(同 formulas.ts 私函)。 */
function asShort(n: number): number {
  return (n << 16) >> 16
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
  damage: number
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

    enemy.e.health = Math.max(0, enemy.e.health - dmg)
    results.push({ enemyIdx: idx, damage: dmg })
  }
  return results
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
