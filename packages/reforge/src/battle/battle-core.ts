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
  AiAction,
  AiBattleView,
  BattleStatus,
  CarriedStatus,
  ElementVec,
  EnemyDef,
  EnemyFallback,
  EnemyHookChannel,
  ItemData,
  LevelGrowthTarget,
  PoisonCurability,
  PoisonDef,
  SkillData,
  ThrowEffect,
} from '@type-pal/content'
import {
  applyEnemyStatus,
  applyLevelGrowth,
  applyPlayerStatus,
  applyPoisonSelf,
  buildActionQueue,
  calcMagicDamage,
  calcPhysicalAttackDamage,
  canAct,
  checkThrowSpec,
  decideByRules,
  emptyBattleStatus,
  getEnemyDexterity,
  getPlayerActualDexterity,
  isPlayerDying,
  itemUseSupportsContext,
  magicDefenseDivisor,
  pickAiTarget,
  poisonCurableBy,
  tickBattleStatus,
} from '@type-pal/content'
import { expectDefined } from '../defined.js'
import { getEnemyBasePos } from './battle-positions.js'

function assertNever(value: never, context: string): never {
  throw new Error(`${context}: 未处理的物品效果 ${JSON.stringify(value)}`)
}

export type BattlePhase = 'preBattle' | 'selectAction' | 'performAction' | 'won' | 'lost' | 'fled'

/** 队员战斗态（属性由 createBattleState 从 world 派生;M4a 只用攻防/HP）。 */
export interface BattlePlayerState {
  /** 稳定 CharacterInstance.id。 */
  roleId: string
  /** 稳定 ActorDef.id；AI 条件与剧情固定成长不得拿实例 id 冒充模板。 */
  actorTemplateId: string
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
  /** 合体技仙术 id(角色专属;发起合击时用。缺 = 该员无合体技,不能发起合击)。 */
  cooperativeMagicSkillId?: string
  /** 守护者 roleId(原版 rgwCoveredBy 具名化;main 从 actor.battler.coveredBy 解析成
   *  在场队员实例 id)。此角色濒死/失能被敌物攻且 7/17 掷中 → 守护者替挡(完全免伤)。 */
  coveredBy?: string
  /** 吉运(逃跑判定 str;含装备加成,派生时算好)。 */
  fleeRate: number
  /** 五灵抗(装备 live 派生;缺省全 0)。喂 calcMagicDamage.elemRes,减免元素仙术伤害。 */
  elemRes?: ElementVec
  /** 毒抗(装备 live 派生;缺省 0)。减毒系伤害 + 降中毒率(fight.c:5141)。 */
  poisonRes?: number
  /** 物品提供的临时毒抗层；重复使用只刷新取高，不无限叠加。 */
  itemPoisonResBonus?: number
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
  /** 战内临时属性增益(0x30 buffStat,梦蛇等):delta 已烙进对应属性字段,定时的到期扣回;
   *  'battle' 整场有效,随战斗态销毁天然失效(战斗属性每战重派生,红线不外泄)。 */
  statBuffs?: { stat: BuffableStat; delta: number; turnsLeft: number | 'battle' }[]
  /** 変身精灵(trance 效果,梦蛇换战斗外观)。纯 presentation:表现层读;gameplay 增益走 buffStat。 */
  tranceBattleSprite?: string
  /**
   * 角色不含装备加成的持久成长快照。金蚕王在战内修改它并排队回写；普通战斗属性仍使用上方
   * 派生字段，避免把装备加成烙回存档。
   */
  persistentProgress?: BattlePersistentCharacterProgress
}

export interface BattlePersistentCharacterProgress extends LevelGrowthTarget {
  exp: number
}

export type BattleWorldMutation =
  | {
      kind: 'characterGrowth'
      characterId: string
      delta: import('@type-pal/content').LevelGrowthDelta
      expAfter: 0
    }
  | {
      kind: 'hostileAwareness'
      value: { rangeMultiplier: 0 | 3; remainingMs: number }
    }

/** buffStat 可增益属性 → BattlePlayerState 字段映射(0x30;magic=法力,dexterity=身法)。 */
const STAT_BUFF_FIELD = {
  attack: 'attackStrength',
  defense: 'defense',
  magic: 'magicStrength',
  dexterity: 'baseDexterity',
} as const
type BuffableStat = keyof typeof STAT_BUFF_FIELD

/** 敌人战斗态（引 EnemyDef + 当前 HP/status）。 */
export interface BattleEnemyState {
  /** 当前视觉、数值、fallback/rules 权威；transform 会切换。 */
  def: EnemyDef
  /** ready/turnStart/onDefeated 权威；transform 后保持原 owner。 */
  scriptOwnerDef: EnemyDef
  /** 当前 battle 内按 hook channel 持久的具名 state cursor。 */
  hookCursors: Partial<Record<EnemyHookChannel, string>>
  /** 当前实例 fallback 副本；setFallback 可跨激活覆盖。 */
  fallback?: EnemyFallback
  hp: number
  /** 站位底锚(建态时按**开战敌数**一次定死;死怪空位不递补、增援填死槽继承 ——
   *  原版/一阶段真值:布局列数=开战编队,曾按实时 length 现算 → 死怪/增援全场重排,作者报)。 */
  basePos: { x: number; y: number }
  status: BattleStatus
  defending: boolean
  /** once 规则已触发下标(M4c;transform 时清零)。 */
  firedRules: Set<number>
  /** 战果已计入 expGained/cashGained(死亡只记一次;B7a)。 */
  rewardCounted?: boolean
  /** 中毒列表(独立于 status;每回合 DoT tick,敌走 enemyTicks)。 */
  poisons: ActivePoison[]
  /** 偷窃余量(飞龙探云手:首偷时从 def.steal.count 初始化;偷光 = 再偷无得。原版 nStealItem--)。 */
  stealLeft?: number
}

export interface BattleState {
  phase: BattlePhase
  turn: number
  players: BattlePlayerState[]
  enemies: BattleEnemyState[]
  /** 本轮各队员选的行动（selectAction 阶段 UI 填;headless 测直接填）。 */
  pendingActions: Map<number, BattleAction>
  /** 本回合有人合击(fight.c fThisTurnCoop):其余队员出手作废(HP 已在合击结算内扣);回合末清。 */
  coopThisTurn: boolean
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
  /** 收妖值累计(灵葫咒 collectTreasure,script.c 0x33 wCollectValue += 敌 collectValue;
   *  战后并入 world.collectValue —— 与战利品不同,偷/收所得**无条件**入账,逃跑也保留)。 */
  collectGained: number
  /** 隐身回合(0x5C 隐蛊;一阶段 iHidingTime CLASSIC 三段):<0 待激活(用品当步存负)、
   *  行动步前取反激活(同轮后续敌立即跳过)、>0 敌整轮不行动、轮末 −1 到 0 结束。 */
  hidingTime: number
  /** 战斗内金钱增减合计(偷钱敌 +;乾坤一掷/铜钱镖消耗 −;战后无条件并入 world.money)。 */
  moneyDelta: number
  /** 建态金钱快照(乾坤一掷 min(钱,5000) 上限、铜钱镖 500 门槛;可用金 = money + moneyDelta)。 */
  money: number
  /** 最近一步已结算的行动(表现层读:音效/动画时机;每次 perform*Action 覆写)。 */
  lastAction: {
    side: 'player' | 'enemy'
    idx: number
    kind: string
    target?: number
    /** cast 动作的技能 id(表现层查 animation 播特效)。 */
    skillId?: string
    /** item/throw 动作的物品 id(表现层显示物品名 + 查图标)。 */
    itemId?: string
    /** 物攻暴击(1/6 或狂暴;表现层取暴击音,fight.c:2065-2069)。 */
    crit?: boolean
    /** 连击第二击伤害(dualAttack;present 追加第二挥击,音效落不同帧)。 */
    secondDamage?: number
    /** 攻击全体各敌伤害(长鞭 attackAll;present 逐敌数字+染色+击退)。 */
    attackAllHits?: { idx: number; value: number }[]
    /** 投掷对各目标造成的实际 HP 变化；单体与全体表现共用。 */
    throwHits?: { idx: number; value: number }[]
    /** 敌物攻被格挡(7/17 被动「闪避」:免伤,演出格挡姿+coverSound+仍击退)。 */
    blocked?: boolean
    /** 替挡守护者 idx(coveredBy 关系;blocked 且此值在 → 守护者顶身前接刀演出)。 */
    coverIdx?: number
    /** 敌施法被动格挡的队员 idx(1/3 掷,除因子 +1 —— 减伤不免伤;演出摆防御姿 frame3)。 */
    autoDefend?: number[]
    /** 合击贡献者 slot(结算时 healthy 队员;演出层聚拢队形用,HP 已扣不能事后重算)。 */
    coopContributors?: number[]
    /** cast/item 的己方目标 idx(oneAlly 点名队友;演出层把举物/特效落到目标身上)。 */
    targetAllyIdx?: number
    /** 结果横幅(偷窃「获得 xx」/金蝉 boss「无法逃离!」/乾坤「金钱不足」;present 层顶部居中,对齐原版对话框提示)。 */
    notice?: string
    /** flee/金蝉脱壳 成败(演出分流:成功全队滑出屏 / 失败挪步或原地横幅;battle.c:1438 / fight.c:4152)。 */
    fleeSuccess?: boolean
    /** divide/summon 本步新占的敌槽(演出层:分身滑开起点/新怪精灵播种)。 */
    spawnedIdxs?: number[]
  } | null
  /** 战斗用品产生、必须在任意终局按顺序写回大世界的通用 mutation 队列。 */
  pendingWorldMutations: BattleWorldMutation[]
}

export type BattleAction =
  | { kind: 'attack'; targetEnemyIdx: number }
  | { kind: 'cast'; skillId: string; targetEnemyIdx?: number; targetAllyIdx?: number } // 对敌单体带敌目标;oneAlly 带己方目标(缺省=施法者)
  | { kind: 'coop'; targetEnemyIdx?: number } // 合击:发起者(pendingActions key)用其 coop 技,全 healthy 队员合力(HP 代价);全体技不带目标
  | { kind: 'item'; itemId: string; targetAllyIdx?: number } // 战斗用品(oneAlly 可点名队友,缺省施于自己;consuming 扣库存)
  | { kind: 'throw'; itemId: string; targetEnemyIdx?: number } // 单体需目标；全体由 ThrowSpec.target 直提
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
  /** 入战金钱快照(乾坤一掷/铜钱镖消耗基数;缺省 0 = 金钱技放不出)。 */
  money?: number
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
      for (const cs of p.carriedStatuses ?? [])
        status[cs.status] = Math.max(status[cs.status], cs.turns)
      return {
        ...p,
        ...(p.persistentProgress ? { persistentProgress: { ...p.persistentProgress } } : {}),
        status,
        defending: false,
        hiddenCounts: {},
        poisons: p.poisons?.map((x) => ({ ...x })) ?? [], // 大世界带入的毒(副本;战后不回写)
      }
    }),
    enemies: input.enemies.map((def, i) => ({
      def,
      scriptOwnerDef: def,
      hookCursors: initialHookCursors(def),
      ...(def.ai.fallback ? { fallback: cloneFallback(def.ai.fallback) } : {}),
      hp: def.stats.health,
      status: emptyBattleStatus(),
      defending: false,
      firedRules: new Set<number>(),
      poisons: [],
      // 站位一次定死(按开战敌数;yPosOffset 是敌种属性一并烙进)
      basePos: getEnemyBasePos(input.enemies.length, i, def.yPosOffset) ?? { x: 100, y: 110 },
    })),
    pendingActions: new Map(),
    coopThisTurn: false,
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
    collectGained: 0,
    hidingTime: 0,
    moneyDelta: 0,
    money: input.money ?? 0,
    lastAction: null,
    pendingWorldMutations: [],
  }
}

/** 战斗内当前可用金钱(快照 + 战内增减,钳 ≥0)。 */
const battleMoney = (s: BattleState): number => Math.max(0, s.money + s.moneyDelta)

const alivePlayers = (s: BattleState): number[] =>
  s.players.map((p, i) => (p.hp > 0 ? i : -1)).filter((i) => i >= 0)
const aliveEnemies = (s: BattleState): number[] =>
  s.enemies.map((e, i) => (e.hp > 0 ? i : -1)).filter((i) => i >= 0)

/** 增援落位:优先复用死槽(原版填空槽语义 —— 继承槽位 basePos,布局不换挡、在场怪不动);
 *  无死槽才追加(仅新怪落新位,既有怪 basePos 已定死不受影响)。
 *  rewardCounted 重置:复活槽的新怪再死要重新计赏(老怪死时已入账,不双计)。
 *  返回落位槽下标(演出层:分裂滑开/新怪精灵播种)。 */
function spawnIntoSlot(s: BattleState, spawn: Omit<BattleEnemyState, 'basePos'>): number {
  const slot = s.enemies.findIndex((x) => x.hp <= 0)
  if (slot >= 0) {
    const basePos = expectDefined(s.enemies[slot]).basePos
    s.enemies[slot] = { ...spawn, basePos, rewardCounted: false }
    return slot
  }
  s.enemies.push({
    ...spawn,
    basePos: getEnemyBasePos(s.enemies.length + 1, s.enemies.length, spawn.def.yPosOffset) ?? {
      x: 100,
      y: 110,
    },
  })
  return s.enemies.length - 1
}

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
 * 执行一条活跃毒的当前 tick 并返回下一游标。逐回合 tick 与 0x28 成功施毒当下的
 * enemy-script 首次执行必须共用这里，避免 HP、产物、自解或游标推进出现两套语义。
 */
function tickPoison(
  s: BattleState,
  host: PoisonHost,
  side: 'player' | 'enemy',
  active: ActivePoison,
): ActivePoison | undefined {
  const def = s.poisonDefs[active.poisonId]
  const ticks = side === 'player' ? def?.playerTicks : def?.enemyTicks
  if (!def || !ticks?.length) return active // 无数据 = 保留但本次无效果(不吞毒)
  const tick = expectDefined(ticks[Math.min(active.tickIndex, ticks.length - 1)])
  if (tick.hpDelta) host.hp = Math.max(0, host.hp + tick.hpDelta)
  if (tick.mpDelta && host.mp !== undefined) host.mp = Math.max(0, host.mp + tick.mpDelta)
  if (tick.halveHp)
    host.hp = Math.max(0, host.hp - Math.min(tick.halveHp, Math.trunc(host.hp / 2) + 1))
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
  if (tick.selfCure) return undefined
  return {
    poisonId: active.poisonId,
    tickIndex: Math.min(active.tickIndex + 1, ticks.length - 1),
  }
}

/**
 * 逐回合毒 DoT(fight.c:4454;毒 = 数据化 tick 序列,见 poison-system-design.md):
 * 遍历单位 poisons,跑当前 tick(hpDelta/halveHp)→ tickIndex++(钳末项);selfCure → 移除本毒。
 * 敌走 enemyTicks、玩家走 playerTicks;缺 def 或缺该侧 ticks = 该毒本回合空过。
 */
function tickPoisons(s: BattleState, host: PoisonHost, side: 'player' | 'enemy'): void {
  if (!host.poisons.length) return
  host.poisons = host.poisons.flatMap((active) => {
    const next = tickPoison(s, host, side, active)
    return next ? [next] : []
  })
}

type EnemyPoisonApplication = 'resisted' | 'alreadyPresent' | 'applied'

function tryApplyPoisonToEnemy(
  enemy: BattleEnemyState,
  poisonId: number,
  rng: () => number,
): EnemyPoisonApplication {
  if (Math.floor(rng() * 10) < enemy.def.ai.resistanceToSorcery) return 'resisted'
  if (enemy.poisons.some((poison) => poison.poisonId === poisonId)) return 'alreadyPresent'
  enemy.poisons.push({ poisonId, tickIndex: 0 })
  return 'applied'
}

/** 0x28 成功新增敌毒时立即执行一次 wEnemyScript 的数据化 tick，并保存推进后的游标。 */
function applyEnemyPoisonEffect(
  s: BattleState,
  enemy: BattleEnemyState,
  poisonId: number,
  rng: () => number,
): EnemyPoisonApplication {
  const result = tryApplyPoisonToEnemy(enemy, poisonId, rng)
  if (result !== 'applied') return result
  const index = enemy.poisons.findIndex((poison) => poison.poisonId === poisonId)
  const active = enemy.poisons[index]
  if (!active) throw new Error(`applyEnemyPoisonEffect: 新毒 ${poisonId} 未落槽`)
  const next = tickPoison(s, enemy, 'enemy', active)
  if (next) enemy.poisons[index] = next
  else enemy.poisons.splice(index, 1)
  return result
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
  return tryApplyPoisonToEnemy(e, poisonId, rng) !== 'resisted'
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

/**
 * 复活(script.c 0x22 全语义,还魂咒/还魂香共用):**仅死者**;HP = floor(max×pct/100)
 * (一阶段 OP_REVIVE_PLAYER 真值:无保底 1,极端小 max 复活到 0 = 依旧倒地,忠实)
 * + 解重毒(PAL_CurePoisonByLevel(3) ≙ 'severe')+ 清全部定时状态(0x22 遍历 RemovePlayerStatus;
 * 一阶段哨兵语义:装备常驻(建态 9999,如仙女剑连击)保留)。活人 → false(0x22 脚本失败位)。
 */
export function reviveBattlePlayer(
  s: BattleState,
  t: BattlePlayerState,
  hpPercent: number,
): boolean {
  if (t.hp > 0) return false
  t.hp = Math.trunc((t.maxHp * hpPercent) / 100)
  curePoisons(t, s.poisonDefs, 'severe')
  for (const k of Object.keys(t.status) as (keyof BattleStatus)[])
    if (t.status[k] < 9000) t.status[k] = 0
  return true
}

/**
 * 偷窃(fight.c:5193 PAL_BattleStealFromEnemy):命中 = 有余量 && (rng(0,10) ≤ rate || rate=0)。
 * steal.itemId 空/'0' = 偷钱(余量/R(2,3),即时入 moneyDelta);否则余量 −1 得该物 1 件入背包。
 * 余量 stealLeft 烙敌身上(原版 nStealItem--),偷光再偷一无所获。结果写 lastAction.notice。
 */
function performSteal(
  s: BattleState,
  p: BattlePlayerState,
  targetIdx: number | undefined,
  rate: number,
  rng: () => number,
): void {
  const e = s.enemies[targetIdx ?? -1]
  if (!e) return
  const spec = e.def.steal
  e.stealLeft ??= spec?.count ?? 0
  const hit = e.stealLeft > 0 && (Math.floor(rng() * 11) <= rate || rate === 0)
  if (!hit || !spec) {
    s.log.push(`${p.roleId} 施展偷窃,一无所获`)
    return
  }
  if (!spec.itemId || spec.itemId === '0') {
    const c = Math.trunc(e.stealLeft / (2 + Math.floor(rng() * 2)))
    e.stealLeft -= c
    if (c > 0) {
      s.moneyDelta += c
      // 提示文案 = 原版 CLASSIC「获得 N 文钱」(WORD34+WORD10;一阶段居中框同款,c=0 不弹)
      if (s.lastAction) s.lastAction.notice = `获得 ${c} 文钱`
      s.log.push(`${p.roleId} 获得 ${c} 文钱`)
    }
    return
  }
  e.stealLeft -= 1
  const slot = s.inventory.find((x) => x.itemId === spec.itemId)
  if (slot) slot.count += 1
  else s.inventory.push({ itemId: spec.itemId, count: 1 })
  const name = s.items[spec.itemId]?.name ?? spec.itemId
  if (s.lastAction) s.lastAction.notice = `获得 ${name}`
  s.log.push(`${p.roleId} 获得 ${name}`)
}

/** 0x30 buffStat:百分比临时增益。delta 立即烙进属性字段并记账;定时的回合末到期扣回。 */
function applyStatBuff(
  t: BattlePlayerState,
  eff: { stat: BuffableStat; percent: number; duration: 'battle' | number },
): number {
  const field = STAT_BUFF_FIELD[eff.stat]
  const delta = Math.trunc((t[field] * eff.percent) / 100)
  t[field] += delta
  t.statBuffs ??= []
  t.statBuffs.push({ stat: eff.stat, delta, turnsLeft: eff.duration })
  return delta
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
      const p = expectDefined(s.players[i])
      return {
        index: i,
        hpPercent: (p.hp / Math.max(1, p.maxHp)) * 100,
        hp: p.hp,
        mp: p.mp,
        attack: p.attackStrength,
        role: p.actorTemplateId,
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

function cloneFallback(fallback: EnemyFallback): EnemyFallback {
  return {
    chancePercent: fallback.chancePercent,
    action: { ...fallback.action },
  }
}

function initialHookCursors(def: EnemyDef): Partial<Record<EnemyHookChannel, string>> {
  return Object.fromEntries(
    (['ready', 'turnStart'] as const).flatMap((channel) => {
      const flow = def.ai.hooks?.[channel]
      return flow ? [[channel, flow.initial] as const] : []
    }),
  )
}

function fallbackAttack(
  view: AiBattleView,
  rng: () => number,
): EnemyDecision {
  return {
    kind: 'attack',
    targetPlayerIdx: pickAiTarget('random', view.players, rng),
  }
}

function resolveEnemyAiAction(
  s: BattleState,
  e: BattleEnemyState,
  action: AiAction,
  view: AiBattleView,
  rng: () => number,
): EnemyDecision {
  switch (action.kind) {
    case 'pass':
      return { kind: 'pass' }
    case 'attack':
      return {
        kind: 'attack',
        targetPlayerIdx: pickAiTarget(action.target, view.players, rng),
      }
    case 'cast': {
      if (e.status.silence > 0) return fallbackAttack(view, rng)
      const skill = s.skills[action.skillId]
      if (!skill) {
        s.log.push(`${e.def.id} 施法 ${action.skillId} 缺技能数据,落普攻`)
        return fallbackAttack(view, rng)
      }
      return {
        kind: 'cast',
        skill,
        targetPlayerIdx: pickAiTarget(action.target, view.players, rng),
      }
    }
    case 'transform': {
      const def = s.enemiesById[action.enemyId]
      if (!def) {
        s.log.push(`${e.def.id} 变身 ${action.enemyId} 缺敌人数据,落普攻`)
        return fallbackAttack(view, rng)
      }
      return { kind: 'transform', def }
    }
    case 'divide':
      return { kind: 'divide', copies: action.copies }
    case 'summon': {
      const def = s.enemiesById[action.enemyId ?? e.def.id] ?? (action.enemyId ? undefined : e.def)
      if (!def) {
        s.log.push(`${e.def.id} 召唤 ${action.enemyId} 缺敌人数据,落普攻`)
        return fallbackAttack(view, rng)
      }
      return { kind: 'summon', def, count: action.count }
    }
    case 'flee':
      return { kind: 'fleeAll' }
  }
}

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
  const rules = e.def.ai.rules
  if (rules?.length) {
    const decision = decideByRules(rules, view, rng, e.firedRules)
    if (decision) {
      if (rules[decision.ruleIdx]?.once) e.firedRules.add(decision.ruleIdx)
      return resolveEnemyAiAction(s, e, decision.action, view, rng)
    }
  }
  if (e.fallback && rng() * 100 < e.fallback.chancePercent)
    return resolveEnemyAiAction(s, e, e.fallback.action, view, rng)
  return fallbackAttack(view, rng)
}

/** 战场敌槽上限(原版 formation 最多 5)。 */
const MAX_ENEMIES = 5

export type EnemyEffectAction = Extract<
  AiAction,
  { kind: 'summon' | 'transform' | 'divide' }
>

export interface EnemyEffectResult {
  outcome: 'succeeded' | 'failed'
  kind: EnemyEffectAction['kind']
  spawnedIdxs?: number[]
  beforeDef?: EnemyDef
}

/**
 * hook 与普通 AI 共用的即时敌人副作用。它不消费 actionQueue；调用方决定是否继续正常行动。
 */
export function applyEnemyEffect(
  s: BattleState,
  enemyIdx: number,
  effect: EnemyEffectAction,
  resolvedTarget?: EnemyDef,
): EnemyEffectResult {
  const enemy = s.enemies[enemyIdx]
  if (!enemy || enemy.hp <= 0) return { outcome: 'failed', kind: effect.kind }
  const blockedByStatus =
    s.hidingTime > 0 ||
    enemy.status.sleep > 0 ||
    enemy.status.paralyzed > 0 ||
    enemy.status.confused > 0
  if ((effect.kind === 'summon' || effect.kind === 'transform') && blockedByStatus)
    return { outcome: 'failed', kind: effect.kind }

  if (effect.kind === 'transform') {
    const target = resolvedTarget ?? s.enemiesById[effect.enemyId]
    if (!target) return { outcome: 'failed', kind: effect.kind }
    const beforeDef = enemy.def
    enemy.def = target
    enemy.fallback = target.ai.fallback ? cloneFallback(target.ai.fallback) : undefined
    enemy.firedRules = new Set()
    return { outcome: 'succeeded', kind: effect.kind, beforeDef }
  }

  if (effect.kind === 'divide') {
    if (aliveEnemies(s).length !== 1 || enemy.hp <= 1)
      return { outcome: 'failed', kind: effect.kind }
    const requested = effect.copies
    const slots = MAX_ENEMIES - aliveEnemies(s).length
    const count = Math.min(requested, slots)
    if (count <= 0) return { outcome: 'failed', kind: effect.kind }
    const share = Math.max(1, Math.trunc((enemy.hp + requested) / (requested + 1)))
    enemy.hp = share
    const spawnedIdxs: number[] = []
    for (let index = 0; index < count; index += 1)
      spawnedIdxs.push(
        spawnIntoSlot(s, {
          def: enemy.def,
          scriptOwnerDef: enemy.scriptOwnerDef,
          hookCursors: { ...enemy.hookCursors },
          ...(enemy.fallback ? { fallback: cloneFallback(enemy.fallback) } : {}),
          hp: share,
          status: emptyBattleStatus(),
          defending: false,
          firedRules: new Set(enemy.firedRules),
          poisons: enemy.poisons.map((poison) => ({ ...poison })),
        }),
      )
    return { outcome: 'succeeded', kind: effect.kind, spawnedIdxs }
  }

  const target =
    resolvedTarget ??
    s.enemiesById[effect.enemyId ?? enemy.def.id] ??
    (effect.enemyId === undefined ? enemy.def : undefined)
  const slots = MAX_ENEMIES - aliveEnemies(s).length
  if (!target || effect.count > slots) return { outcome: 'failed', kind: effect.kind }
  const spawnedIdxs: number[] = []
  for (let index = 0; index < effect.count; index += 1)
    spawnedIdxs.push(
      spawnIntoSlot(s, {
        def: target,
        scriptOwnerDef: target,
        hookCursors: initialHookCursors(target),
        ...(target.ai.fallback ? { fallback: cloneFallback(target.ai.fallback) } : {}),
        hp: target.stats.health,
        status: emptyBattleStatus(),
        defending: false,
        firedRules: new Set(),
        poisons: [],
      }),
    )
  return { outcome: 'succeeded', kind: effect.kind, spawnedIdxs }
}

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
      if (
        alive.some(
          (i) => needsManualSelect(expectDefined(s.players[i])) && !s.pendingActions.has(i),
        )
      )
        return
      // 不能选招的队员强制普攻(fight.c:1504-1527):眠/定/死排 dex 0,同轮恢复/复活才真出手
      // (perform 守卫跳未恢复者);疯魔保本体 dex(P2 落地后 perform 侧改派敌/友)。目标出手时环扫。
      for (let i = 0; i < s.players.length; i++)
        if (!s.pendingActions.has(i))
          s.pendingActions.set(i, { kind: 'attack', targetEnemyIdx: -1 })
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
        const st = expectDefined(s.enemies[i]).def.stats
        const base = getEnemyDexterity(st.level, st.dexterity)
        return {
          idx: i,
          dex: Math.trunc(base * (0.9 + rng() * 0.2)),
          dualMove: st.dualMove,
          // dualMove 第二行动独立二抽(fight.c:1485-1489)
          ...(st.dualMove ? { dex2: Math.trunc(base * (0.9 + rng() * 0.2)) } : {}),
        }
      })
      // 合击标记:本回合有人选合击 → 其余队员出手作废(fight.c fThisTurnCoop;perform 侧 pass)
      s.coopThisTurn = [...s.pendingActions.values()].some((a) => a.kind === 'coop')
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
          // 0x30 定时 buff 到期扣回(demo 梦蛇是 'battle' 整场,随战斗态销毁天然失效)
          if (p.statBuffs?.length)
            p.statBuffs = p.statBuffs.filter((b) => {
              if (b.turnsLeft === 'battle') return true
              b.turnsLeft -= 1
              if (b.turnsLeft > 0) return true
              p[STAT_BUFF_FIELD[b.stat]] -= b.delta
              return false
            })
        }
        for (const e of s.enemies) if (e.hp > 0) tickBattleStatus(e.status)
        // 隐身每轮 −1(一阶段 decrementHidingEffect;CLASSIC 无条件,到 0 = 隐身结束)
        if (s.hidingTime > 0) s.hidingTime -= 1
        s.pendingActions.clear()
        s.coopThisTurn = false // 合击标记回合末清(下回合重判)
        s.turn++
        s.phase = 'selectAction'
        return
      }
      // 隐身激活(0x5C 负值 → 取反;一阶段 activateHidingEffect 在处理**每个动作前**,
      // 使同轮后续敌人动作立即被跳过 —— fight.c:3529)
      if (s.hidingTime < 0) s.hidingTime = -s.hidingTime
      if (item.isEnemy && s.hidingTime > 0) {
        // 隐身期敌整轮跳过(fight.c:1716 ==0 才行动;连选目标都不做)
      } else if (item.isEnemy) performEnemyAction(s, item.idx, rng)
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

/** 玩家施法结算(M4b-3 + P0 全效果接线):对敌用敌方真实抗性(元素/毒/物抗);
 *  奶/状态/复活按 skill.target 路由己方目标(oneAlly 点名,缺省施法者;allAllies 全活人)。
 *  effects 有序:gate 失败截断其后(原版魔法脚本 jump-on-fail 同构,M1c-2)。
 *  MP 不足到不了这里(validatePlayerAction 已降级),守卫纯兜底。 */
function applyPlayerSkill(
  s: BattleState,
  idx: number,
  skillId: string,
  targetEnemyIdx: number | undefined,
  rng: () => number,
  targetAllyIdx?: number,
): void {
  const p = expectDefined(s.players[idx])
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
  // 金钱消耗门(铜钱镖 cost.money=500;原版 scriptOnUse 0x1E 扣钱、不足跳「金钱不足」臂):
  // 与 MP 同待遇 —— validatePlayerAction 已降级,此守卫纯兜底(在扣 MP 之前,失败不吃任何消耗)
  const moneyCost = skill.cost.money ?? 0
  if (moneyCost > battleMoney(s)) {
    s.log.push(`${p.roleId} 金钱不足,${skill.name} 施放失败`)
    return
  }
  p.mp -= mpCost
  if (moneyCost > 0) s.moneyDelta -= moneyCost
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
  // 己方目标:oneAlly/self 单点(可指死者 —— 还魂咒复活要选尸体);allAllies 全活人
  const allyTargets =
    skill.target === 'allAllies'
      ? alivePlayers(s)
      : skill.target === 'oneAlly' || skill.target === 'self'
        ? [Math.min(Math.max(targetAllyIdx ?? idx, 0), s.players.length - 1)]
        : []
  effects: for (const eff of skill.effects) {
    switch (eff.kind) {
      case 'summon': // 纯演出效果(神将现身动画,battle-session 时间线):gameplay 由链上 damage 结算
        break
      case 'gate': {
        // 顺序门(M1c-2 考证):门失败 → 截断其后效果,原版 fail 分支显「无任何效果」。
        // 判定对象 = 首个敌方目标(数据现状 gate 全挂对敌技:夺魂/灵葫咒/回梦/鬼降)。
        const t = s.enemies[enemyTargets[0] ?? -1]
        let pass = true
        // 概率门(script.c:3303 0x06:RandomLong(1,100) >= 率 → fail-jump,即 roll < 率才过)
        if (eff.chance !== undefined) pass &&= 1 + Math.floor(rng() * 100) < eff.chance
        // HP 阈值门(script.c:1988 0x64:cur×100 > max×阈值 → fail;灵葫咒 25% 处决线)
        if (pass && eff.hpAtMostPercent !== undefined)
          pass = !!t && t.hp * 100 <= t.def.stats.health * eff.hpAtMostPercent
        // 灵抗门(0x2E 空状态掷同构:rng(0,9) >= 巫抗过;跟 applyStatus 同 ≥ 后期修复语义)
        if (pass && eff.magicResist)
          pass = !!t && Math.floor(rng() * 10) >= t.def.ai.resistanceToSorcery
        if (!pass) {
          s.log.push(`${skill.name} 无任何效果`)
          break effects
        }
        break
      }
      case 'instantKill': {
        // 0x60 即死(夺魂/灵葫咒;门已在前面把关,此处直落)
        for (const ti of enemyTargets) {
          const e = expectDefined(s.enemies[ti])
          e.hp = 0
          s.log.push(`${p.roleId} 施展 ${skill.name},${e.def.id} 魂飞魄散`)
        }
        break
      }
      case 'collectTreasure': {
        // 0x33 收妖(灵葫咒二段):敌 collectValue 累进全局收妖值(战后无条件入 world)
        for (const ti of enemyTargets) {
          const v = expectDefined(s.enemies[ti]).def.stats.collectValue
          if (v > 0) {
            s.collectGained += v
            s.log.push(`收妖值 +${v}`)
          }
        }
        break
      }
      case 'steal': {
        performSteal(s, p, enemyTargets[0], eff.rate, rng)
        break
      }
      case 'trance': {
        // 変身(梦蛇):纯外观换精灵;属性增益由链上 buffStat 生效
        p.tranceBattleSprite = eff.battleSprite
        s.log.push(`${p.roleId} 变身!`)
        break
      }
      case 'buffStat': {
        for (const ti of allyTargets) {
          const t = expectDefined(s.players[ti])
          if (t.hp <= 0) continue
          const delta = applyStatBuff(t, eff)
          s.log.push(`${t.roleId} ${eff.stat} +${delta}`)
        }
        break
      }
      case 'removeStatus': {
        // 0x2F 解状态(冰心诀/灵血咒):点名清,无抗掷
        for (const ti of allyTargets) {
          const t = expectDefined(s.players[ti])
          if (t.hp <= 0) continue
          for (const st of eff.statuses) t.status[st] = 0
          s.log.push(`${t.roleId} 恢复神智`)
        }
        break
      }
      case 'revive': {
        // 0x22 全语义(还魂咒/赎魂):仅死者;回 max×% + 解重毒 + 清定时状态
        for (const ti of allyTargets) {
          const t = expectDefined(s.players[ti])
          if (reviveBattlePlayer(s, t, eff.hpPercent))
            s.log.push(`${p.roleId} 施展 ${skill.name},${t.roleId} 死而复生`)
          else s.log.push(`${skill.name} 对 ${t.roleId} 无任何效果`)
        }
        break
      }
      case 'damage': {
        for (const ti of enemyTargets)
          dealSkillDamage(s, p, ti, eff.power, eff.elemental, skill.name, rng)
        break
      }
      case 'moneyDamage': {
        // 0x88 乾坤一掷:消耗 min(可用金, maxSpend),基伤 = 消耗×num/den(script.c:2547-2554);
        // 之后走常规法术伤害结算。分文没有 → 原版 0x1E 验钱门跳「金钱不足」臂,无任何效果
        const spend = Math.min(battleMoney(s), eff.maxSpend)
        if (spend <= 0) {
          s.log.push(`${p.roleId} 金钱不足,${skill.name} 无任何效果`)
          if (s.lastAction) s.lastAction.notice = '金钱不足'
          break effects
        }
        s.moneyDelta -= spend
        s.log.push(`${p.roleId} 掷出 ${spend} 文钱`)
        const power = Math.trunc((spend * eff.num) / eff.den)
        for (const ti of enemyTargets)
          dealSkillDamage(s, p, ti, power, eff.elemental, skill.name, rng)
        break
      }
      case 'fleeBattle': {
        // 0x3A 金蝉脱壳:全队**必定**脱离战斗(无掷率);boss 战不可(原版跳「无法逃离!」文案臂)
        if (s.boss) {
          s.log.push('无法逃离!')
          if (s.lastAction) {
            s.lastAction.notice = '无法逃离!'
            s.lastAction.fleeSuccess = false
          }
        } else {
          s.phase = 'fled'
          s.log.push(`${p.roleId} 施展 ${skill.name},全队脱离战斗`)
          if (s.lastAction) s.lastAction.fleeSuccess = true
        }
        break effects
      }
      case 'healHp': {
        // 0x1B 回血:PAL_IncreaseHPMP 仅活人(global.c:1287);目标按 skill.target 路由
        for (const ti of allyTargets) {
          const t = expectDefined(s.players[ti])
          if (t.hp <= 0) continue
          t.hp = Math.min(t.maxHp, t.hp + eff.amount)
          s.log.push(`${p.roleId} 施展 ${skill.name},${t.roleId} 回复 ${eff.amount}`)
        }
        break
      }
      case 'healMp': {
        for (const ti of allyTargets) {
          const t = expectDefined(s.players[ti])
          if (t.hp <= 0) continue
          t.mp = Math.min(t.maxMp, t.mp + eff.amount)
          s.log.push(`${p.roleId} 施展 ${skill.name},${t.roleId} 回蓝 ${eff.amount}`)
        }
        break
      }
      case 'applyStatus': {
        if (onEnemies) {
          for (const ti of enemyTargets) {
            const e = expectDefined(s.enemies[ti])
            // 命中判定:rng(0,9) >= resistanceToSorcery(原版后期修复语义,enemy.ts 注)
            if (Math.floor(rng() * 10) >= e.def.ai.resistanceToSorcery) {
              // 直接赋值(script.c:1391;曾 Math.max = 短回合无法覆写长回合,偏离原版)
              applyEnemyStatus(e.status, eff.status, eff.turns)
              s.log.push(`${e.def.id} 陷入 ${eff.status}`)
            } else s.log.push(`${e.def.id} 抵抗了 ${eff.status}`)
          }
        } else {
          // 己方增益状态(护体/神勇/加速等):0x2D 语义无抗掷,走 PAL_SetPlayerStatus 规则
          for (const ti of allyTargets) {
            const t = expectDefined(s.players[ti])
            const ok = applyPlayerStatus(t.status, eff.status, eff.turns, t.hp > 0)
            if (ok) s.log.push(`${t.roleId} 获得 ${eff.status} ${eff.turns} 回合`)
          }
        }
        break
      }
      case 'applyPoison': {
        // 三尸咒类:对敌下毒,命中门 = 巫抗(不是毒抗!fight.c 0x28 掷 0~9 >= 巫抗)
        const pid = Number(eff.poisonId)
        for (const ti of enemyTargets) {
          const e = expectDefined(s.enemies[ti])
          if (applyEnemyPoisonEffect(s, e, pid, rng) !== 'resisted')
            s.log.push(`${e.def.id} 中 ${s.poisonDefs[pid]?.name ?? `毒${pid}`}`)
          else s.log.push(`${e.def.id} 抵抗了下毒`)
        }
        break
      }
      case 'curePoison': {
        // 灵血咒类:解毒(按可解度 tier 或按 id);目标按 skill.target 路由(oneAlly 点名)
        for (const ti of allyTargets) {
          const t = expectDefined(s.players[ti])
          if (t.hp <= 0) continue
          if (eff.poisonId !== undefined)
            t.poisons = t.poisons.filter((ap) => ap.poisonId !== Number(eff.poisonId))
          else curePoisons(t, s.poisonDefs, eff.curesTier ?? 'common')
          s.log.push(`${p.roleId} 施展 ${skill.name},${t.roleId} 解毒`)
        }
        break
      }
      default:
        s.log.push(`技能效果 ${(eff as { kind: string }).kind} 未接(战斗期陆续)`)
    }
  }
}

/** 玩家法术伤害单敌结算(damage/moneyDamage 共用):魔强+抗性+战场五灵,防御姿减半,保底 1。 */
function dealSkillDamage(
  s: BattleState,
  p: BattlePlayerState,
  ti: number,
  power: number,
  elemental: number,
  skillName: string,
  rng: () => number,
): void {
  const e = expectDefined(s.enemies[ti])
  const dmg = Math.max(
    1,
    applyDefense(
      calcMagicDamage({
        magStr: p.magicStrength,
        def: e.def.stats.defense,
        rngFactor: 1 + rng() * 0.1,
        magicData: { baseDamage: power, elemental },
        elemRes: e.def.stats.elemResistance,
        poisonRes: e.def.stats.poisonResistance,
        resistMult: 1, // 敌侧抗性 0-10 直用(一阶段敌向量语义)
        fieldEffect: s.fieldEffect, // 战场五灵加成(fight.c:244)
      }),
      e.defending,
    ),
  )
  e.hp = Math.max(0, e.hp - dmg)
  s.log.push(`${p.roleId} 施展 ${skillName} 对 ${e.def.id} 造成 ${dmg}`)
}

/** 合击贡献/发起资格(fight.c:69-76 PAL_IsPlayerHealthy):活 + 非濒死 + 无眠/疯/封/麻/傀儡。 */
export function isPlayerHealthy(p: BattlePlayerState): boolean {
  if (p.hp <= 0 || isPlayerDying(p.hp, p.maxHp)) return false
  const st = p.status
  return st.sleep <= 0 && st.confused <= 0 && st.silence <= 0 && st.paralyzed <= 0 && st.puppet <= 0
}

/** 当前 healthy 队员数(合击资格:≥2 才能发起)。 */
export function healthyPlayerCount(s: BattleState): number {
  return s.players.reduce((n, p) => n + (isPlayerHealthy(p) ? 1 : 0), 0)
}

/**
 * 协力合击(fight.c:3856-4043 PAL_CLASSIC 移植)。发起者取其 cooperativeMagicSkillId:
 * · contributors = 全 healthy 队员;≤1 → 退化发起者普攻(选单已门控 ≥2,执行端兜底)。
 * · HP 代价(非 MP!):每贡献者扣合体技 cost.mp 作 HP,钳 ≥1(fight.c:3961-3967)。
 * · magStr = Σ(攻+法力) / 4(fight.c:3982-3995);伤害走 calcMagicDamage(同普通仙术),保底 1。
 * · 目标:allEnemies 技 → 全体,否则单体 targetEnemyIdx。伤害系数(合体×10)是出手身法非伤害。
 */
function performCoopMagic(
  s: BattleState,
  casterIdx: number,
  targetEnemyIdx: number | undefined,
  rng: () => number,
): void {
  const caster = s.players[casterIdx]
  if (!caster) return
  const coopId = caster.cooperativeMagicSkillId
  const skill = coopId ? s.skills[coopId] : undefined
  if (!skill) {
    s.log.push(`${caster.roleId} 无合体技,合击失败`)
    return
  }
  const contributors = s.players
    .map((_, i) => i)
    .filter((i) => isPlayerHealthy(expectDefined(s.players[i])))
  // healthy ≤ 1 → 退化发起者普攻(fight.c:3374-3378;选招到出手间贡献者阵亡的兜底)
  if (contributors.length <= 1) {
    const ti =
      targetEnemyIdx !== undefined && (s.enemies[targetEnemyIdx]?.hp ?? 0) > 0
        ? targetEnemyIdx
        : retargetEnemy(s, targetEnemyIdx ?? 0)
    const e = s.enemies[ti]
    s.lastAction = {
      side: 'player',
      idx: casterIdx,
      kind: 'attack',
      ...(ti >= 0 ? { target: ti } : {}),
    }
    if (!e || e.hp <= 0) return
    caster.hiddenCounts.attack = (caster.hiddenCounts.attack ?? 0) + 1
    caster.hiddenCounts.maxHP = (caster.hiddenCounts.maxHP ?? 0) + 2 + Math.floor(rng() * 2)
    const hit = resolvePlayerAttackHit(caster, e, rng)
    if (s.lastAction) s.lastAction.crit = hit.crit
    e.hp = Math.max(0, e.hp - hit.dmg)
    s.log.push(`${caster.roleId} 合击人手不足,改普攻 ${e.def.id} 造成 ${hit.dmg}`)
    return
  }
  // HP 代价:每贡献者扣 skill.cost.mp 作 HP,钳 ≥1(fight.c:3961-3967)
  const hpCost = skill.cost.mp ?? 0
  for (const i of contributors) {
    const p = expectDefined(s.players[i])
    p.hp -= hpCost
    if (p.hp <= 0) p.hp = 1
  }
  // magStr = Σ(攻 + 法力) / 4(fight.c:3982-3995;reforge 属性已 effective,无需 SHORT)
  let str = 0
  for (const i of contributors) {
    const p = expectDefined(s.players[i])
    str += p.attackStrength + p.magicStrength
  }
  str = Math.trunc(str / 4)
  // 目标:allEnemies 技 → 全体,否则单体(死目标环扫改选)
  const targets =
    skill.target === 'allEnemies'
      ? aliveEnemies(s)
      : (() => {
          const ti =
            targetEnemyIdx !== undefined && (s.enemies[targetEnemyIdx]?.hp ?? 0) > 0
              ? targetEnemyIdx
              : retargetEnemy(s, targetEnemyIdx ?? 0)
          return ti >= 0 ? [ti] : []
        })()
  s.lastAction = {
    side: 'player',
    idx: casterIdx,
    kind: 'coop',
    skillId: coopId,
    coopContributors: [...contributors],
    ...(targets.length === 1 ? { target: targets[0] } : {}),
  }
  const dmgEff = skill.effects.find((e) => e.kind === 'damage')
  if (!dmgEff || dmgEff.kind !== 'damage') {
    s.log.push(`合体技 ${skill.name}(非伤害效果暂未接)`)
    return
  }
  const hits: { idx: number; value: number }[] = []
  for (const ti of targets) {
    const e = expectDefined(s.enemies[ti])
    const dmg = Math.max(
      1,
      applyDefense(
        calcMagicDamage({
          magStr: str,
          def: e.def.stats.defense,
          rngFactor: 1 + rng() * 0.1,
          magicData: { baseDamage: dmgEff.power, elemental: dmgEff.elemental },
          elemRes: e.def.stats.elemResistance,
          poisonRes: e.def.stats.poisonResistance,
          resistMult: 1,
          fieldEffect: s.fieldEffect,
        }),
        e.defending,
      ),
    )
    e.hp = Math.max(0, e.hp - dmg)
    hits.push({ idx: ti, value: dmg })
    s.log.push(`合体技 ${skill.name} 对 ${e.def.id} 造成 ${dmg}`)
  }
  if (s.lastAction && targets.length > 1) s.lastAction.attackAllHits = hits
}

/**
 * 该队员是否需要玩家手选指令(session 出菜单 + stepBattle 等填齐共用同一谓词)。
 * 原版眠/定/疯/死者跳过选招(fight.c:1504-1527 直接强制普攻;uibattle 菜单也不停留)。
 */
export function needsManualSelect(p: BattlePlayerState): boolean {
  return p.hp > 0 && canAct(p.status) && p.status.confused <= 0
}

/**
 * 本回合已预占的物品数(原版 nAmountInUse,fight.c:1900-1916 真值:**投掷无条件占、
 * 使用仅 consuming 物占**)。从 pendingActions 动态算 —— 菜单 Esc 回退上一队员后
 * 下次建列表自然释放预占(一阶段 battle-system:1778 同思路)。选单侧扣此数,
 * 防止两名队员同回合选走同一件仅剩 1 的药(出手端 validate 耗尽降级仍兜底)。
 */
export function pendingItemUses(s: BattleState): Map<string, number> {
  const m = new Map<string, number>()
  for (const a of s.pendingActions.values()) {
    if (a.kind === 'throw') m.set(a.itemId, (m.get(a.itemId) ?? 0) + 1)
    else if (a.kind === 'item' && s.items[a.itemId]?.use?.consuming)
      m.set(a.itemId, (m.get(a.itemId) ?? 0) + 1)
  }
  return m
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
    case 'coop':
      return 10 // fight.c:1529-1556 合体 ×10(出手极靠前)
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
  const p = expectDefined(s.players[idx])
  let a = act
  if (a.kind === 'cast') {
    const skill = s.skills[a.skillId]
    if (
      skill &&
      (p.status.silence > 0 ||
        p.mp < (skill.cost.mp ?? 0) ||
        battleMoney(s) < (skill.cost.money ?? 0))
    ) {
      const why =
        p.status.silence > 0 ? '被封咒' : p.mp < (skill.cost.mp ?? 0) ? 'MP 不足' : '金钱不足'
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
    const use = s.items[itemId]?.use
    const slot = s.inventory.find((x) => x.itemId === itemId)
    if (!use || !itemUseSupportsContext(use, 'battle') || !slot || slot.count <= 0) {
      a = { kind: 'defend' }
      s.log.push(
        !use || !itemUseSupportsContext(use, 'battle')
          ? `${p.roleId} 的 ${itemId} 不能在战斗中使用,降级防御`
          : `${p.roleId} 的 ${itemId} 已耗尽,降级防御`,
      )
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
  } else if (a.kind === 'throw') {
    const itemId = a.itemId
    const item = s.items[itemId]
    const slot = s.inventory.find((entry) => entry.itemId === itemId)
    try {
      if (!item?.throw) throw new Error('缺投掷能力')
      checkThrowSpec(item.throw, `items.${itemId}.throw`)
    } catch {
      a = { kind: 'defend' }
      s.log.push(`${p.roleId} 的 ${itemId} 投掷数据无效,降级防御`)
    }
    if (a.kind === 'throw' && (!slot || slot.count <= 0)) {
      a = { kind: 'defend' }
      s.log.push(`${p.roleId} 的 ${itemId} 已耗尽,降级防御`)
    } else if (a.kind === 'throw' && item?.throw?.target === 'oneEnemy') {
      const target = a.targetEnemyIdx
      if (target === undefined || (s.enemies[target]?.hp ?? 0) <= 0) {
        const nt = retargetEnemy(s, target ?? 0)
        if (nt >= 0) a = { ...a, targetEnemyIdx: nt }
      }
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
  // 合击消耗:本回合有人合击 → 其余队员本次出手作废(HP 贡献已在合击结算内扣;fight.c:2532)
  if (s.coopThisTurn && queued.kind !== 'coop') {
    s.lastAction = { side: 'player', idx, kind: 'pass' }
    return
  }
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
    ...('itemId' in act ? { itemId: act.itemId } : {}),
    ...('targetAllyIdx' in act && act.targetAllyIdx !== undefined
      ? { targetAllyIdx: act.targetAllyIdx }
      : {}),
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
      if (s.lastAction) s.lastAction.fleeSuccess = true
      s.log.push('全队逃跑')
    } else {
      addHidden('luck', 2) // B7c:逃跑失败 → 吉运池 +2(fight.c:4170 rgFleeExp,仅逃者本人)
      if (s.lastAction) s.lastAction.fleeSuccess = false
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
    if (!itemUseSupportsContext(item.use, 'battle')) {
      s.log.push(`${p.roleId} 使用 ${item.name} 失败(该用途不能在战斗中执行)`)
      return
    }
    // 目标路由:allAllies 必须逐个结算；oneAlly 可点名队友，self 始终锁施用者。
    const selected = item.use.target === 'self' ? p : (s.players[act.targetAllyIdx ?? idx] ?? p)
    const targets = item.use.target === 'allAllies' ? s.players : [selected]
    if (
      item.use.effects.some((effect) => effect.kind === 'levelUp') &&
      targets.some((target) => !target.persistentProgress)
    )
      throw new Error('battle item levelUp: 目标缺持久成长快照')
    if (item.use.consuming) slot.count -= 1
    const stoppedTargets = new Set<BattlePlayerState>()
    for (const eff of item.use.effects) {
      if (eff.kind === 'gate') {
        // 0x06 掷 1..100，严格小于阈值才成功；失败仍消耗战斗道具（fight.c 真值）。
        const chance = Math.max(0, Math.min(100, eff.chance ?? 100))
        const roll = 1 + Math.floor(Math.max(0, Math.min(0.999999999, _rng())) * 100)
        if (!(roll < chance)) {
          s.log.push(`${item.name} 无任何效果`)
          return
        }
        continue
      }
      if (eff.kind === 'hideParty') {
        // 0x5C 隐蛊是队伍全局态，不因 allAllies 目标数重复执行。
        s.hidingTime = -eff.turns
        s.log.push(`全队隐匿形迹`)
        continue
      }
      if (eff.kind === 'modifyHostileAwareness') {
        s.pendingWorldMutations.push({
          kind: 'hostileAwareness',
          value: {
            rangeMultiplier: eff.rangeMultiplier,
            remainingMs: eff.durationMs,
          },
        })
        s.log.push(
          `${p.roleId} 使用 ${item.name},明雷感知${eff.rangeMultiplier === 0 ? '暂时关闭' : '暂时增强'}`,
        )
        continue
      }
      if (
        eff.kind === 'permanentStatBoost' ||
        eff.kind === 'runScript' ||
        eff.kind === 'runSceneHook' ||
        eff.kind === 'craftRecipe' ||
        eff.kind === 'drawFromResourcePool' ||
        eff.kind === 'placeEntityInFront'
      ) {
        // 上面的 context guard 应在扣库存前拒绝这些世界专用效果；这里保留显式穷尽兜底。
        s.log.push(`${item.name} 的 ${eff.kind} 不能在战斗中执行`)
        return
      }
      for (const t of targets) {
        if (stoppedTargets.has(t)) continue
        const who = t === p ? p.roleId : `${p.roleId} 对 ${t.roleId}`
        switch (eff.kind) {
          case 'healHp':
            if (t.hp <= 0) break // PAL_IncreaseHPMP 仅活人(global.c:1287);死人用药无效果
            t.hp = Math.max(0, Math.min(t.maxHp, t.hp + eff.amount))
            s.log.push(`${who} 使用 ${item.name} 回复 ${eff.amount}`)
            break
          case 'healMp':
            if (t.hp <= 0) break
            t.mp = Math.max(0, Math.min(t.maxMp, t.mp + eff.amount))
            s.log.push(`${who} 使用 ${item.name} 回蓝 ${eff.amount}`)
            break
          case 'revive':
            // 0x22 全语义:仅死者;回 max×% + 解重毒 + 清定时状态。
            if (reviveBattlePlayer(s, t, eff.hpPercent))
              s.log.push(`${who} 使用 ${item.name},死而复生`)
            else s.log.push(`${item.name} 对 ${t.roleId} 无任何效果`)
            break
          case 'applyStatus': {
            const ok = applyPlayerStatus(t.status, eff.status, eff.turns, t.hp > 0)
            if (ok) s.log.push(`${who} 使用 ${item.name},获得 ${eff.status}`)
            break
          }
          case 'removeStatus':
            if (t.hp <= 0) break
            for (const st of eff.statuses) t.status[st] = 0
            s.log.push(`${who} 使用 ${item.name},恢复神智`)
            break
          case 'applyPoison': {
            const r = applyPoisonToPlayer(t, Number(eff.poisonId), s.poisonDefs)
            s.log.push(
              `${who} 使用 ${item.name}${r === 'cured' ? ',以毒攻毒解毒' : r === 'lethal' ? ',双毒相冲暴毙' : ''}`,
            )
            break
          }
          case 'curePoison':
            if (eff.poisonId !== undefined)
              t.poisons = t.poisons.filter((ap) => ap.poisonId !== Number(eff.poisonId))
            else curePoisons(t, s.poisonDefs, eff.curesTier ?? 'common')
            s.log.push(`${who} 使用 ${item.name} 解毒`)
            break
          case 'scaleCurrentHp':
            t.hp = Math.max(
              0,
              Math.min(t.maxHp, Math.trunc((t.hp * eff.numerator) / eff.denominator)),
            )
            s.log.push(`${who} 使用 ${item.name},当前体力变为 ${t.hp}`)
            break
          case 'levelUp': {
            const progress = t.persistentProgress
            if (!progress) throw new Error(`battle item levelUp: ${t.roleId} 缺持久成长快照`)
            const delta = applyLevelGrowth(progress, eff.levels, _rng)
            progress.exp = 0
            t.maxHp += delta.maxHP
            t.maxMp += delta.maxMP
            t.attackStrength += delta.attack
            t.magicStrength += delta.magicAttack
            t.defense += delta.defense
            t.baseDexterity += delta.speed
            t.fleeRate += delta.luck
            s.pendingWorldMutations.push({
              kind: 'characterGrowth',
              characterId: t.roleId,
              delta,
              expAfter: 0,
            })
            s.log.push(`${who} 使用 ${item.name},修行提升`)
            break
          }
          case 'dieIfNotPoisoned':
            if (t.poisons.length === 0) {
              t.hp = 0
              stoppedTargets.add(t)
              s.log.push(`${who} 使用 ${item.name},未中毒反噬暴毙`)
            }
            break
          case 'extraPoisonRes':
            {
              const before = t.itemPoisonResBonus ?? 0
              const after = Math.max(before, eff.amount)
              t.itemPoisonResBonus = after
              t.poisonRes = Math.max(0, (t.poisonRes ?? 0) + after - before)
            }
            s.log.push(`${who} 使用 ${item.name},毒抗提高 ${eff.amount}`)
            break
          default:
            assertNever(eff, 'battle item use')
        }
      }
    }
    return
  }
  if (act.kind === 'throw') {
    performThrow(s, p, act.itemId, act.targetEnemyIdx, _rng)
    return
  }
  if (act.kind === 'cast') {
    applyPlayerSkill(s, idx, act.skillId, act.targetEnemyIdx, _rng, act.targetAllyIdx)
    return
  }
  if (act.kind === 'coop') {
    performCoopMagic(s, idx, act.targetEnemyIdx, _rng)
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
  targetEnemyIdx: number | undefined,
  rng: () => number,
): void {
  const item = s.items[itemId]
  const slot = s.inventory.find((x) => x.itemId === itemId)
  if (!item?.throw || !slot || slot.count <= 0) {
    s.log.push(`${p.roleId} 投掷 ${itemId} 失败(缺数据/无库存)`)
    return
  }
  try {
    checkThrowSpec(item.throw, `items.${itemId}.throw`)
    for (const [effectIndex, effect] of item.throw.effects.entries())
      if (
        effect.kind === 'applyPoison' &&
        (!Number.isSafeInteger(Number(effect.poisonId)) || Number(effect.poisonId) <= 0)
      )
        throw new Error(
          `items.${itemId}.throw.effects[${effectIndex}].poisonId: 当前毒表期望正整数 id`,
        )
  } catch (error) {
    s.log.push(
      `${p.roleId} 投掷 ${item.name} 失败(${error instanceof Error ? error.message : String(error)})`,
    )
    return
  }
  const targetIndices =
    item.throw.target === 'allEnemies'
      ? aliveEnemies(s)
      : targetEnemyIdx !== undefined && (s.enemies[targetEnemyIdx]?.hp ?? 0) > 0
        ? [targetEnemyIdx]
        : []
  if (targetIndices.length === 0) {
    s.log.push(`${p.roleId} 投掷 ${item.name} 失败(没有有效目标)`)
    return
  }

  const elementNumber = {
    none: 0,
    wind: 1,
    thunder: 2,
    water: 3,
    fire: 4,
    earth: 5,
    poison: 6,
  } as const
  const resolvedStrength = new Map<ThrowEffect, number>()
  const strengthOf = (effect: Extract<ThrowEffect, { kind: 'magicDamage' }>): number => {
    const cached = resolvedStrength.get(effect)
    if (cached !== undefined) return cached
    const value =
      effect.strength.kind === 'fixed'
        ? effect.strength.value
        : effect.strength.bonus +
          p.attackStrength *
            (effect.strength.multiplier.min +
              Math.floor(
                Math.max(0, Math.min(0.999999999, rng())) *
                  (effect.strength.multiplier.max - effect.strength.multiplier.min + 1),
              ))
    resolvedStrength.set(effect, value)
    return value
  }

  slot.count -= 1 // 投掷必消耗
  const hits: { idx: number; value: number }[] = []
  const throwEffects: readonly ThrowEffect[] = item.throw.effects
  for (const enemyIdx of targetIndices) {
    const e = expectDefined(s.enemies[enemyIdx])
    const hpBefore = e.hp
    let stopTarget = false
    for (let effectIndex = 0; effectIndex < throwEffects.length; effectIndex++) {
      const eff: ThrowEffect = expectDefined(throwEffects[effectIndex])
      switch (eff.kind) {
        case 'magicDamage': {
          const damage = Math.max(
            0,
            calcMagicDamage({
              magStr: strengthOf(eff),
              def: Math.max(0, ((e.def.stats.defense << 16) >> 16) + (e.def.stats.level + 6) * 4),
              rngFactor: 1 + rng() * 0.1,
              magicData: {
                baseDamage: eff.baseDamage,
                elemental: elementNumber[eff.element],
              },
              elemRes: e.def.stats.elemResistance,
              poisonRes: e.def.stats.poisonResistance,
              resistMult: 1,
              fieldEffect: s.fieldEffect,
            }),
          )
          e.hp = Math.max(0, e.hp - damage)
          s.log.push(`${p.roleId} 投掷 ${item.name},${e.def.id} 受到 ${damage} 伤害`)
          break
        }
        case 'fixedDamage':
          e.hp = Math.max(0, e.hp - eff.amount)
          s.log.push(`${p.roleId} 投掷 ${item.name},${e.def.id} 受到 ${eff.amount} 伤害`)
          break
        case 'applyPoison': {
          const pid = Number(eff.poisonId)
          const application = applyEnemyPoisonEffect(s, e, pid, rng)
          if (application !== 'resisted')
            s.log.push(
              `${p.roleId} 投掷 ${item.name},${e.def.id} 中 ${s.poisonDefs[pid]?.name ?? `毒${pid}`}`,
            )
          else s.log.push(`${e.def.id} 抵抗了 ${item.name}`)
          // 0x28 抵抗不会跳过随后的 0x5E/0x60；无论本次是否加毒，都按
          // PoisonDef.lethalWith 检查目标已有的配对毒。
          const lethal = s.poisonDefs[pid]?.lethalWith
          if (lethal !== undefined && e.poisons.some((ap) => ap.poisonId === lethal)) {
            e.hp = 0
            s.log.push(`${e.def.id} 双毒相冲,当场暴毙`)
          }
          break
        }
        case 'currentHpDamage': {
          const damage = Math.min(
            eff.cap,
            Math.trunc((e.hp * eff.numerator) / eff.denominator) + eff.bonus,
          )
          e.hp = Math.max(0, e.hp - damage)
          s.log.push(`${p.roleId} 投掷 ${item.name},${e.def.id} 受到 ${damage} 伤害`)
          break
        }
        case 'applyStatus':
          if (Math.floor(rng() * 10) >= e.def.ai.resistanceToSorcery) {
            applyEnemyStatus(e.status, eff.status, eff.turns)
            s.log.push(`${e.def.id} 陷入 ${eff.status}`)
          } else {
            if (eff.onResist === 'stopTarget') {
              s.log.push('攻击无效')
              if (s.lastAction) s.lastAction.notice = '攻击无效'
              stopTarget = true
            } else s.log.push(`${e.def.id} 抵抗了 ${eff.status}`)
          }
          break
        case 'killIfHpAtMost':
          if (e.hp * 100 <= e.def.stats.health * eff.percent) {
            e.hp = 0
            s.log.push(`${e.def.id} 魂飞魄散`)
          } else {
            s.log.push('无任何效果')
            if (s.lastAction) s.lastAction.notice = '无任何效果'
          }
          break
        case 'damageAndHealCaster':
          e.hp = Math.max(0, e.hp - eff.damage)
          p.hp = Math.min(p.maxHp, p.hp + eff.heal)
          s.log.push(
            `${p.roleId} 投掷 ${item.name},${e.def.id} 受到 ${eff.damage} 伤害,自身回复 ${eff.heal}`,
          )
          break
        default:
          assertNever(eff, 'battle item throw')
      }
      if (stopTarget) break
    }
    hits.push({ idx: enemyIdx, value: Math.max(0, hpBefore - e.hp) })
  }
  if (s.lastAction) s.lastAction.throwHits = hits
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
  const p = expectDefined(s.players[idx])
  const m = expectDefined(s.players[mateIdx])
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
  effects: for (const eff of skill.effects) {
    switch (eff.kind) {
      case 'gate': {
        // 顺序门(敌施法侧,夺魂/回梦/鬼降):概率门同 0x06;灵抗门对玩家**直通** ——
        // 原版玩家无灵抗字段(global.h:203 wResistanceToSorcery 是敌专属,0x2D 对玩家
        // 上状态也无抗掷);HP 阈值门按玩家血量。失败截断其后(夺魂 miss)。
        const t = s.players[targets[0] ?? -1]
        let pass = true
        if (eff.chance !== undefined) pass &&= 1 + Math.floor(rng() * 100) < eff.chance
        if (pass && eff.hpAtMostPercent !== undefined)
          pass = !!t && t.hp * 100 <= t.maxHp * eff.hpAtMostPercent
        if (!pass) {
          s.log.push(`${skill.name} 无任何效果`)
          break effects
        }
        break
      }
      case 'instantKill': {
        // 0x60 即死打玩家(夺魂:33% 概率门在前;中了直接魂飞魄散)
        for (const ti of targets) {
          const t = s.players[ti]
          if (!t || t.hp <= 0) continue
          t.hp = 0
          s.log.push(`${e.def.id} 施展 ${skill.name},${t.roleId} 魂飞魄散`)
        }
        break
      }
      case 'applyPoison': {
        // 0x29 对玩家下毒(script.c:1269):RandomLong(1,100) > 玩家毒抗 → 中毒
        const pid = Number(eff.poisonId)
        for (const ti of targets) {
          const t = s.players[ti]
          if (!t || t.hp <= 0) continue
          if (1 + Math.floor(rng() * 100) > (t.poisonRes ?? 0)) {
            if (!t.poisons.some((x) => x.poisonId === pid))
              t.poisons.push({ poisonId: pid, tickIndex: 0 })
            s.log.push(`${t.roleId} 中 ${s.poisonDefs[pid]?.name ?? `毒${pid}`}`)
          } else s.log.push(`${t.roleId} 抵抗了下毒`)
        }
        break
      }
      case 'damage': {
        for (const ti of targets) {
          const p = expectDefined(s.players[ti])
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
          const p = expectDefined(s.players[ti])
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
    const result = applyEnemyEffect(s, idx, {
      kind: 'transform',
      enemyId: decision.def.id,
    }, decision.def)
    s.log.push(
      result.outcome === 'succeeded' ? `${e.def.id} 现出真身!` : `${e.def.id} 变身失败`,
    )
    return
  }
  if (decision.kind === 'divide') {
    const result = applyEnemyEffect(s, idx, {
      kind: 'divide',
      copies: decision.copies,
    })
    if (s.lastAction && result.spawnedIdxs) s.lastAction.spawnedIdxs = result.spawnedIdxs
    s.log.push(
      result.outcome === 'succeeded'
        ? `${e.def.id} 分裂出 ${result.spawnedIdxs?.length ?? 0} 个分身`
        : `${e.def.id} 分裂失败`,
    )
    return
  }
  if (decision.kind === 'summon') {
    const result = applyEnemyEffect(s, idx, {
      kind: 'summon',
      enemyId: decision.def.id,
      count: decision.count,
    }, decision.def)
    if (s.lastAction && result.spawnedIdxs) s.lastAction.spawnedIdxs = result.spawnedIdxs
    s.log.push(
      result.outcome === 'succeeded'
        ? `${e.def.id} 召唤了 ${result.spawnedIdxs?.length ?? 0} 个 ${decision.def.id}`
        : `${e.def.id} 召唤失败`,
    )
    return
  }
  if (decision.kind === 'fleeAll') {
    // 原版 0x69:整场敌逃离,战斗终止无奖励(enemyFled 标记;奖励系统接入时读)
    s.enemyFled = true
    for (const x of s.enemies) x.hp = 0
    s.log.push(`${e.def.id} 逃走了`)
    return
  }
  const p = expectDefined(s.players[decision.targetPlayerIdx])
  // 敌物攻打玩家(fight.c:4917-5076 全链):
  // str = 敌攻 + (敌级+6)×6(钳≥0);def = 玩家防 ×(防御 2)(原版 def 前置翻倍,非伤害减半)
  let str = e.def.stats.attackStrength + (e.def.stats.level + 6) * 6
  if (str < 0) str = 0
  // 被动格挡「闪避」(fight.c:4938 RandomLong(0,16)>=10 = 7/17;乱/眠/定无援护不闪
  // fight.c:4976-4985。格挡 = 完全免伤,演出仍击退,格挡音 = 玩家 coverSound)
  // 被动闪避掷(7/17,fight.c:4938)+ 替挡(fight.c:4941-4985 全链):
  // · 目标濒死/乱/眠/定 且掷中 → 守护者(coveredBy 数据关系)顶上 —— 须在场、活着、
  //   自身非濒死/乱/眠/定;替挡 = **完全免伤**(守护者架开,谁都不掉血)
  // · 坏状态(乱/眠/定)且无援护 → 不许闪(CLASSIC);濒死无援护仍可自闪
  const roll = Math.floor(rng() * 17) >= 10
  const badStatus = p.status.confused > 0 || p.status.sleep > 0 || p.status.paralyzed > 0
  let coverIdx = -1
  if (roll && (badStatus || isPlayerDying(p.hp, p.maxHp)) && p.coveredBy) {
    const gi = s.players.findIndex((x) => x.roleId === p.coveredBy)
    const g = s.players[gi]
    if (
      g &&
      g.hp > 0 &&
      !isPlayerDying(g.hp, g.maxHp) &&
      g.status.confused <= 0 &&
      g.status.sleep <= 0 &&
      g.status.paralyzed <= 0
    )
      coverIdx = gi
  }
  const blocked = roll && (coverIdx >= 0 || !badStatus)
  if (s.lastAction) {
    s.lastAction.blocked = blocked
    if (blocked && coverIdx >= 0) s.lastAction.coverIdx = coverIdx
  }
  if (blocked) {
    s.log.push(
      coverIdx >= 0
        ? `${expectDefined(s.players[coverIdx]).roleId} 挡下了 ${e.def.id} 对 ${p.roleId} 的攻击`
        : `${p.roleId} 格挡了 ${e.def.id} 的攻击`,
    )
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
