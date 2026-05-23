/**
 * 战斗模式 phase 状态机 —— M3 T22(整合 T11-T21 所有 building blocks)。
 *
 * Phase 流转(对照 design §3):
 *   preBattle → selectAction → performAction → postAction
 *                 ↑___________________________|
 *   → 终态 won / lost / fleed → finalize → mode='explore'
 *
 * **入口**:
 *   - startBattle({ gs, enemyTeamId, battleFieldId, isBoss, 资源... }) — 构 BattleState + 切 mode
 *   - tickBattle(gs, input, bus) — phase 路由(替换 T14 stub)
 *
 * **__battleResources hack**:战斗中 tickBattle 需要 items/spells/magics/playerRoles/commands
 * 五张表,而 GameState 不直接持有(资源数据由 Shell 装载侧管理)。本 task 在 GameState
 * 上挂一个非可见字段 __battleResources 缓存,startBattle 写入、finalizeBattle 清理。
 * M5 可改成 module-level Map 或 DI;本任务先用此简化方案,T23 baseline 对拍后再优化。
 *
 * **enemy id 映射决策**(本 task):enemyTeam.enemies 槽位在 sdlpal 中是 OBJECT 数组绝对
 * index → OBJECT_ENEMY.wEnemyID → DATA.MKF chunk 1(enemies.json id)。当前 enemy-teams.json
 * 中存的是 OBJECT 索引(D28 dumper),enemies.json 用 enemy id。本 task 简化方案:
 * **直接把 enemyTeam.enemies 当作 enemies.json 的 id 索引**(`.find(e => e.id === slot)`)。
 * T23 baseline 对拍发现真实映射不直接时再修(可能需要中间一张 OBJECT → enemyId 的查找表)。
 *
 * **select-action UI input 处理**(本 task):tickSelectAction 是 stub — 只检测
 * pendingActions 是否填满,**不处理 Up/Down/Confirm/Cancel 真菜单逻辑**。T26 真画菜单 +
 * T29 dev panel 编程式触发时再扩这部分;本 task 测试通过 fixture 直接写 pendingActions。
 *
 * **死循环保护**:phaseStallTicks > 1500(~60s at 25fps)兜底切 explore + console.error。
 */

import type {
  BattleField,
  Command,
  Enemy,
  EnemyTeam,
  InputSnapshot,
  Item,
  Magic,
  PlayerRoles,
  Spell,
} from '@type-pal/shared'
import type { CommandBus } from '../command-bus.js'
import type { GameState } from '../game-state.js'
import { runScript, type RunScriptOptions } from '../event-system.js'
import { createSeedableRng } from '../rng.js'
import { performAttack } from './actions/attack.js'
import { performDefend } from './actions/defend.js'
import { performFlee } from './actions/flee.js'
import { performItem } from './actions/item.js'
import { performMagic } from './actions/magic.js'
import type { BattleAction, BattleState } from './battle-state.js'
import { createBattleState } from './battle-state.js'
import { decideEnemyAction } from './enemy-ai.js'
import { getEnemyDexterity, getPlayerActualDexterity } from './formulas.js'
import { buildActionQueue, type ActionQueueItem } from './turn-queue.js'

/** 防卡死兜底阈值:1500 ticks ≈ 60s at 25fps(M3 战斗 FPS)。 */
const PHASE_STALL_TICKS_LIMIT = 1500

/**
 * 战斗运行时所需的资源表 —— 由 startBattle 缓存到 GameState.__battleResources。
 *
 * tickBattle 内的 perform* 调用需要 items/spells/magics/playerRoles/commands;
 * GameState 主表只保 inventory / partyMembers / 等运行状态,资源数据走这里。
 */
export interface BattleResources {
  items: Item[]
  spells: Spell[]
  magics: Magic[]
  playerRoles: PlayerRoles
  commands: Command[]
}

/** runScript 注入类型(便于测试 mock 替换 free function)。 */
export type RunScriptFn = (opts: RunScriptOptions) => void

/** GameState 上的非可见 stash 字段名 —— 不在 GameState interface 中,但通过 cast 写入。 */
const BATTLE_RESOURCES_KEY = '__battleResources' as const

/** 取(可能不存在的)战斗资源。 */
function getBattleResources(gs: GameState): BattleResources | undefined {
  return (gs as unknown as Record<string, BattleResources | undefined>)[BATTLE_RESOURCES_KEY]
}

/** 设置战斗资源(startBattle 用)。 */
function setBattleResources(gs: GameState, res: BattleResources | undefined): void {
  (gs as unknown as Record<string, BattleResources | undefined>)[BATTLE_RESOURCES_KEY] = res
}

// ============================================================================
// startBattle
// ============================================================================

export interface StartBattleInput {
  gs: GameState
  /** enemy-teams.json 中的 EnemyTeam.id(本 task 等同 enemies.json 的 id 直接索引,详见文件 doc)。 */
  enemyTeamId: number
  /** battle-fields.json 中的 BattleField.id。 */
  battleFieldId: number
  /** boss 战不可逃跑(performFlee 检查)。 */
  isBoss: boolean
  /** 全部 enemies.json。 */
  enemies: Enemy[]
  /** 全部 enemy-teams.json。 */
  enemyTeams: EnemyTeam[]
  /** 全部 battle-fields.json。 */
  battleFields: BattleField[]
  /** PlayerRoles(roles[].hp/mp 在战斗中会被改)。 */
  playerRoles: PlayerRoles
  /** items.json。 */
  items: Item[]
  /** spells.json。 */
  spells: Spell[]
  /** magic.json。 */
  magics: Magic[]
  /** events.bin commands(scriptOnUse 是其全局 ip)。 */
  commands: Command[]
  /** RNG seed;undefined → 用 Date.now()(运行时);测试应显式传 seed 保确定性。 */
  rngSeed?: number
  /** 可选注入 runScript(测试 mock 用);默认 = event-system.runScript。 */
  runScriptFn?: RunScriptFn
}

/**
 * 启动一场战斗。
 *
 * 1. 找 EnemyTeam → 展开活槽位(过滤 0 / 0xFFFF) → 解引用成 Enemy[]
 * 2. 找 BattleField
 * 3. 构 RNG + BattleState
 * 4. 切 mode = 'battle',缓存资源到 __battleResources
 *
 * 找不到 enemyTeam / battleField → 抛错(防 fixture 错配,而非静默失败)。
 */
export function startBattle(input: StartBattleInput): void {
  const team = input.enemyTeams.find(t => t.id === input.enemyTeamId)
  if (!team)
    throw new Error(`startBattle: enemyTeam id ${input.enemyTeamId} not found`)

  // 展开 team.enemies(过滤 0 / 0xFFFF;详见 EnemyTeam 注释)
  // 简化:槽位直接当 enemies.json 的 id 索引(T23 baseline 对拍如不对再修)
  const enemyList: Enemy[] = team.enemies
    .filter(slot => slot !== 0 && slot !== 0xFFFF)
    .map((slot) => {
      const e = input.enemies.find(en => en.id === slot)
      if (!e)
        console.warn(`[battle] startBattle: enemy id ${slot} not in enemies.json, skipped`)
      return e
    })
    .filter((e): e is Enemy => e !== undefined)

  const field = input.battleFields.find(f => f.id === input.battleFieldId)
  if (!field)
    throw new Error(`startBattle: battleField id ${input.battleFieldId} not found`)

  const rng = createSeedableRng(input.rngSeed ?? Date.now())

  const battleState = createBattleState({
    gs: input.gs,
    playerRoles: input.playerRoles,
    enemies: enemyList,
    field,
    isBoss: input.isBoss,
    rng,
  })

  input.gs.mode = 'battle'
  input.gs.battleState = battleState
  setBattleResources(input.gs, {
    items: input.items,
    spells: input.spells,
    magics: input.magics,
    playerRoles: input.playerRoles,
    commands: input.commands,
  })

  // 注入 runScript(测试用)— 通过 BattleState 的 hidden field 走;这里临时挂在 res 上
  // 默认用 event-system.runScript;测试 mock 时传 runScriptFn
  if (input.runScriptFn) {
    (input.gs as unknown as Record<string, RunScriptFn>).__battleRunScript = input.runScriptFn
  }
}

/** 取注入的 runScript(测试 mock)或默认 event-system.runScript。 */
function getRunScript(gs: GameState): RunScriptFn {
  const injected = (gs as unknown as Record<string, RunScriptFn | undefined>).__battleRunScript
  return injected ?? runScript
}

// ============================================================================
// tickBattle —— phase 路由
// ============================================================================

/**
 * 战斗 tick —— 由 mode.ts 在 mode='battle' 时每帧调一次。
 *
 * 替换 T14 stub。phase 路由 + 死循环保护;具体行为见各 phase handler。
 *
 * @param gs GameState(必须 mode='battle' 且 battleState 非空;否则 no-op)
 * @param input 输入快照(本 task select-action input 处理为 stub,基本不读)
 * @param bus Present 命令通道(perform 阶段 emit 动画 / 数字弹幕)
 */
export function tickBattle(gs: GameState, input: InputSnapshot, bus: CommandBus): void {
  const state = gs.battleState
  if (!state)
    return

  const res = getBattleResources(gs)
  if (!res) {
    console.error('[battle] tickBattle without resources — state lifecycle 错乱,强制退出')
    gs.mode = 'explore'
    gs.battleState = undefined
    return
  }

  // 死循环保护(每 phase 内独立计数,phase 转换时 reset = 0)
  state.phaseStallTicks++
  if (state.phaseStallTicks > PHASE_STALL_TICKS_LIMIT) {
    console.error(
      `[battle] phase ${state.phase} stall > ${PHASE_STALL_TICKS_LIMIT} ticks (~60s),强制退出 explore`,
    )
    finalizeBattle(gs, state, res, /* forced= */ true)
    return
  }

  switch (state.phase) {
    case 'preBattle':
      tickPreBattle(state)
      break
    case 'selectAction':
      tickSelectAction(state, res, input)
      break
    case 'performAction':
      tickPerformAction(state, gs, bus, res)
      break
    case 'postAction':
      tickPostAction(state, res)
      break
    case 'won':
    case 'lost':
    case 'fleed':
      finalizeBattle(gs, state, res, /* forced= */ false)
      break
  }
}

// ============================================================================
// Phase handlers
// ============================================================================

/** preBattle → selectAction(M3 跳过 wScriptOnReady)。 */
function tickPreBattle(state: BattleState): void {
  state.phase = 'selectAction'
  state.selectingPlayerIdx = 0
  state.uiState = 'mainMenu'
  state.uiCursor = 0
  state.phaseStallTicks = 0
}

/**
 * selectAction:等所有活队员选好 action(由 dev panel / UI 写 pendingActions),
 * 然后 build ActionQueue + 进 performAction。
 *
 * 本 task UI input 处理是 stub —— 真菜单交互延 T26 / T29。
 */
function tickSelectAction(
  state: BattleState,
  res: BattleResources,
  _input: InputSnapshot,
): void {
  // 找活队员
  const alivePlayerIdxs: number[] = []
  state.players.forEach((p, i) => {
    const role = res.playerRoles.roles[p.roleId]
    if (role && role.hp > 0)
      alivePlayerIdxs.push(i)
  })

  // 活队员全死 → 转 lost(防卡死兜底,通常 postAction 已经检测过)
  if (alivePlayerIdxs.length === 0) {
    state.phase = 'lost'
    state.phaseStallTicks = 0
    return
  }

  // 还没全选完 → 等下一 tick(真 UI 交互延 T26;本 task 测试以 fixture 直填 pendingActions)
  if (state.pendingActions.size < alivePlayerIdxs.length)
    return

  // 全选完 → build ActionQueue,进 performAction
  const playerSlots = alivePlayerIdxs.map((i) => {
    const player = state.players[i]!
    const role = res.playerRoles.roles[player.roleId]!
    // 简化版 PAL_GetPlayerDexterity:role.dexterity(SHORT)+ (level+6)*4
    // sdlpal `fight.c::PAL_GetPlayerDexterity` 还会加装备 modifier,M3 不实现
    const baseDex = role.dexterity + (role.level + 6) * 4
    return {
      idx: i,
      dex: getPlayerActualDexterity(baseDex, {
        haste: player.status.haste,
        slow: player.status.slow,
      }),
    }
  })

  const enemySlots = state.enemies
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.e.health > 0)
    .map(({ e, i }) => ({
      idx: i,
      dex: getEnemyDexterity({ level: e.e.level, dexterity: e.e.dexterity }),
      dualMove: e.e.dualMove === 1,
    }))

  state.actionQueue = buildActionQueue({ players: playerSlots, enemies: enemySlots })
  state.currentActionIndex = 0
  state.phase = 'performAction'
  state.uiState = 'hidden'
  state.selectingPlayerIdx = undefined
  state.phaseStallTicks = 0
}

/**
 * performAction:逐项消费 actionQueue。
 *
 * 每 tick 执行一个 queue item(给 Present 层留出动画时间)。
 * - 队员 item:从 pendingActions 取
 * - 敌人 item:enemy-ai.decideEnemyAction 决策
 *
 * **flee 早退**:performFlee 成功会把 state.phase 设为 'fleed';本 handler 检测到
 * 后立即退出 queue(剩余 action 不执行),交给下一 tick 的 finalizeBattle。
 *
 * queue 跑完 → 转 postAction。
 */
function tickPerformAction(
  state: BattleState,
  gs: GameState,
  bus: CommandBus,
  res: BattleResources,
): void {
  // flee 提前转 phase → 早退
  if (state.phase !== 'performAction')
    return

  if (state.currentActionIndex >= state.actionQueue.length) {
    state.phase = 'postAction'
    state.phaseStallTicks = 0
    return
  }

  const item = state.actionQueue[state.currentActionIndex]!
  let action: BattleAction | undefined

  if (item.isEnemy) {
    const enemy = state.enemies[item.idx]
    if (enemy && enemy.e.health > 0) {
      const alivePlayers = state.players
        .map((p, i) => ({ idx: i, hp: res.playerRoles.roles[p.roleId]?.hp ?? 0 }))
        .filter(p => p.hp > 0)
      action = decideEnemyAction({ enemy: enemy.e, alivePlayers, rng: state.rng })
    }
    // enemy dead → skip(action 保持 undefined)
  }
  else {
    // player:从 pendingActions 取(skip 死队员的 action)
    const player = state.players[item.idx]
    if (player) {
      const role = res.playerRoles.roles[player.roleId]
      if (role && role.hp > 0)
        action = state.pendingActions.get(item.idx)
    }
  }

  if (action)
    performBattleAction(state, gs, item, action, bus, res)

  state.currentActionIndex++
  // 不 reset phaseStallTicks —— 整个 performAction phase 内 stall 累计;
  // 如卡 60s 没推进(eg. 自死循环),会被 stall 兜底
}

/**
 * 派发单个 BattleAction 到对应 perform*。
 *
 * action.target 为 -1 表示「全体」(BattleState.BattleAction 的 doc);
 * 转给 perform{Magic,Item} 时映射为 'all'(它们接受 number | 'all')。
 */
function performBattleAction(
  state: BattleState,
  gs: GameState,
  actor: ActionQueueItem,
  action: BattleAction,
  bus: CommandBus,
  res: BattleResources,
): void {
  switch (action.type) {
    case 'attack':
      performAttack(state, actor, action.target, bus, res.playerRoles)
      break

    case 'defend':
      // defend 只对队员有意义(敌人不 defend);写错也安全(performDefend 越界 no-op)
      performDefend(state, actor.idx)
      break

    case 'flee':
      // flee 只对队员有意义;敌人 flee 写错 no-op(performFlee 通过 playerRoles 解;此情境不应发生)
      if (!actor.isEnemy)
        performFlee(state, actor.idx, res.playerRoles)
      break

    case 'magic': {
      if (action.actionId === undefined)
        break
      // target=-1 → 'all';否则按 number 走
      const targetIdx: number | 'all' = action.target === -1 ? 'all' : action.target
      // 队员 cast → 默认 target 是敌人;敌人 cast → target 是队员
      // (sdlpal 实际逻辑允许治疗 / 辅助 targetIsEnemy=false,但 M3 简版默认按 caster 对立面)
      const targetIsEnemy = !actor.isEnemy
      performMagic({
        state,
        casterIsEnemy: actor.isEnemy,
        casterIdx: actor.idx,
        spellId: action.actionId,
        targetIsEnemy,
        targetIdx,
        spells: res.spells,
        magics: res.magics,
        playerRoles: res.playerRoles,
        bus,
        commands: res.commands,
        runScript: getRunScript(gs),
      })
      break
    }

    case 'item': {
      if (action.actionId === undefined)
        break
      const targetIdx: number | 'all' = action.target === -1 ? 'all' : action.target
      const targetIsEnemy = !actor.isEnemy
      performItem({
        state,
        gs,
        casterIsEnemy: actor.isEnemy,
        casterIdx: actor.idx,
        itemId: action.actionId,
        targetIsEnemy,
        targetIdx,
        items: res.items,
        playerRoles: res.playerRoles,
        bus,
        commands: res.commands,
        runScript: getRunScript(gs),
      })
      break
    }

    case 'pass':
      // pass:no-op(enemy 死掉后 decideEnemyAction 返回的兜底)
      break
  }
}

/**
 * postAction:累计 exp/cash,判 won/lost,否则推下一轮。
 *
 * - 死的 enemy(prevHp > 0 → health === 0):累 exp + cash 一次,prevHp = 0(防重复累)
 * - aliveCount=0 → lost
 * - 敌全死 → won
 * - 否则:turn++、清 pendingActions、清 defending flag(单轮失效)、回 selectAction
 *
 * **flee 不走本 phase** —— performFlee 直接把 phase 设 'fleed',tickBattle 路由会
 * 直接进 finalizeBattle。本 handler 不处理 fleed(防御性提早返回)。
 */
function tickPostAction(state: BattleState, res: BattleResources): void {
  // 累计死的 enemy 的 exp / cash(避免重复:用 prevHp 判)
  for (const e of state.enemies) {
    if (e.e.health <= 0 && e.prevHp > 0) {
      state.expGained += e.e.exp
      state.cashGained += e.e.cash
    }
    e.prevHp = e.e.health
  }

  const aliveCount = state.players.filter(p => (res.playerRoles.roles[p.roleId]?.hp ?? 0) > 0).length
  const enemyAlive = state.enemies.filter(e => e.e.health > 0).length

  if (aliveCount === 0) {
    state.phase = 'lost'
    state.phaseStallTicks = 0
    return
  }

  if (enemyAlive === 0) {
    state.phase = 'won'
    state.phaseStallTicks = 0
    return
  }

  // 推下一轮
  state.turn++
  state.pendingActions.clear()
  // defend 单轮失效(sdlpal `fight.c:1604` `g_Battle.rgPlayer[i].fDefending = FALSE`)
  state.players.forEach((p) => {
    p.defending = false
  })
  state.phase = 'selectAction'
  state.selectingPlayerIdx = 0
  state.uiState = 'mainMenu'
  state.uiCursor = 0
  state.phaseStallTicks = 0
}

// ============================================================================
// finalizeBattle —— 战斗结束写回 GameState
// ============================================================================

/**
 * 战斗终态写回 + 清状态。
 *
 * - won:exp 平分到所有队员(临时挂 `_exp` 字段;M5 真做 levelUpExp 表 + level up 弹窗)
 *        cash 加到 (gs as any).cash(M3 简版,后续 GameState schema 加 cash 字段时去 hack)
 * - lost:全员 hp=1(M3 简版,game over 推 M5);保留 cash / exp(不奖励)
 * - fleed:无 hp 改动,无奖励
 * - forced(stall 兜底):无奖励、无 hp 改动,只清状态
 *
 * 最终:gs.mode = 'explore'、gs.battleState = undefined、清 __battleResources。
 */
function finalizeBattle(
  gs: GameState,
  state: BattleState,
  res: BattleResources,
  forced: boolean,
): void {
  if (!forced) {
    if (state.phase === 'won') {
      // exp 平分到 partyMembers(M3 简版:不算 level up;M5 真做)
      const partySize = Math.max(gs.partyMembers.length, 1)
      const expEach = Math.floor(state.expGained / partySize)
      for (const playerIdx of gs.partyMembers) {
        const role = res.playerRoles.roles[playerIdx]
        if (!role)
          continue
        const r = role as unknown as Record<string, number>
        r._exp = (r._exp ?? 0) + expEach
      }
      const g = gs as unknown as Record<string, number>
      g.cash = (g.cash ?? 0) + state.cashGained
    }
    else if (state.phase === 'lost') {
      // 全员 hp=1(M3 简版,M5 真做 game over)
      for (const playerIdx of gs.partyMembers) {
        const role = res.playerRoles.roles[playerIdx]
        if (role)
          role.hp = 1
      }
    }
    // 'fleed' / 其它:无 hp 改动,无奖励
  }

  gs.mode = 'explore'
  gs.battleState = undefined
  setBattleResources(gs, undefined)
  // 清 injected runScript(若有)
  delete (gs as unknown as Record<string, RunScriptFn | undefined>).__battleRunScript
}
