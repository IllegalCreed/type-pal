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
import type {
  ActivePoison,
  AiBattleView,
  BattleStatus,
  CarriedStatus,
  ElementVec,
  EnemyDef,
  ItemData,
  PoisonCurability,
  PoisonDef,
  SkillData,
} from '@type-pal/content'
import {
  applyEnemyStatus,
  applyPlayerStatus,
  buildActionQueue,
  calcMagicDamage,
  calcPhysicalAttackDamage,
  canAct,
  decideByRules,
  emptyBattleStatus,
  getEnemyDexterity,
  getPlayerActualDexterity,
  isPlayerDying,
  applyPoisonSelf,
  poisonCurableBy,
  magicDefenseDivisor,
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
  /** 五灵抗(装备 live 派生;缺省全 0)。喂 calcMagicDamage.elemRes,减免元素仙术伤害。 */
  elemRes?: ElementVec
  /** 毒抗(装备 live 派生;缺省 0)。减毒系伤害 + 降中毒率(fight.c:5141)。 */
  poisonRes?: number
  /** 攻击全体(长鞭装备 live 派生;物攻扫全场,伤害逐敌减半,fight.c:3683-3730)。 */
  attackAll?: boolean
  /** 每回合回血(寿葫芦等 regenHp 词条;live 派生。clean 版正名,不借毒系统)。 */
  regenHp?: number
  /** 每回合回蓝(regenMp 词条)。 */
  regenMp?: number
  status: BattleStatus
  defending: boolean
  /**
   * B7c 隐藏经验行为计数(fight.c 考证:物攻→attack+1/maxHP+R(2,3);防御→defense+2;
   * 施法→maxMP+R(2,3)/magicAttack+1)。战后 grantBattleRewards 按比例分配成长。
   */
  hiddenCounts: Partial<Record<string, number>>
  /** 中毒列表(独立于 status;每回合 DoT tick + 指针推进。大世界带入/战后清理)。 */
  poisons: ActivePoison[]
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
  /** 中毒列表(独立于 status;每回合 DoT tick,敌走 enemyTicks)。 */
  poisons: ActivePoison[]
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
  /** 首领战(原版 0x07 fIsBoss=!op2):不可逃(fight.c:4143 && !fIsBoss);胜利曲/结算时长由壳层用。 */
  boss: boolean
  /** 战场五灵加成(双向乘入法术伤害,fight.c:244)。 */
  fieldEffect: ElementVec
  /** 毒表(id → PoisonDef;DoT tick 查逐回合值;缺 = 该毒无效果)。 */
  poisonDefs: Record<number, PoisonDef>
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
    /** 物攻暴击(1/6 或狂暴;表现层取暴击音,fight.c:2065-2069)。 */
    crit?: boolean
    /** 连击第二击伤害(dualAttack;present 追加第二挥击,音效落不同帧)。 */
    secondDamage?: number
    /** 攻击全体各敌伤害(长鞭 attackAll;present 逐敌数字+染色+击退)。 */
    attackAllHits?: { idx: number; value: number }[]
    /** 敌物攻被格挡(7/17 被动「闪避」:免伤,演出格挡姿+coverSound+仍击退)。 */
    blocked?: boolean
    /** 敌施法被动格挡的队员 idx(1/3 掷,除因子 +1 —— 减伤不免伤;演出摆防御姿 frame3)。 */
    autoDefend?: number[]
  } | null
}

export type BattleAction =
  | { kind: 'attack'; targetEnemyIdx: number }
  | { kind: 'cast'; skillId: string; targetEnemyIdx?: number } // 对敌单体带目标;施于己方/全体不带
  | { kind: 'item'; itemId: string } // 战斗用品(v1 施于自己;consuming 扣库存)
  | { kind: 'throw'; itemId: string; targetEnemyIdx: number } // 投掷道具打敌(下毒/伤害;毒药/蛊)
  | { kind: 'defend' }
  | { kind: 'flee' }

/** 队员建态输入:引擎态字段(status/defending/hiddenCounts)自动补;poisons 大世界带入;
 *  grantedStatuses 装备常驻状态(连击等,建态置 9999 不烙持久);carriedStatuses 大世界护体符定时状态。 */
export type CreatePlayerInput = Omit<
  BattlePlayerState,
  'status' | 'defending' | 'hiddenCounts' | 'poisons'
> & {
  poisons?: ActivePoison[]
  grantedStatuses?: (keyof BattleStatus)[]
  carriedStatuses?: CarriedStatus[]
}

export interface CreateBattleInput {
  players: CreatePlayerInput[]
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
  /** 首领战(不可逃;缺省 false)。 */
  boss?: boolean
  /** 战场五灵加成(battle-fields magicEffect;fight.c:244 双向乘入法术伤害。缺省全 0)。 */
  fieldEffect?: ElementVec
  /** 毒表(id → PoisonDef;缺省空 = 无毒生效)。 */
  poisonDefs?: Record<number, PoisonDef>
}

export function createBattleState(input: CreateBattleInput): BattleState {
  return {
    phase: 'preBattle',
    turn: 0,
    players: input.players.map((p) => {
      const status = emptyBattleStatus()
      // 装备常驻状态(连击等):建态时置大值(PERMANENT,不在战内衰减到 0;红线 —— 每战重派生)
      for (const k of p.grantedStatuses ?? []) status[k] = 9999
      // 大世界护体符/金刚符定时状态:注入实际回合数(随战内衰减;战后 world 侧三件套清 extraStatuses)
      for (const cs of p.carriedStatuses ?? []) status[cs.status] = Math.max(status[cs.status], cs.turns)
      return {
        ...p,
        status,
        defending: false,
        hiddenCounts: {},
        poisons: p.poisons?.map((x) => ({ ...x })) ?? [], // 大世界带入的毒(副本;战后不回写)
      }
    }),
    enemies: input.enemies.map((def) => ({
      def,
      hp: def.stats.health,
      status: emptyBattleStatus(),
      defending: false,
      firedRules: new Set<number>(),
      poisons: [],
    })),
    pendingActions: new Map(),
    actionQueue: [],
    log: [],
    skills: input.skills ?? {},
    enemiesById: input.enemiesById ?? {},
    items: input.items ?? {},
    inventory: input.inventory ?? [],
    difficulty: input.difficulty ?? 'normal',
    boss: input.boss ?? false,
    fieldEffect: input.fieldEffect ?? { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    poisonDefs: input.poisonDefs ?? {},
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

/** 傀儡续战(fight.c:1139/950/1739):死者 hp==0 但 puppet>0 仍出手(仅死人可设)。 */
const puppetActs = (p: BattlePlayerState): boolean => p.hp <= 0 && p.status.puppet > 0
/**
 * 全队 hp==0 但有傀儡 → 战斗不判负(fOnlyPuppet=FALSE,fight.c:1102-1141):傀儡独战,
 * 敌方无活玩家目标自然 pass(decideEnemyAction targets 空),傀儡撑到胜或 puppet 回合耗尽。
 */
const anyFighter = (s: BattleState): boolean =>
  s.players.some((p) => p.hp > 0 || p.status.puppet > 0)

/** 防御减半（原版 defending 时受击伤害 /2;fight.c PAL_BattleUpdateFighters 后处理近似）。 */
function applyDefense(damage: number, defending: boolean): number {
  return defending ? Math.trunc(damage / 2) : damage
}

/** 中毒单位的血宿主(玩家/敌通用:读写 hp;玩家另有 mp,敌无)。 */
interface PoisonHost {
  hp: number
  maxHp?: number
  mp?: number
  poisons: ActivePoison[]
}

/**
 * 逐回合毒 DoT(fight.c:4454;毒 = 数据化 tick 序列,见 poison-system-design.md):
 * 遍历单位 poisons,跑当前 tick(hpDelta/halveHp)→ tickIndex++(钳末项);selfCure → 移除本毒。
 * 敌走 enemyTicks、玩家走 playerTicks;缺 def 或缺该侧 ticks = 该毒本回合空过。
 */
function tickPoisons(s: BattleState, host: PoisonHost, side: 'player' | 'enemy'): void {
  if (!host.poisons.length) return
  const survivors: ActivePoison[] = []
  for (const ap of host.poisons) {
    const def = s.poisonDefs[ap.poisonId]
    const ticks = side === 'player' ? def?.playerTicks : def?.enemyTicks
    if (!def || !ticks?.length) {
      survivors.push(ap) // 无数据 = 保留但本回合无效果(不吞毒)
      continue
    }
    const tick = ticks[Math.min(ap.tickIndex, ticks.length - 1)]!
    if (tick.hpDelta) host.hp = Math.max(0, host.hp + tick.hpDelta)
    if (tick.mpDelta && host.mp !== undefined) host.mp = Math.max(0, host.mp + tick.mpDelta)
    if (tick.halveHp) host.hp = Math.max(0, host.hp - Math.min(tick.halveHp, Math.trunc(host.hp / 2) + 1))
    const name = def.name || `毒${def.id}`
    if (tick.hpDelta || tick.mpDelta || tick.halveHp)
      s.log.push(`${side === 'player' ? (host as BattlePlayerState).roleId : def.id} ${name} 发作`)
    // 养蛊到期产道具(食妖虫附→灵蛊/碧血蚕附→碧血蚕):寄生哪方都产给队伍背包
    if (tick.grantItem) {
      const slot = s.inventory.find((x) => x.itemId === tick.grantItem)
      if (slot) slot.count += 1
      else s.inventory.push({ itemId: tick.grantItem, count: 1 })
      s.log.push(`${name} 到期化作 ${tick.grantItem}`)
    }
    if (tick.selfCure) continue // 末回合自解:不进 survivors(移除本毒)
    survivors.push({ poisonId: ap.poisonId, tickIndex: Math.min(ap.tickIndex + 1, ticks.length - 1) })
  }
  host.poisons = survivors
}

/**
 * 对己/队友下毒(毒药 use-on-self 三段链,fight.c 0x5D/0x2B/0x5F/0x29):
 * ① 身中被本毒所克的毒(counters)→ 以毒攻毒解掉它、不下本毒;② 否则身中致死配对毒(lethalWith)
 * → 当场暴毙;③ 都没有 → 下本毒。**自毒无巫抗门**(巫抗只 gate 对敌)。返回结果供 log。
 */
export function applyPoisonToPlayer(
  p: BattlePlayerState,
  poisonId: number,
  poisonDefs: Record<number, PoisonDef>,
): 'cured' | 'lethal' | 'applied' {
  return applyPoisonSelf(p, poisonId, poisonDefs) // 战斗↔大世界共用同一三段链(content/poison)
}

/**
 * 上毒(fight.c 0x28):对敌下毒命中门 = **巫抗**(不是毒抗!)`RandomLong(0,9) >= 巫抗` 才中;
 * 巫抗满(≥10)的 boss 不中毒。已中同毒不叠(指针不重置)。返回是否命中。
 */
export function applyPoisonToEnemy(
  e: BattleEnemyState,
  poisonId: number,
  rng: () => number,
): boolean {
  if (Math.floor(rng() * 10) < e.def.ai.resistanceToSorcery) return false // 巫抗挡
  if (!e.poisons.some((p) => p.poisonId === poisonId)) e.poisons.push({ poisonId, tickIndex: 0 })
  return true
}

/**
 * 按可解度解毒(fight.c 0x2C；语义分层替代原版 level 魔数):移除可解度 ≤ maxTier 的毒。
 * 灵血咒/九节菖蒲 = 'common'、复活类/战后三件套 = 'severe';无影毒/寄生毒 = 'incurable' 不可及。
 */
export function curePoisons(
  host: { poisons?: ActivePoison[] },
  poisonDefs: Record<number, PoisonDef>,
  maxTier: PoisonCurability,
): void {
  if (!host.poisons) return
  host.poisons = host.poisons.filter((ap) => {
    const def = poisonDefs[ap.poisonId]
    return !def || !poisonCurableBy(def, maxTier)
  })
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
      // 需要手选的队员都选了 → build queue,进 performAction。（headless:调用方先填 pendingActions。）
      // 眠/定/疯/死者不出菜单(needsManualSelect false),下面统一强制普攻入队。
      const alive = alivePlayers(s)
      if (alive.some((i) => needsManualSelect(s.players[i]!) && !s.pendingActions.has(i))) return
      // 不能选招的队员强制普攻(fight.c:1504-1527):眠/定/死排 dex 0,同轮恢复/复活才真出手
      // (perform 守卫跳未恢复者);疯魔保本体 dex(P2 落地后 perform 侧改派敌/友)。目标出手时环扫。
      for (let i = 0; i < s.players.length; i++)
        if (!s.pendingActions.has(i)) s.pendingActions.set(i, { kind: 'attack', targetEnemyIdx: -1 })
      // 逃跑改为行动(轮到该队员时掷骰;fight.c:4143 语义)——不再选了即逃
      // 队列 dex 装配(fight.c:1497-1565 classic 队列口;stat 级的 slow/dying 修正是非 classic,
      // 不在此):动作系数 防御×5/辅助法×3/物品×3/逃÷2(合体×10 待 P3) → 濒死÷2 → ×[0.9,1.1)。
      // 防御×5 与"fDefending 出手时才置位"成对:防御者靠排序提前,原版才显得"防得住"。
      const players = s.players.map((p, i) => {
        // 死者 dex 0 排尾(除傀儡:死傀儡照常出手,取正常 dex);活者被眠/定压制也 dex 0
        if ((p.hp <= 0 && !puppetActs(p)) || !canAct(p.status)) return { idx: i, dex: 0 }
        let dex = getPlayerActualDexterity(p.baseDexterity, p.status.haste > 0)
        dex = Math.trunc(dex * actionDexMult(s.pendingActions.get(i), s.skills))
        if (isPlayerDying(p.hp, p.maxHp)) dex = Math.trunc(dex / 2)
        return { idx: i, dex: Math.trunc(dex * (0.9 + rng() * 0.2)) }
      })
      const enemies = aliveEnemies(s).map((i) => {
        const st = s.enemies[i]!.def.stats
        const base = getEnemyDexterity(st.level, st.dexterity)
        return {
          idx: i,
          dex: Math.trunc(base * (0.9 + rng() * 0.2)),
          dualMove: st.dualMove,
          // dualMove 第二行动独立二抽(fight.c:1485-1489)
          ...(st.dualMove ? { dex2: Math.trunc(base * (0.9 + rng() * 0.2)) } : {}),
        }
      })
      s.actionQueue = buildActionQueue(players, enemies)
      // defending 不在此预置:原版出手时才置位(fight.c:4115,见 performPlayerAction defend 分支),
      // 先手敌打到"选了防御但还没轮到"的队员时不减半。曾建队列预置并误标"原版语义"。
      s.phase = 'performAction'
      return
    }
    case 'performAction': {
      const item = s.actionQueue.shift()
      if (!item) {
        // 回合末:装备回血/回蓝(寿葫芦 regenHp/regenMp 词条,clean 版不借毒系统)→
        // 毒 DoT(存活单位逐回合扣血+指针推进,fight.c:4454)→ defending 全清
        // (fight.c:1604 队列耗尽处) + status 衰减 + turn++,回 selectAction
        for (const p of s.players)
          if (p.hp > 0) {
            if (p.regenHp) p.hp = Math.min(p.maxHp, p.hp + p.regenHp)
            if (p.regenMp) p.mp = Math.min(p.maxMp, p.mp + p.regenMp)
          }
        for (const p of s.players) if (p.hp > 0) tickPoisons(s, p, 'player')
        for (const e of s.enemies) if (e.hp > 0) tickPoisons(s, e, 'enemy')
        for (const p of s.players) {
          p.defending = false
          tickBattleStatus(p.status)
        }
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
      } else if (!anyFighter(s)) {
        // 全队 hp==0 且无傀儡续战 → 负(有傀儡则续战:fight.c fOnlyPuppet)
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
 *  多人队友选择后补)。MP 不足到不了这里(validatePlayerAction 已降级),守卫纯兜底。 */
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
    // 正常不可达:MP 不足在 validatePlayerAction 已降级普攻/防御(fight.c:3316)
    s.log.push(`${p.roleId} MP 不足,${skill.name} 施放失败`)
    return
  }
  p.mp -= mpCost
  // B7c:施法成功 → maxMP 池 +R(2,3)、magicAttack 池 +1(fight.c:4328-4329,序固定)
  p.hiddenCounts.maxMP = (p.hiddenCounts.maxMP ?? 0) + 2 + Math.floor(rng() * 2)
  p.hiddenCounts.magicAttack = (p.hiddenCounts.magicAttack ?? 0) + 1
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
      case 'summon': // 纯演出效果(神将现身动画,battle-session 时间线):gameplay 由链上 damage 结算
        break
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
                fieldEffect: s.fieldEffect, // 战场五灵加成(fight.c:244)
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
            // 直接赋值(script.c:1391;曾 Math.max = 短回合无法覆写长回合,偏离原版)
            applyEnemyStatus(e.status, eff.status, eff.turns)
            s.log.push(`${e.def.id} 陷入 ${eff.status}`)
          } else s.log.push(`${e.def.id} 抵抗了 ${eff.status}`)
        }
        break
      }
      case 'applyPoison': {
        // 三尸咒类:对敌下毒,命中门 = 巫抗(不是毒抗!fight.c 0x28 掷 0~9 >= 巫抗)
        const pid = Number(eff.poisonId)
        for (const ti of enemyTargets) {
          const e = s.enemies[ti]!
          if (applyPoisonToEnemy(e, pid, rng))
            s.log.push(`${e.def.id} 中 ${s.poisonDefs[pid]?.name ?? `毒${pid}`}`)
          else s.log.push(`${e.def.id} 抵抗了下毒`)
        }
        break
      }
      case 'curePoison': {
        // 灵血咒类:解己方毒(按可解度 tier 或按 id);施于自身(v1 target 己方)
        if (eff.poisonId !== undefined)
          p.poisons = p.poisons.filter((ap) => ap.poisonId !== Number(eff.poisonId))
        else curePoisons(p, s.poisonDefs, eff.curesTier ?? 'common')
        s.log.push(`${p.roleId} 施展 ${skill.name} 解毒`)
        break
      }
      default:
        s.log.push(`技能效果 ${eff.kind} 未接(战斗期陆续)`)
    }
  }
}

/**
 * 该队员是否需要玩家手选指令(session 出菜单 + stepBattle 等填齐共用同一谓词)。
 * 原版眠/定/疯/死者跳过选招(fight.c:1504-1527 直接强制普攻;uibattle 菜单也不停留)。
 */
export function needsManualSelect(p: BattlePlayerState): boolean {
  return p.hp > 0 && canAct(p.status) && p.status.confused <= 0
}

/** classic 入队身法动作系数(fight.c:1529-1556):防御×5/辅助法术×3/物品×3/逃跑÷2;
 *  普攻/攻击法术×1;合体×10 待 P3。调用方对结果 trunc(原版整数运算)。 */
function actionDexMult(act: BattleAction | undefined, skills: Record<string, SkillData>): number {
  switch (act?.kind) {
    case 'defend':
      return 5
    case 'item':
      return 3
    case 'flee':
      return 0.5
    case 'cast': {
      const t = skills[act.skillId]?.target
      return t === 'oneEnemy' || t === 'allEnemies' ? 1 : 3
    }
    default:
      return 1
  }
}

/** 死目标改选:从原槽位起环扫首个活敌(fight.c:87 PAL_BattleSelectAutoTargetFrom;
 *  其 iPrevEnemyTarget 优先项是 UI 层记忆,core 不持有,session 需要时自补)。全灭返 -1。 */
function retargetEnemy(s: BattleState, from: number): number {
  const n = s.enemies.length
  const start = from >= 0 && from < n ? from : 0
  for (let c = 0; c < n; c++) {
    const i = (start + c) % n
    if ((s.enemies[i]?.hp ?? 0) > 0) return i
  }
  return -1
}

/**
 * 出手时刻行动验证(fight.c:3260-3506 PAL_BattlePlayerValidateAction 降级链):
 * 选招到轮到之间战况可能已变(先手敌封咒/耗 MP、队友抢走目标)——
 * · cast:封咒中或 MP 不足 → 攻击系(对敌)降普攻承袭目标、辅助系降防御(fight.c:3310-3349)
 * · item:库存已空 → 降防御(fight.c:3433 UseItem 数 0;多队员同轮抢用同一件时触发)
 * · 通用尾:对敌动作目标已死 → 环扫改选(fight.c:3500,普攻/对敌单体法术一视同仁)
 * 返回生效行动;lastAction 按生效值记,表现层自然演降级后的动作(原版同:改写 action 本体)。
 */
function validatePlayerAction(s: BattleState, idx: number, act: BattleAction): BattleAction {
  const p = s.players[idx]!
  let a = act
  if (a.kind === 'cast') {
    const skill = s.skills[a.skillId]
    if (skill && (p.status.silence > 0 || p.mp < (skill.cost.mp ?? 0))) {
      const why = p.status.silence > 0 ? '被封咒' : 'MP 不足'
      if (skill.target === 'oneEnemy' || skill.target === 'allEnemies') {
        a = { kind: 'attack', targetEnemyIdx: a.targetEnemyIdx ?? -1 }
        s.log.push(`${p.roleId} ${why},${skill.name} 降级普攻`)
      } else {
        a = { kind: 'defend' }
        s.log.push(`${p.roleId} ${why},${skill.name} 降级防御`)
      }
    }
  } else if (a.kind === 'item') {
    const itemId = a.itemId
    const slot = s.inventory.find((x) => x.itemId === itemId)
    if (!slot || slot.count <= 0) {
      a = { kind: 'defend' }
      s.log.push(`${p.roleId} 的 ${itemId} 已耗尽,降级防御`)
    }
  }
  if (a.kind === 'attack') {
    if ((s.enemies[a.targetEnemyIdx]?.hp ?? 0) <= 0) {
      const nt = retargetEnemy(s, a.targetEnemyIdx)
      if (nt >= 0) a = { ...a, targetEnemyIdx: nt }
    }
  } else if (a.kind === 'cast' && s.skills[a.skillId]?.target === 'oneEnemy') {
    const t = a.targetEnemyIdx
    if (t === undefined || (s.enemies[t]?.hp ?? 0) <= 0) {
      const nt = retargetEnemy(s, t ?? 0)
      if (nt >= 0) a = { ...a, targetEnemyIdx: nt }
    }
  }
  return a
}

function performPlayerAction(s: BattleState, idx: number, _rng: () => number): void {
  const p = s.players[idx]
  if (!p) return
  if (p.hp <= 0 && !puppetActs(p)) return // 死者不出手(傀儡除外:死傀儡续战 fight.c:1739)
  if (!canAct(p.status)) {
    s.log.push(`${p.roleId} 无法行动`)
    return
  }
  const queued = s.pendingActions.get(idx)
  if (!queued) return
  let act = queued
  // 疯魔改派(fight.c:1743-1747 执行时刻指派,无视所选动作):濒死 → Pass 完全不出手;
  // 否则随机打敌**或**友(作者 2026-05-31 拍板忠原版 —— sdlpal 是「必打活队友、无活友才 Pass」,
  // 其源码注释自认 original version behaviour is not same,不采)。打友走 attackMate 专用结算
  // (fight.c:3812-3835),打敌走正常物攻链(原版打敌细节不可考,按普攻结算)。
  if (p.status.confused > 0) {
    if (isPlayerDying(p.hp, p.maxHp)) {
      s.lastAction = { side: 'player', idx, kind: 'pass' }
      s.log.push(`${p.roleId} 神志不清`)
      return
    }
    const pool = [
      ...aliveEnemies(s).map((i) => ({ side: 'enemy' as const, i })),
      ...alivePlayers(s)
        .filter((i) => i !== idx)
        .map((i) => ({ side: 'player' as const, i })),
    ]
    const pick = pool[Math.floor(_rng() * pool.length)]
    if (!pick) {
      s.lastAction = { side: 'player', idx, kind: 'pass' }
      return // 理论不可达(无活敌已判胜)
    }
    if (pick.side === 'player') {
      s.lastAction = { side: 'player', idx, kind: 'attackMate', target: pick.i }
      attackMate(s, idx, pick.i)
      return
    }
    act = { kind: 'attack', targetEnemyIdx: pick.i } // 活敌,无需再验证
  } else {
    act = validatePlayerAction(s, idx, queued)
  }
  s.lastAction = {
    side: 'player',
    idx,
    kind: act.kind,
    ...('targetEnemyIdx' in act && act.targetEnemyIdx !== undefined
      ? { target: act.targetEnemyIdx }
      : {}),
    ...('skillId' in act ? { skillId: act.skillId } : {}),
  }
  const addHidden = (k: string, n: number): void => {
    p.hiddenCounts[k] = (p.hiddenCounts[k] ?? 0) + n
  }
  if (act.kind === 'defend') {
    // 原版 fDefending 出手时才置位(fight.c:4115)、回合末全清(fight.c:1604):先手敌的攻击
    // 落在置位前不减半。降级防御(封咒/MP/物品空)走同一分支,待遇与手选一致。
    p.defending = true
    addHidden('defense', 2) // B7c:防御 → defense 池 +2(fight.c:4116,无 RNG)
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
    // roll 先消费(rng 流序稳定),boss 再拦(fight.c:4143 `str >= roll && !fIsBoss`)
    const roll = Math.floor(_rng() * (def + 1))
    if (!s.boss && p.fleeRate >= roll) {
      s.phase = 'fled'
      s.log.push('全队逃跑')
    } else {
      addHidden('luck', 2) // B7c:逃跑失败 → 吉运池 +2(fight.c:4170 rgFleeExp,仅逃者本人)
      s.log.push(`${p.roleId} 逃跑失败${s.boss ? '(首领战不可逃)' : ''}`)
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
        case 'applyPoison': {
          // 毒药对己 use:相克(以毒攻毒自解)/致死(暴毙)/否则自毒(毒蛇卵等自毒食同路)
          const r = applyPoisonToPlayer(p, Number(eff.poisonId), s.poisonDefs)
          s.log.push(
            `${p.roleId} 使用 ${item.name}${r === 'cured' ? ',以毒攻毒解毒' : r === 'lethal' ? ',双毒相冲暴毙' : ''}`,
          )
          break
        }
        case 'curePoison':
          if (eff.poisonId !== undefined)
            p.poisons = p.poisons.filter((ap) => ap.poisonId !== Number(eff.poisonId))
          else curePoisons(p, s.poisonDefs, eff.curesTier ?? 'common')
          s.log.push(`${p.roleId} 使用 ${item.name} 解毒`)
          break
        case 'dieIfNotPoisoned':
          // 毒龙胆/九阴散(0x61):没中毒 → 秒杀自己 + 截断后效;中毒 → 续跑解毒/回血
          if (p.poisons.length === 0) {
            p.hp = 0
            s.log.push(`${p.roleId} 使用 ${item.name},未中毒反噬暴毙`)
            return
          }
          break
        default:
          s.log.push(`物品效果 ${eff.kind} 未接(战斗期陆续)`)
      }
    }
    return
  }
  if (act.kind === 'throw') {
    performThrow(s, p, act.itemId, act.targetEnemyIdx, _rng)
    return
  }
  if (act.kind === 'cast') {
    applyPlayerSkill(s, idx, act.skillId, act.targetEnemyIdx, _rng)
    return
  }
  if (act.kind === 'attack') {
    // 长鞭攻全体(装备 live 派生;fight.c:3683-3730 扫全场,逐敌减半):走专用多目标结算
    if (p.attackAll && aliveEnemies(s).length > 0) {
      performAttackAll(s, p, _rng)
      addHidden('attack', 1)
      addHidden('maxHP', 2 + Math.floor(_rng() * 2))
      return
    }
    const e = s.enemies[act.targetEnemyIdx]
    if (!e || e.hp <= 0) return // 验证已环扫改选;仍无活敌 = 理论不可达(全灭已判胜),兜底空过
    // B7c:物攻 → attack 池 +1、maxHP 池 +R(2,3)(fight.c:3756-3757,序固定)
    addHidden('attack', 1)
    addHidden('maxHP', 2 + Math.floor(_rng() * 2))
    const hit1 = resolvePlayerAttackHit(p, e, _rng)
    if (s.lastAction) s.lastAction.crit = hit1.crit
    e.hp = Math.max(0, e.hp - hit1.dmg)
    s.log.push(`${p.roleId} ${hit1.crit ? '会心一击 ' : ''}攻击 ${e.def.id} 造成 ${hit1.dmg}`)
    // 连击(装备授 dualAttack;仙女剑170):敌未死则第二击(独立 rng 掷,同 fight.c 双击)
    if (p.status.dualAttack > 0 && e.hp > 0) {
      const hit2 = resolvePlayerAttackHit(p, e, _rng)
      if (s.lastAction) s.lastAction.secondDamage = hit2.dmg
      e.hp = Math.max(0, e.hp - hit2.dmg)
      s.log.push(`${p.roleId} 连击 ${hit2.crit ? '会心一击 ' : ''}造成 ${hit2.dmg}`)
    }
  }
}

/**
 * 投掷道具打敌(fight.c wScriptOnThrow):对目标敌应用 throw.effects —— applyPoison 走巫抗门
 * (0x28 下毒:rng(0,9)>=巫抗才中);damage 直接扣血;consuming 扣库存。相生相克/致死(0x5E+0x60)
 * 是后续数据层(counters/lethalPairs),此处先接基础下毒/伤害(食妖虫寄生、毒药下毒)。
 */
function performThrow(
  s: BattleState,
  p: BattlePlayerState,
  itemId: string,
  targetEnemyIdx: number,
  rng: () => number,
): void {
  const item = s.items[itemId]
  const slot = s.inventory.find((x) => x.itemId === itemId)
  const e = s.enemies[targetEnemyIdx]
  if (!item?.throw || !slot || slot.count <= 0 || !e || e.hp <= 0) {
    s.log.push(`${p.roleId} 投掷 ${itemId} 失败(缺数据/无库存/目标已死)`)
    return
  }
  slot.count -= 1 // 投掷必消耗
  for (const eff of item.throw.effects) {
    switch (eff.kind) {
      case 'applyPoison': {
        const pid = Number(eff.poisonId)
        if (applyPoisonToEnemy(e, pid, rng)) {
          s.log.push(`${p.roleId} 投掷 ${item.name},${e.def.id} 中 ${s.poisonDefs[pid]?.name ?? `毒${pid}`}`)
          // 三对致死(数据驱动 lethalWith;仅投掷触发,fight.c 0x5E+0x60):中本毒 + 已中配对毒 → 暴毙
          const lethal = s.poisonDefs[pid]?.lethalWith
          if (lethal !== undefined && e.poisons.some((ap) => ap.poisonId === lethal)) {
            e.hp = 0
            s.log.push(`${e.def.id} 双毒相冲,当场暴毙`)
          }
        } else s.log.push(`${e.def.id} 抵抗了 ${item.name}`)
        break
      }
      case 'healHp': // 对敌"回血"= 反效果,原版罕见;直接扣(负 heal 语义留数据层)
        s.log.push(`${p.roleId} 投掷 ${item.name}(对敌无效果)`)
        break
      default:
        s.log.push(`投掷效果 ${eff.kind} 未接(战斗期陆续)`)
    }
  }
}

/**
 * 长鞭攻全体(fight.c:3683-3730):中心向外顺序 {2,1,0,4,3} 逐敌打,暴击掷一次(全体共享),
 * 伤害逐个活敌减半(division 每打中一个活敌 ×2)。**无 +R 噪声/无浮动/无李逍遥彩蛋**(异于单体);
 * def = 敌防 + (敌级+6)×4,物抗直用。逐敌伤害记 lastAction.attackAllHits 供演出。
 */
function performAttackAll(s: BattleState, p: BattlePlayerState, rng: () => number): void {
  const ORDER = [2, 1, 0, 4, 3] // 中心向外(原版 index[])
  const crit = Math.floor(rng() * 6) === 0 || p.status.bravery > 0
  let division = 1
  const hits: { idx: number; value: number }[] = []
  for (const i of ORDER) {
    const e = s.enemies[i]
    if (!e || e.hp <= 0) continue
    const def = e.def.stats.defense + (e.def.stats.level + 6) * 4
    let dmg = resolveAttack(p.attackStrength, def, e.def.stats.physicalResistance, e.defending)
    if (crit) dmg *= 3
    dmg = Math.trunc(dmg / division)
    if (dmg <= 0) dmg = 1
    e.hp = Math.max(0, e.hp - dmg)
    hits.push({ idx: i, value: dmg })
    division *= 2 // 下一个活敌伤害减半
  }
  if (s.lastAction) s.lastAction.attackAllHits = hits
  s.log.push(`${p.roleId} ${crit ? '会心 ' : ''}长鞭横扫 ${hits.length} 敌`)
}

/**
 * 玩家单次物攻伤害(fight.c:3629-3663 全链):def = 敌防 + (敌级+6)×4 → 基础伤 → +R(1,2) →
 * 暴击(1/6 或狂暴)×3 → 李逍遥专属 1/12 再 ×2(主角彩蛋)→ ×[1,1.125) → 保底 1。
 * 提取成函数供连击第二击复用(独立 rng 消费,与首击同分布)。
 */
function resolvePlayerAttackHit(
  p: BattlePlayerState,
  e: BattleEnemyState,
  rng: () => number,
): { dmg: number; crit: boolean } {
  const def = e.def.stats.defense + (e.def.stats.level + 6) * 4
  const crit = Math.floor(rng() * 6) === 0 || p.status.bravery > 0
  let dmg = resolveAttack(p.attackStrength, def, e.def.stats.physicalResistance, e.defending)
  dmg += 1 + Math.floor(rng() * 2)
  if (crit) dmg *= 3
  let bonus = false
  if (p.roleId === 'li-xiaoyao' && Math.floor(rng() * 12) === 0) {
    dmg *= 2
    bonus = true
  }
  dmg = Math.trunc(dmg * (1 + rng() * 0.125))
  if (dmg <= 0) dmg = 1
  return { dmg, crit: crit || bonus }
}

/**
 * 疯魔打友结算(fight.c:3812-3835):str = 攻,def = 对方防 ×(防御中?2),物抗恒 2;
 * **无噪声无暴击无闪避**(异于打敌全链);护体 /2 → 保底 1 → 钳余血,顺序照 C。
 */
function attackMate(s: BattleState, idx: number, mateIdx: number): void {
  const p = s.players[idx]!
  const m = s.players[mateIdx]!
  const def = m.defense * (m.defending ? 2 : 1)
  let dmg = calcPhysicalAttackDamage(p.attackStrength, def, 2)
  if (m.status.protect > 0) dmg = Math.trunc(dmg / 2)
  if (dmg <= 0) dmg = 1
  if (dmg > m.hp) dmg = m.hp
  m.hp -= dmg
  s.log.push(`${p.roleId} 神志不清,攻击了 ${m.roleId} 造成 ${dmg}`)
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
  // 被动格挡预掷(fight.c:4723-4757,在效果处理**前**——效果先施眠/定不剥夺本次资格):
  // 资格 = 活着 + 无眠/定/乱,1/3 命中;进除因子 +1(减伤不免伤,异于物攻 7/17 全免闪避)
  const autoDefend = new Set<number>()
  for (const ti of targets) {
    const p = s.players[ti]
    if (!p || p.hp <= 0) continue
    const eligible = p.status.sleep <= 0 && p.status.paralyzed <= 0 && p.status.confused <= 0
    if (eligible && Math.floor(rng() * 3) === 0) autoDefend.add(ti)
  }
  if (autoDefend.size && s.lastAction) s.lastAction.autoDefend = [...autoDefend]
  // str = 魔强 + (级+6)×6,钳 ≥0(fight.c:4673-4678;物攻侧同构已带,此处曾漏级数项)
  let magStr = e.def.stats.magicStrength + (e.def.stats.level + 6) * 6
  if (magStr < 0) magStr = 0
  for (const eff of skill.effects) {
    switch (eff.kind) {
      case 'damage': {
        for (const ti of targets) {
          const p = s.players[ti]!
          if (p.hp <= 0) continue // 已死跳过(fight.c:4782;AoE 前效果可能致死)
          // 除因子(fight.c:4801-4803/4836-4838):(防御2)×(护体2)+(格挡1)
          let dmg = Math.trunc(
            calcMagicDamage({
              magStr,
              def: p.defense,
              rngFactor: 1 + rng() * 0.1, // fight.c RandomFloat(1, 1.1)
              magicData: { baseDamage: eff.power, elemental: eff.elemental },
              // 玩家元素/毒抗:装备 live 派生(effectiveResistances → 建态时算好,红线不烙)
              elemRes: p.elemRes ?? ZERO,
              poisonRes: p.poisonRes ?? 0,
              resistMult: 20, // 玩家侧抗性除数 20(fight.c:4798/4833;敌侧是 1)
              fieldEffect: s.fieldEffect, // 战场五灵加成(fight.c:244,双向同表)
            }) / magicDefenseDivisor(p.defending, p.status.protect > 0, autoDefend.has(ti)),
          )
          // 钳到余血、**无最小 1**(fight.c:4805/4840;玩家打敌才 inline 钳 1)
          if (dmg > p.hp) dmg = p.hp
          p.hp -= dmg
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
          // PAL_SetPlayerStatus 语义(global.c:2221-2276):坏状态已有不刷新/好状态活人取长/
          // 傀儡仅死者(曾一律 Math.max 覆盖,偏离原版)
          const ok = applyPlayerStatus(p.status, eff.status, eff.turns, p.hp > 0)
          s.log.push(
            ok
              ? `${e.def.id} 对 ${p.roleId} 施加 ${eff.status} ${eff.turns} 回合`
              : `${p.roleId} 的 ${eff.status} 未生效(已有/条件不符)`,
          )
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
        poisons: [],
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
        poisons: [],
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
  // 敌物攻打玩家(fight.c:4917-5076 全链):
  // str = 敌攻 + (敌级+6)×6(钳≥0);def = 玩家防 ×(防御 2)(原版 def 前置翻倍,非伤害减半)
  let str = e.def.stats.attackStrength + (e.def.stats.level + 6) * 6
  if (str < 0) str = 0
  // 被动格挡「闪避」(fight.c:4938 RandomLong(0,16)>=10 = 7/17;乱/眠/定无援护不闪
  // fight.c:4976-4985。格挡 = 完全免伤,演出仍击退,格挡音 = 玩家 coverSound)
  const blocked =
    Math.floor(rng() * 17) >= 10 &&
    p.status.confused <= 0 &&
    p.status.sleep <= 0 &&
    p.status.paralyzed <= 0
  if (s.lastAction) s.lastAction.blocked = blocked
  if (blocked) {
    s.log.push(`${p.roleId} 格挡了 ${e.def.id} 的攻击`)
    return
  }
  const def = p.defense * (p.defending ? 2 : 1)
  // 伤害 = calc(str+R(0,2), def, 物抗恒 2) + R(0,1) → 护体/2 → 钳现有 HP → 保底 1
  let dmg = calcPhysicalAttackDamage(str + Math.floor(rng() * 3), def, 2) + Math.floor(rng() * 2)
  if (p.status.protect > 0) dmg = Math.trunc(dmg / 2) // 护体(fight.c:5059)
  if (dmg > p.hp) dmg = p.hp
  if (dmg <= 0) dmg = 1
  p.hp = Math.max(0, p.hp - dmg)
  s.log.push(`${e.def.id} 攻击 ${p.roleId} 造成 ${dmg}`)
  if (p.hp > 0) applyEnemyEquivItem(p, e, s, rng) // 敌普攻附带道具(附毒攻击:尸腐肉/毒蛇卵等)
}

/**
 * 敌普攻附带道具效果(fight.c:5139-5146 「attackEquivItem」):命中后掷 `rate >= R(1,10)` 触发,
 * 再过**玩家毒抗门**(`毒抗 < R(1,100)` 才中,fight.c:5141)→ 跑该道具 use 的 applyPoison 到玩家。
 * = 附毒攻击(尸腐肉/毒蛇卵 equiv 的蛇妖类)。毒抗越高越难中(大蒜临时毒抗即缩此门);
 * 三段链走 applyPoisonToPlayer(相克/致死/自毒同路)。仅处理 applyPoison(附毒攻击的用途)。
 */
export function applyEnemyEquivItem(
  p: BattlePlayerState,
  e: BattleEnemyState,
  s: BattleState,
  rng: () => number,
): void {
  const equiv = e.def.attackEquivItem
  const item = equiv ? s.items[equiv.itemId] : undefined
  if (!equiv || !item?.use) return
  if (equiv.rate < Math.floor(rng() * 10) + 1) return // rate < R(1,10) → 不触发
  if ((p.poisonRes ?? 0) >= Math.floor(rng() * 100) + 1) return // 毒抗门:毒抗 ≥ R(1,100) → 抗掉
  for (const eff of item.use.effects) {
    if (eff.kind === 'applyPoison') {
      const r = applyPoisonToPlayer(p, Number(eff.poisonId), s.poisonDefs)
      if (r === 'applied') s.log.push(`${p.roleId} 中了 ${item.name} 的毒`)
    }
  }
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
