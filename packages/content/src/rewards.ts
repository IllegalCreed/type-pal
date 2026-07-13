/**
 * 战后结算(B7a)—— exp/cash 入账 + 升级成长 + 学新技能 + 战后半恢复。
 * 公式 = 原版考证(battle.c:991-1372 + global.c:2347-2454,经一阶段 battle-system 移植):
 * - exp:全体存活队员各得全额(死者不获);扣减式升级(dwExp -= levelUpExp[level])
 * - 成长:maxHP+10+R(0,7) / maxMP+8+R(0,5) / 武术·灵力+4+R(0,1) / 防·身法+2+R(0,1) /
 *   吉运+2(固定);各项 cap 999;升级 HP/MP 回满
 * - 学技能:升级跨过的 level 在 levelUp 表内 → 习得(去重)
 * - Phase F:战后全员 HP += (max−HP)/2、MP 同(死者由调用方先回 1 血再半恢复,同原版观感)
 */
import type { ActorDef } from './actor.js'
import { type CharacterInstance, HIDDEN_STAT_KEYS, type HiddenStatKey } from './character.js'
import type { LevelUpSkill } from './skill.js'

const MAX_LEVEL = 99
const STAT_CAP = 999

/** 抓属性快照(升级屏 old/cur;体力/真气原版显 cur/max)。 */
function snapshotStats(c: CharacterInstance): StatSnapshot {
  return {
    level: c.level,
    hp: c.hp,
    maxHP: c.maxHP,
    mp: c.mp,
    maxMP: c.maxMP,
    attack: c.attack,
    magicAttack: c.magicAttack,
    defense: c.defense,
    speed: c.speed,
    luck: c.luck,
  }
}

export interface RewardInput {
  exp: number
  cash: number
  /** B7c 战斗内隐藏经验行为计数(characterId → 池计数;缺 = 无隐藏成长)。 */
  hiddenCounts?: Record<string, HiddenCounts>
}

/** 升级屏 8 属性快照(顺序 = 原版 battle.c:1141-1148:修行/体力/真气/武术/灵力/防御/身法/吉运)。
 *  体力/真气原版显 cur/max(192/326 → 339/339),故带当前 hp/mp。 */
export interface StatSnapshot {
  level: number
  hp: number
  maxHP: number
  mp: number
  maxMP: number
  attack: number
  magicAttack: number
  defense: number
  speed: number
  luck: number
}

export interface LevelUpReport {
  characterId: string
  from: number
  to: number
  /** 本次升级习得的技能 id(已并入 learnedSkills)。 */
  learned: string[]
  /** 升级屏 old→cur(8 属性;原版 Phase B box)。 */
  before: StatSnapshot
  after: StatSnapshot
}

export interface RewardReport {
  exp: number
  cash: number
  levelUps: LevelUpReport[]
  /** B7c 隐藏经验属性提升(过阈值的单项 +N;结算屏逐条一屏)。 */
  hiddenUps: HiddenUpReport[]
}

/** 隐藏经验一条提升(结算屏「{name}{属性}提升 {delta}」)。 */
export interface HiddenUpReport {
  characterId: string
  stat: HiddenStatKey
  delta: number
}

/** 战斗内行为计数(per 角色;attack+1/血+R(2,3)、防+2、法+R(2,3)/灵+1 —— fight.c 考证)。 */
export type HiddenCounts = Partial<Record<HiddenStatKey, number>>

/**
 * B7c 隐藏经验分配 —— 原版 CHECK_HIDDEN_EXP(battle.c:1226-1293),per 角色在主升级后跑:
 *   total = 7 池 count 之和;<=0 跳过(零行为零成长)
 *   每池:exp = trunc(expGained * count / total) * 2 + 池.exp
 *   while exp >= levelUpExp[池.level]:扣阈值;**属性 += R(1,2)**;level<99 → ++
 *   余数回存池.exp。**无属性 cap**(原版与主升级不同,不封顶)。
 * 阈值表复用主升级 expTable。原地改 c(属性 + hiddenExp 池);返回提升清单。
 */
export function applyHiddenExp(
  c: CharacterInstance,
  counts: HiddenCounts,
  expGained: number,
  expTable: readonly number[],
  rng: () => number = Math.random,
): HiddenUpReport[] {
  const r = (a: number, b: number): number => a + Math.floor(rng() * (b - a + 1))
  let total = 0
  for (const k of HIDDEN_STAT_KEYS) total += counts[k] ?? 0
  if (total <= 0) return []
  const ups: HiddenUpReport[] = []
  c.hiddenExp ??= {}
  const pools = c.hiddenExp
  for (const k of HIDDEN_STAT_KEYS) {
    const count = counts[k] ?? 0
    pools[k] ??= { exp: 0, level: c.level }
    const pool = pools[k]
    if (pool.level > 99) pool.level = 99
    let exp = Math.trunc((expGained * count) / total) * 2 + pool.exp
    let delta = 0
    while (true) {
      const threshold = expTable[pool.level]
      if (threshold === undefined || threshold <= 0 || exp < threshold) break
      exp -= threshold
      const inc = r(1, 2)
      c[k] += inc
      delta += inc
      if (pool.level < 99) pool.level++
    }
    pool.exp = exp & 0xffff // WORD 截断(原版同)
    if (delta > 0) ups.push({ characterId: c.id, stat: k, delta })
  }
  return ups
}

/**
 * 入账 + 升级 + 半恢复(原地修改 party/learnedSkills;money 由返回值加)。
 * @param rng [0,1) 随机源(成长掷骰)。
 */
export function grantBattleRewards(
  party: CharacterInstance[],
  learnedSkills: Record<string, string[]>,
  actorsById: Record<string, ActorDef>,
  levelUp: Record<string, LevelUpSkill[]>,
  input: RewardInput,
  rng: () => number = Math.random,
): RewardReport {
  const r = (a: number, b: number): number => a + Math.floor(rng() * (b - a + 1))
  const levelUps: LevelUpReport[] = []
  const hiddenUps: HiddenUpReport[] = []
  for (const c of party) {
    if (c.hp <= 0) continue // 死者不获经验(原版 alive gate)
    const expTable = actorsById[c.template]?.battler?.leveling?.expTable
    if (!expTable) {
      c.exp += input.exp
      continue
    }
    const from = c.level
    const before = snapshotStats(c)
    let exp = c.exp + input.exp
    const learned: string[] = []
    while (true) {
      const threshold = expTable[c.level]
      if (threshold === undefined || threshold <= 0 || exp < threshold) break
      exp -= threshold
      if (c.level >= MAX_LEVEL) continue // 满级:继续扣 exp 不再升(battle.c:1110)
      c.level++
      // PAL_PlayerLevelUp 成长(global.c:2347-2454)
      c.maxHP = Math.min(STAT_CAP, c.maxHP + 10 + r(0, 7))
      c.maxMP = Math.min(STAT_CAP, c.maxMP + 8 + r(0, 5))
      c.attack = Math.min(STAT_CAP, c.attack + 4 + r(0, 1))
      c.magicAttack = Math.min(STAT_CAP, c.magicAttack + 4 + r(0, 1))
      c.defense = Math.min(STAT_CAP, c.defense + 2 + r(0, 1))
      c.speed = Math.min(STAT_CAP, c.speed + 2 + r(0, 1))
      c.luck = Math.min(STAT_CAP, c.luck + 2)
      c.hp = c.maxHP // 升级回满(battle.c:1115-1116)
      c.mp = c.maxMP
      // 学新技能(battle.c:1300-1321):该 level 的 levelUp 条目
      for (const lu of levelUp[c.template] ?? []) {
        if (lu.level === c.level) {
          let list = learnedSkills[c.id]
          if (!list) {
            list = []
            learnedSkills[c.id] = list
          }
          if (!list.includes(lu.skillId)) {
            list.push(lu.skillId)
            learned.push(lu.skillId)
          }
        }
      }
    }
    c.exp = exp
    if (c.level > from)
      levelUps.push({
        characterId: c.id,
        from,
        to: c.level,
        learned,
        before,
        after: snapshotStats(c),
      })
    // B7c 隐藏经验分配(原版 CHECK_HIDDEN_EXP:主升级之后、per 角色)
    const counts = input.hiddenCounts?.[c.id]
    if (counts) hiddenUps.push(...applyHiddenExp(c, counts, input.exp, expTable, rng))
  }
  // Phase F:战后半恢复(battle.c:1342-1372 PAL_CLASSIC;全员,升级回满者无变化)
  for (const c of party) {
    c.hp += Math.floor((c.maxHP - c.hp) / 2)
    c.mp += Math.floor((c.maxMP - c.mp) / 2)
  }
  return { exp: input.exp, cash: input.cash, levelUps, hiddenUps }
}
