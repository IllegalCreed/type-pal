/**
 * BattleState —— 战斗模式的局部 working state(M3 T16)。
 *
 * 从 GameState 派生(startBattle 时 createBattleState),战斗结束写回 GameState
 * (hp / mp / exp / cash 等)。设计:可变结构,T22 battle-system.ts 真消费。
 *
 * 字段对照 02 架构 §3 BattleState 列表;status / phase / uiState 三个枚举与
 * sdlpal `battle.h` / `fight.c` 概念对齐,但不一一映射(M3 只识别状态子集)。
 */

import type { BattleField, Enemy, PlayerRoles } from '@type-pal/shared'
import type { GameState } from '../game-state.js'
import type { SeedableRng } from '../rng.js'
import type { ActionQueueItem } from './turn-queue.js'

/**
 * 队员的战斗状态视图。M3 通过 roleId 引用 PlayerRoles.roles[roleId] 的真实数据,
 * 这里只存战斗局部信息(prev 快照 / defend / status counter)。
 */
export interface BattlePlayer {
  /** PlayerRoles.roles 的 id(M3 fixture 时由 dev panel 填)。 */
  roleId: number
  /** 拷贝战前状态(用于动画 / 数字弹幕 比对)。 */
  prevHp: number
  prevMp: number
  /** 本轮是否在 defend。 */
  defending: boolean
  /** 状态:M3 只识别 sleep / paralyzed / confused 三种 + haste / slow flag。 */
  status: { sleep: number, paralyzed: number, confused: number, haste: boolean, slow: boolean }
}

/**
 * 敌人的战斗状态视图。e 字段是 enemies.json 的 shallow copy(health 在战斗中
 * 会被改,需独立副本不污染原数据)。3 个 script 字段从 OBJECT 数组的
 * OBJECT_ENEMY 派生(M3 不实际运行,字段预留 M5)。
 */
export interface BattleEnemy {
  /** 拷贝 enemies.json 的完整 stats(战斗中 health 会被改)。 */
  e: Enemy
  status: { sleep: number, paralyzed: number, confused: number, haste: boolean, slow: boolean }
  prevHp: number
  /** 从 OBJECT 数组的 OBJECT_ENEMY 派生(M3 不实际运行,但字段预留 M5)。 */
  scriptOnTurnStart: number
  scriptOnBattleEnd: number
  scriptOnReady: number
}

/**
 * 选好的一个战斗动作(进 performAction 阶段后逐个执行)。
 * actionId 仅对 magic / item 有效;target = -1 表示全体。
 */
export interface BattleAction {
  type: 'attack' | 'defend' | 'magic' | 'item' | 'flee' | 'pass'
  /** magic / item 的 id;attack/defend/flee 不用。 */
  actionId?: number
  /** target 索引(0..4 或 0..N enemy);-1 = 全体。 */
  target: number
}

/**
 * 战斗 phase 状态机(T22 真消费)。
 * preBattle → selectAction → performAction → postAction → (回 selectAction
 * 进下一轮 / 或转 won / lost / fleed 退出)。
 */
export type BattlePhase = 'preBattle' | 'selectAction' | 'performAction' | 'postAction' | 'won' | 'lost' | 'fleed'

/** UI 状态:select-action 阶段在 mainMenu / magicMenu / itemMenu / targetSelect 间切;非选择阶段 hidden。 */
export type BattleUIState = 'mainMenu' | 'magicMenu' | 'itemMenu' | 'targetSelect' | 'hidden'

export interface BattleState {
  players: BattlePlayer[]
  enemies: BattleEnemy[]
  field: BattleField
  isBoss: boolean
  phase: BattlePhase
  /** 当前轮(每轮 ActionQueue 重排)。 */
  turn: number
  actionQueue: ActionQueueItem[]
  /** actionQueue 推进游标。 */
  currentActionIndex: number
  /** select-action 阶段:还在选哪个队员(undefined 表示已全选完)。 */
  selectingPlayerIdx?: number
  /** 队员已选好的 action(进 performAction 后逐个执行)。 */
  pendingActions: Map<number, BattleAction>
  /** UI 状态。 */
  uiState: BattleUIState
  /** 当前 UI 选项的高亮 index。 */
  uiCursor: number
  expGained: number
  cashGained: number
  rng: SeedableRng
  /** 防卡死:phase 卡 60s tickBattle 报错跳出(T22 用)。 */
  phaseStallTicks: number
}

export interface CreateBattleStateInput {
  gs: GameState
  playerRoles: PlayerRoles
  /** 已 expand 自 enemyTeam(slot 解引用 + 0xFFFF 过滤过)。 */
  enemies: Enemy[]
  field: BattleField
  isBoss: boolean
  rng: SeedableRng
}

/**
 * 从 GameState + fixture 派生一个新的 BattleState。
 *
 * - players 按 gs.partyMembers 顺序构造,每个 roleId 必须落在 playerRoles.roles
 *   中(找不到抛错防 fixture 错配)。
 * - enemies 每条 shallow copy `e`,health 在战斗中会被改,避免污染原 JSON 数据。
 * - phase 起点 = 'preBattle',turn = 0,uiState = 'hidden'(T22 进入后再 advance)。
 */
export function createBattleState(input: CreateBattleStateInput): BattleState {
  const players: BattlePlayer[] = input.gs.partyMembers.map((roleId) => {
    const role = input.playerRoles.roles[roleId]
    if (!role)
      throw new Error(`createBattleState: role id ${roleId} not in PlayerRoles`)
    return {
      roleId,
      prevHp: role.hp,
      prevMp: role.mp,
      defending: false,
      status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false },
    }
  })

  const enemies: BattleEnemy[] = input.enemies.map(e => ({
    e: { ...e }, // shallow copy(health 在战斗中会被改)
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false },
    prevHp: e.health,
    scriptOnTurnStart: 0,
    scriptOnBattleEnd: 0,
    scriptOnReady: 0,
  }))

  return {
    players,
    enemies,
    field: input.field,
    isBoss: input.isBoss,
    phase: 'preBattle',
    turn: 0,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'hidden',
    uiCursor: 0,
    expGained: 0,
    cashGained: 0,
    rng: input.rng,
    phaseStallTicks: 0,
  }
}
