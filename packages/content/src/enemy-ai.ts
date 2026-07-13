/**
 * 敌人 AI(M4c)—— 条件规则列表(设计:enemy-ai-design.md)。
 *
 * 分层(2026-07-04 用户定调):本文件只管**战斗策略**(普攻/施法/变身/分裂/召唤,
 * 条件可配,目标策略留灵活口);剧情演出(嘲讽/剧情逃跑)走 EnemyDef.choreography
 * (事件 Command 词汇,M4c-2)。纯函数,rng 注入可测;引擎(battle-core)只做接线。
 *
 * 默认行为 = 原版:fallback 施法敌由迁移器翻成 [chance] cast + 兜底 attack,
 * 目标策略缺省 random。灵活策略(集火/战场感知/难度)是编辑器可配能力。
 */
/**
 * 难度 = **预设 id**(非固定枚举;2026-07-04 用户扩展定调)。预设是内容层定义的
 * **规则开关集合**(数值/技能/奖励系数、硬核存档限制、野怪不复活、宝箱随机化等),
 * 各系统读各自开关 —— AI 只按预设 id 匹配。预设 schema 归难度分级正式立项;
 * 本期仅此留口,缺省 'normal'。
 */
export type Difficulty = string

/** 目标选择策略。random = 原版;其余给难度/DLC 敌人配。 */
export type AiTarget = 'random' | 'lowestHp' | 'highestHp' | 'lowestMp' | 'strongest'

export type AiCond =
  | { kind: 'hpBelow'; percent: number }
  | { kind: 'hpAbove'; percent: number }
  | { kind: 'turn'; op: '==' | '>='; value: number }
  | { kind: 'chance'; percent: number }
  | { kind: 'aloneAlive' }
  | { kind: 'firstOfKind' }
  | { kind: 'anyPlayerHpBelow'; percent: number }
  | { kind: 'allyCount'; op: '<=' | '>='; value: number }
  | { kind: 'playerInParty'; role: string } // 原版 0x79:某角色(模板 id)在队(绿叶小妖:赵灵儿在队则退下)
  | { kind: 'difficulty'; in: Difficulty[] } // 当前难度预设命中列表(预设无全序,用集合)
  | { kind: 'all'; of: AiCond[] }
  | { kind: 'any'; of: AiCond[] }
  | { kind: 'not'; cond: AiCond }

export type AiAction =
  | { kind: 'attack'; target?: AiTarget }
  | { kind: 'cast'; skillId: string; target?: AiTarget }
  | { kind: 'summon'; enemyId?: string; count: number }
  | { kind: 'transform'; enemyId: string }
  | { kind: 'divide'; copies: number }
  | { kind: 'flee' }
  | { kind: 'pass' }

export interface AiRule {
  /** turnStart = 每轮起手(不占行动;M4c-2 演出走 choreography,此处留给状态类策略);
   *  act = 轮到自己行动(决策,首条命中即本回合行动)。 */
  at: 'turnStart' | 'act'
  /** 缺省恒真(兜底)。 */
  when?: AiCond
  do: AiAction
  /** 整场只触发一次。 */
  once?: boolean
}

/** 求值视图:引擎每次决策时组装(纯数据,不含引擎对象)。 */
export interface AiBattleView {
  turn: number
  difficulty: Difficulty
  self: {
    hpPercent: number
    /** 同种敌中的首只(嘲讽/分裂类只由一只发起)。 */
    firstOfKind: boolean
    /** 沉默中(cast 规则跳过,继续匹配后续)。 */
    silenced: boolean
  }
  /** 场上活敌数(含自己)。 */
  allyCount: number
  /** 活队员(索引 = 战斗槽;role = 角色模板 id,playerInParty 门用)。 */
  players: {
    index: number
    hpPercent: number
    hp: number
    mp: number
    attack: number
    role: string
  }[]
}

export function evalAiCond(cond: AiCond, view: AiBattleView, rng: () => number): boolean {
  switch (cond.kind) {
    case 'hpBelow':
      return view.self.hpPercent < cond.percent
    case 'hpAbove':
      return view.self.hpPercent > cond.percent
    case 'turn':
      return cond.op === '==' ? view.turn === cond.value : view.turn >= cond.value
    case 'chance':
      return rng() * 100 < cond.percent
    case 'aloneAlive':
      return view.allyCount === 1
    case 'firstOfKind':
      return view.self.firstOfKind
    case 'anyPlayerHpBelow':
      return view.players.some((p) => p.hpPercent < cond.percent)
    case 'allyCount':
      return cond.op === '<=' ? view.allyCount <= cond.value : view.allyCount >= cond.value
    case 'playerInParty':
      return view.players.some((p) => p.role === cond.role)
    case 'difficulty':
      return cond.in.includes(view.difficulty)
    case 'all':
      return cond.of.every((c) => evalAiCond(c, view, rng))
    case 'any':
      return cond.of.some((c) => evalAiCond(c, view, rng))
    case 'not':
      return !evalAiCond(cond.cond, view, rng)
  }
}

export interface AiDecision {
  action: AiAction
  /** 命中规则下标(once 记账用)。 */
  ruleIdx: number
}

/**
 * act 决策:从上到下取首条命中。沉默时 cast 规则**跳过继续匹配**(原版:被沉默仍会普攻);
 * once 已触发的跳过。无命中 → null(引擎兜底普攻)。
 */
export function decideByRules(
  rules: readonly AiRule[],
  view: AiBattleView,
  rng: () => number,
  fired: ReadonlySet<number>,
): AiDecision | null {
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i]
    if (!r) continue
    if (r.at !== 'act') continue
    if (r.once && fired.has(i)) continue
    if (view.self.silenced && r.do.kind === 'cast') continue
    if (r.when && !evalAiCond(r.when, view, rng)) continue
    return { action: r.do, ruleIdx: i }
  }
  return null
}

/** 目标选择。random 用 rng;并列取槽序靠前(稳定)。players 须非空。 */
export function pickAiTarget(
  strategy: AiTarget | undefined,
  players: AiBattleView['players'],
  rng: () => number,
): number {
  const first = players[0]
  if (!first) throw new Error('pickAiTarget: players must not be empty')
  const s = strategy ?? 'random'
  if (s === 'random') return (players[Math.floor(rng() * players.length)] ?? first).index
  const by: Record<Exclude<AiTarget, 'random'>, (p: AiBattleView['players'][number]) => number> = {
    lowestHp: (p) => p.hp,
    highestHp: (p) => -p.hp,
    lowestMp: (p) => p.mp,
    strongest: (p) => -p.attack,
  }
  const key = by[s]
  let best = first
  for (const p of players) if (key(p) < key(best)) best = p
  return best.index
}
