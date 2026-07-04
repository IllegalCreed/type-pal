/**
 * M4a/M4c · headless 回合战核 —— 无渲染、无动画的纯逻辑状态机（单测验收）。
 * 设计:battle-model-m4-design.md §3 + enemy-ai-design.md(M4c)。
 * 回合流程 preBattle→selectAction⇄performAction→won/lost/fled。
 *
 * M4c-1:敌人决策走规则求值器(content/enemy-ai)——迁移器把 fallback(magic+magicRate)
 * 翻成 [chance] cast 规则,无规则/无命中 = 普攻(原版兜底);cast 走 SkillEffect 结算
 * (v1 覆盖 damage/healHp/applyStatus,其余效果 log 跳过)。
 * summon/transform/divide/flee 动作与 choreography 演出 = M4c-2。
 * 公式全走 content/battle-formulas（= sdlpal fight.c）。RNG 可注入（测试定值,运行时真随机）。
 */
import type { AiBattleView, BattleStatus, EnemyDef, ItemData, SkillData } from '@type-pal/content'
import {
  buildActionQueue,
  calcMagicDamage,
  calcPhysicalAttackDamage,
  canAct,
  decideByRules,
  emptyBattleStatus,
  getEnemyDexterity,
  getPlayerActualDexterity,
  pickAiTarget,
  tickBattleStatus,
} from '@type-pal/content'

export type BattlePhase = 'preBattle' | 'selectAction' | 'performAction' | 'won' | 'lost' | 'fled'

/** 队员战斗态（属性由 createBattleState 从 world 派生;M4a 只用攻防/HP）。 */
export interface BattlePlayerState {
  roleId: string
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  attackStrength: number
  defense: number
  magicStrength: number
  /** 基础敏捷（含 level+装备,派生时算好）。 */
  baseDexterity: number
  /** 会的技能 id(M4b-3;main 从 world.learnedSkills 组装)。 */
  skills: string[]
  /** 吉运(逃跑判定 str;含装备加成,派生时算好)。 */
  fleeRate: number
  status: BattleStatus
  defending: boolean
}

/** 敌人战斗态（引 EnemyDef + 当前 HP/status）。 */
export interface BattleEnemyState {
  def: EnemyDef
  hp: number
  status: BattleStatus
  defending: boolean
  /** once 规则已触发下标(M4c;transform 时清零)。 */
  firedRules: Set<number>
  /** 战果已计入 expGained/cashGained(死亡只记一次;B7a)。 */
  rewardCounted?: boolean
}

export interface BattleState {
  phase: BattlePhase
  turn: number
  players: BattlePlayerState[]
  enemies: BattleEnemyState[]
  /** 本轮各队员选的行动（selectAction 阶段 UI 填;headless 测直接填）。 */
  pendingActions: Map<number, BattleAction>
  /** performAction 消费中的队列。 */
  actionQueue: ReturnType<typeof buildActionQueue>
  /** 战斗日志（headless 测断言用;present 期改事件）。 */
  log: string[]
  /** 技能表(敌施法;M4c)。 */
  skills: Record<string, SkillData>
  /** 敌人表(transform/summon;M4c-2)。 */
  enemiesById: Record<string, EnemyDef>
  /** 物品表 + 背包(战斗内扣,writeBack 回世界)。 */
  items: Record<string, ItemData>
  inventory: { itemId: string; count: number }[]
  /** 难度预设 id(M4c 留口)。 */
  difficulty: string
  /** 敌人整场逃离(0x69 剧情逃跑:战斗终止无奖励;fled 敌不计胜利奖励)。 */
  enemyFled: boolean
  /** 战果累计(敌死时 += def.stats.exp/cash;敌逃(enemyFled)不计;B7a 战后入账)。 */
  expGained: number
  cashGained: number
  /** 最近一步已结算的行动(表现层读:音效/动画时机;每次 perform*Action 覆写)。 */
  lastAction: {
    side: 'player' | 'enemy'
    idx: number
    kind: string
    target?: number
    /** cast 动作的技能 id(表现层查 animation 播特效)。 */
    skillId?: string
  } | null
}

export type BattleAction =
  | { kind: 'attack'; targetEnemyIdx: number }
  | { kind: 'cast'; skillId: string; targetEnemyIdx?: number } // 对敌单体带目标;施于己方/全体不带
  | { kind: 'item'; itemId: string } // 战斗用品(v1 施于自己;consuming 扣库存)
  | { kind: 'defend' }
  | { kind: 'flee' }

export interface CreateBattleInput {
  players: Omit<BattlePlayerState, 'status' | 'defending'>[]
  enemies: EnemyDef[]
  /** 技能表(敌施法查 SkillData;缺省空 = cast 落普攻并 log)。 */
  skills?: Record<string, SkillData>
  /** 敌人表(transform/summon 查 EnemyDef;缺省空 = 动作落普攻并 log)。 */
  enemiesById?: Record<string, EnemyDef>
  /** 物品表 + 背包副本(战斗用品;count 战斗内扣,main 战后写回)。 */
  items?: Record<string, ItemData>
  inventory?: { itemId: string; count: number }[]
  /** 难度预设 id(AI difficulty 条件;缺省 'normal')。 */
  difficulty?: string
}

export function createBattleState(input: CreateBattleInput): BattleState {
  return {
    phase: 'preBattle',
    turn: 0,
    players: input.players.map((p) => ({ ...p, status: emptyBattleStatus(), defending: false })),
    enemies: input.enemies.map((def) => ({
      def,
      hp: def.stats.health,
      status: emptyBattleStatus(),
      defending: false,
      firedRules: new Set<number>(),
    })),
    pendingActions: new Map(),
    actionQueue: [],
    log: [],
    skills: input.skills ?? {},
    enemiesById: input.enemiesById ?? {},
    items: input.items ?? {},
    inventory: input.inventory ?? [],
    difficulty: input.difficulty ?? 'normal',
    enemyFled: false,
    expGained: 0,
    cashGained: 0,
    lastAction: null,
  }
}

const alivePlayers = (s: BattleState): number[] =>
  s.players.map((p, i) => (p.hp > 0 ? i : -1)).filter((i) => i >= 0)
const aliveEnemies = (s: BattleState): number[] =>
  s.enemies.map((e, i) => (e.hp > 0 ? i : -1)).filter((i) => i >= 0)

/** 防御减半（原版 defending 时受击伤害 /2;fight.c PAL_BattleUpdateFighters 后处理近似）。 */
function applyDefense(damage: number, defending: boolean): number {
  return defending ? Math.trunc(damage / 2) : damage
}

/** 物理攻击结算（攻方 atk vs 受方 def+物抗）。返回实际伤害。 */
export function resolveAttack(
  atk: number,
  def: number,
  physRes: number,
  defending: boolean,
): number {
  return Math.max(0, applyDefense(calcPhysicalAttackDamage(atk, def, physRes), defending))
}

/** 组装 AI 求值视图(纯数据;设计 enemy-ai-design.md §2)。session 演出钩 when 求值共用。 */
export function buildAiView(s: BattleState, self: BattleEnemyState): AiBattleView {
  const firstIdx = s.enemies.findIndex((x) => x.hp > 0 && x.def.id === self.def.id)
  return {
    turn: s.turn,
    difficulty: s.difficulty,
    self: {
      hpPercent: (self.hp / Math.max(1, self.def.stats.health)) * 100,
      firstOfKind: s.enemies[firstIdx] === self,
      silenced: self.status.silence > 0,
    },
    allyCount: aliveEnemies(s).length,
    players: alivePlayers(s).map((i) => {
      const p = s.players[i]!
      return {
        index: i,
        hpPercent: (p.hp / Math.max(1, p.maxHp)) * 100,
        hp: p.hp,
        mp: p.mp,
        attack: p.attackStrength,
      }
    }),
  }
}

export type EnemyDecision =
  | { kind: 'attack'; targetPlayerIdx: number }
  | { kind: 'cast'; skill: SkillData; targetPlayerIdx: number }
  | { kind: 'transform'; def: EnemyDef }
  | { kind: 'divide'; copies: number }
  | { kind: 'summon'; def: EnemyDef; count: number }
  | { kind: 'fleeAll' }
  | { kind: 'pass' }

/**
 * 敌人决策(M4c):规则求值器(content/enemy-ai)取首条命中;无规则/无命中 = 普攻随机
 * 活队员(原版兜底)。sleep/paralyzed → pass;沉默由求值器跳 cast 规则。
 * transform/summon 查敌人表,缺数据落普攻并 log(手配数据可见提示)。
 */
export function decideEnemyAction(
  s: BattleState,
  e: BattleEnemyState,
  rng: () => number,
): EnemyDecision {
  const targets = alivePlayers(s)
  if (!canAct(e.status) || targets.length === 0) return { kind: 'pass' }
  const view = buildAiView(s, e)
  const fallbackAttack = (): EnemyDecision => ({
    kind: 'attack',
    targetPlayerIdx: pickAiTarget('random', view.players, rng),
  })
  const rules = e.def.ai.rules
  if (!rules?.length) return fallbackAttack()
  const d = decideByRules(rules, view, rng, e.firedRules)
  if (!d) return fallbackAttack()
  if (rules[d.ruleIdx]?.once) e.firedRules.add(d.ruleIdx)
  switch (d.action.kind) {
    case 'pass':
      return { kind: 'pass' } // 0xFFFF 哨兵:掷中也不动(原版)
    case 'attack':
      return { kind: 'attack', targetPlayerIdx: pickAiTarget(d.action.target, view.players, rng) }
    case 'cast': {
      const skill = s.skills[d.action.skillId]
      if (!skill) {
        s.log.push(`${e.def.id} 施法 ${d.action.skillId} 缺技能数据,落普攻`)
        return fallbackAttack()
      }
      return {
        kind: 'cast',
        skill,
        targetPlayerIdx: pickAiTarget(d.action.target, view.players, rng),
      }
    }
    case 'transform': {
      const def = s.enemiesById[d.action.enemyId]
      if (!def) {
        s.log.push(`${e.def.id} 变身 ${d.action.enemyId} 缺敌人数据,落普攻`)
        return fallbackAttack()
      }
      return { kind: 'transform', def }
    }
    case 'divide':
      return { kind: 'divide', copies: d.action.copies }
    case 'summon': {
      const def =
        s.enemiesById[d.action.enemyId ?? e.def.id] ?? (d.action.enemyId ? undefined : e.def)
      if (!def) {
        s.log.push(`${e.def.id} 召唤 ${d.action.enemyId} 缺敌人数据,落普攻`)
        return fallbackAttack()
      }
      return { kind: 'summon', def, count: d.action.count }
    }
    case 'flee':
      return { kind: 'fleeAll' }
  }
}

/** 战场敌槽上限(原版 formation 最多 5)。 */
const MAX_ENEMIES = 5

/**
 * 推进战斗一步（headless 驱动 = 反复调至 phase 终态）。
 * @param rng 注入随机（dex jitter / AI 选目标 / 逃跑）。
 */
export function stepBattle(s: BattleState, rng: () => number): void {
  switch (s.phase) {
    case 'preBattle':
      s.phase = 'selectAction'
      s.turn = 1
      return
    case 'selectAction': {
      // 所有活队员都选了 → build queue,进 performAction。（headless:调用方先填 pendingActions。）
      const alive = alivePlayers(s)
      if (alive.some((i) => !s.pendingActions.has(i))) return // 等填齐
      // 逃跑改为行动(轮到该队员时掷骰;fight.c:4143 语义)——不再选了即逃
      const players = alive.map((i) => ({
        idx: i,
        dex: getPlayerActualDexterity(s.players[i]!.baseDexterity, s.players[i]!.status.haste > 0),
      }))
      const enemies = aliveEnemies(s).map((i) => ({
        idx: i,
        dex: getEnemyDexterity(s.enemies[i]!.def.stats.level, s.enemies[i]!.def.stats.dexterity),
        dualMove: s.enemies[i]!.def.stats.dualMove,
      }))
      s.actionQueue = buildActionQueue(players, enemies)
      // 防御在选定行动后即时就位、贯穿整个 performAction(原版语义:防御者本回合受击减半,
      // 不论敌人是否先手)。故此处按 pendingActions 预设,不等该队员的队列项。
      for (const i of alive) s.players[i]!.defending = s.pendingActions.get(i)?.kind === 'defend'
      s.phase = 'performAction'
      return
    }
    case 'performAction': {
      const item = s.actionQueue.shift()
      if (!item) {
        // 回合末:status 衰减 + turn++,回 selectAction
        for (const p of s.players) tickBattleStatus(p.status)
        for (const e of s.enemies) if (e.hp > 0) tickBattleStatus(e.status)
        s.pendingActions.clear()
        s.turn++
        s.phase = 'selectAction'
        return
      }
      if (item.isEnemy) performEnemyAction(s, item.idx, rng)
      else performPlayerAction(s, item.idx, rng)
      // B7a 战果累计:本步新死敌 += exp/cash(只记一次;敌逃(enemyFled)清场不计)
      for (const e of s.enemies) {
        if (e.hp <= 0 && !e.rewardCounted) {
          e.rewardCounted = true
          if (!s.enemyFled) {
            s.expGained += e.def.stats.exp
            s.cashGained += e.def.stats.cash
          }
        }
      }
      // 每 action 后判胜负（提前终结）
      if (aliveEnemies(s).length === 0) {
        s.phase = 'won'
        s.log.push('胜利')
      } else if (alivePlayers(s).length === 0) {
        s.phase = 'lost'
        s.log.push('全灭')
      }
      return
    }
    default:
      return // won/lost/fled = 终态
  }
}

/** 玩家施法结算(M4b-3):对敌用敌方真实抗性(元素/毒/物抗);奶/状态用于自己(单人队;
 *  多人队友选择后补)。MP 不足空过(UI 已滤,core 兜底)。 */
function applyPlayerSkill(
  s: BattleState,
  idx: number,
  skillId: string,
  targetEnemyIdx: number | undefined,
  rng: () => number,
): void {
  const p = s.players[idx]!
  const skill = s.skills[skillId]
  if (!skill) {
    s.log.push(`${p.roleId} 施法 ${skillId} 缺技能数据`)
    return
  }
  const mpCost = skill.cost.mp ?? 0
  if (p.mp < mpCost) {
    s.log.push(`${p.roleId} MP 不足,${skill.name} 施放失败`)
    return
  }
  p.mp -= mpCost
  const onEnemies = skill.target === 'oneEnemy' || skill.target === 'allEnemies'
  const enemyTargets =
    skill.target === 'allEnemies'
      ? aliveEnemies(s)
      : onEnemies
        ? [targetEnemyIdx ?? aliveEnemies(s)[0] ?? -1].filter(
            (i) => i >= 0 && (s.enemies[i]?.hp ?? 0) > 0,
          )
        : []
  for (const eff of skill.effects) {
    switch (eff.kind) {
      case 'damage': {
        for (const ti of enemyTargets) {
          const e = s.enemies[ti]!
          const dmg = Math.max(
            1,
            applyDefense(
              calcMagicDamage({
                magStr: p.magicStrength,
                def: e.def.stats.defense,
                rngFactor: 1 + rng() * 0.1,
                magicData: { baseDamage: eff.power, elemental: eff.elemental },
                elemRes: e.def.stats.elemResistance,
                poisonRes: e.def.stats.poisonResistance,
                resistMult: 1, // 敌侧抗性 0-10 直用(一阶段敌向量语义)
                fieldEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
              }),
              e.defending,
            ),
          )
          e.hp = Math.max(0, e.hp - dmg)
          s.log.push(`${p.roleId} 施展 ${skill.name} 对 ${e.def.id} 造成 ${dmg}`)
        }
        break
      }
      case 'healHp': {
        p.hp = Math.min(p.maxHp, p.hp + eff.amount)
        s.log.push(`${p.roleId} 施展 ${skill.name} 回复 ${eff.amount}`)
        break
      }
      case 'healMp': {
        p.mp = Math.min(p.maxMp, p.mp + eff.amount)
        s.log.push(`${p.roleId} 施展 ${skill.name} 回蓝 ${eff.amount}`)
        break
      }
      case 'applyStatus': {
        for (const ti of enemyTargets) {
          const e = s.enemies[ti]!
          // 命中判定:rng(0,9) >= resistanceToSorcery(原版后期修复语义,enemy.ts 注)
          if (Math.floor(rng() * 10) >= e.def.ai.resistanceToSorcery) {
            e.status[eff.status] = Math.max(e.status[eff.status], eff.turns)
            s.log.push(`${e.def.id} 陷入 ${eff.status}`)
          } else s.log.push(`${e.def.id} 抵抗了 ${eff.status}`)
        }
        break
      }
      default:
        s.log.push(`技能效果 ${eff.kind} 未接(战斗期陆续)`)
    }
  }
}

function performPlayerAction(s: BattleState, idx: number, _rng: () => number): void {
  const p = s.players[idx]
  if (!p || p.hp <= 0) return
  if (!canAct(p.status)) {
    s.log.push(`${p.roleId} 无法行动`)
    return
  }
  const act = s.pendingActions.get(idx)
  if (!act) return
  s.lastAction = {
    side: 'player',
    idx,
    kind: act.kind,
    ...('targetEnemyIdx' in act && act.targetEnemyIdx !== undefined
      ? { target: act.targetEnemyIdx }
      : {}),
    ...('skillId' in act ? { skillId: act.skillId } : {}),
  }
  if (act.kind === 'defend') {
    // defending 已在 build queue 时就位(原版语义,防御贯穿整个 performAction);此处只记日志。
    s.log.push(`${p.roleId} 防御`)
    return
  }
  if (act.kind === 'flee') {
    // fight.c:4143(一阶段 flee.ts 修复版):str = 玩家吉运;def = Σ活敌(吉运+(level+6)*4);
    // roll ∈ [0,def] 闭区间,str >= roll 成功全队逃。失败 = 本次行动作废(原版失败动画 M4d)。
    let def = 0
    for (const e of s.enemies) {
      if (e.hp <= 0) continue
      def += e.def.stats.fleeRate + (e.def.stats.level + 6) * 4
    }
    if (def < 0) def = 0
    const roll = Math.floor(_rng() * (def + 1))
    if (p.fleeRate >= roll) {
      s.phase = 'fled'
      s.log.push('全队逃跑')
    } else {
      s.log.push(`${p.roleId} 逃跑失败`)
    }
    return
  }
  if (act.kind === 'item') {
    const item = s.items[act.itemId]
    const slot = s.inventory.find((x) => x.itemId === act.itemId)
    if (!item?.use || !slot || slot.count <= 0) {
      s.log.push(`${p.roleId} 使用 ${act.itemId} 失败(缺数据/无库存)`)
      return
    }
    if (item.use.consuming) slot.count -= 1
    for (const eff of item.use.effects) {
      switch (eff.kind) {
        case 'healHp':
          p.hp = Math.min(p.maxHp, p.hp + eff.amount)
          s.log.push(`${p.roleId} 使用 ${item.name} 回复 ${eff.amount}`)
          break
        case 'healMp':
          p.mp = Math.min(p.maxMp, p.mp + eff.amount)
          s.log.push(`${p.roleId} 使用 ${item.name} 回蓝 ${eff.amount}`)
          break
        case 'revive':
          p.hp = Math.max(p.hp, Math.trunc((p.maxHp * eff.hpPercent) / 100))
          s.log.push(`${p.roleId} 使用 ${item.name}`)
          break
        default:
          s.log.push(`物品效果 ${eff.kind} 未接(战斗期陆续)`)
      }
    }
    return
  }
  if (act.kind === 'cast') {
    applyPlayerSkill(s, idx, act.skillId, act.targetEnemyIdx, _rng)
    return
  }
  if (act.kind === 'attack') {
    const e = s.enemies[act.targetEnemyIdx]
    if (!e || e.hp <= 0) return // 目标已死,空过（M4a;M4b 自动改目标）
    const dmg = resolveAttack(
      p.attackStrength,
      e.def.stats.defense,
      e.def.stats.physicalResistance,
      e.defending,
    )
    e.hp = Math.max(0, e.hp - dmg)
    s.log.push(`${p.roleId} 攻击 ${e.def.id} 造成 ${dmg}`)
  }
}

/** 敌施法单目标结算(damage 走 calcMagicDamage;heal/status 直接应用;其余 log 跳过)。 */
function applyEnemySkill(
  s: BattleState,
  e: BattleEnemyState,
  skill: SkillData,
  targetIdx: number,
  rng: () => number,
): void {
  const ZERO = { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 }
  // 敌施法目标反转:oneEnemy/allEnemies(玩家使用视角)= 打队员;应用系(ally)= 用在自己/敌方
  const onParty = skill.target === 'oneEnemy' || skill.target === 'allEnemies'
  const targets = skill.target === 'allEnemies' ? alivePlayers(s) : onParty ? [targetIdx] : []
  for (const eff of skill.effects) {
    switch (eff.kind) {
      case 'damage': {
        for (const ti of targets) {
          const p = s.players[ti]!
          const dmg = Math.max(
            1,
            applyDefense(
              calcMagicDamage({
                magStr: e.def.stats.magicStrength,
                def: p.defense,
                rngFactor: 1 + rng() * 0.1, // fight.c RandomFloat(1, 1.1)
                magicData: { baseDamage: eff.power, elemental: eff.elemental },
                // 玩家元素/毒抗:装备派生 M4b-3 落地,先按 0(TODO 同玩家施法一起接)
                elemRes: ZERO,
                poisonRes: 0,
                resistMult: 10,
                fieldEffect: ZERO,
              }),
              p.defending,
            ),
          )
          p.hp = Math.max(0, p.hp - dmg)
          s.log.push(`${e.def.id} 施展 ${skill.name} 对 ${p.roleId} 造成 ${dmg}`)
        }
        break
      }
      case 'healHp': {
        e.hp = Math.min(e.def.stats.health, e.hp + eff.amount)
        s.log.push(`${e.def.id} 施展 ${skill.name} 回复 ${eff.amount}`)
        break
      }
      case 'applyStatus': {
        for (const ti of targets) {
          const p = s.players[ti]!
          p.status[eff.status] = Math.max(p.status[eff.status], eff.turns)
          s.log.push(`${e.def.id} 对 ${p.roleId} 施加 ${eff.status} ${eff.turns} 回合`)
        }
        break
      }
      default:
        s.log.push(`${e.def.id} 技能效果 ${eff.kind} 未接(M4c-2)`)
    }
  }
}

function performEnemyAction(s: BattleState, idx: number, rng: () => number): void {
  const e = s.enemies[idx]
  if (!e || e.hp <= 0) return
  const decision = decideEnemyAction(s, e, rng)
  s.lastAction = {
    side: 'enemy',
    idx,
    kind: decision.kind,
    ...('targetPlayerIdx' in decision ? { target: decision.targetPlayerIdx } : {}),
    ...(decision.kind === 'cast' ? { skillId: decision.skill.id } : {}),
  }
  if (decision.kind === 'pass') {
    s.log.push(`${e.def.id} 无法行动`)
    return
  }
  if (decision.kind === 'cast') {
    applyEnemySkill(s, e, decision.skill, decision.targetPlayerIdx, rng)
    return
  }
  if (decision.kind === 'transform') {
    // 原版 0x9F(DM1):换 stats/精灵,**保当前 HP**;规则表随新形态,once 记账清零
    e.def = decision.def
    e.firedRules = new Set()
    s.log.push(`${e.def.id} 现出真身!`)
    return
  }
  if (decision.kind === 'divide') {
    // 原版 0x9C 引擎内建门:**仅剩自己一只活敌**且 hp>1 才分裂(一阶段 battle-opcodes DL9)
    if (aliveEnemies(s).length !== 1) {
      s.log.push(`${e.def.id} 分裂失败(场上不止一只)`)
      return
    }
    const slots = MAX_ENEMIES - aliveEnemies(s).length
    const n = Math.min(decision.copies, slots)
    if (n <= 0 || e.hp <= 1) {
      s.log.push(`${e.def.id} 分裂失败(无空位/血量不足)`)
      return
    }
    const share = Math.max(1, Math.trunc(e.hp / (n + 1)))
    e.hp = share
    for (let k = 0; k < n; k++) {
      s.enemies.push({
        def: e.def,
        hp: share,
        status: emptyBattleStatus(),
        defending: false,
        firedRules: new Set(),
      })
    }
    s.log.push(`${e.def.id} 分裂出 ${n} 个分身`)
    return
  }
  if (decision.kind === 'summon') {
    const slots = MAX_ENEMIES - aliveEnemies(s).length
    const n = Math.min(decision.count, slots)
    if (n <= 0) {
      s.log.push(`${e.def.id} 召唤失败(无空位)`)
      return
    }
    for (let k = 0; k < n; k++) {
      s.enemies.push({
        def: decision.def,
        hp: decision.def.stats.health,
        status: emptyBattleStatus(),
        defending: false,
        firedRules: new Set(),
      })
    }
    s.log.push(`${e.def.id} 召唤了 ${n} 个 ${decision.def.id}`)
    return
  }
  if (decision.kind === 'fleeAll') {
    // 原版 0x69:整场敌逃离,战斗终止无奖励(enemyFled 标记;奖励系统接入时读)
    s.enemyFled = true
    for (const x of s.enemies) x.hp = 0
    s.log.push(`${e.def.id} 逃走了`)
    return
  }
  const p = s.players[decision.targetPlayerIdx]!
  const dmg = resolveAttack(e.def.stats.attackStrength, p.defense, 0, p.defending)
  p.hp = Math.max(0, p.hp - dmg)
  s.log.push(`${e.def.id} 攻击 ${p.roleId} 造成 ${dmg}`)
}

/** 跑到终态（headless 便捷驱动;上限防死循环）。返回结果。 */
export function runBattleToEnd(
  s: BattleState,
  chooseActions: (s: BattleState) => void,
  rng: () => number,
  maxSteps = 10000,
): 'won' | 'lost' | 'fled' {
  for (let i = 0; i < maxSteps; i++) {
    if (s.phase === 'won' || s.phase === 'lost' || s.phase === 'fled') return s.phase
    if (s.phase === 'selectAction' && alivePlayers(s).some((pi) => !s.pendingActions.has(pi))) {
      chooseActions(s) // 调用方填 pendingActions
    }
    stepBattle(s, rng)
  }
  throw new Error('runBattleToEnd: 超过 maxSteps 未终结')
}
