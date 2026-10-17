/**
 * 战斗公式 —— 参考 `reference/sdlpal/fight.c` 的 PAL_CLASSIC 路径。
 *
 * 参考原 C 的公式结构;JS 用 `(n << 16) >> 16` 截取有符号 16 位结果。
 * JS double 与 C FLOAT/WORD 中间赋值并非全数值域等价,见 GAME-MAGIC-NUMERIC-ASSIGNMENT-1。
 * 全部纯函数,无 side effect,可在 worker / Node 直接跑。
 *
 * 5 个公式对照 sdlpal `fight.c` 行号:
 *   - calcBaseDamage              fight.c:131-171
 *   - calcMagicDamage             fight.c:174-249
 *   - calcPhysicalAttackDamage    fight.c:253-285
 *   - getEnemyDexterity           fight.c:289-332 (PAL_CLASSIC)
 *   - getPlayerActualDexterity    fight.c:336-389 (PAL_CLASSIC)
 *
 * 非 PAL_CLASSIC 分支(time-charging / haste *6/5 / slow *2/3 / dying *4/5)
 * M3 不实现,源码处用注释标 `// non-classic: M3 不实现`。
 */

/** SHORT cast:把任意整数 cast 成 -32768..32767 范围。 */
function asShort(n: number): number {
  return (n << 16) >> 16
}

/**
 * 基础伤害(无 resist,纯 atk vs def)。
 *
 * from `reference/sdlpal/fight.c:131-171` —— PAL_CalcBaseDamage。
 *
 * 三段公式(sdlpal 注释:Formula courtesy of palxex and shenyanduxing):
 *   atk > def       → (SHORT)(atk*2 - def*1.6 + 0.5)
 *   atk > def*0.6   → (SHORT)(atk - def*0.6 + 0.5)
 *   else            → 0
 *
 * 注:sdlpal C 把 float `(SHORT)(x)` 是 truncate-towards-zero;JS 模拟用 `Math.trunc`
 * (而非 `Math.floor`,二者对负值有差异)。非负 atk/def 在截取 SHORT 前得到非负值;
 * 截取后可为负。此处不承诺越出 C SHORT 可表示范围的浮点转换等价。
 */
export function calcBaseDamage(atk: number, def: number): number {
  if (atk > def) {
    return asShort(Math.trunc(atk * 2 - def * 1.6 + 0.5))
  }
  if (atk > def * 0.6) {
    return asShort(Math.trunc(atk - def * 0.6 + 0.5))
  }
  return 0
}

/**
 * 物理伤害(应用物理 resist)。
 *
 * from `reference/sdlpal/fight.c:253-285` —— PAL_CalcPhysicalAttackDamage。
 *
 * 流程:base = calcBaseDamage(atk, def);若 resist != 0 则 base /= resist。
 * resist == 0 时不除(防 div by zero)。
 */
export function calcPhysicalAttackDamage(
  atk: number,
  def: number,
  physicalResistance: number,
): number {
  let damage = calcBaseDamage(atk, def)
  if (physicalResistance !== 0) {
    damage = asShort(Math.trunc(damage / physicalResistance))
  }
  return damage
}

export interface MagicDamageInput {
  /** 攻击方魔法强度。 */
  magStr: number
  /** 受方防御。 */
  def: number
  /** 受方对 5 个元素的抗性。 */
  elemRes: { wind: number; thunder: number; water: number; fire: number; earth: number }
  /** 受方毒抗。 */
  poisonRes: number
  /** 必填抗性除数;生产 caller 对敌传 1,对玩家传 20。 */
  resistMult: number
  magicData: {
    /** sdlpal `wBaseDamage`。 */
    baseDamage: number
    /** 0 = 无元素;1-5 = wind/thunder/water/fire/earth;>5 = poison(>NUM_MAGIC_ELEMENTAL)。 */
    elemental: number
  }
  /** 战场加成(每个元素 -10..+10)。 */
  fieldEffect: { wind: number; thunder: number; water: number; fire: number; earth: number }
  /**
   * TS caller 用 1 + SeedableRng.next() * 0.1,范围 [1.0, 1.1)。
   * 原 C RandomFloat(10,11) 可取端点11,且先写回 WORD 再除10;不是直接等价替换。
   * 调用方提供倍率,本函数不持 RNG;中间数值差异见 GAME-MAGIC-NUMERIC-ASSIGNMENT-1。
   */
  rngFactor: number
}

/**
 * 法术伤害。
 *
 * from `reference/sdlpal/fight.c:174-249` —— PAL_CalcMagicDamage。
 *
 * 流程(sdlpal 注释:Formula courtesy of palxex and shenyanduxing):
 *   1. C: magStr *= RandomFloat(10, 11); magStr /= 10 (WORD 两次赋值)
 *      TS: 接收 rngFactor 后连续 double 运算并截断,存在已登记的数值差异
 *   2. sDamage = calcBaseDamage(magStr, def) / 4
 *   3. sDamage += magic.baseDamage
 *   4. if elemental != 0:
 *        poison (elem > 5):     sDamage *= (10 - poisonRes / mult)
 *        elem == 0:             sDamage *= 5  (sdlpal 死分支,被外层 != 0 拦截 —— 此处不实现)
 *        elem 1..5:             sDamage *= (10 - elemRes[elem-1] / mult)
 *        sDamage /= 5
 *        if elem <= 5:
 *          sDamage *= (10 + fieldEffect[elem-1])
 *          sDamage /= 10
 *
 * 注:sdlpal `WORD wMagicID` 是经 `gpGlobals->g.rgObject[id].magic.wMagicNumber`
 * 解析后的 magic struct;本函数让调用方先解析,只接受 `magicData`。
 *
 * 注:原 C 的 sDamage 每次赋值都回到 SHORT;这里保留相应截断步骤,
 * 但 C FLOAT 运算精度、WORD 中间赋值及越界域尚不能据此称为 1:1。
 */
export function calcMagicDamage(input: MagicDamageInput): number {
  const NUM_MAGIC_ELEMENTAL = 5

  // step 1: rng-modulated magic strength
  // sdlpal: wMagicStrength *= RandomFloat(10, 11); wMagicStrength /= 10
  // 当前连续 double 运算不模拟 C 的 FLOAT→WORD 中间赋值,正常域已有反例。
  // 按 GAME-MAGIC-NUMERIC-ASSIGNMENT-1 等待裁决;删除 *10/10 不能修复该反例。
  const magStr = Math.trunc((input.magStr * input.rngFactor * 10) / 10)

  // step 2-3: base / 4 + magic.baseDamage
  let damage = asShort(Math.trunc(calcBaseDamage(magStr, input.def) / 4))
  damage = asShort(damage + input.magicData.baseDamage)

  // step 4: elemental modifiers
  const elem = input.magicData.elemental
  if (elem !== 0) {
    let elemMultiplier: number
    if (elem > NUM_MAGIC_ELEMENTAL) {
      // poison
      elemMultiplier = 10 - input.poisonRes / input.resistMult
    } else {
      const elemArr = [
        input.elemRes.wind,
        input.elemRes.thunder,
        input.elemRes.water,
        input.elemRes.fire,
        input.elemRes.earth,
      ]
      elemMultiplier = 10 - elemArr[elem - 1]! / input.resistMult
    }
    damage = asShort(Math.trunc(damage * elemMultiplier))
    damage = asShort(Math.trunc(damage / 5))

    if (elem <= NUM_MAGIC_ELEMENTAL) {
      const fieldArr = [
        input.fieldEffect.wind,
        input.fieldEffect.thunder,
        input.fieldEffect.water,
        input.fieldEffect.fire,
        input.fieldEffect.earth,
      ]
      damage = asShort(damage * (10 + fieldArr[elem - 1]!))
      damage = asShort(Math.trunc(damage / 10))
    }
  }
  return damage
}

export interface EnemyDexInput {
  level: number
  /** signed 语义(可负;sdlpal 在 fight.c:312 用 `(SHORT)wDexterity` cast)。 */
  dexterity: number
}

/**
 * 敌人有效 dexterity(用于 turn order 排序)。
 *
 * from `reference/sdlpal/fight.c:289-332` —— PAL_GetEnemyDexterity(PAL_CLASSIC 路径)。
 *
 * 公式(PAL_CLASSIC):
 *   s = (level + 6) * 3 + (SHORT)dexterity
 *
 * 非 classic 分支额外做(M3 不实现):
 *   - s < 20 → s = 20  lowerbound
 *   - haste status → s *= 6/5
 *   - slow status → s *= 2/3
 */
export function getEnemyDexterity(input: EnemyDexInput): number {
  return (input.level + 6) * 3 + asShort(input.dexterity)
}

export interface PlayerStatusFlags {
  haste: boolean
  /** slow 仅 non-classic 分支有效;PAL_CLASSIC 路径下本字段被忽略。 */
  slow: boolean
}

/**
 * 队员有效 dexterity(用于 turn order 排序,PAL_CLASSIC 路径)。
 *
 * from `reference/sdlpal/fight.c:336-389` —— PAL_GetPlayerActualDexterity。
 *
 * `baseDexterity` 对应 PAL_GetPlayerDexterity(role): runtime 基础身法 + 装备效果,无等级项。
 * TS battle-system 从 projectRuntimeToBattleRoles 的 role.dexterity 传入;本函数只应用 status / 上限。
 *
 * PAL_CLASSIC 路径:
 *   - haste     → dex *= 3
 *   - 上限 999
 *
 * 非 classic 分支(M3 不实现):
 *   - haste     → dex *= 6/5
 *   - slow      → dex *= 2/3
 *   - dying     → dex *= 4/5
 *   - 无 999 上限
 */
export function getPlayerActualDexterity(baseDexterity: number, status: PlayerStatusFlags): number {
  let dex = baseDexterity
  if (status.haste) {
    dex = dex * 3
  }
  // non-classic: M3 不实现 slow / dying modifier
  if (dex > 999) dex = 999
  return dex
}
