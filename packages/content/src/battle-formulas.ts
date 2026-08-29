/**
 * 战斗公式 + 回合队列 + 状态衰减 —— 纯函数层(M4a）。
 *
 * 忠实移植一阶段 `packages/game/src/core/battle/{formulas,turn-queue,status}.ts`
 * （= sdlpal `fight.c` PAL_CLASSIC 路径的 1:1 port）。SHORT 语义保持
 * （JS 用 `(n<<16)>>16` 模拟）。无 side effect，可 headless/worker 直跑。
 *
 * 第二阶段是 clean-rewrite，但**战斗数值忠实原版**是复刻验收的硬指标（伤害/命中/回合序
 * 必须和 pal.exe 一致），故公式层照抄一阶段（它已对齐 fight.c 行号，是语义真值源）。
 */

import { ACTOR_STATUS_DEFINITIONS } from './actor-condition.js'

/** SHORT cast:把任意整数 cast 成 -32768..32767 范围（sdlpal `(SHORT)` 语义）。 */
function asShort(n: number): number {
  return (n << 16) >> 16
}

// ════════════════════════════════════════════════════════════════════
// 伤害公式（fight.c:131-285）
// ════════════════════════════════════════════════════════════════════

/**
 * 基础伤害（无 resist，纯 atk vs def）。fight.c:131-171 PAL_CalcBaseDamage。
 *   atk > def       → (SHORT)trunc(atk*2 - def*1.6 + 0.5)
 *   atk > def*0.6   → (SHORT)trunc(atk - def*0.6 + 0.5)
 *   else            → 0
 */
export function calcBaseDamage(atk: number, def: number): number {
  if (atk > def) return asShort(Math.trunc(atk * 2 - def * 1.6 + 0.5))
  if (atk > def * 0.6) return asShort(Math.trunc(atk - def * 0.6 + 0.5))
  return 0
}

/**
 * 物理伤害（应用物理 resist）。fight.c:253-285 PAL_CalcPhysicalAttackDamage。
 * resist != 0 → base /= resist；resist == 0 不除（防 div-by-zero）。
 */
export function calcPhysicalAttackDamage(
  atk: number,
  def: number,
  physicalResistance: number,
): number {
  let damage = calcBaseDamage(atk, def)
  if (physicalResistance !== 0) damage = asShort(Math.trunc(damage / physicalResistance))
  return damage
}

/** 5 元素抗性/战场加成向量（wind/thunder/water/fire/earth）。 */
export interface ElementVec {
  wind: number
  thunder: number
  water: number
  fire: number
  earth: number
}

export interface MagicDamageInput {
  /** 攻击方魔法强度。 */
  magStr: number
  /** 受方防御。 */
  def: number
  /** 受方 5 元素抗性。 */
  elemRes: ElementVec
  /** 受方毒抗。 */
  poisonRes: number
  /** 抗性除数（sdlpal wResistanceMultiplier，默认 10）。 */
  resistMult: number
  magicData: {
    /** sdlpal wBaseDamage。 */
    baseDamage: number
    /** 0=无元素;1-5=wind/thunder/water/fire/earth;>5=poison。 */
    elemental: number
  }
  /** 战场加成（每元素 -10..+10）。 */
  fieldEffect: ElementVec
  /** 替代 sdlpal RandomFloat(10,11)/10 的乘子 [1.0,1.1]（调用方喂,本函数不持 RNG）。 */
  rngFactor: number
}

/**
 * 法术伤害。fight.c:174-249 PAL_CalcMagicDamage。
 *   1. magStr *= rngFactor
 *   2. dmg = calcBaseDamage(magStr, def) / 4 + magic.baseDamage
 *   3. elem != 0: dmg *= (10 - res/mult); dmg /= 5; elem<=5 再 *= (10+field); /= 10
 * 每赋值点 asShort，保 sdlpal `SHORT *= FLOAT` 逐步截断语义。
 */
export function calcMagicDamage(input: MagicDamageInput): number {
  const NUM_ELEM = 5
  const magStr = Math.trunc((input.magStr * input.rngFactor * 10) / 10)
  let damage = asShort(Math.trunc(calcBaseDamage(magStr, input.def) / 4))
  damage = asShort(damage + input.magicData.baseDamage)
  const elem = input.magicData.elemental
  if (elem !== 0) {
    let mult: number
    if (elem > NUM_ELEM) {
      mult = 10 - input.poisonRes / input.resistMult
    } else {
      const arr = [
        input.elemRes.wind,
        input.elemRes.thunder,
        input.elemRes.water,
        input.elemRes.fire,
        input.elemRes.earth,
      ]
      mult = 10 - (arr[elem - 1] ?? 0) / input.resistMult
    }
    damage = asShort(Math.trunc(damage * mult))
    damage = asShort(Math.trunc(damage / 5))
    if (elem <= NUM_ELEM) {
      const field = [
        input.fieldEffect.wind,
        input.fieldEffect.thunder,
        input.fieldEffect.water,
        input.fieldEffect.fire,
        input.fieldEffect.earth,
      ]
      damage = asShort(damage * (10 + (field[elem - 1] ?? 0)))
      damage = asShort(Math.trunc(damage / 10))
    }
  }
  return damage
}

/**
 * 敌法术打队员的防御除因子（fight.c:4801-4803 AoE / 4836-4838 单体）：
 *   ((防御中?2:1) × (护体?2:1)) + (被动格挡?1:0)
 * 乘加结构：防御×护体叠成 /4，格挡再 +1（最深 /5）；伤害 = trunc(原伤 / 除因子)。
 * 被动格挡（autoDefend）资格掷骰在调用方：目标活着 + 无眠/定/乱，1/3 命中
 * （fight.c:4727-4757，于效果结算**前**预掷——效果先施眠/定不剥夺本次资格）。
 * 与敌**物攻**的 7/17 全免「闪避」是两套机制：那个免伤，这个只减伤。
 */
export function magicDefenseDivisor(
  defending: boolean,
  protect: boolean,
  autoDefend: boolean,
): number {
  return (defending ? 2 : 1) * (protect ? 2 : 1) + (autoDefend ? 1 : 0)
}

// ════════════════════════════════════════════════════════════════════
// 敏捷 / 出手顺序（fight.c:289-389）
// ════════════════════════════════════════════════════════════════════

/** 敌人有效 dexterity（turn order 排序）。fight.c:289-332 PAL_CLASSIC:(level+6)*3 + (SHORT)dex。 */
export function getEnemyDexterity(level: number, dexterity: number): number {
  return (level + 6) * 3 + asShort(dexterity)
}

/**
 * 队员有效 dexterity（PAL_CLASSIC 路径）。fight.c:336-389。
 * baseDexterity 由调用方算好（level+装备+raw）;本函数只应用 haste ×3 + 上限 999。
 * （non-classic 的 slow/dying **stat 级**修正忠实原版不实现;classic 的濒死÷2 与动作系数
 * 在**队列口**另有一套(fight.c:1529-1560),由 buildActionQueue 的调用方装配。）
 */
export function getPlayerActualDexterity(baseDexterity: number, haste: boolean): number {
  let dex = baseDexterity
  if (haste) dex *= 3
  return dex > 999 ? 999 : dex
}

/** 濒死（PAL_IsPlayerDying fight.c:29-49）:hp < min(100, maxHp/5)。
 *  消费点:入队身法÷2(fight.c:1557)、濒死姿势帧、合体法术资格。 */
export function isPlayerDying(hp: number, maxHp: number): boolean {
  return hp < Math.min(100, Math.trunc(maxHp / 5))
}

// ════════════════════════════════════════════════════════════════════
// 行动队列（fight.c:1451-1584 PAL_CLASSIC）
// ════════════════════════════════════════════════════════════════════

export interface PlayerSlot {
  idx: number
  dex: number
}
export interface EnemySlot {
  idx: number
  /** 第一抽 dex（含 jitter，调用方喂）。 */
  dex: number
  dualMove: boolean
  /** dualMove 第二行动的独立二抽 dex（省略回退 dex-1 近似）。 */
  dex2?: number
}
export interface ActionQueueItem {
  isEnemy: boolean
  idx: number
  dex: number
  /** 仅 dualMove 敌人的第二次行动 = true。 */
  fIsSecond: boolean
}

/**
 * 构建一轮行动队列。fight.c:1451-1584 PAL_CLASSIC。
 *   1. 敌人塞队列;dualMove 进两次（小 dex 者标 fIsSecond）
 *   2. 队员塞队列
 *   3. dex 降序稳定排序（同 dex 保填充序 = 敌人先于队员）
 */
export function buildActionQueue(
  players: readonly PlayerSlot[],
  enemies: readonly EnemySlot[],
): ActionQueueItem[] {
  const items: ActionQueueItem[] = []
  for (const e of enemies) {
    const first: ActionQueueItem = { isEnemy: true, idx: e.idx, dex: e.dex, fIsSecond: false }
    items.push(first)
    if (e.dualMove) {
      if (e.dex2 !== undefined) {
        const second: ActionQueueItem = { isEnemy: true, idx: e.idx, dex: e.dex2, fIsSecond: false }
        if (e.dex2 <= e.dex) second.fIsSecond = true
        else first.fIsSecond = true
        items.push(second)
      } else {
        items.push({ isEnemy: true, idx: e.idx, dex: e.dex - 1, fIsSecond: true })
      }
    }
  }
  for (const p of players) items.push({ isEnemy: false, idx: p.idx, dex: p.dex, fIsSecond: false })
  items.sort((a, b) => b.dex - a.dex) // stable：同 dex 敌人在前
  return items
}

// ════════════════════════════════════════════════════════════════════
// 状态效果（fight.c:1632-1661 + kStatus）
// ════════════════════════════════════════════════════════════════════

/**
 * 战斗状态计数器（sdlpal kStatusAll = 9 项 + Slow 兼容）。全部 WORD 计数器，
 * 回合末统一 -1;>999 = 装备永久效果（战末保留）。顺序对齐 STATUS_BY_NUM（迁移器用）。
 */
export interface BattleStatus {
  confused: number
  paralyzed: number
  sleep: number
  silence: number
  puppet: number
  bravery: number
  protect: number
  haste: number
  slow: number
  dualAttack: number
}

export function emptyBattleStatus(): BattleStatus {
  return {
    confused: 0,
    paralyzed: 0,
    sleep: 0,
    silence: 0,
    puppet: 0,
    bravery: 0,
    protect: 0,
    haste: 0,
    slow: 0,
    dualAttack: 0,
  }
}

const STATUS_KEYS = [
  'confused',
  'paralyzed',
  'sleep',
  'silence',
  'puppet',
  'bravery',
  'protect',
  'haste',
  'slow',
  'dualAttack',
] as const satisfies readonly (keyof BattleStatus)[]

/** 回合末对一个战斗单位全 status 计数器 -1（fight.c:1632-1638 遍历 kStatusAll）。原地改。 */
export function tickBattleStatus(status: BattleStatus): void {
  for (const k of STATUS_KEYS) {
    const v = status[k] ?? 0
    if (v > 0) status[k] = v - 1
  }
}

/** 可正常行动:sleep/paralyzed 阻断（confused 由状态机改派攻击友方,不在此拦）。 */
export function canAct(status: BattleStatus): boolean {
  return status.sleep <= 0 && status.paralyzed <= 0
}

/** 可施法:silence 阻断（sdlpal silence>0 时仙术菜单禁用）。 */
export function canCastMagic(status: BattleStatus): boolean {
  return (status.silence ?? 0) <= 0
}

/**
 * 队员状态设置语义(global.c:2221-2276 PAL_SetPlayerStatus 精确移植):
 * - 坏状态(乱/定/眠/封/迟缓):**已有不刷新**(==0 才设);
 * - 好状态(狂/护/加速/连击):仅活人,取较长回合;
 * - 傀儡:仅死者,取较长;
 * - 加速↔迟缓互斥(非 CLASSIC 语义;引擎 schema 含 slow 故一并实现,PAL 数据不触发)。
 * 返回是否生效(调用方 log/演出用)。⚠ 曾一律 Math.max 覆盖 = 坏状态可被刷新(偏离原版)。
 */
export function applyPlayerStatus(
  st: BattleStatus,
  key: keyof BattleStatus,
  turns: number,
  alive: boolean,
): boolean {
  if (key === 'puppet') {
    if (alive) return false // 傀儡仅死者可设(global.c:2240-2255)
    st.puppet = Math.max(st.puppet, turns)
    return true
  }
  const definition = key === 'slow' ? undefined : ACTOR_STATUS_DEFINITIONS[key]
  if (key === 'slow' || definition?.category === 'bad') {
    if (st[key] > 0) return false // 坏状态已有不刷新(global.c:2234)
    st[key] = turns
    if (key === 'slow') st.haste = 0 // 互斥
    return true
  }
  if (!alive) return false // 好状态仅活人(global.c:2239+)
  if (key === 'haste') st.slow = 0 // 互斥
  st[key] = Math.max(st[key], turns)
  return true
}

/** 敌方状态设置 = **直接赋值**(script.c:1391 rgwStatus[op0]=op1;命中判定在调用方)。 */
export function applyEnemyStatus(st: BattleStatus, key: keyof BattleStatus, turns: number): void {
  st[key] = turns
}
