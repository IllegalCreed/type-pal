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
import type { CharacterInstance } from './character.js'
import type { LevelUpSkill } from './skill.js'

const MAX_LEVEL = 99
const STAT_CAP = 999

export interface RewardInput {
  exp: number
  cash: number
}

export interface LevelUpReport {
  characterId: string
  from: number
  to: number
  /** 本次升级习得的技能 id(已并入 learnedSkills)。 */
  learned: string[]
}

export interface RewardReport {
  exp: number
  cash: number
  levelUps: LevelUpReport[]
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
  for (const c of party) {
    if (c.hp <= 0) continue // 死者不获经验(原版 alive gate)
    const expTable = actorsById[c.template]?.battler?.leveling?.expTable
    if (!expTable) {
      c.exp += input.exp
      continue
    }
    const from = c.level
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
          const list = (learnedSkills[c.id] ??= [])
          if (!list.includes(lu.skillId)) {
            list.push(lu.skillId)
            learned.push(lu.skillId)
          }
        }
      }
    }
    c.exp = exp
    if (c.level > from) levelUps.push({ characterId: c.id, from, to: c.level, learned })
  }
  // Phase F:战后半恢复(battle.c:1342-1372 PAL_CLASSIC;全员,升级回满者无变化)
  for (const c of party) {
    c.hp += Math.floor((c.maxHP - c.hp) / 2)
    c.mp += Math.floor((c.maxMP - c.mp) / 2)
  }
  return { exp: input.exp, cash: input.cash, levelUps }
}
