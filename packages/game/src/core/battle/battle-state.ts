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
  /** sdlpal `global.h tagSTATUS` 真值 9 种(PAL_CLASSIC):
   *  Confused/Paralyzed/Sleep/Silence/Puppet/Bravery/Protect/Haste/DualAttack。
   *  此外 Slow(revisited 模式独有)我们留兼容。number = 剩余回合数(0 = 无效)。
   *  boolean = 持续生效旗子(Haste/Bravery/Protect/Slow 等 sdlpal `rgwStatus[i] > 0`)。 */
  status: {
    sleep: number, paralyzed: number, confused: number, haste: boolean, slow: boolean,
    // M5.B-w0.3 扩 — sdlpal classic 9 种 status:Silence/Puppet/Bravery/Protect/DualAttack
    // 全 optional 保 fixture 向后兼容;运行时 apply 逻辑(B-w1.a)用 ?? 0/false。
    silence?: number, puppet?: number,
    bravery?: boolean, protect?: boolean, dualAttack?: boolean,
  }
}

/**
 * 敌人的战斗状态视图。e 字段是 enemies.json 的 shallow copy(health 在战斗中
 * 会被改,需独立副本不污染原数据)。3 个 script 字段从 OBJECT 数组的
 * OBJECT_ENEMY 派生(M3 不实际运行,字段预留 M5)。
 */
export interface BattleEnemy {
  /** 拷贝 enemies.json 的完整 stats(战斗中 health 会被改)。 */
  e: Enemy
  /** sdlpal `global.h tagSTATUS` 真值 9 种(PAL_CLASSIC):
   *  Confused/Paralyzed/Sleep/Silence/Puppet/Bravery/Protect/Haste/DualAttack。
   *  此外 Slow(revisited 模式独有)我们留兼容。number = 剩余回合数(0 = 无效)。
   *  boolean = 持续生效旗子(Haste/Bravery/Protect/Slow 等 sdlpal `rgwStatus[i] > 0`)。 */
  status: {
    sleep: number, paralyzed: number, confused: number, haste: boolean, slow: boolean,
    // M5.B-w0.3 扩 — sdlpal classic 9 种 status:Silence/Puppet/Bravery/Protect/DualAttack
    // 全 optional 保 fixture 向后兼容;运行时 apply 逻辑(B-w1.a)用 ?? 0/false。
    silence?: number, puppet?: number,
    bravery?: boolean, protect?: boolean, dualAttack?: boolean,
  }
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
  // M5.B-w2.b 扩 4 个 action type(sdlpal `battle.h kBattleAction*`):
  //   summon: 召唤(special magic 调 special script + 召唤兽 sprite)
  //   trance: 觉醒态切换(player sprite 改 + buff atk/def/dex 翻倍持续 N 回合)
  //   throw-item: 物品投掷(item.scriptOnThrow 跑 — 类法术效果但消耗 item)
  //   equip-battle: 战斗内换装(罕见,跟 Menu equip 共享框架)
  // M5 简版 4 个 action 类型 stub:handler 走 console.debug + 不影响 outcome,
  // 真实施留 B-w2.b 后续 commit。
  type: 'attack' | 'defend' | 'magic' | 'item' | 'flee' | 'pass'
    | 'summon' | 'trance' | 'throw-item' | 'equip-battle'
  /** magic / item 的 id;attack/defend/flee 不用。summon = magicId,trance = roleId,
   *  throw-item = itemId,equip-battle = itemId。 */
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
  /**
   * 半成品 action:攻击 / 法术 / 物品 在 mainMenu Confirm 后但还没选 target 时暂存
   * 这里(T13 写入,T14 二级菜单 / targetSelect 完成后落 pendingActions)。
   * 完整 BattleAction.target 必填,这里允许缺(尚未选 target)。
   */
  pendingActionDraft?: { type: BattleAction['type'], actionId?: number, target?: number }
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
  /**
   * M5.B-w2.a:每只 enemy 的 AI script hook(同 index 对齐 enemies 数组)。
   * 字段对应 sdlpal `OBJECT_ENEMY.wScriptOn*` 真值;0 = 无脚本(走 default
   * `decideEnemyAction` C 代码 fallback)。
   * 不传或 length 不足 → 全部按 0 处理(向后兼容旧 fixture / 测试)。
   */
  enemyScripts?: Array<{ onTurnStart: number; onReady: number; onBattleEnd: number }>
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
/** sdlpal `battle.c:27` 真值:`g_rgPlayerPos[3][3][2]` — 战斗时最多 3 player。
 *  party 可有 5(MAX_PLAYABLE_PLAYER_ROLES),但战斗 layout 只 3 位。 */
export const MAX_BATTLE_PLAYERS = 3

export function createBattleState(input: CreateBattleStateInput): BattleState {
  if (input.gs.partyMembers.length > MAX_BATTLE_PLAYERS) {
    throw new Error(
      `createBattleState: partyMembers.length=${input.gs.partyMembers.length} > ${MAX_BATTLE_PLAYERS}`
      + `(sdlpal g_rgPlayerPos[3][3][2] 真值:战斗最多 3 player)`,
    )
  }
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

  const enemies: BattleEnemy[] = input.enemies.map((e, i) => {
    const scripts = input.enemyScripts?.[i]
    return {
      e: { ...e }, // shallow copy(health 在战斗中会被改)
      status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false },
      prevHp: e.health,
      scriptOnTurnStart: scripts?.onTurnStart ?? 0,
      scriptOnBattleEnd: scripts?.onBattleEnd ?? 0,
      scriptOnReady: scripts?.onReady ?? 0,
    }
  })

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
