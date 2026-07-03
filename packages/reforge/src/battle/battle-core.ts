/**
 * M4a · headless 回合战核 —— 无渲染、无动画的纯逻辑状态机（单测验收）。
 * 设计:battle-model-m4-design.md §3。回合流程 preBattle→selectAction⇄performAction→won/lost/fled。
 *
 * M4a 范围:攻击/防御 + fallback 敌人 AI（物攻）+ 胜负判定。
 * 仙术/物品/动画/状态施加 = M4b;敌人 AI 脚本/召唤 = M4c。
 * 公式全走 content/battle-formulas（= sdlpal fight.c）。RNG 可注入（测试定值,运行时真随机）。
 */
import type { BattleStatus, EnemyDef } from '@type-pal/content'
import {
  buildActionQueue,
  calcPhysicalAttackDamage,
  canAct,
  emptyBattleStatus,
  getEnemyDexterity,
  getPlayerActualDexterity,
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
  status: BattleStatus
  defending: boolean
}

/** 敌人战斗态（引 EnemyDef + 当前 HP/status）。 */
export interface BattleEnemyState {
  def: EnemyDef
  hp: number
  status: BattleStatus
  defending: boolean
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
}

export type BattleAction =
  | { kind: 'attack'; targetEnemyIdx: number }
  | { kind: 'defend' }
  | { kind: 'flee' }

export interface CreateBattleInput {
  players: Omit<BattlePlayerState, 'status' | 'defending'>[]
  enemies: EnemyDef[]
}

export function createBattleState(input: CreateBattleInput): BattleState {
  return {
    phase: 'preBattle',
    turn: 0,
    players: input.players.map((p) => ({ ...p, status: emptyBattleStatus(), defending: false })),
    enemies: input.enemies.map((def) => ({ def, hp: def.stats.health, status: emptyBattleStatus(), defending: false })),
    pendingActions: new Map(),
    actionQueue: [],
    log: [],
  }
}

const alivePlayers = (s: BattleState): number[] => s.players.map((p, i) => (p.hp > 0 ? i : -1)).filter((i) => i >= 0)
const aliveEnemies = (s: BattleState): number[] => s.enemies.map((e, i) => (e.hp > 0 ? i : -1)).filter((i) => i >= 0)

/** 防御减半（原版 defending 时受击伤害 /2;fight.c PAL_BattleUpdateFighters 后处理近似）。 */
function applyDefense(damage: number, defending: boolean): number {
  return defending ? Math.trunc(damage / 2) : damage
}

/** 物理攻击结算（攻方 atk vs 受方 def+物抗）。返回实际伤害。 */
export function resolveAttack(atk: number, def: number, physRes: number, defending: boolean): number {
  return Math.max(0, applyDefense(calcPhysicalAttackDamage(atk, def, physRes), defending))
}

/**
 * fallback 敌人 AI（无脚本,99/153 敌人）—— 移植一阶段 enemy-ai.ts::decideEnemyAction。
 * M4a 简化:magic≠0 && rng<magicRate → 施法(M4b 落地,现降级物攻);否则物攻随机活队员。
 * confused → 打友方(M4c);sleep/paralyzed → canAct=false 跳过。
 */
export function decideEnemyAction(
  e: BattleEnemyState,
  targets: number[],
  rng: () => number,
): { kind: 'attack'; targetPlayerIdx: number } | { kind: 'pass' } {
  if (!canAct(e.status) || targets.length === 0) return { kind: 'pass' }
  const idx = targets[Math.floor(rng() * targets.length)]!
  return { kind: 'attack', targetPlayerIdx: idx }
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
      // 所有活队员都选了 → build queue,进 performAction。（headless:调用方先填 pendingActions。）
      const alive = alivePlayers(s)
      if (alive.some((i) => !s.pendingActions.has(i))) return // 等填齐
      // 逃跑:任一队员选逃 → 本轮全队逃（M4a 简化,恒成功;fleeRate 判定 M4b）
      if (alive.some((i) => s.pendingActions.get(i)?.kind === 'flee')) {
        s.phase = 'fled'
        s.log.push('全队逃跑')
        return
      }
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

function performPlayerAction(s: BattleState, idx: number, _rng: () => number): void {
  const p = s.players[idx]
  if (!p || p.hp <= 0) return
  if (!canAct(p.status)) {
    s.log.push(`${p.roleId} 无法行动`)
    return
  }
  const act = s.pendingActions.get(idx)
  if (!act) return
  if (act.kind === 'defend') {
    // defending 已在 build queue 时就位(原版语义,防御贯穿整个 performAction);此处只记日志。
    s.log.push(`${p.roleId} 防御`)
    return
  }
  if (act.kind === 'attack') {
    const e = s.enemies[act.targetEnemyIdx]
    if (!e || e.hp <= 0) return // 目标已死,空过（M4a;M4b 自动改目标）
    const dmg = resolveAttack(p.attackStrength, e.def.stats.defense, e.def.stats.physicalResistance, e.defending)
    e.hp = Math.max(0, e.hp - dmg)
    s.log.push(`${p.roleId} 攻击 ${e.def.id} 造成 ${dmg}`)
  }
}

function performEnemyAction(s: BattleState, idx: number, rng: () => number): void {
  const e = s.enemies[idx]
  if (!e || e.hp <= 0) return
  const decision = decideEnemyAction(e, alivePlayers(s), rng)
  if (decision.kind === 'pass') {
    s.log.push(`${e.def.id} 无法行动`)
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
