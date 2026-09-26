import type { LevelUpMagicEntry } from '@type-pal/shared'
import {
  getPlayerAttackStrength,
  getPlayerDefense,
  getPlayerDexterity,
  getPlayerFleeRate,
  getPlayerMagicStrength,
} from '../equip-effect.js'
import type { AllExperience, GameState, PlayerRolesRuntime } from '../game-state.js'
import type { SeedableRng } from '../rng.js'
import type { LevelUpScreenData } from './battle-settlement.js'

/** sdlpal `MAX_LEVELS`(global.h)。 */
const LEVELUP_MAX_LEVELS = 99
/** sdlpal `STAT_LIMIT` cap(global.c:2440 宏,值上限 999)。 */
const LEVELUP_STAT_CAP = 999

/** D11 升级演出结果(单个升级队员)—— 供 present 升级 box(level/HP/MP/属性 增长 + 学得法术)。 */
export interface BattleLevelUpResult {
  roleId: number
  fromLevel: number
  toLevel: number
  /** 本次升级新学的法术(spell object id)。 */
  learnedMagics: number[]
  /**
   * D11b 升级 box 数值快照(仅 toLevel>fromLevel 有意义)—— old(升级前)/cur(升级后)。
   * level/hp/mp 为 runtime 直读值;attack/magic/defense/dexterity/flee 为 PAL_GetPlayerXxx 有效值
   * (含装备加成,battle.c:1184-1212 真值)。name/magicName 在 buildBattleWonSettlement 用 res 补。
   */
  snapshot?: Omit<LevelUpScreenData, 'name'>
  /** E04:隐藏属性经验涨点(CHECK_HIDDEN_EXP),供结算屏 hidden-exp-up box;无涨点则空/省略。 */
  hiddenExpGrowth?: HiddenExpGrowthResult[]
}

/**
 * E04 隐藏属性经验池 → runtime 属性字段映射(sdlpal CHECK_HIDDEN_EXP 调用顺序 battle.c:1276-1282):
 *   Health→rgwMaxHP / Magic→rgwMaxMP / Attack→rgwAttackStrength / MagicPower→rgwMagicStrength /
 *   Defense→rgwDefense / Dexterity→rgwDexterity / Flee→rgwFleeRate。**顺序严格**(影响 RandomLong 消耗序)。
 */
const HIDDEN_EXP_POOLS: ReadonlyArray<{
  key:
    | 'rgHealthExp'
    | 'rgMagicExp'
    | 'rgAttackExp'
    | 'rgMagicPowerExp'
    | 'rgDefenseExp'
    | 'rgDexterityExp'
    | 'rgFleeExp'
  stat:
    | 'rgwMaxHP'
    | 'rgwMaxMP'
    | 'rgwAttackStrength'
    | 'rgwMagicStrength'
    | 'rgwDefense'
    | 'rgwDexterity'
    | 'rgwFleeRate'
  label: string
  /** 结算屏属性 WORD id(sdlpal STATUS_LABEL_*,ui.h:86-96):49体力/50真气/51武术/52灵力/53防御/54身法/55吉运。 */
  statLabelWord: number
}> = [
  { key: 'rgHealthExp', stat: 'rgwMaxHP', label: 'maxHP', statLabelWord: 49 },
  { key: 'rgMagicExp', stat: 'rgwMaxMP', label: 'maxMP', statLabelWord: 50 },
  { key: 'rgAttackExp', stat: 'rgwAttackStrength', label: 'attack', statLabelWord: 51 },
  { key: 'rgMagicPowerExp', stat: 'rgwMagicStrength', label: 'magic', statLabelWord: 52 },
  { key: 'rgDefenseExp', stat: 'rgwDefense', label: 'defense', statLabelWord: 53 },
  { key: 'rgDexterityExp', stat: 'rgwDexterity', label: 'dexterity', statLabelWord: 54 },
  { key: 'rgFleeExp', stat: 'rgwFleeRate', label: 'fleeRate', statLabelWord: 55 },
]

/** 隐藏属性经验某池涨点结果(供结算屏显示)。statLabelWord = STATUS_LABEL_* WORD id。 */
export interface HiddenExpGrowthResult {
  stat: string
  label: string
  statLabelWord: number
  delta: number
}

/**
 * 隐藏属性经验分配 —— sdlpal `CHECK_HIDDEN_EXP`(battle.c:1226-1293),per-role 在主升级之后跑。
 *
 * iTotalCount = 7 隐藏池 wCount 之和(**不含主经验**)。iTotalCount<=0 → 整段跳过(忠实零行为)。
 * 每池(严格 Health→…→Flee 序):
 *   dwExp = trunc(expGained * wCount / iTotalCount) * 2 + wExp  (逐步整数,截断在 /iTotalCount 处,*2 在其后)
 *   wLevel>99 → 钳 99;while dwExp >= levelUpExp[wLevel]:dwExp-=阈值;**rt.stat += RandomLong(1,2)**;wLevel<99→++
 *   wExp = (WORD)dwExp
 * 写 rt(PlayerRolesRuntime raw base,与主升级同源)—— **不**写 projected role(否则装备加成被当 base 错涨,D27)。
 * **不做 STAT_LIMIT 钳**(sdlpal CHECK_HIDDEN_EXP 与主升级不同,无 cap)。返回各池涨点(供结算屏 hidden-exp-up box)。
 */
export function applyHiddenExpGrowth(input: {
  exp: AllExperience
  rt: PlayerRolesRuntime
  roleId: number
  expGained: number
  levelUpExp: number[]
  rng: { rangeInclusive: (a: number, b: number) => number }
}): HiddenExpGrowthResult[] {
  const { exp, rt, roleId, expGained, levelUpExp, rng } = input
  let iTotalCount = 0
  for (const p of HIDDEN_EXP_POOLS) iTotalCount += exp[p.key][roleId]?.wCount ?? 0
  if (iTotalCount <= 0) return [] // 无累积 → 跳过

  const results: HiddenExpGrowthResult[] = []
  for (const p of HIDDEN_EXP_POOLS) {
    const entry = exp[p.key][roleId]
    const statRow = rt[p.stat]
    if (!entry || !statRow) continue
    const wCount = entry.wCount ?? 0
    let dwExp = Math.trunc((expGained * wCount) / iTotalCount) * 2 + entry.wExp
    if (entry.wLevel > 99) entry.wLevel = 99
    let delta = 0
    while (true) {
      const threshold = levelUpExp[entry.wLevel]
      if (threshold === undefined || threshold <= 0 || dwExp < threshold) break
      dwExp -= threshold
      const inc = rng.rangeInclusive(1, 2) // RandomLong(1,2)
      statRow[roleId] = (statRow[roleId] ?? 0) + inc
      delta += inc
      if (entry.wLevel < 99) entry.wLevel++
    }
    entry.wExp = dwExp & 0xffff // WORD 截断
    if (delta > 0)
      results.push({ stat: p.stat, label: p.label, statLabelWord: p.statLabelWord, delta })
  }
  return results
}

/**
 * 战斗胜利升级 —— 对照 sdlpal `PAL_BattleWon`(battle.c:1088-1120 升级 loop + 1300-1321 学法术)
 * + `PAL_PlayerLevelUp`(global.c:2347-2454 stat 成长)。写 gs.PlayerRolesRuntime(统一源,边界回写后跑)。
 *
 * 对每个活着的 party 成员(post-battle runtime hp>0):
 *   dwExp = rgPrimaryExp.wExp + expGained;
 *   while dwExp >= rgLevelUpExp[level]:
 *     dwExp -= rgLevelUpExp[level];
 *     if level < MAX:level++; stat 成长(maxHP+=10+R(0,7) 等)+ STAT_LIMIT cap + HP/MP 满;
 *   rgPrimaryExp = { wExp: dwExp 余, wLevel: level };
 *   升级了 → 学新法术(level-up-magic[j][roleId],level<=新等级 + magic!=0 + 未学 → AddMagic)。
 *
 * stat 成长用 state.rng(种子,**确定性 + 忠实 RandomLong**;区别于 opcode 0x8D playerLevelUp 的
 * Math.random 版 —— 战斗胜利在确定 rng 流里,可复现/可测)。
 */
export function battleWonLevelUp(input: {
  gs: GameState
  partyMembers: number[]
  expGained: number
  levelUpExp: number[]
  levelUpMagic: LevelUpMagicEntry[][]
  rng: SeedableRng
}): BattleLevelUpResult[] {
  const { gs, partyMembers, expGained, levelUpExp, levelUpMagic, rng } = input
  const rt = gs.PlayerRolesRuntime
  const out: BattleLevelUpResult[] = []

  for (const roleId of partyMembers) {
    if ((rt.rgwHP[roleId] ?? 0) <= 0) continue // 死人不获 exp / 不升级(battle.c:1093)

    // 升级 box old→new 快照:升级 loop 前抓 old(HP/MP 此刻是 post-battle 受伤值;sdlpal
    // OrigPlayerRoles 在 PAL_BattleWon 起手抓 = 同语义)。attack 等的 old 用 base,渲染时 +装备加成。
    const oldHP = rt.rgwHP[roleId] ?? 0
    const oldMaxHP = rt.rgwMaxHP[roleId] ?? 0
    const oldMP = rt.rgwMP[roleId] ?? 0
    const oldMaxMP = rt.rgwMaxMP[roleId] ?? 0
    const oldAtkBase = rt.rgwAttackStrength[roleId] ?? 0
    const oldMagBase = rt.rgwMagicStrength[roleId] ?? 0
    const oldDefBase = rt.rgwDefense[roleId] ?? 0
    const oldDexBase = rt.rgwDexterity[roleId] ?? 0
    const oldFleeBase = rt.rgwFleeRate[roleId] ?? 0

    const fromLevel = Math.min(LEVELUP_MAX_LEVELS, rt.rgwLevel[roleId] ?? 0)
    let level = fromLevel
    rt.rgwLevel[roleId] = level
    let dwExp = (gs.Exp.rgPrimaryExp[roleId]?.wExp ?? 0) + expGained
    let leveled = false

    while (true) {
      const threshold = levelUpExp[level]
      if (threshold === undefined || threshold <= 0 || dwExp < threshold) break
      dwExp -= threshold
      if (level >= LEVELUP_MAX_LEVELS) continue // 满级:继续扣 exp 不再升(battle.c:1110 `if (level < MAX)`)
      leveled = true
      level++
      rt.rgwLevel[roleId] = level
      // PAL_PlayerLevelUp stat 成长(global.c:2347-2454)
      rt.rgwMaxHP[roleId] = (rt.rgwMaxHP[roleId] ?? 0) + 10 + rng.rangeInclusive(0, 7)
      rt.rgwMaxMP[roleId] = (rt.rgwMaxMP[roleId] ?? 0) + 8 + rng.rangeInclusive(0, 5)
      rt.rgwAttackStrength[roleId] =
        (rt.rgwAttackStrength[roleId] ?? 0) + 4 + rng.rangeInclusive(0, 1)
      rt.rgwMagicStrength[roleId] =
        (rt.rgwMagicStrength[roleId] ?? 0) + 4 + rng.rangeInclusive(0, 1)
      rt.rgwDefense[roleId] = (rt.rgwDefense[roleId] ?? 0) + 2 + rng.rangeInclusive(0, 1)
      rt.rgwDexterity[roleId] = (rt.rgwDexterity[roleId] ?? 0) + 2 + rng.rangeInclusive(0, 1)
      rt.rgwFleeRate[roleId] = (rt.rgwFleeRate[roleId] ?? 0) + 2
      for (const arr of [
        rt.rgwMaxHP,
        rt.rgwMaxMP,
        rt.rgwAttackStrength,
        rt.rgwMagicStrength,
        rt.rgwDefense,
        rt.rgwDexterity,
        rt.rgwFleeRate,
      ]) {
        if ((arr[roleId] ?? 0) > LEVELUP_STAT_CAP) arr[roleId] = LEVELUP_STAT_CAP
      }
      // 升级 HP/MP 回满(battle.c:1115-1116)
      rt.rgwHP[roleId] = rt.rgwMaxHP[roleId]!
      rt.rgwMP[roleId] = rt.rgwMaxMP[roleId]!
    }

    // 写回余 exp + level(battle.c:1120 / global.c:2450-2452)
    const exp = gs.Exp.rgPrimaryExp[roleId]
    if (exp) {
      exp.wExp = dwExp
      exp.wLevel = level
    }

    // 升级 box 快照(battle.c:1153-1212):level/HP/MP 直读;attack 等用 PAL_GetPlayerXxx 有效值
    //   (含装备加成)。old 有效值 = old base + 装备加成(= 有效 - cur base,装备不随升级变,故等价
    //   sdlpal `OrigBase + GetPlayerXxx() - curBase`)。仅升级了才建快照。
    let snapshot: Omit<LevelUpScreenData, 'name'> | undefined
    if (leveled) {
      const effAtk = getPlayerAttackStrength(gs, roleId)
      const effMag = getPlayerMagicStrength(gs, roleId)
      const effDef = getPlayerDefense(gs, roleId)
      const effDex = getPlayerDexterity(gs, roleId)
      const effFlee = getPlayerFleeRate(gs, roleId)
      snapshot = {
        roleId,
        level: { old: fromLevel, cur: level },
        hp: {
          old: oldHP,
          oldMax: oldMaxHP,
          cur: rt.rgwHP[roleId] ?? 0,
          curMax: rt.rgwMaxHP[roleId] ?? 0,
        },
        mp: {
          old: oldMP,
          oldMax: oldMaxMP,
          cur: rt.rgwMP[roleId] ?? 0,
          curMax: rt.rgwMaxMP[roleId] ?? 0,
        },
        attack: { old: oldAtkBase + (effAtk - (rt.rgwAttackStrength[roleId] ?? 0)), cur: effAtk },
        magic: { old: oldMagBase + (effMag - (rt.rgwMagicStrength[roleId] ?? 0)), cur: effMag },
        defense: { old: oldDefBase + (effDef - (rt.rgwDefense[roleId] ?? 0)), cur: effDef },
        dexterity: { old: oldDexBase + (effDex - (rt.rgwDexterity[roleId] ?? 0)), cur: effDex },
        flee: { old: oldFleeBase + (effFlee - (rt.rgwFleeRate[roleId] ?? 0)), cur: effFlee },
      }
    }

    // E04:CHECK_HIDDEN_EXP(battle.c:1226-1293)在主升级 box 之后、学法术之前跑(sdlpal 同序)。
    //   写 rt base + 收集各池涨点供结算屏。隐藏经验有独立 box,不并入主升级 snapshot。
    const hiddenExpGrowth = applyHiddenExpGrowth({
      exp: gs.Exp,
      rt,
      roleId,
      expGained,
      levelUpExp,
      rng,
    })
    // 隐藏经验可能抬高 maxHP/MP;若本场**主升级**则 HP/MP 回满到(可能更高的)新 max(battle.c:1289-1292 if fLevelUp)。
    if (leveled) {
      rt.rgwHP[roleId] = rt.rgwMaxHP[roleId]!
      rt.rgwMP[roleId] = rt.rgwMaxMP[roleId]!
    }

    // 学新法术(battle.c:1298-1328):**在 if(fLevelUp) 之外**,对每个活队员按当前等级学(level-up-magic
    //   [j][roleId] 仅 5 角色 0-4,role5 取 undefined 自动跳过)。非升级队员若漏学(应有却没)也补上。
    const learned: number[] = []
    for (const entry of levelUpMagic) {
      const m = entry[roleId]
      if (!m || m.magic === 0 || m.level > level) continue
      if (addMagicToRoleRuntime(rt, roleId, m.magic)) learned.push(m.magic)
    }

    // 升级了 / 学到新法术 / 隐藏属性涨点 → 产出结算条目(present 据此排 level-up box + 隐藏涨点 box + learn-magic 屏)。
    if (leveled || learned.length > 0 || hiddenExpGrowth.length > 0)
      out.push({
        roleId,
        fromLevel,
        toLevel: level,
        learnedMagics: learned,
        snapshot,
        hiddenExpGrowth,
      })
  }
  return out
}

/** sdlpal `PAL_AddMagic`(global.c:2084):已学 → false;否则填第一个空槽(spell object id)→ true。写 runtime.rgwMagic。 */
function addMagicToRoleRuntime(
  rt: PlayerRolesRuntime,
  roleId: number,
  spellObjId: number,
): boolean {
  if (roleId < 0 || spellObjId === 0) return false
  const rgwMagic = rt.rgwMagic
  for (const slot of rgwMagic) {
    if (slot?.[roleId] === spellObjId) return false // 已学
  }
  for (const slot of rgwMagic) {
    if ((slot?.[roleId] ?? 0) === 0) {
      slot[roleId] = spellObjId
      return true
    }
  }
  return false // 槽满
}
