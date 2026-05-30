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
  EnemyObject,
  EnemyTeam,
  InputSnapshot,
  Item,
  Magic,
  ObjectMagicView,
  ObjectPoisonView,
  PlayerRoles,
  Spell,
} from '@type-pal/shared'
import type { CommandBus } from '../command-bus.js'
import type { GameState } from '../game-state.js'
import { getGlobalCommands, runScript, type RunScriptOptions } from '../event-system.js'
import { createSeedableRng } from '../rng.js'
import { performAttack } from './actions/attack.js'
import { performDefend } from './actions/defend.js'
import { performFlee } from './actions/flee.js'
import { tickStatusEffects } from './status.js'
import { performItem } from './actions/item.js'
import { performMagic } from './actions/magic.js'
import { performThrowItem } from './actions/throw-item.js'
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
  /** rgObject magic-union 视图(object-magics.json)—— 0x42 SimulateMagic 解析 magic object id。 */
  objectMagics: ObjectMagicView[]
  /** rgObject poison-union 视图(object-poisons.json)—— 0x28 apply poison 解析 wEnemyScript。 */
  objectPoisons: ObjectPoisonView[]
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
  /**
   * M5.B-w2.a:全部 enemy-objects.json — sdlpal `OBJECT_ENEMY` 段 153 条
   * (objectIndex 398+),每条含 4 个 AI script hook(scriptOnReady 等)。
   * 不传 → 全部 enemy 走 default `decideEnemyAction` C 代码 fallback(无 AI)。
   */
  enemyObjects?: EnemyObject[]
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
  /**
   * object-magics.json(完整 rgObject 的 magic-union 视图)—— 0x42 SimulateMagic / 投掷物
   * scriptOnThrow 解析 magic object id(可低至 24,不在 spells.json [296..397])。
   * 省略 → 空表(0x42 走 no-op,投掷物伤害失效,会 console.warn)。
   */
  objectMagics?: ObjectMagicView[]
  /** object-poisons.json —— 0x28 apply poison 解析 poison 的 wEnemyScript。省略 → 空表。 */
  objectPoisons?: ObjectPoisonView[]
  /**
   * P2#5:战斗脚本(enemy.scriptOnReady / spell.scriptOnUse / item.scriptOnUse)是**全局 entry** —
   * 省略时默认单一全局数组(getGlobalCommands(),= 探索/菜单同一来源)。单测可传自带数组 override。
   * (旧版从 bootstrap 传 per-scene 切片 → 全局 ip 索引 16/782 元素切片 → 战斗脚本静默 no-op 的根因。)
   */
  commands?: Command[]
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
  // M5.B-w2.a:平行构造 enemyScripts,同 index 对齐;通过 enemyId 反查 enemy-objects.json
  // 第一条匹配项(同 enemyId 多 OBJECT_ENEMY 条目时取首条,精确多版本 script 推后)。
  const enemyList: Enemy[] = []
  const enemyScripts: Array<{ onTurnStart: number; onReady: number; onBattleEnd: number; resistanceToSorcery: number }> = []
  for (const slot of team.enemies) {
    if (slot === 0 || slot === 0xFFFF) continue
    const e = input.enemies.find(en => en.id === slot)
    if (!e) {
      console.warn(`[battle] startBattle: enemy id ${slot} not in enemies.json, skipped`)
      continue
    }
    enemyList.push(e)
    const objMatch = input.enemyObjects?.find(o => o.enemyId === slot)
    enemyScripts.push({
      onTurnStart: objMatch?.scriptOnTurnStart ?? 0,
      onReady: objMatch?.scriptOnReady ?? 0,
      onBattleEnd: objMatch?.scriptOnBattleEnd ?? 0,
      resistanceToSorcery: objMatch?.resistanceToSorcery ?? 0, // 0x28 apply poison 抗性判定
    })
  }

  const field = input.battleFields.find(f => f.id === input.battleFieldId)
  if (!field)
    throw new Error(`startBattle: battleField id ${input.battleFieldId} not found`)

  const rng = createSeedableRng(input.rngSeed ?? Date.now())

  const battleState = createBattleState({
    gs: input.gs,
    playerRoles: input.playerRoles,
    enemies: enemyList,
    enemyScripts,
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
    objectMagics: input.objectMagics ?? [],
    objectPoisons: input.objectPoisons ?? [],
    playerRoles: input.playerRoles,
    commands: input.commands ?? getGlobalCommands(), // P2#5:默认单一全局数组
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
      tickSelectAction(state, res, input, gs)
      break
    case 'performAction':
      tickPerformAction(state, gs, bus, res)
      break
    case 'postAction':
      tickPostAction(state, gs, bus, res)
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
 * selectAction:等所有活队员选好 action(由 UI 写 pendingActions),
 * 然后 build ActionQueue + 进 performAction。
 *
 * UI input 处理(M3.5 T13/T14):
 * - mainMenu(T13):Up/Down 切 cursor;Confirm 0/3/4 直接产 action,1/2 切二级菜单
 * - magicMenu / itemMenu / targetSelect(T14):待实现
 *
 * fixture 测试仍可绕过 UI 直填 pendingActions —— input handler 仅在 uiState
 * 命中分支时改 state,其它情况(fixture 模式 / 二级菜单未实现)不动 state。
 */
function tickSelectAction(
  state: BattleState,
  res: BattleResources,
  input: InputSnapshot,
  gs: GameState,
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

  // UI input dispatch(按 uiState 路由);Cancel 在 mainMenu 顶层无意义,不处理。
  switch (state.uiState) {
    case 'mainMenu':
      handleMainMenuInput(state, input, alivePlayerIdxs)
      break
    case 'magicMenu':
      handleMagicMenuInput(state, input, res.playerRoles)
      break
    case 'itemMenu':
      handleItemMenuInput(state, input, gs, res.items)
      break
    case 'targetSelect':
      handleTargetSelectInput(state, input, alivePlayerIdxs)
      break
    default:
      // 'hidden' / 其它(含 fixture 模式)— 不处理 input,保留 stub 行为
      break
  }

  // 还没全选完 → 等下一 tick
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

/** mainMenu 5 项数(0=攻击 1=法术 2=物品 3=防御 4=逃跑;对照 sdlpal BATTLE_MENU)。 */
const MAIN_MENU_SIZE = 5

/**
 * mainMenu input 处理(M3.5 T13):
 *
 * - Up:cursor = (cursor - 1 + 5) % 5
 * - Down:cursor = (cursor + 1) % 5
 * - Confirm:按 cursor 派发:
 *   - 0 攻击 → 切 targetSelect,暂存 pendingActionDraft
 *   - 1 法术 → 切 magicMenu(T14 真消费)
 *   - 2 物品 → 切 itemMenu(T14 真消费)
 *   - 3 防御 → 落 pendingActions[playerIdx] = { type: 'defend', target: -1 } + advance
 *   - 4 逃跑 → 落 pendingActions[playerIdx] = { type: 'flee', target: -1 } + advance
 * - Cancel:顶层菜单,无意义,不处理
 */
function handleMainMenuInput(
  state: BattleState,
  input: InputSnapshot,
  alivePlayerIdxs: number[],
): void {
  const playerIdx = state.selectingPlayerIdx
  if (playerIdx === undefined)
    return

  if (input.pressed.has('Up')) {
    state.uiCursor = (state.uiCursor - 1 + MAIN_MENU_SIZE) % MAIN_MENU_SIZE
    return
  }
  if (input.pressed.has('Down')) {
    state.uiCursor = (state.uiCursor + 1) % MAIN_MENU_SIZE
    return
  }
  if (!input.pressed.has('Confirm'))
    return

  switch (state.uiCursor) {
    case 0: // 攻击 → targetSelect
      state.pendingActionDraft = { type: 'attack' }
      state.uiState = 'targetSelect'
      state.uiCursor = 0
      break
    case 1: // 法术 → magicMenu(T14)
      state.pendingActionDraft = { type: 'magic' }
      state.uiState = 'magicMenu'
      state.uiCursor = 0
      break
    case 2: // 物品 → itemMenu(T14)
      state.pendingActionDraft = { type: 'item' }
      state.uiState = 'itemMenu'
      state.uiCursor = 0
      break
    case 3: // 防御 → 直接落 action + advance
      state.pendingActions.set(playerIdx, { type: 'defend', target: -1 })
      advanceSelectingPlayer(state, alivePlayerIdxs)
      break
    case 4: // 逃跑 → 直接落 action + advance
      state.pendingActions.set(playerIdx, { type: 'flee', target: -1 })
      advanceSelectingPlayer(state, alivePlayerIdxs)
      break
  }
}

/**
 * advance 到下一个未填 action 的活队员;全填则保留 selectingPlayerIdx(由
 * tickSelectAction 主流程检测 size 切 performAction)。每次 advance 重置 uiState
 * 回 mainMenu、cursor=0、清 pendingActionDraft。
 */
function advanceSelectingPlayer(state: BattleState, alivePlayerIdxs: number[]): void {
  state.pendingActionDraft = undefined
  const next = alivePlayerIdxs.find(i => !state.pendingActions.has(i))
  if (next !== undefined) {
    state.selectingPlayerIdx = next
    state.uiState = 'mainMenu'
    state.uiCursor = 0
  }
  // 全填完 → 不动 uiState/cursor;主流程下一步会切 performAction(在那里 uiState='hidden')
}

/**
 * Cancel 退回 mainMenu —— magicMenu / itemMenu / targetSelect 三个 handler 共用。
 * 不切 selectingPlayerIdx(还是当前队员重新选)、清 draft、cursor 归 0。
 */
function cancelToMainMenu(state: BattleState): void {
  state.uiState = 'mainMenu'
  state.uiCursor = 0
  state.pendingActionDraft = undefined
}

/**
 * magicMenu input 处理(M3.5 T14):
 *
 * - Up / Down:wrap 在 learnedSpells.length(空表 → 不动 cursor)
 * - Confirm:把 learned[cursor] 写进 draft.actionId,切 targetSelect、cursor=0
 *   - 空表 → no-op(不切)
 * - Cancel:回 mainMenu(清 draft、cursor=0)
 *
 * learnedSpells 不在 PlayerRole schema —— 兼容 dev panel 临时附加(同 draw-battle-ui)。
 */
function handleMagicMenuInput(
  state: BattleState,
  input: InputSnapshot,
  playerRoles: PlayerRoles,
): void {
  if (input.pressed.has('Cancel')) {
    cancelToMainMenu(state)
    return
  }

  const playerIdx = state.selectingPlayerIdx
  if (playerIdx === undefined)
    return
  const player = state.players[playerIdx]
  if (!player)
    return
  const role = playerRoles.roles[player.roleId]
  if (!role)
    return
  const learned: number[] = (role as unknown as { learnedSpells?: number[] }).learnedSpells ?? []

  if (learned.length === 0) {
    // 空表 — Up/Down/Confirm 都 no-op(cursor 保持 0;Cancel 已在上面处理过)
    return
  }

  if (input.pressed.has('Up')) {
    state.uiCursor = (state.uiCursor - 1 + learned.length) % learned.length
    return
  }
  if (input.pressed.has('Down')) {
    state.uiCursor = (state.uiCursor + 1) % learned.length
    return
  }
  if (input.pressed.has('Confirm')) {
    const spellId = learned[state.uiCursor]
    if (spellId === undefined)
      return
    state.pendingActionDraft = { type: 'magic', actionId: spellId }
    state.uiState = 'targetSelect'
    state.uiCursor = 0
  }
}

/**
 * itemMenu input 处理(M3.5 T14):
 *
 * - usable = gs.inventory.filter(count > 0)(与 draw-battle-ui 视图保持一致)
 * - Up / Down:wrap 在 usable.length
 * - Confirm:把 usable[cursor].itemId 写进 draft.actionId,切 targetSelect、cursor=0
 *   - usable 空 → no-op
 * - Cancel:回 mainMenu
 */
function handleItemMenuInput(
  state: BattleState,
  input: InputSnapshot,
  gs: GameState,
  items: Item[],
): void {
  if (input.pressed.has('Cancel')) {
    cancelToMainMenu(state)
    return
  }

  const usable = gs.inventory.filter(e => e.count > 0)
  if (usable.length === 0)
    return

  if (input.pressed.has('Up')) {
    state.uiCursor = (state.uiCursor - 1 + usable.length) % usable.length
    return
  }
  if (input.pressed.has('Down')) {
    state.uiCursor = (state.uiCursor + 1) % usable.length
    return
  }
  if (input.pressed.has('Confirm')) {
    const entry = usable[state.uiCursor]
    if (!entry)
      return
    // E2:投掷物(throwable + scriptOnThrow)→ 'throw-item' action(performThrowItem
    // 跑 scriptOnThrow + 0x42),否则 'item' action(performItem 跑 scriptOnUse)。
    // sdlpal 战斗物品菜单按 item flag 分 kBattleActionThrowItem / kBattleActionUseItem。
    const item = items.find(i => i.id === entry.itemId)
    const isThrow = !!item?.flags.throwable && item.scriptOnThrow !== 0
    state.pendingActionDraft = { type: isThrow ? 'throw-item' : 'item', actionId: entry.itemId }
    state.uiState = 'targetSelect'
    state.uiCursor = 0
  }
}

/**
 * targetSelect input 处理(M3.5 T14):
 *
 * 光标语义:uiCursor 是 **state.enemies 的 raw index**(与 draw-battle-ui 一致),
 * Left/Right 移动时跳过已死 enemy(health <= 0)。
 *
 * - Left:从当前 raw index 往左找下一个 alive(wrap)
 * - Right:类似
 * - Confirm:把 (draft + target=uiCursor) 写进 pendingActions,advance
 *   - 当前光标位置是死敌 / 无 alive enemy → no-op
 *   - draft 缺失 → no-op(防御性)
 * - Cancel:回 mainMenu(清 draft)
 */
function handleTargetSelectInput(
  state: BattleState,
  input: InputSnapshot,
  alivePlayerIdxs: number[],
): void {
  if (input.pressed.has('Cancel')) {
    cancelToMainMenu(state)
    return
  }

  // 收集活敌 raw index;无 alive 则 Left/Right/Confirm 全 no-op
  const aliveRawIdxs: number[] = []
  state.enemies.forEach((e, i) => {
    if (e.e.health > 0)
      aliveRawIdxs.push(i)
  })
  if (aliveRawIdxs.length === 0)
    return

  if (input.pressed.has('Left') || input.pressed.has('Right')) {
    // 找当前 cursor 在 aliveRawIdxs 中的位置;若 cursor 指向死敌则取最近的活敌
    let pos = aliveRawIdxs.indexOf(state.uiCursor)
    if (pos === -1)
      pos = 0 // cursor 不在活敌中 — 默认从第一个 alive 开始数
    const delta = input.pressed.has('Left') ? -1 : 1
    const newPos = (pos + delta + aliveRawIdxs.length) % aliveRawIdxs.length
    state.uiCursor = aliveRawIdxs[newPos]!
    return
  }

  if (input.pressed.has('Confirm')) {
    const draft = state.pendingActionDraft
    const playerIdx = state.selectingPlayerIdx
    if (!draft || playerIdx === undefined)
      return
    // 当前 cursor 必须是活敌(防御性 — UI 应已通过 Left/Right 保证)
    const target = aliveRawIdxs.includes(state.uiCursor) ? state.uiCursor : aliveRawIdxs[0]!
    state.pendingActions.set(playerIdx, {
      type: draft.type,
      actionId: draft.actionId,
      target,
    })
    advanceSelectingPlayer(state, alivePlayerIdxs)
  }
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
      // M5.B-w2.a:sdlpal `fight.c:1719-1724` 真值 — enemy 轮到时跑 wScriptOnReady
      // bytecode AI 脚本,脚本通过 opcode 0x0067 enemy use magic / 0x0064 jump if hp>
      // 等 mutate enemy state(wMagic / wMagicRate);随后 PerformAction 用 mutate
      // 后的 state 执行实际动作。
      // 现阶段 opcode handler 仍是 raw skip(留后续 commit 真做),脚本路径已通,
      // mutate 还没生效,默认仍走 decideEnemyAction fallback。
      if (enemy.scriptOnReady > 0) {
        runScript({
          commands: res.commands,
          ip: enemy.scriptOnReady,
          bus,
          runtimeMode: 'battle',
          battleCtx: {
            state,
            caster: { type: 'enemy', idx: item.idx },
          },
        })
      }
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

    case 'throw-item': {
      // E2:投掷物(kBattleActionThrowItem,fight.c:4332)—— 跑 item.scriptOnThrow,
      // 脚本里 0x42 SimulateMagic 结算伤害。43 个投掷符/镖/卵/蛊靠这条。
      if (action.actionId === undefined)
        break
      const targetIdx: number | 'all' = action.target === -1 ? 'all' : action.target
      performThrowItem({
        state,
        gs,
        casterIsEnemy: actor.isEnemy,
        casterIdx: actor.idx,
        itemId: action.actionId,
        targetIdx,
        items: res.items,
        magics: res.magics,
        objectMagics: res.objectMagics,
        objectPoisons: res.objectPoisons, // 0x28 apply poison
        playerRoles: res.playerRoles, // 0x66 throw weapon 需 caster attackStrength
        bus,
        commands: res.commands,
        runScript: getRunScript(gs),
      })
      break
    }

    // M5.B-w2.b + B-w3.a stub:4 个新 action type — handler 真做留后续 commit
    case 'summon':
    case 'trance':
    case 'equip-battle':
    case 'coop-magic':
      console.debug(
        `[battle] ${action.type === 'coop-magic' ? 'B-w3.a' : 'B-w2.b'} stub:`
        + `action=${action.type} actionId=${action.actionId}`
        + ` target=${action.target}(handler 真做留后续)`,
      )
      bus.emit({ op: 'showBattleMessage', text: `[${action.type}] stub` })
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
function tickPostAction(state: BattleState, gs: GameState, bus: CommandBus, res: BattleResources): void {
  // 毒 tick —— 对照 sdlpal `fight.c:1645-1648`(每回合每敌 rgPoisons[j].wPoisonScript 跑)。
  // 每个活敌的每条 poison 跑其 scriptEntry(毒 wEnemyScript,经 0x21 扣血),target = 该敌人。
  // 放在死亡 exp 累计**之前** → 毒杀的敌人也计入死亡奖励。
  const runPoisonScript = getRunScript(gs)
  state.enemies.forEach((enemy, idx) => {
    if (enemy.e.health <= 0)
      return
    for (const poison of enemy.poisons ?? []) {
      if (poison.scriptEntry > 0) {
        runPoisonScript({
          commands: res.commands,
          ip: poison.scriptEntry,
          bus,
          runtimeMode: 'battle',
          battleCtx: { state, target: { type: 'enemy', idx } },
        })
      }
    }
  })

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

  // 推下一轮 + M5.B-w1.a:tick status effects(sdlpal fight.c:PAL_BattlePlayerCheckReady)
  // sleep/paralyzed/confused/silence/puppet 各 -1 直到 0;boolean 类 haste/slow/...
  // 简版不衰减(等装备 / 法术 follow-up)
  tickStatusEffects(state)
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
      // M5.B-w1.c:sdlpal `PAL_BattleWon` 真值 — iExpGained 加到每 alive
      // partyMember 的 rgPrimaryExp(wExp);levelup loop 触发查 rgLevelUpExp 阈值
      // 留 follow-up(需注入 LevelUpExp 表 + stat 加成 random 公式)。
      // alive 判定用 res.playerRoles.roles[roleId].hp(fixture 真值来源),
      // PlayerRolesRuntime.rgwHP 在装备/savegame 体系完工后接管。
      for (const roleId of gs.partyMembers) {
        const role = res.playerRoles.roles[roleId]
        if (!role || role.hp <= 0) continue // dead 不获 exp
        const entry = gs.Exp.rgPrimaryExp[roleId]
        if (entry) entry.wExp += state.expGained
      }
      gs.dwCash += state.cashGained
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
