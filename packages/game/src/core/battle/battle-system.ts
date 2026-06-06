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
 * **enemy id 映射**(已对齐 sdlpal,2026-06-02 核验订正):enemyTeam.rgwEnemy[j] 在 sdlpal 中是
 * OBJECT 数组绝对 index → OBJECT_ENEMY.wEnemyID → DATA.MKF chunk 1(enemies.json id;battle.c:1602-1611)。
 * 该两级间接**已在提取期完成**(enemy-teams.ts translate mode 经 buildObjectIndexToEnemyIdMap 把
 * OBJECT 索引解析成 enemyId 写入 enemy-teams.json)→ 运行时 `.find(e => e.id === slot)` 直接命中即正确,
 * 无需运行时中间表。(原"本 task 简化方案 / T23 对拍待"备注 FALSE:映射不是简化,是已解析真值。)
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
  EnemyPosTable,
  EnemyTeam,
  InputSnapshot,
  Item,
  LevelUpMagicEntry,
  Magic,
  ObjectMagicView,
  ObjectPlayerView,
  ObjectPoisonView,
  PlayerRole,
  PlayerRoles,
  Spell,
} from '@type-pal/shared'
import type { CommandBus } from '../command-bus.js'
import { curePlayerPoisonByLevel, getGlobalCommands, type RunScriptOptions, runScript } from '../event-system.js'
import type { AllExperience, GameState, PlayerRolesRuntime } from '../game-state.js'
import { type BattleOutcome, clearHiddenExpCounts, resumePostBattleScript, writeBackBattleRolesToRuntime } from '../game-state.js'
import {
  getPlayerAttackStrength, getPlayerDefense, getPlayerDexterity,
  getPlayerFleeRate, getPlayerMagicStrength, removeEquipmentEffect,
} from '../equip-effect.js'
import { createSeedableRng, type SeedableRng } from '../rng.js'
import type { BattleSettlementScreen, LevelUpScreenData } from './battle-settlement.js'
import { settlementScreenTimeoutMs } from './battle-settlement.js'
import { performAttack, performEnemyConfusedAttack } from './actions/attack.js'
import { performAttackMate } from './actions/attack-mate.js'
import { performDefend } from './actions/defend.js'
import { performFlee } from './actions/flee.js'
import { performCoopMagic } from './actions/coop-magic.js'
import { performItem } from './actions/item.js'
import { performMagic } from './actions/magic.js'
import { performThrowItem } from './actions/throw-item.js'
import { BATTLE_FRAME_TIME } from './anim-timeline.js'
import { applyAnimFrame, resetFightersAfterAction } from './battle-anim-driver.js'
import type { BattleAction, BattlePlayer, BattleState } from './battle-state.js'
import { createBattleState } from './battle-state.js'
import { resolveMagicObject } from './magic-object.js'
import { createSelectionMenu, type SelectionMenuState } from '../menu/primitives.js'
import { openMenu } from '../menu/menu-mode.js'
import { createPlayerStatus } from '../menu/player-status.js'
import { decideEnemyAction } from './enemy-ai.js'
import { getEnemyDexterity, getPlayerActualDexterity } from './formulas.js'
import { tickStatusEffects } from './status.js'
import { type ActionQueueItem, buildActionQueue } from './turn-queue.js'
import {
  appendDialogLine,
  confirmDialog,
  setWaitingEndKey,
  setWaitingPageKey,
  shouldWaitPageKey,
  startDialogLine,
  tickDialog,
} from '../../present/dialog-box.js'
import { FRAME_MS_EXPLORE } from '@type-pal/shared'

/** 防卡死兜底阈值:1500 ticks ≈ 60s at 25fps(M3 战斗 FPS)。 */
const PHASE_STALL_TICKS_LIMIT = 1500

/**
 * D17a:每 tick 推进的动画时间(ms)= BATTLE_FRAME_TIME(battle.h:28-29,25fps → 40ms)。
 * 战斗 tick 与 BATTLE_FPS 同频 → 每 tick 恰好推进 1 个 battle frame。
 */
const BATTLE_DT = BATTLE_FRAME_TIME
/**
 * D19 入场揭示 gate 时长(tick)。对齐 sdlpal `PAL_StartBattle` 入场真值 = `VIDEO_SwitchScreen(5)`
 * (video.c:1089-1126:wSpeed=5→6→×10=60,外层 6 band × UTIL_Delay(60) = 360ms),≈ 360ms / 40ms-per-tick
 * (FRAME_MS_BATTLE)= 9 tick。
 *
 * 注(2026-06-04 修 user 报"进战斗到菜单过渡偏长"):入场揭示出处是 video.c VIDEO_SwitchScreen(5)=360ms,
 * **不是** PAL_BattleFadeScene(battle.c:608-682,72×16ms≈1152ms)—— 后者是战斗内动作刷新/法术效果用,
 * PAL_StartBattle 入场 callpath(battle.c:706-737)根本不调它。旧值 29(≈1160ms)对标错了函数,过渡比真值长约 3 倍。
 */
export const INTRO_FADE_TICKS = 9

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
  /** rgObject player-union 视图(object-players.json)—— 队友死亡 / 濒死触发脚本。 */
  objectPlayers: ObjectPlayerView[]
  /** 全部 enemies.json —— 0x9E summon 按 enemyId 取召唤兽 stats。 */
  enemies: Enemy[]
  /** 全部 enemy-objects.json —— 0x9E summon 按 objectIndex 解 op0 → enemyId/scripts/抗性。 */
  enemyObjects: EnemyObject[]
  playerRoles: PlayerRoles
  commands: Command[]
  /**
   * D17a:rgwBattleEffectIndex[10][2] flat(battle-effect-index.json)—— player 物理攻击
   * 命中特效帧基号 `[battleSpriteId][1]*3`(fight.c:2055)。省略 → effectFrameBase=0。
   */
  battleEffectIndex?: number[]
  /**
   * D17:FIRE.MKF magic sprite 帧数 Map(chunk index = magic.effect → frameCount)——
   * performMagic build OffMagic 时间线取 `n`(总帧数公式 fight.c:2652/2661)。
   * 省略或缺 chunk → performMagic 不建攻击魔法时间线(走原即时路径,向后兼容)。
   */
  magicSpriteFrameCounts?: Map<number, number>
  /**
   * 召唤神精灵帧数 Map(F.MKF chunk index = magic.special+10 → frameCount)—— performMagic build
   * 召唤动画取召唤神逐帧 loop 帧数(fight.c:3160)。省略 → 不建召唤动画(走即时路径)。
   */
  summonSpriteFrameCounts?: Map<number, number>
  /**
   * D11:LevelUpExp[100](level-up-exp.json)—— 战斗胜利升级 `dwExp >= rgLevelUpExp[level]` 阈值
   * (battle.c:1106)。省略 → finalizeBattle 升级 loop 跳过(只入 exp,不升级,向后兼容旧 fixture/测试)。
   */
  levelUpExp?: number[]
  /**
   * D11:LEVELUPMAGIC_ALL[20][5](level-up-magic.json)—— 升级时学新法术(battle.c:1300-1321)。
   * 省略 → 不学法术。
   */
  levelUpMagic?: LevelUpMagicEntry[][]
}

/** runScript 注入类型(便于测试 mock 替换 free function)。 */
export type RunScriptFn = (opts: RunScriptOptions) => number

/** GameState 上的非可见 stash 字段名 —— 不在 GameState interface 中,但通过 cast 写入。 */
const BATTLE_RESOURCES_KEY = '__battleResources' as const

/** 取(可能不存在的)战斗资源。 */
function getBattleResources(gs: GameState): BattleResources | undefined {
  return (gs as unknown as Record<string, BattleResources | undefined>)[BATTLE_RESOURCES_KEY]
}

/**
 * 取战斗中**实时**队员 roles —— 伤害 / 死亡(hp→0)持久写于此份(projectRuntimeToBattleRoles 投影,
 * 含装备 effect)。**present 精灵 / UI 必须读这份**,不能读 bootstrap 的 static 满血基线
 * (`battleAssets.playerRoles`)——否则死员仍按满血画站立帧(user 报"起立")。无战斗时 undefined。
 */
export function getBattleLiveRoles(gs: GameState): BattleResources['playerRoles'] | undefined {
  return getBattleResources(gs)?.playerRoles
}

/** 设置战斗资源(startBattle 用)。 */
function setBattleResources(gs: GameState, res: BattleResources | undefined): void {
  ;(gs as unknown as Record<string, BattleResources | undefined>)[BATTLE_RESOURCES_KEY] = res
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
  /** object-players.json —— player object 的 friend-death / dying 脚本。省略 → 空表。 */
  objectPlayers?: ObjectPlayerView[]
  /**
   * D17a:ENEMYPOS table(DATA.MKF chunk 13)— enemy 初始 pos/posOriginal 用
   * (battle.c:936-939)。省略 → fallback 表(向后兼容旧 fixture / 测试)。
   */
  enemyPos?: EnemyPosTable
  /**
   * D17a:rgwBattleEffectIndex[10][2] flat(battle-effect-index.json)。
   * 省略 → effectFrameBase=0(overlay 仍指 chunk10 frame 0..2)。
   */
  battleEffectIndex?: number[]
  /**
   * D17:FIRE.MKF magic sprite 帧数 Map(chunk index = magic.effect → frameCount)——
   * performMagic build OffMagic 时间线取 `n`。省略 → 不建攻击魔法时间线(向后兼容)。
   */
  magicSpriteFrameCounts?: Map<number, number>
  /** 召唤神精灵帧数 Map(F.MKF chunk = magic.special+10 → frameCount)。省略 → 不建召唤动画。 */
  summonSpriteFrameCounts?: Map<number, number>
  /** D11:LevelUpExp[100](level-up-exp.json)—— 战斗胜利升级阈值。省略 → 升级 loop 跳过。 */
  levelUpExp?: number[]
  /** D11:LEVELUPMAGIC_ALL[20][5](level-up-magic.json)—— 升级学新法术。省略 → 不学。 */
  levelUpMagic?: LevelUpMagicEntry[][]
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
  /** D19 入场 dither fade-in gate 时长(tick)。生产传 INTRO_FADE_TICKS;省略/0 → 无入场淡入(单测/dev)。 */
  introFadeTicks?: number
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
  const team = input.enemyTeams.find((t) => t.id === input.enemyTeamId)
  if (!team) throw new Error(`startBattle: enemyTeam id ${input.enemyTeamId} not found`)

  // 展开 team.enemies(过滤 0 / 0xFFFF;详见 EnemyTeam 注释)
  // 简化:槽位直接当 enemies.json 的 id 索引(T23 baseline 对拍如不对再修)
  // M5.B-w2.a:平行构造 enemyScripts,同 index 对齐;通过 enemyId 反查 enemy-objects.json
  // 第一条匹配项(同 enemyId 多 OBJECT_ENEMY 条目时取首条,精确多版本 script 推后)。
  const enemyList: Enemy[] = []
  const enemyScripts: Array<{
    onTurnStart: number
    onReady: number
    onBattleEnd: number
    resistanceToSorcery: number
  }> = []
  for (const slot of team.enemies) {
    if (slot === 0 || slot === 0xffff) continue
    const e = input.enemies.find((en) => en.id === slot)
    if (!e) {
      console.warn(`[battle] startBattle: enemy id ${slot} not in enemies.json, skipped`)
      continue
    }
    enemyList.push(e)
    const objMatch = input.enemyObjects?.find((o) => o.enemyId === slot)
    enemyScripts.push({
      onTurnStart: objMatch?.scriptOnTurnStart ?? 0,
      onReady: objMatch?.scriptOnReady ?? 0,
      onBattleEnd: objMatch?.scriptOnBattleEnd ?? 0,
      resistanceToSorcery: objMatch?.resistanceToSorcery ?? 0, // 0x28 apply poison 抗性判定
    })
  }

  const field = input.battleFields.find((f) => f.id === input.battleFieldId)
  if (!field) throw new Error(`startBattle: battleField id ${input.battleFieldId} not found`)

  const rng = createSeedableRng(input.rngSeed ?? Date.now())

  const battleState = createBattleState({
    gs: input.gs,
    playerRoles: input.playerRoles,
    enemies: enemyList,
    enemyScripts,
    field,
    isBoss: input.isBoss,
    rng,
    enemyPos: input.enemyPos, // D17a:enemy pos/posOriginal 初值(battle.c:936-939)
  })

  // R(重提)跨战斗:sdlpal g_Battle.rgPlayer[i].prevAction 是全局不随战斗重置,故"上回合"可以是
  //   **上一场战斗的最后一回合**(user 2026-05-31 报)。ts BattleState 每场重建会丢 → 从 gs.prevBattleActions
  //   (上一场战末持久,tickPostAction 每轮更新)带入本场初始 prevActions(按 party 槽 index,同 sdlpal)。
  battleState.prevActions = new Map(input.gs.prevBattleActions ?? [])

  // E04:sdlpal PAL_StartBattle(battle.c:1565-1586)战前清 7 隐藏经验池 wCount(per-battle 计数)。
  clearHiddenExpCounts(input.gs)

  // D19:入场 dither fade-in(PAL_BattleFadeScene,battle.c:609)。**显式 opt-in**(生产 tryStartBattle 传
  //   introFadeTicks=INTRO_FADE_TICKS;单测/dev 不传 → 无 fade、无 gate,行为不变)。preBattle 期间 gate 输入,
  //   present-battle 把战斗场景从入场前大世界帧 dither 揭示。
  if (input.introFadeTicks && input.introFadeTicks > 0) {
    battleState.introFade = { step: 0, total: input.introFadeTicks }
  }

  input.gs.mode = 'battle'
  input.gs.battleState = battleState
  setBattleResources(input.gs, {
    items: input.items,
    spells: input.spells,
    magics: input.magics,
    objectMagics: input.objectMagics ?? [],
    objectPoisons: input.objectPoisons ?? [],
    objectPlayers: input.objectPlayers ?? [],
    enemies: input.enemies, // 0x9E summon 召唤兽 stats
    enemyObjects: input.enemyObjects ?? [], // 0x9E summon op0 → enemyId/scripts
    playerRoles: input.playerRoles,
    commands: input.commands ?? getGlobalCommands(), // P2#5:默认单一全局数组
    battleEffectIndex: input.battleEffectIndex, // D17a:player 攻击命中特效帧基号
    magicSpriteFrameCounts: input.magicSpriteFrameCounts, // D17:OffMagic 时间线 n
    summonSpriteFrameCounts: input.summonSpriteFrameCounts, // 召唤神逐帧 loop 帧数
    levelUpExp: input.levelUpExp, // D11:战斗胜利升级阈值
    levelUpMagic: input.levelUpMagic, // D11:升级学新法术
  })

  // 注入 runScript(测试用)— 通过 BattleState 的 hidden field 走;这里临时挂在 res 上
  // 默认用 event-system.runScript;测试 mock 时传 runScriptFn
  if (input.runScriptFn) {
    ;(input.gs as unknown as Record<string, RunScriptFn>).__battleRunScript = input.runScriptFn
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
  if (!state) return

  const res = getBattleResources(gs)
  if (!res) {
    console.error('[battle] tickBattle without resources — state lifecycle 错乱,强制退出')
    gs.mode = 'explore'
    gs.battleState = undefined
    return
  }

  // 死循环保护(**非 sdlpal 真值**,ts 自加的防死锁兜底:sdlpal 玩家选指令可无限等、无任何超时)。
  //   仅对**应自动推进**的 phase 计数;**selectAction 是等玩家选指令的合法无限等待,绝不计 stall**
  //   —— 否则玩家慢慢翻技能菜单 60s 就被强退回大世界(user 2026-06-03 报:每次正选技能就被踢)。
  if (state.phase === 'selectAction') {
    state.phaseStallTicks = 0
  } else {
    state.phaseStallTicks++
    if (state.phaseStallTicks > PHASE_STALL_TICKS_LIMIT) {
      console.error(
        `[battle] phase ${state.phase} stall > ${PHASE_STALL_TICKS_LIMIT} ticks (~60s),强制退出 explore`,
      )
      finalizeBattle(gs, state, res, /* forced= */ true)
      return
    }
  }

  // D17 死亡淡出 hold(phase-agnostic):active → 暂停一切后续(perform / postAction / won 前
  //   都挡住,忠实 sdlpal PAL_BattleFadeScene 同步 blocking)。死敌淡出完才放行。
  if (tickBattleFade(state)) return

  // 逃跑动画 hold(phase-agnostic):flee 成功后 16 步右下滑 + 移出屏(PAL_BattlePlayerEscape),
  //   放完才 phase='fleed' → finalize。期间暂停一切推进。
  if (tickBattleFleeAnim(state, res)) return

  // D13 敌人主动逃飞出屏 hold(phase-agnostic):0x69 触发后全活敌往左挪到出屏 → phase='fleed'。
  if (tickBattleEnemyEscapeAnim(state)) return

  // 战斗内对话 hold(phase-agnostic):战斗脚本 0xFFFF showDialog 收集的队列逐 tick 喂进
  //   复用的大世界 gs.dialogBox + 等键/1.4s,期间暂停战斗(忠实 sdlpal PAL_ShowDialogText 同步 blocking)。
  //
  // **排序守卫(!battleAnim)**:ts 把脚本里的动画(battleAnim)与对话(battleDialogQueue)分两条
  //   异步队列,丢了 sdlpal 脚本顺序执行的"动画 blocking → 对话 blocking"次序。这些**结果消息**
  //   (偷取"获得X"fight.c:5288 在 5218 动画后、法术失败"没有效果"在施法特效后)真值都在动画**之后**。
  //   故 battleAnim active 时**不**起新对话(让动画先播完)——动画完(tickPerformAction 清 battleAnim)
  //   下 tick 才放对话。已显示中的 box(gs.dialogBox)不受影响:对话 blocking 时 tickPerformAction
  //   不跑 → 不会有 battleAnim 与 active box 并存。turnStart/scriptReady 的**前置**对话入队时无
  //   battleAnim,照旧立即显示(各自早退,见 372/1637),不被本守卫推迟。
  if (!state.battleAnim && tickBattleDialog(state, gs, input)) return

  // D11b 胜利结算演出 hold(phase-agnostic):active → 逐屏显示升级/学法术,暂停战斗推进,
  //   放完 → finishBattleWon → explore(忠实 PAL_BattleWon 多屏 PAL_WaitForAnyKey)。
  if (tickBattleSettlement(state, gs, input, res, bus)) return

  // scriptOnTurnStart:每轮起手(进 selectAction **菜单之前**)对全体活敌跑一次 → boss 嘲讽对话
  //   进战斗一开始 / 每轮开头就显示(忠实 sdlpal fight.c:1184-1191 fTurnStart 在 charge/act 前)。
  //   有对话入队 → 本 tick 不进菜单,下 tick 顶层 tickBattleDialog 先把对话放完(修"先选动作才说话")。
  if (state.phase === 'selectAction' && state.turnStartDoneForTurn !== state.turn) {
    runEnemyTurnStartScripts(state, gs, bus, res)
    if (state.battleDialogQueue && state.battleDialogQueue.length > 0) return
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
      // 首次进 won:处理战果 + 建结算演出(下 tick 起顶层 tickBattleSettlement 逐屏放;screens 空则
      //   该 hold 首 tick 即 finishBattleWon → explore)。已建 → 等 hold 接管,不重入。
      if (!state.settlement)
        buildBattleWonSettlement(gs, state, res)
      break
    case 'lost':
    case 'fleed':
      finalizeBattle(gs, state, res, /* forced= */ false)
      break
  }
}

// ============================================================================
// Phase handlers
// ============================================================================

/** preBattle → selectAction(M3 跳过 wScriptOnReady)。起手起第一个队员的选择菜单(PAL_BattleUIPlayerReady)。 */
function tickPreBattle(state: BattleState): void {
  // D19:入场 fade-in 期间停在 preBattle gate 输入(present 放 dither 淡入);fade 完才进 selectAction。
  if (state.introFade && state.introFade.step < state.introFade.total) {
    state.introFade.step++
    return
  }
  state.introFade = undefined
  state.phase = 'selectAction'
  startPlayerSelection(state, 0)
  state.phaseStallTicks = 0
}

/**
 * port sdlpal `PAL_BattleUIPlayerReady`(uibattle.c:581-621):轮到某队员 → 起其动作选择菜单。
 *   state=SelectMove / MenuState=Main / wSelectedAction=0。ts 额外清 target 光标 + 选择子状态。
 */
function startPlayerSelection(state: BattleState, idx: number): void {
  state.selectingPlayerIdx = idx
  state.uiState = 'selectMove'
  state.menuState = 'main'
  state.selectedAction = 0
  state.uiCursor = 0
  state.pendingActionDraft = undefined
  state.magicSelect = undefined
  state.itemSelect = undefined
}

/**
 * 行动类型 dex 倍率 —— sdlpal `fight.c:1529-1556`(PAL_CLASSIC ActionQueue 填充段)真值:
 *   coop-magic ×10 / defend ×5 / 辅助法术(非 usableToEnemy)×3 / item ×3 / flee ÷2;其余 ×1。
 * 决定本轮行动**先后**(dex 越高越先);防御 ×5 让防御方排队首,选防御一进 perform 即先手 → 立刻防御姿。
 */
function actionDexMultiplier(
  action: BattleAction | undefined,
  spells: import('@type-pal/shared').Spell[],
): number {
  if (!action) return 1
  switch (action.type) {
    case 'coop-magic':
      return 10
    case 'defend':
      return 5
    case 'magic': {
      // 攻击法术(usableToEnemy)×1;辅助/防御法术 ×3(fight.c:1540-1543)
      const spell = spells.find((s) => s.id === action.actionId)
      return spell && !spell.flags.usableToEnemy ? 3 : 1
    }
    case 'item':
      return 3
    case 'flee':
      return 0.5
    default:
      return 1
  }
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
    if (role && role.hp > 0) alivePlayerIdxs.push(i)
  })

  // 活队员全死 → 转 lost(防卡死兜底,通常 postAction 已经检测过)
  if (alivePlayerIdxs.length === 0) {
    state.phase = 'lost'
    state.phaseStallTicks = 0
    return
  }

  // B1/D8:失能(睡眠/麻痹/混乱)活队员自动填占位 action + 跳菜单
  //   (sdlpal fight.c:1398-1404 不开菜单 + 1505-1527 queue 自动填 Attack id0;
  //    perform 时再解算 Pass/AttackMate)。
  autoFillIncapacitatedActions(state, alivePlayerIdxs)
  // 当前选择若落在已自动填的失能队员上 → 跳到下一个待填活队员(或全填完 → wait)。
  if (state.selectingPlayerIdx !== undefined && state.pendingActions.has(state.selectingPlayerIdx)) {
    advanceSelectingPlayer(state, alivePlayerIdxs)
  }

  // B4(3):持久 fAutoBattle(0x8A,sdlpal uibattle.c:839-878)**优先**于手动/fAutoAttack(:822 互斥)。
  //   整场每 ready 队员自动 PickAutoMagic(阈值 9999)→ 有可用法术选法术、否则物理,不显示菜单、不可手动关。
  if (state.fAutoBattle && state.selectingPlayerIdx !== undefined) {
    commitForceAction(state, alivePlayerIdxs, res, 9999)
  }
  else {
    // fAutoAttack 取消(sdlpal uibattle.c:827-829):auto 模式按 Menu → 关 auto,本 tick 改正常菜单。
    if (state.fAutoAttack && (input.pressed.has('Menu') || input.pressed.has('Cancel'))) {
      state.fAutoAttack = false
    }

    // 自动攻击模式(围攻 / Auto 键):队员起手即自动 commit 攻击(sdlpal uibattle.c:977-992),不显示菜单。
    if (
      state.uiState === 'selectMove' && state.menuState === 'main' && state.fAutoAttack &&
      state.selectingPlayerIdx !== undefined
    ) {
      commitAutoAttack(state, res.playerRoles, alivePlayerIdxs)
    } else {
      // UI input dispatch(按 uiState × menuState 路由,1:1 sdlpal BATTLEUISTATE × BATTLEMENUSTATE)。
      dispatchSelectInput(state, input, gs, res, alivePlayerIdxs)
    }
  }

  // 还没全选完 → 等下一 tick
  if (state.pendingActions.size < alivePlayerIdxs.length) return

  // 全选完 → build ActionQueue,进 performAction。
  // D7(W1):sdlpal fight.c CLASSIC 填队列 **先全敌后全玩家**,每条 dex `*= RandomFloat(0.9,1.1)`(WORD 截断)。
  //   RNG 抽取次序必须复刻(先 enemy 含 dualMove 二抽,再 player)→ 故 enemySlots 先算。
  //   dualMove 第二行动独立二抽 dex(fight.c:1483-1489),传 dex2 让 buildActionQueue 比较定 fIsSecond。
  const jitter = (d: number): number => Math.trunc(d * state.rng.rangeFloat(0.9, 1.1)) // RandomFloat(0.9,1.1)

  const enemySlots = state.enemies
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.e.health > 0)
    .map(({ e, i }) => {
      const baseDex = getEnemyDexterity({ level: e.e.level, dexterity: e.e.dexterity })
      const dex = jitter(baseDex) // 第一抽
      // B2 c8:sdlpal fight.c:1239-1242 真值 — wDualMove>=2 必二动 || (wDualMove!=0 && RandomLong(0,1) 50%)。
      const dualMove = e.e.dualMove >= 2 || (e.e.dualMove !== 0 && state.rng.rangeInclusive(0, 1) === 1)
      // dualMove 第二抽独立摇(GetEnemyDexterity*RandomFloat 再一次,fight.c:1483-1486)
      const dex2 = dualMove ? jitter(baseDex) : undefined
      return { idx: i, dex, dualMove, dex2 }
    })

  const playerSlots = alivePlayerIdxs.map((i) => {
    const player = state.players[i]!
    const role = res.playerRoles.roles[player.roleId]!
    // B1/D8:睡眠/麻痹队员 dex=0(排队尾;sdlpal fight.c:1505-1517 "同回合恢复则物理攻,否则 Pass")。
    //   注:此分支 sdlpal **不摇** RandomFloat(直接 wDexterity=0),故不消耗 RNG。
    if (player.status.sleep > 0 || player.status.paralyzed > 0) return { idx: i, dex: 0 }
    // baseDex = PAL_GetPlayerDexterity(global.c:1849-1864)= rgwDexterity + Σ装备,**无 level 项**
    //   (等级项是**敌方** PAL_GetEnemyDexterity 才有,且乘数 *3 非 *4,fight.c:311-312)。
    //   role.dexterity 已 = base+装备(projectRuntimeToBattleRoles game-state.ts:1282)→ 直接用,
    //   绝不再加 (level+6)*4(M3 误套敌方公式 + 连乘数都对不上的 bug,2026-06-02 审计核源订正)。
    const baseDex = role.dexterity
    let dex = getPlayerActualDexterity(baseDex, {
      haste: player.status.haste > 0,
      slow: player.status.slow > 0,
    })
    // 行动类型 dex 倍率(sdlpal fight.c:1529-1556):决定本轮行动**先后**。
    //   防御 ×5 → 排到队首先行动,故选防御后**一开始执行动作序列**就进防御姿(user 2026-05-31)。
    dex = Math.round(dex * actionDexMultiplier(state.pendingActions.get(i), res.spells))
    // 濒死 ÷2(fight.c:1558)
    const maxHp = role.maxHP
    if (role.hp > 0 && role.hp < Math.min(100, Math.floor(maxHp / 5)))
      dex = Math.floor(dex / 2)
    // D7:末尾 jitter `*= RandomFloat(0.9,1.1)`(fight.c:1556),在所有倍率/濒死之后(sdlpal 同序)。
    dex = jitter(dex)
    return { idx: i, dex }
  })

  state.actionQueue = buildActionQueue({ players: playerSlots, enemies: enemySlots })
  state.currentActionIndex = 0
  state.phase = 'performAction'
  state.uiState = 'hidden'
  state.selectingPlayerIdx = undefined
  state.phaseStallTicks = 0
}

// ── sdlpal CLASSIC 战斗菜单常量 ─────────────────────────────────────────────
/** 主菜单 4 图标 → BATTLEUIACTION(uibattle.c:813-817):0攻击 1法术 2合击 3杂项。 */
// (图标渲染顺序在 draw 层;此处只用 selectedAction 0-3)
/** 杂项盒 5 项(CLASSIC 顺序 uibattle.c:368-385):0围攻 1道具 2防御 3逃跑 4状态。 */
const MISC_MENU_SIZE = 5
/** 法术选择网格 3 列 × 5 行(magicmenu.c:57-59,CN dwWordLength=10 → 32/10=3,iLinesPerPage=5)。 */
const MAGIC_GRID_COLS = 3
const MAGIC_GRID_ROWS = 5
/** 物品选择网格 3 列 × 7 行(itemmenu.c:51-53)。 */
const ITEM_GRID_COLS = 3
const ITEM_GRID_ROWS = 7

// ── 灰项判定 helpers(PAL_IsPlayerHealthy / PAL_BattleUIIsActionValid)──────
/** port sdlpal `PAL_IsPlayerDying`(global.c):hp>0 且 hp < maxHP/5(濒死)。 */
function isPlayerDying(role: { hp: number; maxHP: number }): boolean {
  return role.hp > 0 && role.hp < Math.max(1, Math.floor(role.maxHP / 5))
}

/**
 * M6 玩家濒死/阵亡音 —— port sdlpal `PAL_BattlePostActionCheck` dying-sweep(fight.c:834-850)
 *   + enemy 攻击致死内联 deathSound(fight.c:4816/4851/5110)。每回合后处理调一次,比对本回合初
 *   prevHp:① hp===0 且 prevHp>0(本回合阵亡)→ rgwDeathSound;② hp>0 且跌入濒死(hp<maxHP/5)且
 *   回合初尚在阈值上(prevHp>=maxHP/5,即刚跨入)→ rgwDyingSound。判完把 prevHp 快照为当前 hp 供下回合。
 *
 * **阵亡音仅敌攻致死播,毒杀不播**(2026-06-03 音效审计确认:sdlpal rgwDeathSound 只在 3 个 enemy
 *   攻击分支内联 fight.c:4816/4851/5110,毒 tick 1657-1700 / PostActionCheck 都不播玩家 deathSound)。
 *   ts 集中 sweep 在毒 tick **后**跑,无法区分死因 → 传 prePoisonHp(毒 tick 前 hp):仅 prePoisonHp===0
 *   (本回合死于动作/敌攻,在毒前已死)才播 deathSound;毒杀(毒前 hp>0,毒后→0)不播。
 *   濒死音 dyingSound 不门控死因(sdlpal PostActionCheck 在毒后也调 fight.c:1664,毒致濒死同样播)。
 *
 * sdlpal 死亡音内联在 enemy 攻击(即时)、濒死音在 PostActionCheck;ts 集中此一处近似(死亡音时序差
 * 不超过一回合,音色 + 死因门控正确)。玩家 prevHp 此前未维护(只敌方用),由本函数建立回合粒度快照。
 * 声经 bus {op:'playSound'} 发 → bootstrap 战斗 drain 播(>0 守卫;0 = 无音,跳过)。
 */
export function emitPlayerCasualtySounds(
  players: ReadonlyArray<{ roleId: number; prevHp: number }>,
  playerRoles: PlayerRoles,
  bus: CommandBus,
  /** 毒 tick 前各 roleId 的 hp(tickPostAction 起手快照)。仅 prePoisonHp===0(敌攻致死)才播 deathSound;
   *  省略 → 退化为旧行为(任何致死都播,向后兼容旧测试)。 */
  prePoisonHp?: ReadonlyMap<number, number>,
): void {
  for (const p of players) {
    const role = playerRoles.roles[p.roleId]
    if (!role) continue
    const dyingThreshold = Math.max(1, Math.floor(role.maxHP / 5))
    const deathSound = role.deathSound ?? 0
    const dyingSound = role.dyingSound ?? 0
    if (role.hp < p.prevHp) {
      if (role.hp === 0 && p.prevHp > 0) {
        // 死于敌攻(毒前已死,prePoisonHp===0)才播阵亡音;毒杀不播。无 prePoisonHp 入参 → 旧行为。
        const diedFromAttack = prePoisonHp === undefined || (prePoisonHp.get(p.roleId) ?? 0) === 0
        if (deathSound > 0 && diedFromAttack) bus.emit({ op: 'playSound', soundId: deathSound })
      } else if (role.hp > 0 && role.hp < dyingThreshold && p.prevHp >= dyingThreshold) {
        if (dyingSound > 0) bus.emit({ op: 'playSound', soundId: dyingSound })
      }
    }
    p.prevHp = role.hp
  }
}

function findObjectPlayer(res: BattleResources, objectId: number): ObjectPlayerView | undefined {
  return res.objectPlayers[objectId] ?? res.objectPlayers.find((p) => p.id === objectId)
}

function backupPlayerCasualtyHp(state: BattleState, res: BattleResources): void {
  state.players.forEach((player) => {
    const role = res.playerRoles.roles[player.roleId]
    if (role) player.scriptPrevHp = role.hp
  })
}

function runPlayerCasualtyScript(
  entry: number,
  roleId: number,
  state: BattleState,
  gs: GameState,
  bus: CommandBus,
  res: BattleResources,
): number {
  const playerIdx = state.players.findIndex((p) => p.roleId === roleId)
  const runScript = getRunScript(gs)
  return runScript({
    commands: res.commands,
    ip: entry,
    bus,
    runtimeMode: 'battle',
    eventObjectId: roleId,
    battleCtx: {
      state,
      target: playerIdx >= 0 ? { type: 'player', idx: playerIdx } : undefined,
      caster: playerIdx >= 0 ? { type: 'player', idx: playerIdx } : undefined,
      gs,
      playerRoles: res.playerRoles,
      objectPoisons: res.objectPoisons,
      magicTables: { magics: res.magics, objectMagics: res.objectMagics },
      battleEffectIndex: res.battleEffectIndex,
      summonTables: { enemies: res.enemies, enemyObjects: res.enemyObjects },
      items: res.items,
      commands: res.commands,
      runScript,
    },
  })
}

function playerBadForCasualtyScript(p: BattlePlayer | undefined): boolean {
  const st = p?.status
  return !st || (st.sleep ?? 0) > 0 || (st.paralyzed ?? 0) > 0 || (st.confused ?? 0) > 0
}

/**
 * port sdlpal `PAL_BattlePostActionCheck` player casualty script sweep(fight.c:775-885).
 *
 * 触发顺序忠实:
 * 1. 队友死亡 → 取死者 `coveredBy` 的健康守护者,跑守护者 OBJECT_PLAYER.wScriptOnFriendDeath。
 * 2. 自己刚跌入濒死 → 守护者在队且健康时,跑自己的 OBJECT_PLAYER.wScriptOnDying。
 *
 * 命中任一脚本后立刻暂停本轮推进,让可能入队的 battle dialog / 0x30 临时 buff 先生效。
 */
function runPlayerCasualtyScripts(
  state: BattleState,
  gs: GameState,
  bus: CommandBus,
  res: BattleResources,
  fCheckPlayers: boolean,
): boolean {
  if (!fCheckPlayers || gs.fAutoBattle) return false

  for (const player of state.players) {
    const role = res.playerRoles.roles[player.roleId]
    const prevHp = player.scriptPrevHp ?? player.prevHp
    if (!role || !(role.hp < prevHp && role.hp === 0)) continue
    const coverRoleId = role.coveredBy ?? 0
    const coverIdx = state.players.findIndex((p) => p.roleId === coverRoleId)
    const coverRole = res.playerRoles.roles[coverRoleId]
    const coverPlayer = coverIdx >= 0 ? state.players[coverIdx] : undefined
    if (!coverRole || coverRole.hp <= 0 || coverIdx < 0 || playerBadForCasualtyScript(coverPlayer)) continue
    const objectPlayer = findObjectPlayer(res, coverRole.name)
    const entry = objectPlayer?.scriptOnFriendDeath ?? 0
    if (objectPlayer && entry > 0) {
      objectPlayer.scriptOnFriendDeath = runPlayerCasualtyScript(entry, coverRoleId, state, gs, bus, res)
      return true
    }
  }

  for (const player of state.players) {
    const role = res.playerRoles.roles[player.roleId]
    const prevHp = player.scriptPrevHp ?? player.prevHp
    if (!role || player.status.sleep > 0 || player.status.confused > 0) continue
    const threshold = Math.max(1, Math.floor(role.maxHP / 5))
    if (!(role.hp < prevHp && role.hp > 0 && isPlayerDying(role) && prevHp >= threshold)) continue
    const coverRoleId = role.coveredBy ?? 0
    const coverIdx = state.players.findIndex((p) => p.roleId === coverRoleId)
    const coverRole = res.playerRoles.roles[coverRoleId]
    const coverPlayer = coverIdx >= 0 ? state.players[coverIdx] : undefined
    if (!coverRole || coverRole.hp <= 0 || coverIdx < 0 || playerBadForCasualtyScript(coverPlayer)) continue
    const objectPlayer = findObjectPlayer(res, role.name)
    const entry = objectPlayer?.scriptOnDying ?? 0
    if (objectPlayer && entry > 0) {
      objectPlayer.scriptOnDying = runPlayerCasualtyScript(entry, player.roleId, state, gs, bus, res)
    }
    return true
  }

  return false
}

function shouldCheckPlayerCasualties(actor: ActionQueueItem, action: BattleAction | undefined): boolean {
  if (!actor.isEnemy || !action) return false
  switch (action.type) {
    case 'attack':
      return true
    case 'magic':
    case 'item':
    case 'throw-item':
      return (action.targetSide ?? 'player') === 'player'
    default:
      return false
  }
}

/** port sdlpal `PAL_IsPlayerHealthy`(fight.c:69-76):非濒死 + 无 sleep/confused/silence/paralyzed/puppet。 */
function isPlayerHealthy(player: BattlePlayer, role: { hp: number; maxHP: number }): boolean {
  if (role.hp <= 0 || isPlayerDying(role)) return false
  const st = player.status
  return (st.sleep ?? 0) === 0 && (st.confused ?? 0) === 0 && (st.silence ?? 0) === 0 &&
    (st.paralyzed ?? 0) === 0 && (st.puppet ?? 0) === 0
}

/**
 * port sdlpal `PAL_BattleUIIsActionValid`(uibattle.c:271-341,PAL_CLASSIC 分支):
 *   0攻击/3杂项 → 恒 valid;1法术 → 非 silence;2合击 → 本人 healthy 且 healthy 人数 > 1。
 */
function isActionValid(state: BattleState, action: number, playerRoles: PlayerRoles): boolean {
  const playerIdx = state.selectingPlayerIdx
  if (playerIdx === undefined) return false
  const player = state.players[playerIdx]
  const role = player ? playerRoles.roles[player.roleId] : undefined
  if (!player || !role) return false
  switch (action) {
    case 0:
    case 3:
      return true
    case 1: // magic — silence 时不可
      return (player.status.silence ?? 0) === 0
    case 2: { // coopmagic(CLASSIC):本人 healthy 且 healthy 人数 > 1
      if (state.players.length <= 1) return false // wMaxPartyMemberIndex==0
      let healthy = 0
      state.players.forEach((p) => {
        const r = playerRoles.roles[p.roleId]
        if (r && isPlayerHealthy(p, r)) healthy++
      })
      return isPlayerHealthy(player, role) && healthy > 1
    }
    default:
      return true
  }
}

/** 当前队员已学法术 id 列表 —— runtime role.magic SoA 优先,空则 dev panel learnedSpells。 */
function getLearnedSpells(role: PlayerRole): number[] {
  const fromMagic = ((role as unknown as { magic?: number[] }).magic ?? []).filter((x) => x !== 0)
  if (fromMagic.length > 0) return fromMagic
  return (role as unknown as { learnedSpells?: number[] }).learnedSpells ?? []
}

/**
 * port sdlpal `PAL_BattleUIPickAutoMagic`(uibattle.c:721-782):Force/auto 挑威力最大的可用法术。
 * 跳过:silence(返回 0=物理)/ costMP==1(极限技)/ costMP>当前MP / baseDamage<=0。返回 spell object id,0=物理。
 */
function pickAutoMagic(
  state: BattleState, playerRoles: PlayerRoles, spells: Spell[], magics: Magic[], range: number,
  objectMagics: ObjectMagicView[] = [],
): number {
  const playerIdx = state.selectingPlayerIdx
  if (playerIdx === undefined) return 0
  const player = state.players[playerIdx]
  const role = player ? playerRoles.roles[player.roleId] : undefined
  if (!player || !role) return 0
  if ((player.status.silence ?? 0) !== 0) return 0
  let best = 0
  let maxPower = 0
  for (const sid of getLearnedSpells(role)) {
    const resolved = resolveMagicObject(sid, spells, magics, objectMagics)
    if (!resolved) continue
    const magic = resolved.magic
    if (magic.costMP === 1 || magic.costMP > role.mp || magic.baseDamage <= 0) continue
    const power = magic.baseDamage + state.rng.rangeInclusive(0, range)
    if (power > maxPower) {
      maxPower = power
      best = sid
    }
  }
  return best
}

// ── 选择网格 state builders(复用 createSelectionMenu;灰项忠实 sdlpal Init)───
/**
 * 建战斗法术选择网格 state —— port sdlpal `PAL_MagicSelectionMenuInit`(magicmenu.c:301-410):
 *   列已学全部法术;enabled = MP 足够 **且** usableInBattle(magicmenu.c:347-368);按 object id 排序。
 *   灰项(disabled)光标可停但不可确认。
 */
function buildBattleMagicSelect(
  state: BattleState, playerRoles: PlayerRoles, spells: Spell[], magics: Magic[],
  objectMagics: ObjectMagicView[] = [],
  itemTable: Item[] = [],
): SelectionMenuState {
  const pageSize = MAGIC_GRID_COLS * MAGIC_GRID_ROWS
  const playerIdx = state.selectingPlayerIdx
  const role = playerIdx !== undefined ? playerRoles.roles[state.players[playerIdx]!.roleId] : undefined
  if (!role) return createSelectionMenu([], pageSize)
  const currentMp = role.mp
  const menuItems = getLearnedSpells(role)
    .map((spellId) => {
      const resolved = resolveMagicObject(spellId, spells, magics, objectMagics)
      if (!resolved) return null
      const { spell, magic } = resolved
      const mpCost = magic.costMP ?? 0
      const disabled = currentMp < mpCost || !spell.flags.usableInBattle
      const label = spell._name ?? itemTable.find((item) => item.id === spellId)?._name ?? `magic#${spellId}`
      return { id: spellId, label, rightText: `MP ${mpCost}`, disabled }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.id - b.id) // sdlpal magicmenu.c:377-397 冒泡按 wMagic(object id)排序
  return createSelectionMenu(menuItems, pageSize)
}

/**
 * 建战斗物品选择网格 state —— port sdlpal `PAL_ItemSelectMenuUpdate`(itemmenu.c):
 *   列**全部**库存(count>0,= CompressInventory 后);灰项 = flag 不符(usable / throwable);
 *   count - nAmountInUse <= 0 也灰掉(本回合已被前面队员预占);
 *   战斗内不加可用装备(itemmenu.c:355 `!gpGlobals->fInBattle`)。光标可停灰项但不可确认。
 */
function buildBattleItemSelect(
  state: BattleState, gs: GameState, items: Item[], flag: 'usable' | 'throwable',
): SelectionMenuState {
  const inUse = new Map<number, number>()
  state.pendingActions.forEach((action) => {
    if ((action.type === 'item' || action.type === 'throw-item') && action.actionId !== undefined) {
      inUse.set(action.actionId, (inUse.get(action.actionId) ?? 0) + 1)
    }
  })
  const menuItems = gs.inventory
    .filter((e) => e.count > 0)
    .map((e) => {
      const item = items.find((i) => i.id === e.itemId)
      const matches = flag === 'usable' ? !!item?.flags.usable : !!item?.flags.throwable
      const amountInUse = inUse.get(e.itemId) ?? 0
      return {
        id: e.itemId,
        label: item?._name ?? `item#${e.itemId}`,
        rightText: `×${e.count - amountInUse}`,
        disabled: !matches || e.count - amountInUse <= 0,
      }
    })
  return createSelectionMenu(menuItems, ITEM_GRID_COLS * ITEM_GRID_ROWS)
}

/**
 * 网格光标导航 —— port sdlpal magicmenu.c:67-116 / itemmenu.c:63-112:
 *   Up/Down ±列数;Left/Right ±1;PgUp/PgDn ±(列×行);Home→0;End→末;**钳 [0,n-1] 不 wrap、不跳灰项**。
 * @returns true = 按了 Menu/Cancel(取消)
 */
function gridNavigate(menu: SelectionMenuState, input: InputSnapshot, cols: number, rows: number): boolean {
  if (input.pressed.has('Menu') || input.pressed.has('Cancel')) return true
  let delta = 0
  if (input.pressed.has('Up')) delta = -cols
  else if (input.pressed.has('Down')) delta = cols
  else if (input.pressed.has('Left')) delta = -1
  else if (input.pressed.has('Right')) delta = 1
  else if (input.pressed.has('PgUp')) delta = -(cols * rows)
  else if (input.pressed.has('PgDn')) delta = cols * rows
  else if (input.pressed.has('Home')) delta = -menu.cursor
  else if (input.pressed.has('End')) delta = menu.items.length - menu.cursor - 1
  const next = menu.cursor + delta
  if (next < 0) menu.cursor = 0
  else if (next >= menu.items.length) menu.cursor = Math.max(0, menu.items.length - 1)
  else menu.cursor = next
  return false
}

// ── 输入派发(BATTLEUISTATE × BATTLEMENUSTATE)──────────────────────────────
function dispatchSelectInput(
  state: BattleState, input: InputSnapshot, gs: GameState, res: BattleResources, alivePlayerIdxs: number[],
): void {
  switch (state.uiState) {
    case 'selectMove':
      switch (state.menuState) {
        case 'main':
          handleMainMenuInput(state, input, alivePlayerIdxs, gs, res)
          break
        case 'magicSelect':
          handleMagicSelectInput(state, input, res)
          break
        case 'useItemSelect':
        case 'throwItemSelect':
          handleItemSelectInput(state, input, res)
          break
        case 'misc':
          handleMiscMenuInput(state, input, alivePlayerIdxs, gs, res)
          break
        case 'miscItemSubMenu':
          handleMiscItemSubMenuInput(state, input, gs, res)
          break
      }
      break
    case 'selectTargetEnemy':
      handleEnemyTargetSelect(state, input, alivePlayerIdxs)
      break
    case 'selectTargetPlayer':
      handlePlayerTargetSelect(state, input, alivePlayerIdxs)
      break
    case 'selectTargetEnemyAll':
    case 'selectTargetPlayerAll':
      // CLASSIC 不让选,即时 commit target=-1(uibattle.c:1611-1707)
      commitDraftAsAction(state, -1, alivePlayerIdxs)
      break
    default:
      break // wait / hidden
  }
}

// ── 主菜单(4 图标方向选 + 快捷键)─────────────────────────────────────────
/**
 * port sdlpal `PAL_BattleUIUpdate` kBattleMenuMain(uibattle.c:1027-1302,PAL_CLASSIC):
 *   方向选图标 North→0攻击 / South→3杂项 / West→1法术(valid)/ East→2合击(valid);
 *   当前 selectedAction 失效 → reset 0(uibattle.c:1058-1061);Confirm 派发;快捷键见下。
 */
function handleMainMenuInput(
  state: BattleState, input: InputSnapshot, alivePlayerIdxs: number[], gs: GameState, res: BattleResources,
): void {
  const playerIdx = state.selectingPlayerIdx
  if (playerIdx === undefined) return
  const playerRoles = res.playerRoles

  // 方向选图标(uibattle.c:1034-1055)
  if (input.pressed.has('Up')) state.selectedAction = 0
  else if (input.pressed.has('Down')) state.selectedAction = 3
  else if (input.pressed.has('Left')) {
    if (isActionValid(state, 1, playerRoles)) state.selectedAction = 1
  } else if (input.pressed.has('Right')) {
    if (isActionValid(state, 2, playerRoles)) state.selectedAction = 2
  }
  // 当前选中失效 → 回攻击(uibattle.c:1058-1061)
  if (!isActionValid(state, state.selectedAction, playerRoles)) state.selectedAction = 0

  // Confirm(kKeySearch)→ 按 selectedAction 派发(uibattle.c:1085-1164)
  if (input.pressed.has('Confirm')) {
    confirmMainAction(state, res)
    return
  }

  // 快捷键(uibattle.c:1166-1302;WASD 已还原 sdlpal 原义,见 shell/input.ts)
  if (input.pressed.has('Defend')) {
    commitSimpleAction(state, { type: 'defend', target: -1 }, alivePlayerIdxs)
  } else if (input.pressed.has('Force')) {
    commitForceAction(state, alivePlayerIdxs, res)
  } else if (input.pressed.has('Flee')) {
    commitFleeAllPlayers(state, alivePlayerIdxs)
  } else if (input.pressed.has('UseItem')) {
    state.menuState = 'useItemSelect'
    state.itemSelect = buildBattleItemSelect(state, gs, res.items, 'usable')
  } else if (input.pressed.has('ThrowItem')) {
    state.menuState = 'throwItemSelect'
    state.itemSelect = buildBattleItemSelect(state, gs, res.items, 'throwable')
  } else if (input.pressed.has('Repeat')) {
    commitRepeatAction(state, alivePlayerIdxs, playerRoles)
  } else if (input.pressed.has('Auto')) {
    state.fAutoAttack = true // 下 tick commitAutoAttack 接管(uibattle.c:882-886 / 977-992)
  } else if (input.pressed.has('Status')) {
    // sdlpal PAL_PlayerStatus(uibattle.c:930-934)— 战斗内开全屏状态屏(复用大世界 player-status 菜单)。
    openBattleStatusView(state, gs, res)
  } else if (input.pressed.has('Menu')) {
    revertToPreviousPlayer(state, alivePlayerIdxs)
  }
}

/** Confirm 主菜单图标 → 派发(uibattle.c:1085-1164,PAL_CLASSIC)。 */
function confirmMainAction(state: BattleState, res: BattleResources): void {
  const playerRoles = res.playerRoles
  const playerIdx = state.selectingPlayerIdx!
  switch (state.selectedAction) {
    case 0: { // 攻击(uibattle.c:1089-1105):群攻武器 → EnemyAll;否则 Enemy(光标从首活敌)
      const role = playerRoles.roles[state.players[playerIdx]!.roleId]
      state.pendingActionDraft = { type: 'attack', targetSide: 'enemy' }
      if ((role?.attackAll ?? 0) !== 0) {
        state.uiState = 'selectTargetEnemyAll'
      } else {
        state.uiState = 'selectTargetEnemy'
        state.uiCursor = 0
      }
      break
    }
    case 1: // 法术(uibattle.c:1107-1113)→ magicSelect 网格
      state.menuState = 'magicSelect'
      state.magicSelect = buildBattleMagicSelect(state, playerRoles, res.spells, res.magics, res.objectMagics, res.items)
      break
    case 2: { // 合击(uibattle.c:1115-1155)— 选择按真值,执行仍 stub(B-w3.a)
      const role = playerRoles.roles[state.players[playerIdx]!.roleId]
      const coopId = (role as unknown as { cooperativeMagic?: number }).cooperativeMagic ?? 0
      const spell = res.spells.find((s) => s.id === coopId)
      const toEnemy = spell?.flags.usableToEnemy ?? true
      const applyToAll = spell?.flags.applyToAll ?? false
      enterTargetForDraft(state, { type: 'coop-magic', actionId: coopId }, toEnemy, applyToAll)
      break
    }
    case 3: // 杂项(uibattle.c:1157-1163)→ 杂项盒
      state.menuState = 'misc'
      break
  }
}

/**
 * Force(F 键):pickAutoMagic → 物理/法术自动 commit(uibattle.c:1171-1204)。
 * threshold:pickAutoMagic 选法术的 MP 阈值 —— Force 键 60(uibattle.c:1173);
 *   fAutoBattle(0x8A 整场自动)9999(uibattle.c:854,几乎必选可用法术)。
 */
function commitForceAction(state: BattleState, alivePlayerIdxs: number[], res: BattleResources, threshold = 60): void {
  const playerIdx = state.selectingPlayerIdx
  if (playerIdx === undefined) return
  const w = pickAutoMagic(state, res.playerRoles, res.spells, res.magics, threshold, res.objectMagics)
  if (w === 0) {
    commitAutoAttack(state, res.playerRoles, alivePlayerIdxs)
    return
  }
  const spell = res.spells.find((s) => s.id === w)
  const applyToAll = spell?.flags.applyToAll ?? false
  const toEnemy = spell?.flags.usableToEnemy ?? true
  const target = applyToAll
    ? -1
    : toEnemy
      ? selectAutoTargetFrom(state.enemies, 0, state.iPrevEnemyTarget ?? -1)
      : playerIdx
  state.pendingActions.set(playerIdx, { type: 'magic', actionId: w, target, targetSide: toEnemy ? 'enemy' : 'player' })
  advanceSelectingPlayer(state, alivePlayerIdxs)
}

/** Repeat(R 键)= 重提上一轮 action(sdlpal kKeyRepeat → CommitAction(TRUE),uibattle.c:1220-1223)。 */
function commitRepeatAction(state: BattleState, alivePlayerIdxs: number[], playerRoles: PlayerRoles): void {
  const playerIdx = state.selectingPlayerIdx
  if (playerIdx === undefined) return
  const prev = state.prevActions?.get(playerIdx)
  // sdlpal CommitAction(TRUE)(fight.c:1858-1867):prevAction 复制后,若是 pass(上轮睡/被控)
  //   → 转物理攻击 id0 target=-1(全体)。无 prev(首轮)同此默认 pass→attack。
  if (prev && prev.type !== 'pass') {
    // 原样重提;敌方目标若已死,perform 期 selectAutoTargetFrom 重选(本系统已有)。
    state.pendingActions.set(playerIdx, { ...prev })
    // R 重提 coop 同样是整队一回合一次 → 其余 healthy 队员被消耗 pass(同 commitDraftAsAction)。
    if (prev.type === 'coop-magic') applyCoopConsumesOthers(state, playerIdx, alivePlayerIdxs)
    advanceSelectingPlayer(state, alivePlayerIdxs)
    return
  }
  // pass / 无 prev → 物理攻击;群攻武器 target=-1,否则自动目标(对齐 commitAutoAttack)。
  const role = playerRoles.roles[state.players[playerIdx]!.roleId]
  const target = (role?.attackAll ?? 0) !== 0
    ? -1
    : selectAutoTargetFrom(state.enemies, 0, state.iPrevEnemyTarget ?? -1)
  state.pendingActions.set(playerIdx, { type: 'attack', target, targetSide: 'enemy' })
  advanceSelectingPlayer(state, alivePlayerIdxs)
}

/**
 * fAutoAttack / Force 物理:自动 commit 攻击(自动目标)。port sdlpal uibattle.c:977-992 / 1171-1187。
 *   群攻武器(canAttackAll)→ target=-1(全体);否则 selectAutoTargetFrom 选首个活敌。
 */
function commitAutoAttack(
  state: BattleState, playerRoles: PlayerRoles, alivePlayerIdxs: number[],
): void {
  const playerIdx = state.selectingPlayerIdx
  if (playerIdx === undefined) return
  const role = playerRoles.roles[state.players[playerIdx]!.roleId]
  const target = (role?.attackAll ?? 0) !== 0
    ? -1
    : selectAutoTargetFrom(state.enemies, 0, state.iPrevEnemyTarget ?? -1)
  state.pendingActions.set(playerIdx, { type: 'attack', target, targetSide: 'enemy' })
  advanceSelectingPlayer(state, alivePlayerIdxs)
}

// ── 杂项盒(围攻/道具/防御/逃跑/状态)──────────────────────────────────────
/**
 * port sdlpal `PAL_BattleUIMiscMenuUpdate`(uibattle.c:416-468)+ 结果派发(uibattle.c:1359-1404,CLASSIC):
 *   Up|Left → -- wrap5;Down|Right → ++ wrap5;Confirm → idx+1 派发;Menu → 回 Main。cursor 持久(g_iCurMiscMenuItem)。
 *   派发:0围攻→fAutoAttack / 1道具→物品二级 / 2防御→commit / 3逃跑→全队逃 / 4状态→开状态屏。
 */
function handleMiscMenuInput(
  state: BattleState, input: InputSnapshot, alivePlayerIdxs: number[], gs: GameState, res: BattleResources,
): void {
  if (input.pressed.has('Up') || input.pressed.has('Left')) {
    state.miscMenuCursor = (state.miscMenuCursor - 1 + MISC_MENU_SIZE) % MISC_MENU_SIZE
    return
  }
  if (input.pressed.has('Down') || input.pressed.has('Right')) {
    state.miscMenuCursor = (state.miscMenuCursor + 1) % MISC_MENU_SIZE
    return
  }
  if (input.pressed.has('Menu') || input.pressed.has('Cancel')) {
    state.menuState = 'main' // 取消 → Main(uibattle.c:1364 平取消层级)
    return
  }
  if (!input.pressed.has('Confirm')) return
  // sdlpal uibattle.c:1364 先置 Main,再按 w(=cursor+1)派发
  state.menuState = 'main'
  switch (state.miscMenuCursor) {
    case 0: // 围攻(auto)→ fAutoAttack(下 tick commitAutoAttack 接管,uibattle.c:1387-1392)
      state.fAutoAttack = true
      break
    case 1: // 道具 → 物品二级(uibattle.c:1369-1375)
      state.menuState = 'miscItemSubMenu'
      break
    case 2: // 防御(uibattle.c:1378-1384)
      commitSimpleAction(state, { type: 'defend', target: -1 }, alivePlayerIdxs)
      break
    case 3: // 逃跑(uibattle.c:1394-1397)—— sdlpal fFlee 全队逃(fight.c:1773-1799/1976-1978)
      commitFleeAllPlayers(state, alivePlayerIdxs)
      break
    case 4: // 状态(uibattle.c:1399-1401)→ PAL_PlayerStatus 全屏屏(复用大世界 player-status 菜单)
      openBattleStatusView(state, gs, res)
      break
  }
}

/**
 * 物品二级(使用/投掷)—— port sdlpal `PAL_BattleUIMiscItemSubMenuUpdate`(uibattle.c:471-545)
 * + 结果(uibattle.c:1406-1426)。Up|Left→0使用 / Down|Right→1投掷;Confirm 进对应 select;Menu→Main。cursor 持久。
 */
function handleMiscItemSubMenuInput(
  state: BattleState, input: InputSnapshot, gs: GameState, res: BattleResources,
): void {
  if (input.pressed.has('Up') || input.pressed.has('Left')) {
    state.miscSubMenuCursor = 0
    return
  }
  if (input.pressed.has('Down') || input.pressed.has('Right')) {
    state.miscSubMenuCursor = 1
    return
  }
  if (input.pressed.has('Menu') || input.pressed.has('Cancel')) {
    state.menuState = 'main' // 取消 → Main(uibattle.c:1411)
    return
  }
  if (!input.pressed.has('Confirm')) return
  state.menuState = 'main' // sdlpal uibattle.c:1411 先置 Main
  if (state.miscSubMenuCursor === 0) {
    state.menuState = 'useItemSelect'
    state.itemSelect = buildBattleItemSelect(state, gs, res.items, 'usable')
  } else {
    state.menuState = 'throwItemSelect'
    state.itemSelect = buildBattleItemSelect(state, gs, res.items, 'throwable')
  }
}

// ── 法术 / 物品选择网格 ─────────────────────────────────────────────────────
/**
 * 法术选择网格 —— port sdlpal `PAL_MagicSelectionMenuUpdate`(magicmenu.c:35-299)+ 战斗结果
 * (uibattle.c:1305-1348)。网格导航(clamp,不跳灰项);Confirm 仅 enabled 可确认 → 据 flags 选目标;Menu→Main。
 */
function handleMagicSelectInput(
  state: BattleState, input: InputSnapshot, res: BattleResources,
): void {
  const menu = state.magicSelect
  if (!menu) {
    state.menuState = 'main'
    return
  }
  if (input.pressed.has('Confirm')) {
    const sel = menu.items[menu.cursor]
    if (sel && !sel.disabled) {
      const resolved = resolveMagicObject(sel.id, res.spells, res.magics, res.objectMagics)
      const toEnemy = resolved?.spell.flags.usableToEnemy ?? true
      const applyToAll = resolved?.spell.flags.applyToAll ?? false
      state.menuState = 'main'
      state.magicSelect = undefined
      enterTargetForDraft(state, { type: 'magic', actionId: sel.id }, toEnemy, applyToAll)
    }
    return
  }
  if (gridNavigate(menu, input, MAGIC_GRID_COLS, MAGIC_GRID_ROWS)) {
    state.menuState = 'main' // Menu 取消 → Main(uibattle.c:1310 平取消)
    state.magicSelect = undefined
  }
}

/**
 * 物品选择网格 —— port sdlpal `PAL_ItemSelectMenuUpdate`(itemmenu.c)+ 战斗结果
 * (PAL_BattleUIUseItem/ThrowItem,uibattle.c:623-719)。useItemSelect→队友目标 / throwItemSelect→敌方目标。
 */
function handleItemSelectInput(
  state: BattleState, input: InputSnapshot, res: BattleResources,
): void {
  const menu = state.itemSelect
  if (!menu) {
    state.menuState = 'main'
    return
  }
  const isThrow = state.menuState === 'throwItemSelect'
  if (input.pressed.has('Confirm')) {
    const sel = menu.items[menu.cursor]
    if (sel && !sel.disabled) {
      const item = res.items.find((i) => i.id === sel.id)
      const applyToAll = !!item?.flags.applyToAll
      state.menuState = 'main'
      state.itemSelect = undefined
      enterTargetForDraft(
        state,
        { type: isThrow ? 'throw-item' : 'item', actionId: sel.id },
        isThrow, applyToAll,
      )
    }
    return
  }
  if (gridNavigate(menu, input, ITEM_GRID_COLS, ITEM_GRID_ROWS)) {
    state.menuState = 'main'
    state.itemSelect = undefined
  }
}

// ── target 路由 / commit helpers ────────────────────────────────────────────
/**
 * 据 action 的目标语义设置 target 状态:applyToAll → All 状态(CLASSIC 即时 commit);否则单选状态。
 *   toEnemy → Enemy / EnemyAll;否则 Player / PlayerAll(uibattle.c:1317-1346 / 653-718)。
 */
function enterTargetForDraft(
  state: BattleState,
  draft: NonNullable<BattleState['pendingActionDraft']>,
  toEnemy: boolean,
  applyToAll: boolean,
): void {
  draft.targetSide = toEnemy ? 'enemy' : 'player'
  state.pendingActionDraft = draft
  if (applyToAll) {
    state.uiState = toEnemy ? 'selectTargetEnemyAll' : 'selectTargetPlayerAll'
  } else {
    state.uiState = toEnemy ? 'selectTargetEnemy' : 'selectTargetPlayer'
    state.uiCursor = 0
  }
}

/**
 * 逃跑全队 —— sdlpal fFlee(fight.c:1976-1978 设 fFlee=TRUE,1797-1799 后续强制全队 kKeyFlee)。
 * 一人选逃跑 → 全体活队员 action 都置 flee(行动队列按 dex 排序逐个 PAL_BattlePlayerEscape,
 * 首个 roll 成功即 phase='fleed' 全队逃离;全失败则各自空过该回合)。
 */
function commitFleeAllPlayers(state: BattleState, alivePlayerIdxs: number[]): void {
  for (const i of alivePlayerIdxs) {
    state.pendingActions.set(i, { type: 'flee', target: -1 })
  }
  // 全填完 → 清选择子状态 + uiState='wait'(主流程 size 检测切 performAction)。
  state.pendingActionDraft = undefined
  state.magicSelect = undefined
  state.itemSelect = undefined
  state.uiState = 'wait'
}

/**
 * 战斗内打开状态查看屏(sdlpal uigame/uibattle PAL_PlayerStatus,杂项菜单"状态" uibattle.c:1399-1401
 * + 主菜单 Status 键 uibattle.c:930-934)。复用大世界 player-status 菜单(openMenu → mode='menu' +
 * menuStack;battleState 保留)。关闭后 menu-mode.resumeAfterMenusClosed 检 gs.battleState → 回 mode='battle'
 * 续选动作。先回写战斗 HP/MP → runtime,让状态屏显示**当前**血量(非战前快照;battle 仍用 res.playerRoles 不受影响)。
 */
function openBattleStatusView(state: BattleState, gs: GameState, res: BattleResources): void {
  void state
  writeBackBattleRolesToRuntime(res.playerRoles, gs.PlayerRolesRuntime, gs.partyMembers)
  openMenu(gs, { kind: 'player-status', state: createPlayerStatus(gs.partyMembers) })
}

/** 落一个完整 action(无 target 选择路径:防御/逃跑)+ advance。 */
function commitSimpleAction(state: BattleState, action: BattleAction, alivePlayerIdxs: number[]): void {
  const playerIdx = state.selectingPlayerIdx
  if (playerIdx === undefined) return
  state.pendingActions.set(playerIdx, action)
  advanceSelectingPlayer(state, alivePlayerIdxs)
}

/** 把当前 pendingActionDraft 以给定 target 落 pendingActions + advance(target=-1 即全体)。 */
function commitDraftAsAction(state: BattleState, target: number, alivePlayerIdxs: number[]): void {
  const playerIdx = state.selectingPlayerIdx
  const draft = state.pendingActionDraft
  if (playerIdx === undefined || !draft) return
  state.pendingActions.set(playerIdx, {
    type: draft.type,
    actionId: draft.actionId,
    target,
    targetSide: draft.targetSide,
  })
  if (draft.type === 'coop-magic') applyCoopConsumesOthers(state, playerIdx, alivePlayerIdxs)
  advanceSelectingPlayer(state, alivePlayerIdxs)
}

/**
 * 合击是**整队一回合一次**的动作(sdlpal fight.c:1417-1424:选 coop 即结束选择,其余未选队员不再选;
 *   3973:coop 把全 healthy contributor 设 kFighterWait → 行动队列里被跳过)。ts 净效果:整回合就这一次
 *   coop,其余 healthy 队员(= coop contributor)不单独行动 → 设 pass。失能(睡眠/混乱/麻痹)队员非
 *   contributor(coop 不消耗),保留其 autoFill action(如混乱→attackmate);若尚未填则补 pass 保证回合收尾。
 */
function applyCoopConsumesOthers(state: BattleState, casterIdx: number, alivePlayerIdxs: number[]): void {
  for (const i of alivePlayerIdxs) {
    if (i === casterIdx) continue
    const st = state.players[i]!.status
    const incapacitated = (st.sleep ?? 0) > 0 || (st.confused ?? 0) > 0 || (st.paralyzed ?? 0) > 0
    if (!incapacitated || !state.pendingActions.has(i)) {
      state.pendingActions.set(i, { type: 'pass', target: -1 })
    }
  }
}

/**
 * B1/D8:对失能(睡眠/麻痹/混乱)活队员自动填占位 action(sdlpal fight.c:1505-1527 action
 * queue 填充段)—— 这些队员**不开动作菜单**(fight.c:1398-1404 selectAction skip)。
 * 占位用 `attack` actionId=0(sdlpal 1514/1524 同);perform 时按状态覆盖为 Pass / AttackMate
 * (见 tickPerformAction)。已有 pendingAction 的队员不动(防覆盖 UI 选好的 / 重入)。
 */
function autoFillIncapacitatedActions(state: BattleState, alivePlayerIdxs: number[]): void {
  for (const i of alivePlayerIdxs) {
    if (state.pendingActions.has(i)) continue
    const st = state.players[i]!.status
    if (st.sleep > 0 || st.paralyzed > 0 || st.confused > 0) {
      state.pendingActions.set(i, { type: 'attack', actionId: 0, target: 0 })
    }
  }
}

/**
 * advance 到下一个未填 action 的活队员(= sdlpal CommitAction 后 CheckReady+PlayerReady)。
 * 全填完 → uiState='wait'(主流程 size 检测切 performAction)。每次清 draft / select 网格。
 */
function advanceSelectingPlayer(state: BattleState, alivePlayerIdxs: number[]): void {
  state.pendingActionDraft = undefined
  state.magicSelect = undefined
  state.itemSelect = undefined
  const next = alivePlayerIdxs.find((i) => !state.pendingActions.has(i))
  if (next !== undefined) startPlayerSelection(state, next)
  else state.uiState = 'wait'
}

/**
 * 主菜单按 Menu → 回退上一队员重选(port sdlpal uibattle.c:1225-1272,PAL_CLASSIC)。
 *   首个队员(无上一个)→ 无操作(sdlpal 留在 Wait);否则撤销上一队员已 commit 的 action,选他重选。
 *   nAmountInUse 由 pendingActions 动态计算;撤销上一 action 后下次建物品表自然释放预占。
 */
function revertToPreviousPlayer(state: BattleState, alivePlayerIdxs: number[]): void {
  const cur = state.selectingPlayerIdx
  if (cur === undefined) return
  const pos = alivePlayerIdxs.indexOf(cur)
  if (pos <= 0) return // 首个队员,无上一个可回退
  const prevIdx = alivePlayerIdxs[pos - 1]!
  state.pendingActions.delete(prevIdx)
  startPlayerSelection(state, prevIdx)
}

// ── 敌方 / 友方 target picker ────────────────────────────────────────────────
/**
 * 敌方单目标选择 —— port sdlpal kBattleUISelectTargetEnemy(uibattle.c:1431-1543,PAL_CLASSIC)。
 *   无活敌(x==-1)→ 回 selectMove;仅 1 活敌(y==1)→ 跳过选择即时 commit(uibattle.c:1459-1475);
 *   Left|Down 前 / Right|Up 后 跳过死敌环绕;Confirm → commit;Menu → 回 selectMove。
 *   iPrevEnemyTarget 在本 CLASSIC build 是死代码(写入注释掉 + iSelectedIndex=0 覆盖)→ 光标恒从首活敌起;
 *   ts 仍在 Confirm 记 iPrevEnemyTarget 供 perform 期 selectAutoTargetFrom 重选(既有功能)。
 */
function handleEnemyTargetSelect(state: BattleState, input: InputSnapshot, alivePlayerIdxs: number[]): void {
  const aliveRawIdxs: number[] = []
  state.enemies.forEach((e, i) => {
    if (e.e.health > 0) aliveRawIdxs.push(i)
  })
  if (aliveRawIdxs.length === 0) {
    state.uiState = 'selectMove' // x==-1(uibattle.c:1444-1448)
    state.menuState = 'main'
    return
  }
  // 仅 1 活敌 → CLASSIC 跳过选择即时 commit(uibattle.c:1459-1475)
  if (aliveRawIdxs.length === 1) {
    commitDraftAsAction(state, aliveRawIdxs[0]!, alivePlayerIdxs)
    return
  }
  // 光标钳到活敌(进入时 uiCursor=0 → 取首个活敌)
  if (!aliveRawIdxs.includes(state.uiCursor)) state.uiCursor = aliveRawIdxs[0]!

  if (input.pressed.has('Menu') || input.pressed.has('Cancel')) {
    state.uiState = 'selectMove'
    state.menuState = 'main'
    state.pendingActionDraft = undefined // 取消 target → 清半成品 draft(防陈旧目标残留)
    return
  }
  if (input.pressed.has('Confirm')) {
    state.iPrevEnemyTarget = state.uiCursor
    commitDraftAsAction(state, state.uiCursor, alivePlayerIdxs)
    return
  }
  // Left|Down → 前一个活敌;Right|Up → 后一个活敌(uibattle.c:1521-1542,环绕跳死敌)
  const pos = aliveRawIdxs.indexOf(state.uiCursor)
  if (input.pressed.has('Left') || input.pressed.has('Down')) {
    state.uiCursor = aliveRawIdxs[(pos - 1 + aliveRawIdxs.length) % aliveRawIdxs.length]!
  } else if (input.pressed.has('Right') || input.pressed.has('Up')) {
    state.uiCursor = aliveRawIdxs[(pos + 1) % aliveRawIdxs.length]!
  }
}

/**
 * 友方单目标选择 —— port sdlpal kBattleUISelectTargetPlayer(uibattle.c:1545-1609,PAL_CLASSIC)。
 *   单人队(wMaxPartyMemberIndex==0)→ 即时 commit idx 0;否则 Left|Down 减 / Right|Up 加 wrap;
 *   Confirm → commit;Menu → 回 selectMove。光标 = party index(不按 hp 过滤,复活类对死者有效)。
 */
function handlePlayerTargetSelect(state: BattleState, input: InputSnapshot, alivePlayerIdxs: number[]): void {
  const draft = state.pendingActionDraft
  if (!draft || state.selectingPlayerIdx === undefined) return
  if (input.pressed.has('Menu') || input.pressed.has('Cancel')) {
    state.uiState = 'selectMove'
    state.menuState = 'main'
    state.pendingActionDraft = undefined // 取消 target → 清半成品 draft(防陈旧目标残留)
    return
  }
  const maxIdx = state.players.length - 1 // = sdlpal wMaxPartyMemberIndex
  if (maxIdx < 0) return
  // 单人队 → 即时 commit idx 0(uibattle.c:1550-1554)
  if (maxIdx === 0) {
    commitDraftAsAction(state, 0, alivePlayerIdxs)
    return
  }
  if (state.uiCursor < 0 || state.uiCursor > maxIdx) state.uiCursor = 0
  if (input.pressed.has('Left') || input.pressed.has('Down')) {
    state.uiCursor = state.uiCursor === 0 ? maxIdx : state.uiCursor - 1
    return
  }
  if (input.pressed.has('Right') || input.pressed.has('Up')) {
    state.uiCursor = state.uiCursor >= maxIdx ? 0 : state.uiCursor + 1
    return
  }
  if (input.pressed.has('Confirm')) {
    commitDraftAsAction(state, state.uiCursor, alivePlayerIdxs)
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
/**
 * port sdlpal `PAL_BattleSelectAutoTargetFrom`(fight.c:86-128):自动挑一个**活**敌人 index。
 * 先用 prevTarget(UI 上次悬停目标,若活);否则从 begin 起循环找第一个活敌(环绕);全死 → -1。
 */
export function selectAutoTargetFrom(
  enemies: BattleState['enemies'],
  begin: number,
  prevTarget = -1,
): number {
  const n = enemies.length
  if (n === 0) return -1
  if (prevTarget >= 0 && prevTarget < n && (enemies[prevTarget]?.e.health ?? 0) > 0)
    return prevTarget
  let i = begin >= 0 ? begin % n : 0
  for (let count = 0; count < n; count++) {
    if ((enemies[i]?.e.health ?? 0) > 0) return i
    i = (i + 1) % n
  }
  return -1
}

/**
 * D17 死亡淡出 hold 步数 = sdlpal PAL_BattleFadeScene 72 步(battle.c:634-636)。
 */
const DEATH_FADE_STEPS = 72
/** 每个淡出步 16ms(battle.c:639 `time = SDL_GetTicks() + 16`)。 */
const DEATH_FADE_STEP_MS = 16

/**
 * port `PAL_BattlePostActionCheck` 死敌检测段(fight.c:740-764):每个 action 后扫敌人,
 * health<=0 且尚未开始淡出(deathFadeStep===undefined)的 → 标记开始淡出 + emit 死亡音效命令。
 * 本次有任何新死敌 → 开启 state.battleFade hold(忠实 sdlpal fFade → PAL_BattleFadeScene)。
 *
 * 注:exp/cash 累计仍在 tickPostAction(用 prevHp 判重)走真 schema,这里只管淡出 render state。
 *
 * @returns 本次是否开启了新淡出(true 时调用方应交给 fade 分支推进,不立即 currentActionIndex++)。
 */
function checkEnemyDeaths(state: BattleState, bus: CommandBus): boolean {
  let fade = false
  state.enemies.forEach((enemy, idx) => {
    if (enemy.e.health <= 0 && enemy.deathFadeStep === undefined) {
      enemy.deathFadeStep = 0 // 开始淡出(0..72,draw 走 crossfade)
      // sdlpal fight.c:756 AUDIO_PlaySound(wDeathSound):本层 emit 命令,present 播。
      bus.emit({ op: 'playEnemyDeath', enemyIdx: idx })
      fade = true
    }
  })
  if (fade && !state.battleFade) state.battleFade = { elapsedMs: 0 }
  return fade
}

/**
 * D17 死亡淡出 hold —— **phase-agnostic**(忠实 sdlpal PAL_BattleFadeScene fight.c:889-893 是
 * 同步 blocking,挡住一切后续)。有 active 淡出 → 按 BATTLE_DT 累 elapsedMs,推进所有淡出中
 * 敌人 deathFadeStep = floor(elapsedMs/16)(cap 72);72 步淡完 → 清 hold。
 * 放在 tickBattle 最前 → performAction(攻击/法术杀敌)与 postAction(毒杀)死亡都能淡出。
 * currentActionIndex 不在此推进(各 phase 自身管),淡出只是暂停。
 * @returns true = 淡出中(caller 早退,暂停战斗)。
 */
function tickBattleFade(state: BattleState): boolean {
  if (!state.battleFade) return false
  state.battleFade.elapsedMs += BATTLE_DT
  const step = Math.min(
    DEATH_FADE_STEPS,
    Math.floor(state.battleFade.elapsedMs / DEATH_FADE_STEP_MS),
  )
  for (const enemy of state.enemies) {
    if (enemy.deathFadeStep !== undefined && enemy.deathFadeStep < DEATH_FADE_STEPS) {
      enemy.deathFadeStep = step // step 到 72 时死敌固定 72(隐,draw 不画)
    }
  }
  if (step >= DEATH_FADE_STEPS) state.battleFade = undefined // 淡完 → 清 hold,下 tick phase 续跑
  return true
}

/** 逃跑动画步数(sdlpal battle.c:1473 `for i<16`)。 */
const FLEE_ANIM_STEPS = 16
/**
 * 逐步逃跑位移 —— **统一方向**(user 2026-05-31 拍板:忠于原版,三人同向同速,不要 sdlpal 的扇形散开)。
 * sdlpal 真值是 p0 +4/+6·p1 +4/+4·p2 +6/+3(扇形,其源码自带 TODO 承认跟原版不一致);
 * 这里**主动偏离 sdlpal 朝原版靠**:全员统一右下 +5/+4(队伍在右侧,整体跑出右下方)。
 */
function fleeStepDelta(_j: number, _partyLen: number): [number, number] {
  return [5, 4]
}

/**
 * 逃跑动画 hold(phase-agnostic;sdlpal `PAL_BattlePlayerEscape` battle.c:1438-1527)。
 * flee roll 成功(performFlee 设 state.fleeAnim)→ 16 步把活队员往右下挪 + 站立帧,满步移出屏
 * (9999,9999)→ phase='fleed'(下 tick finalize)。返回 true = 本 tick 被逃跑动画占用(暂停推进)。
 * 注:音效 45(battle.c:1459)走 M6 音频,本期跳过。
 */
function tickBattleFleeAnim(state: BattleState, res: BattleResources): boolean {
  const fa = state.fleeAnim
  if (!fa) return false
  if (fa.step < FLEE_ANIM_STEPS) {
    const partyLen = state.players.length
    state.players.forEach((p, j) => {
      const role = res.playerRoles.roles[p.roleId]
      if (!role || role.hp <= 0) return
      p.currentFrame = 0 // 站立帧(battle.c:1469)
      if (!p.pos) return
      const [dx, dy] = fleeStepDelta(j, partyLen)
      p.pos = { x: p.pos.x + dx, y: p.pos.y + dy }
    })
    fa.step++
    return true
  }
  // 16 步完 → 全员移出屏(battle.c:1520-1523)→ fleed → 下 tick finalize
  for (const p of state.players) p.pos = { x: 9999, y: 9999 }
  state.fleeAnim = undefined
  state.phase = 'fleed'
  state.phaseStallTicks = 0
  return true
}

/** D13 入场 fade 同尺度:全活敌每 tick 往左 ENEMY_FLYOUT_DX,全过 -ENEMY_FLYOUT_OFFSCREEN → fleed。 */
const ENEMY_FLYOUT_DX = 20 // sdlpal 5px/10ms ≈ 20px/40ms tick(battle.c:1413)
const ENEMY_FLYOUT_OFFSCREEN = 160 // x <= -160 视为精灵全出左屏(近似 x+width<=0,battle.c:1420)
const ENEMY_FLYOUT_MAX_STEPS = 40 // 安全上限(最右敌 ~320 / 20 + margin)

/**
 * D13 敌人主动逃飞出屏(sdlpal `PAL_BattleEnemyEscape`,battle.c:1399-1434):0x69 设 enemyEscapeAnim 后,
 * 每 tick 把全体活敌往**左**挪(x-=ENEMY_FLYOUT_DX,y 不变);全部 x<=-OFFSCREEN(或超安全步数)→ phase='fleed'
 * (Terminated 无奖励,**不**改 health 避免误给 exp)。返回 true = 本 tick 被该 hold 占用。
 */
function tickBattleEnemyEscapeAnim(state: BattleState): boolean {
  const ea = state.enemyEscapeAnim
  if (!ea) return false
  let anyOnScreen = false
  for (const e of state.enemies) {
    if (e.e.health <= 0 || !e.pos) continue // 死敌(wObjectID==0)跳过(battle.c:1408)
    e.pos = { x: e.pos.x - ENEMY_FLYOUT_DX, y: e.pos.y }
    if (e.pos.x > -ENEMY_FLYOUT_OFFSCREEN) anyOnScreen = true // 仍在屏(x+width>0,battle.c:1420)
  }
  ea.step++
  if (anyOnScreen && ea.step < ENEMY_FLYOUT_MAX_STEPS) return true // 继续飞
  // 全出屏 → 终止整场(无奖励);不动 health(fled 不结算 exp)
  state.enemyEscapeAnim = undefined
  state.phase = 'fleed'
  state.phaseStallTicks = 0
  return true
}

/**
 * scriptOnTurnStart:每轮起手对全体活敌跑一次(sdlpal fight.c:1184-1191,fTurnStart gate)。
 * 在玩家**选动作之前**跑(tickBattle round-start)→ boss 嘲讽对话(林月如/拜月/蜘蛛精)进战斗
 * 一开始 / 每轮开头就显示(user 实测:不该先选动作才说话)。脚本 0xFFFF showDialog → 入
 * battleDialogQueue,顶层 tickBattleDialog 显示。turnStartDoneForTurn guard 保每轮一次。
 *
 * B2:0x79 队伍条件分支经 explore handler fallthrough 已生效;真 show-once = 脚本返回值回写
 * (跑完置 scriptOnTurnStart,见函数末)。0x90 写 gs.rgObject,与战斗内敌脚本字段无关(sdlpal 不回读)。
 */
function runEnemyTurnStartScripts(state: BattleState, gs: GameState, bus: CommandBus, res: BattleResources): void {
  state.turnStartDoneForTurn = state.turn
  // B2 c5 / D24:隐身期间(iHidingTime>0)敌整轮跳过 → 不跑 turnStart 脚本(sdlpal fight.c:1680 ==0 才跑)
  if ((state.iHidingTime ?? 0) > 0) return
  for (let ei = 0; ei < state.enemies.length; ei++) {
    const en = state.enemies[ei]
    if (!en || en.e.health <= 0 || en.scriptOnTurnStart <= 0) continue
    state.battleDialogPendingClear = false // 每脚本重置 ClearDialog 暂存(防跨脚本泄漏)
    // B2 c7:真 show-once / re-arm —— sdlpal `wScriptOnTurnStart = PAL_RunTriggerScript(...)`
    //   (fight.c:1186-1187 / 1689-1690)把脚本**返回值**写回。runScript 返回 wNextScriptEntry:
    //   0x01 收尾 → 推进过本段(show-once,多数 boss 嘲讽);0x00 收尾 → 起始 entry(每轮重显,
    //   如 enemyId 23 跳跳蛙 / 25 怪老子 scriptOnTurnStart=42840);0x02 → re-arm 指定 entry。
    //   runScript 同步跑到 end 才返回(showDialog 只入队不挂起),故此回写每轮一次(turnStartDoneForTurn 守)。
    en.scriptOnTurnStart = runScript({
      commands: res.commands,
      ip: en.scriptOnTurnStart,
      bus,
      runtimeMode: 'battle',
      battleCtx: {
        state,
        caster: { type: 'enemy', idx: ei },
        summonTables: { enemies: res.enemies, enemyObjects: res.enemyObjects },
        gs, // raw opcode fall 到 applyRawOpcode 需 gs
        // 0x92 show-magic-anim(赵灵儿觉醒 cutscene scriptOnTurnStart)需 cast 特效帧基号 + 角色战斗精灵
        playerRoles: res.playerRoles,
        battleEffectIndex: res.battleEffectIndex,
      },
    })
  }
  state.battleDialogPendingClear = false
}

/**
 * B2 c5 / D24:激活隐身效果(sdlpal `PAL_BattleCheckHidingEffect` fight.c:3529-3532)。
 * 0x5C 把 iHidingTime 存为**负值**(待激活标记);CLASSIC 激活 = **纯取反**(`-iHidingTime`),
 * **无 *20 / 无 bBattleSpeed 缩放**(那是非 CLASSIC 分支,type-pal 走 CLASSIC)。
 */
export function activateHidingEffect(state: BattleState): void {
  if ((state.iHidingTime ?? 0) < 0) state.iHidingTime = -(state.iHidingTime ?? 0)
}

/**
 * B2 c5 / D24:每轮衰减隐身(sdlpal CLASSIC fight.c:1670-1672):iHidingTime>0 → -1(到 0 = 隐身结束)。
 * CLASSIC 每轮无条件 -1(非 CLASSIC 才有充能速度门控)。
 */
export function decrementHidingEffect(state: BattleState): void {
  if ((state.iHidingTime ?? 0) > 0) state.iHidingTime = (state.iHidingTime ?? 0) - 1
}

/** narration 风格(物品提示式)自动消失时长 = 1.4s(sdlpal PAL_DialogWaitForKeyWithMaximumSeconds(1.4),text.c:1701)。 */
const BATTLE_DIALOG_NARRATION_MS = 1400

/**
 * 战斗内对话 hold —— **phase-agnostic**(忠实 sdlpal PAL_ShowDialogText 同步 blocking,text.c:1701)。
 *
 * 战斗脚本(scriptOnReady / scriptOnTurnStart 等)的 0xFFFF showDialog 由 runScript 收集到
 * state.battleDialogQueue(runScript 同步跑完无法跨 tick 阻塞);此 hold 逐 tick 把队列喂进
 * **复用的大世界** gs.dialogBox(startDialogLine/appendDialogLine 行累积 + tickDialog 打字 +
 * confirmDialog page/end-key),期间暂停一切战斗推进。放在 tickBattle 顶层(fade 之后)。
 *
 * CLASSIC 真值:battle dialog 走普通 dialog box(top/bottom 多行翻页 + 等键;narration 1.4s 自消),
 * `#ifndef PAL_CLASSIC` 的战斗飘字 PAL_BattleUIShowText 在 classic build 被编译掉(text.c:1668-1672)。
 *
 * 打字节拍:tickDialog 按大世界 10fps(100ms/帧)校准;战斗 tick 40ms → 用 battleDialogTypingAccMs
 * 累到 100ms 才 tickDialog 一次,保打字总时长与大世界一致。
 *
 * @returns true = 有对话在显示(caller 早退,暂停战斗)。
 */
/** 上下位置互换(top↔bottom)—— 同屏共存的两位置对话框判定(center/narration 不参与)。 */
function isVerticalDialogSwap(
  a: import('@type-pal/shared').DialogBoxStyle,
  b: import('@type-pal/shared').DialogBoxStyle,
): boolean {
  return (a === 'top' && b === 'bottom') || (a === 'bottom' && b === 'top')
}

export function tickBattleDialog(state: BattleState, gs: GameState, input: InputSnapshot): boolean {
  const queueLen = state.battleDialogQueue?.length ?? 0
  // 无 active dialogBox 且队列空 → 对话整段结束(放行)。一并清掉同屏共存的反位置框。
  if (!gs.dialogBox && queueLen === 0) {
    gs.dialogBoxKept = undefined
    return false
  }

  // 对话是合法的玩家等待(非卡死)→ 清 phase stall 计数,避免长时间等键被 60s 看门狗强退。
  state.phaseStallTicks = 0

  // (A) 无 active box 但队列有行 → 起首行 / 或处理内联 effect(D26(2b))
  if (!gs.dialogBox) {
    const next = state.battleDialogQueue?.[0]
    if (next?.effect) {
      // D26(2b):dialog 序列中的内联可见 effect 按位置 dispatch(目前仅 0x69 敌逃跑)。
      //   0x69 → set enemyEscapeAnim(= dispatchBattleOpcode 的 0x69 handler,battle.c:1399
      //   PAL_BattleEnemyEscape)→ 下 tick tickBattleEnemyEscapeAnim(397,优先于本 hold)飞出敌人
      //   → phase='fleed';飞完后队列后续 narration 仍由本 hold 显示,再 finalize。
      //   时序:嘲讽对话 → [逃跑动画] → narration「逃走了」→ fleed,忠实 sdlpal 脚本顺序。
      state.battleDialogQueue!.shift()
      if (next.effect.opcode === 0x69) {
        state.enemyEscapeAnim = { step: 0 }
        ;(gs.pendingSounds ??= []).push(45) // 敌逃跑音(battle.c:1397)
      }
      return true
    }
    feedNextBattleDialogLine(state, gs)
    return true
  }

  const box = gs.dialogBox

  // (B) narration 风格:满 1.4s 或任意键 → 自动消(sdlpal text.c:1663-1710 CenterWindow 计时自清)
  if (box.style === 'narration') {
    state.battleDialogNarrationFrames = (state.battleDialogNarrationFrames ?? 0) + BATTLE_DT
    const anyKey = input.pressed.size > 0
    if (anyKey || state.battleDialogNarrationFrames >= BATTLE_DIALOG_NARRATION_MS) {
      gs.dialogBox = undefined
      state.battleDialogNarrationFrames = 0
      state.battleDialogTypingAccMs = 0
      // 队列还有后续行 → 继续 hold(下 tick 起下一行)。
      // **被按键消掉** → 本 tick 仍 hold(吃掉该键),避免同一按键漏进战斗菜单(sdlpal 对话后
      //   PAL_ClearKeyState,ts 用"消费本 tick"等价);超时消失无键可漏,空队列才放行。
      return anyKey || (state.battleDialogQueue?.length ?? 0) > 0
    }
    return true // 仍在显示 narration(等 1.4s / 任意键)
  }

  // (C) 普通 typing dialog —— 节拍累加,驱动 tickDialog 在 100ms cadence
  state.battleDialogTypingAccMs = (state.battleDialogTypingAccMs ?? 0) + BATTLE_DT
  while (state.battleDialogTypingAccMs >= FRAME_MS_EXPLORE) {
    state.battleDialogTypingAccMs -= FRAME_MS_EXPLORE
    tickDialog(box)
  }

  // Confirm 处理(phase 决定):skip-typing / page-advance / dialog-end
  if (input.pressed.has('Confirm')) {
    const result = confirmDialog(box)
    if (result === 'skip-typing') {
      return true // 本 tick 整行显满;下 tick 才走 line-done 推进(同大世界 fUserSkip)
    }
    if (result === 'page-advance') {
      feedNextBattleDialogLine(state, gs) // 4 行翻页清完 → append 下一行到清空的 box
      return true
    }
    if (result === 'dialog-end') {
      const next = state.battleDialogQueue?.[0]
      // 上下位置切换(top↔bottom,非 clearBefore)→ **保留旧框**(林月如 top 不消失,下面接着出李逍遥
      //   bottom),对照 sdlpal upper/lower 同屏共存(PAL_StartDialog 不擦旧框)。把旧框移入 dialogBoxKept
      //   (反位置冻结框);否则普通结束 → 清掉两者。
      // effect 条目(next.style undefined)非上下位置切换 → 不保留旧框。
      if (next && next.style && !next.clearBefore && isVerticalDialogSwap(gs.dialogBox.style, next.style)) {
        gs.dialogBoxKept = gs.dialogBox
      } else {
        gs.dialogBoxKept = undefined
      }
      gs.dialogBox = undefined
      state.battleDialogTypingAccMs = 0
      // **本 tick 吃掉关框的 Confirm** —— 否则同一 Confirm 同 tick 漏进战斗菜单触发普通攻击
      //   (user 2026-05-31 实测:对话最后一个 space 同时结束对话 + 选了普通攻击)。
      //   sdlpal PAL_ShowDialogText 返回后 PAL_ClearKeyState 清键;ts 用"消费本 tick + 下 tick 菜单
      //   只认新按下的 pressed(edge)"等价。队列还有(clearBefore/换风格)也 hold,下 tick 起新框。
      return true
    }
    // 'noop':line-done 等 → 落下面自动推进
  }

  // line-done 自动推进(sdlpal 行间不停):喂下一行 / 满页等键 / 队列空等结束键
  if (box.phase === 'line-done') {
    const next = state.battleDialogQueue?.[0]
    if (!next) {
      setWaitingEndKey(box) // 无后续 → 等结束键(Confirm 关 box)
    }
    else if (next.clearBefore || next.style !== box.style) {
      setWaitingEndKey(box) // 新段(显式清屏 / 风格变)→ 先结束当前段,下段起新框
    }
    else if (shouldWaitPageKey(box)) {
      setWaitingPageKey(box) // 满 4 行 → 等翻页键
    }
    else {
      feedNextBattleDialogLine(state, gs) // 同段同风格未满页 → append 下一行(继续打字)
    }
  }
  return true
}

/** 从 battleDialogQueue 取下一行喂进 gs.dialogBox(无 box → startDialogLine;有 → appendDialogLine)。 */
function feedNextBattleDialogLine(state: BattleState, gs: GameState): void {
  const line = state.battleDialogQueue?.shift()
  if (!line) return
  // D26(2b)防御:effect 条目正常由 tickBattleDialog (A) 分支处理;若经此(段边界 page-advance)→ 同样 dispatch。
  if (line.effect) {
    if (line.effect.opcode === 0x69) {
      state.enemyEscapeAnim = { step: 0 }
      ;(gs.pendingSounds ??= []).push(45) // 敌逃跑音(battle.c:1397)
    }
    return
  }
  const text = line.text ?? ''
  if (!gs.dialogBox) {
    gs.dialogBox = startDialogLine(text, {
      style: line.style ?? 'bottom',
      portraitIcon: line.portrait,
      fontColor: line.fontColor,
    })
  }
  else {
    appendDialogLine(gs.dialogBox, text)
  }
  state.battleDialogTypingAccMs = 0
  state.battleDialogNarrationFrames = 0
}

function tickPerformAction(
  state: BattleState,
  gs: GameState,
  bus: CommandBus,
  res: BattleResources,
): void {
  // flee 提前转 phase → 早退
  if (state.phase !== 'performAction') return

  // 注:死亡淡出 hold 已上移到 tickBattle 顶层(phase-agnostic tickBattleFade)。

  // 注:scriptOnTurnStart(boss 嘲讽)已上移到 tickBattle round-start(进 selectAction **菜单之前**),
  //   见 runEnemyTurnStartScripts —— 修"先选动作才开始说话"的顺序 bug(user 实测:林月如应进战斗就说话)。

  // ── D17a:时间线驱动 ──────────────────────────────────────────────────────
  // 有 active 动画时间线 → 逐 tick 推进帧;不起新 action,不推 currentActionIndex。
  if (state.battleAnim) {
    const a = state.battleAnim
    a.frameElapsedMs += BATTLE_DT
    // 跨过若干帧(durationMs 可能为 0,见 actWaitFrames=0)→ while 一次跨多帧。
    while (a.idx < a.frames.length && a.frameElapsedMs >= (a.frames[a.idx]?.durationMs ?? 0)) {
      a.frameElapsedMs -= a.frames[a.idx]?.durationMs ?? 0
      a.idx++
      if (a.idx < a.frames.length) applyAnimFrame(state, a.frames[a.idx]!, bus)
    }
    if (a.idx >= a.frames.length) {
      // 法术伤害数字在**特效播完后**才 emit(对照 sdlpal PAL_BattleDisplayStatChange 在 magic anim
      //   之后,fight.c:4322/4369/4405)—— 修 user 实测"掉血数字比攻击动画早出"(林月如鞭击/法术)。
      for (const dn of a.pendingDamageNums ?? []) {
        bus.emit({ op: 'showDamageNum', target: dn.target, value: dn.value, color: dn.color })
      }
      // 时间线播完 → 复位双方 fighter(PAL_BattleUpdateFighters)+ 清动画。
      resetFightersAfterAction(state, res.playerRoles)
      state.battleAnim = undefined
      // D17:复位后检死敌(fight.c:889-893 fFade 检测在 action 收尾)→ 开淡出 hold。
      //   currentActionIndex **总是**推进(action 已完);淡出由顶层 tickBattleFade 暂停。
      checkEnemyDeaths(state, bus)
      const activeItem = state.actionQueue[state.currentActionIndex]
      if (runPlayerCasualtyScripts(state, gs, bus, res, !!activeItem?.checkPlayerCasualties)) {
        emitPlayerCasualtySounds(state.players, res.playerRoles, bus)
        state.currentActionIndex++
        return
      }
      state.currentActionIndex++
    }
    return
  }

  // sdlpal `PAL_BattleStartFrame`(fight.c:1116-1152):每帧**先**检 fEnemyCleared(全敌死→won)
  //   / fEnded(全队员死 puppet 除外→lost),命中即 return,**不再处理剩余 action queue**。
  //   ts 对齐(修 user 实测:本轮第一个角色打死最后敌人后,后续我方角色仍继续攻击)——
  //   放在 battleAnim hold 之后(杀敌动画播完)+ tickBattleFade 死亡淡出 hold 在 tickBattle 顶层
  //   已先于本函数(淡出完才到此)→ 此处判全死并中止队列,转 postAction 由其定 won/lost。
  if (state.actionQueue.length > 0) {
    const anyEnemyAlive = state.enemies.some((e) => e.e.health > 0)
    const anyPlayerAlive = state.players.some(
      (p) => (res.playerRoles.roles[p.roleId]?.hp ?? 0) > 0,
    )
    if (!anyEnemyAlive || !anyPlayerAlive) {
      state.phase = 'postAction'
      state.phaseStallTicks = 0
      return
    }
  }

  if (state.currentActionIndex >= state.actionQueue.length) {
    state.phase = 'postAction'
    state.phaseStallTicks = 0
    return
  }

  // B2 c5 / D24:激活隐身(0x5C 存的负值 → 取反,CLASSIC 无缩放)。在处理本动作前激活,
  //   使隐身后队列里后续敌人动作被下面的 gate 跳过。
  activateHidingEffect(state)

  const item = state.actionQueue[state.currentActionIndex]!
  let action: BattleAction | undefined

  // sdlpal 每次行动起手 reset 击退强度 iBlow=0(fight.c:3608 玩家 / fight.c:4576 敌人 PerformAction 起手)。
  //   0x6B blow 设的 iBlow 只在当次行动有效;ts 此前漏 reset → 击退法术后 iBlow 残留,后续所有法术都把
  //   敌人吹飞后归位(user 2026-06-04 报)。注:动画时间线进行中走上方分支不到这里,不会误清当次 iBlow。
  state.iBlow = 0

  // B2 c5 / D24:隐身期间(iHidingTime>0)敌整轮跳过(连选目标都不做,sdlpal fight.c:1716 ==0 才行动)
  if (item.isEnemy && (state.iHidingTime ?? 0) > 0) {
    // action 保持 undefined → 不 perform;下方 currentActionIndex++ 推进队列
  } else if (item.isEnemy) {
    const enemy = state.enemies[item.idx]
    if (enemy && enemy.e.health > 0) {
      // sdlpal `fight.c:1719-1724` 真值 — enemy 轮到时跑 wScriptOnReady bytecode AI 脚本,
      // 脚本通过 opcode 0x67 enemy use magic / 0x64 jump if hp> 等 mutate enemy state
      // (wMagic / wMagicRate);随后 decideEnemyAction 读 mutate 后值执行实际动作。
      // B2:0x67 已真驱动(battle-opcodes OP_ENEMY_USE_MAGIC + decideEnemyAction 读 enemy.magic);
      // 0x79 队伍条件分支经 explore handler fallthrough 已生效;0x90 写 gs.rgObject(sdlpal 战斗内
      // 本就不回读敌运行时脚本字段);真 show-once = scriptOnTurnStart/Ready 返回值回写(见 runEnemyTurnStartScripts)。
      if (enemy.scriptOnReady > 0 && !item.scriptReadyRan) {
        item.scriptReadyRan = true // 本 turn 项一次性(防对话 hold 暂停期间重入重复跑)
        state.battleDialogPendingClear = false // 脚本起手清 ClearDialog 暂存(防跨脚本泄漏)
        // B2 c7:真 show-once / re-arm —— sdlpal `wScriptOnReady = PAL_RunTriggerScript(...)`
        //   (fight.c:1226-1227 / 1719-1720)返回值回写。0x01 收尾 → 推进(show-once);0x00 → 起始
        //   entry(每次 ready 重跑);0x02 → re-arm 指定。scriptReadyRan guard 保本 action 一次性。
        enemy.scriptOnReady = runScript({
          commands: res.commands,
          ip: enemy.scriptOnReady,
          bus,
          runtimeMode: 'battle',
          battleCtx: {
            state,
            caster: { type: 'enemy', idx: item.idx },
            // 0x9E enemy summon 需召唤兽表 + enemy-objects 解析
            summonTables: { enemies: res.enemies, enemyObjects: res.enemyObjects },
            // raw opcode(0x06 概率跳等)fall 到 applyRawOpcode 需 gs
            gs,
            // 0x92 show-magic-anim(scriptOnReady 出场施法演出)需 cast 特效帧基号 + 角色战斗精灵
            playerRoles: res.playerRoles,
            battleEffectIndex: res.battleEffectIndex,
          },
        })
        // scriptOnReady 里 0xFFFF showDialog 入了对话队列 → 先暂停本 action,让顶层 tickBattleDialog
        //   放完对话再回来(scriptReadyRan guard 防重跑)→ 决策 + 行动。忠实 sdlpal:
        //   scriptOnReady 对话在敌人行动前显示(fight.c:1719-1724 脚本先跑,后 PerformAction)。
        if (state.battleDialogQueue && state.battleDialogQueue.length > 0) return
      }
      // B2 c10:传全 party(含死者)→ decideEnemyAction 用 sdlpal RNG 真值选目标(reject 重摇)
      const party = state.players.map((p, i) => ({ idx: i, hp: res.playerRoles.roles[p.roleId]?.hp ?? 0 }))
      const alivePlayers = party.filter((p) => p.hp > 0)
      // B2 c1:敌方状态门(sleep/paralyzed→pass;silence→强制物理;confused→打友敌;fight.c:4582-4655)
      const aliveEnemies = state.enemies
        .map((e, i) => ({ idx: i, health: e.e.health }))
        .filter((e) => e.health > 0)
      action = decideEnemyAction({
        enemy: enemy.e,
        alivePlayers,
        party,
        rng: state.rng,
        status: enemy.status,
        selfIdx: item.idx,
        aliveEnemies,
      })
    }
    // enemy dead → skip(action 保持 undefined)
  } else {
    // player:从 pendingActions 取(skip 死队员的 action)
    const player = state.players[item.idx]
    if (player) {
      const role = res.playerRoles.roles[player.roleId]
      if (role && role.hp > 0) {
        action = state.pendingActions.get(item.idx)
        // perform 时失能解算(sdlpal fight.c:1731-1747 + 原版混乱)——
        //   睡眠/麻痹 → Pass;混乱 → 濒死?Pass : **随机攻击任一存活目标(敌方或友方)**。
        //   **混乱按原版**(user 2026-05-31 拍板:sdlpal 改成只打友军 AttackMate 且独自时 Pass,
        //   但 sdlpal 注释自承"original version behaviour is not same";原版是随机敌/友普攻 → 改回原版)。
        //   覆盖 pendingActions 里的占位 action(自动填的 attack id0)。
        const st = player.status
        if (st.sleep > 0 || st.paralyzed > 0) {
          action = { type: 'pass', target: -1 }
        } else if (st.confused > 0) {
          action = isPlayerDying({ hp: role.hp, maxHP: role.maxHP })
            ? { type: 'pass', target: -1 }
            : resolveConfusedAttack(state, res, item.idx)
        }
      }
    }
  }

  // sdlpal `PAL_BattlePlayerValidateAction`(fight.c:3487-3507):perform 前重选目标 ——
  //   **所有指向敌方的动作**(攻击 / 攻击魔法 / 投掷 / 合击)若目标敌人**已死**(被本回合先手队友
  //   打死),重选一个活敌(否则打空位)。sdlpal 对 attack(3339)/ magic 攻击(3407)/ throwItem(3491)
  //   皆 fToEnemy 时校验。target<0(全体)由 perform* 自身遍历活敌,不需重选。
  //   注:magic/item 的 targetSide 省略默认 'enemy'(玩家施法默认敌方,见 resolveTargetIsEnemy)。
  //   **!item.isEnemy gate(回归 attack.ts:117 崩溃)**:本块是**玩家专用**校验(PAL_BattlePlayerValidateAction)。
  //   敌人攻击/施法的 action.target 是**玩家索引**,绝不能当敌索引来 selectAutoTargetFrom 重选
  //   (否则玩家索引恰为死敌槽时会重选成敌索引 → enemy→player 路径越界 state.players[敌索引])。
  //   敌人目标在 decideEnemyAction 时已从当前活玩家里选,无需重选。
  if (
    !item.isEnemy &&
    action != null &&
    action.target >= 0 &&
    (action.type === 'attack' ||
      ((action.type === 'magic' || action.type === 'throw-item' || action.type === 'coop-magic') &&
        (action.targetSide ?? 'enemy') === 'enemy')) &&
    (state.enemies[action.target]?.e.health ?? 0) <= 0
  ) {
    const newTarget = selectAutoTargetFrom(
      state.enemies,
      action.target,
      state.iPrevEnemyTarget ?? -1,
    )
    if (newTarget >= 0) action = { ...action, target: newTarget }
    // newTarget<0(全敌已死)→ 保持原 target;perform* 对死敌 no-op,本回合即将结束转 postAction
  }

  item.checkPlayerCasualties = shouldCheckPlayerCasualties(item, action)
  backupPlayerCasualtyHp(state, res)

  if (action) performBattleAction(state, gs, item, action, bus, res)

  // D17a 向后兼容:performBattleAction 起了动画时间线(物理攻击)→ 本 tick 不推进
  // currentActionIndex,交给上面时间线分支逐帧驱动播完再推。
  // 未建时间线的 action(defend/flee/pass/magic/item/throw 等)→ 即时路径。
  if (!state.battleAnim) {
    // 即时 action(defend/flee/pass/法术/投掷 等无动画路径)也复位 fighter 姿势 —— sdlpal 每帧
    //   PAL_BattleUpdateFighters(fight.c:940-986)据 fDefending/hp/sleep 重算姿势。我们在 action 收尾
    //   补这步:**防御 action 一执行(防御 ×5 排队首,故 perform 起手即此)立刻进防御姿 frame 3**,
    //   不再等下一个有动画的 action 才刷新(user 2026-05-31 实测:防御姿出现太晚)。
    resetFightersAfterAction(state, res.playerRoles)
    // D17:即时 action(法术 / 投掷秒敌)也检死敌(开淡出 hold);currentActionIndex 总是推进,
    //   淡出由顶层 tickBattleFade 暂停。
    checkEnemyDeaths(state, bus)
    if (runPlayerCasualtyScripts(state, gs, bus, res, !!item.checkPlayerCasualties)) {
      emitPlayerCasualtySounds(state.players, res.playerRoles, bus)
      state.currentActionIndex++
      return
    }
    state.currentActionIndex++
  }
  // 不 reset phaseStallTicks —— 整个 performAction phase 内 stall 累计;
  // 如卡 60s 没推进(eg. 自死循环),会被 stall 兜底
}

/**
 * 原版混乱(user 2026-05-31 拍板忠于原版):随机攻击**任一存活目标**(敌方或友方,排除自己),
 * 走普通物理攻击。敌方目标 → 'attack'(performAttack 完整动画);友方目标 → 'attack-mate'(performAttackMate 打该友军)。
 * 池空(无任何可打目标)→ Pass。sdlpal CLASSIC 改成只打友军(AttackMate)且独自时 Pass,
 * 其源码注释 `since original version behaviour is not same` 已承认偏离原版 —— 此处改回原版随机敌/友。
 */
function resolveConfusedAttack(state: BattleState, res: BattleResources, casterIdx: number): BattleAction {
  const pool: Array<{ kind: 'enemy' | 'ally', idx: number }> = []
  state.enemies.forEach((e, i) => {
    if (e.e.health > 0) pool.push({ kind: 'enemy', idx: i })
  })
  state.players.forEach((p, i) => {
    if (i === casterIdx) return
    if ((res.playerRoles.roles[p.roleId]?.hp ?? 0) > 0) pool.push({ kind: 'ally', idx: i })
  })
  if (pool.length === 0) return { type: 'pass', target: -1 }
  const pick = pool[state.rng.range(0, pool.length)]! // range 上限 exclusive → [0, len)
  return pick.kind === 'enemy'
    ? { type: 'attack', target: pick.idx, targetSide: 'enemy' }
    : { type: 'attack-mate', target: pick.idx }
}

/**
 * D18:解析一个 magic/item action 的目标方是否敌方。
 *
 * 公式(对齐 plan §4):`(action.targetSide ?? (actor.isEnemy ? 'player' : 'enemy')) === 'enemy'`
 *   - 显式 targetSide → 按它(治疗法术/治疗物品 'player' → false → performMagic/Item 走 player target)。
 *   - 省略(旧 action / 攻击魔法 enemy 流也可能省略,但 enemy 流会显式设 'enemy')→ 保旧语义:
 *     玩家施法默认指敌方,敌人施法默认指队员。
 */
function resolveTargetIsEnemy(action: BattleAction, actor: ActionQueueItem): boolean {
  const side = action.targetSide ?? (actor.isEnemy ? 'player' : 'enemy')
  return side === 'enemy'
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
  // E04:玩家动作累积隐藏经验 wCount(sdlpal fight.c 各 case 末尾,enemy 不累积;coop 回合队员走 pass/coop-magic
  //   两 case 无累积,天然满足 sdlpal `if(fThisTurnCoop) break`)。helper 闭包绑 gs/roleId。
  const addHiddenExp = (poolKey: keyof AllExperience, delta: number): void => {
    if (actor.isEnemy) return
    const roleId = state.players[actor.idx]?.roleId
    if (roleId === undefined) return
    const e = gs.Exp[poolKey][roleId]
    if (e) e.wCount = (e.wCount ?? 0) + delta
  }

  switch (action.type) {
    case 'attack':
      performAttack(state, actor, action.target, bus, res.playerRoles, res.battleEffectIndex,
        // 敌普攻 equivItem 中毒(fight.c:5139):敌→我 命中后按几率 + 抗性跑毒物品 scriptOnUse(0x29)。
        { gs, items: res.items, commands: res.commands, runScript: getRunScript(gs) })
      // E04:攻击 → rgAttackExp.wCount++ + rgHealthExp.wCount += RandomLong(2,3)(fight.c:3756-3757,序固定)
      addHiddenExp('rgAttackExp', 1)
      addHiddenExp('rgHealthExp', state.rng.rangeInclusive(2, 3))
      break

    case 'defend':
      // defend 只对队员有意义(敌人不 defend);写错也安全(performDefend 越界 no-op)
      performDefend(state, actor.idx)
      addHiddenExp('rgDefenseExp', 2) // E04:防御 → rgDefenseExp.wCount += 2(fight.c:4116,无 RNG)
      break

    case 'flee':
      // flee 只对队员有意义;敌人 flee 写错 no-op(performFlee 通过 playerRoles 解;此情境不应发生)
      //   bus 传入 → 逃跑失败时起失败动画(performFlee 内 buildFleeFailTimeline)。
      if (!actor.isEnemy) performFlee(state, gs, actor.idx, res.playerRoles, bus)
      break

    case 'magic': {
      if (action.actionId === undefined) break
      // target=-1 → 'all';否则按 number 走
      const targetIdx: number | 'all' = action.target === -1 ? 'all' : action.target
      // D18:目标方按 action.targetSide(显式);省略时保旧语义(玩家施法→敌方,敌人施法→队员)。
      //   targetIsEnemy=false → performMagic 走 player target(DefMagic 动画 + 治疗 opcode 打队友)。
      const targetIsEnemy = resolveTargetIsEnemy(action, actor)
      performMagic({
        state,
        casterIsEnemy: actor.isEnemy,
        casterIdx: actor.idx,
        spellId: action.actionId,
        targetIsEnemy,
        targetIdx,
        spells: res.spells,
        magics: res.magics,
        items: res.items, // 0x6A 偷取成功"获得 物品名"提示需 item 名
        playerRoles: res.playerRoles,
        bus,
        commands: res.commands,
        runScript: getRunScript(gs),
        objectMagics: res.objectMagics, // 0x57/0x88 scriptOnUse 解析 magic object id
        gs, // 0x88 set magic damage by money 需 gs.dwCash
        magicSpriteFrameCounts: res.magicSpriteFrameCounts, // D17:OffMagic 时间线 n
        battleEffectIndex: res.battleEffectIndex, // D17:PreMagic cast 特效帧基号
        summonSpriteFrameCounts: res.summonSpriteFrameCounts, // 召唤神逐帧 loop 帧数
      })
      // E04:施法 → rgMagicExp.wCount += RandomLong(2,3) + rgMagicPowerExp.wCount++(fight.c:4328-4329,序固定)
      addHiddenExp('rgMagicExp', state.rng.rangeInclusive(2, 3))
      addHiddenExp('rgMagicPowerExp', 1)
      break
    }

    case 'item': {
      if (action.actionId === undefined) break
      const targetIdx: number | 'all' = action.target === -1 ? 'all' : action.target
      // D18:治疗物品 targetSide='player' → targetIsEnemy=false(打到队友)。
      const targetIsEnemy = resolveTargetIsEnemy(action, actor)
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
      // pass:no-op(enemy 死掉后 decideEnemyAction 返回的兜底 / 睡眠·麻痹·濒死混乱队员)
      break

    case 'attack-mate':
      // 'attack-mate' = 攻同阵营。玩家混乱 → 打友军(fight.c:3760-3853);
      //   敌人混乱(B2 c1b)→ 打另一活敌(fight.c:4596-4654,CalcBaseDamage*2/physRes)。
      if (actor.isEnemy)
        performEnemyConfusedAttack(state, actor.idx, action.target, bus)
      else
        performAttackMate(state, actor.idx, bus, res.playerRoles, action.target >= 0 ? action.target : undefined)
      break

    case 'throw-item': {
      // E2:投掷物(kBattleActionThrowItem,fight.c:4332)—— 跑 item.scriptOnThrow,
      // 脚本里 0x42 SimulateMagic 结算伤害。43 个投掷符/镖/卵/蛊靠这条。
      if (action.actionId === undefined) break
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
        magicSpriteFrameCounts: res.magicSpriteFrameCounts, // 投掷 OffMagic 特效时间线 n(fight.c:5340)
      })
      break
    }

    case 'coop-magic': {
      // 协力合击(fight.c:3856-4043 CLASSIC):coopObjId = action.actionId(= role.cooperativeMagic,
      //   装备 override 已经 projection 投影)。仅 player 发起;扣全 healthy 队员 HP + Σ(atk+mag)/4 伤害。
      if (actor.isEnemy || action.actionId === undefined) break
      performCoopMagic({
        state,
        casterIdx: actor.idx,
        coopObjId: action.actionId,
        targetIdx: action.target === -1 ? 'all' : action.target,
        playerRoles: res.playerRoles,
        magics: res.magics,
        objectMagics: res.objectMagics,
        bus,
        magicSpriteFrameCounts: res.magicSpriteFrameCounts, // 有 → 建合击动画(聚拢/施法/法术效果/滑回)
      })
      break
    }
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
function tickPostAction(
  state: BattleState,
  gs: GameState,
  bus: CommandBus,
  res: BattleResources,
): void {
  // M6 阵亡音死因门控:毒 tick 前快照各队员 hp。下方 emitPlayerCasualtySounds 仅 prePoisonHp===0
  //   (本回合死于敌攻、毒前已死)才播 deathSound;毒杀(毒前>0、毒后→0)不播(sdlpal 毒死无 deathSound)。
  const prePoisonHp = new Map<number, number>()
  for (const p of state.players) {
    const role = res.playerRoles.roles[p.roleId]
    if (role) prePoisonHp.set(p.roleId, role.hp)
  }
  backupPlayerCasualtyHp(state, res)
  // 毒 tick —— 对照 sdlpal `fight.c:1645-1648`(每回合每敌 rgPoisons[j].wPoisonScript 跑)。
  // 每个活敌的每条 poison 跑其 scriptEntry(毒 wEnemyScript,经 0x21 扣血),target = 该敌人。
  // 放在死亡 exp 累计**之前** → 毒杀的敌人也计入死亡奖励。
  const runPoisonScript = getRunScript(gs)
  // 玩家毒 tick —— sdlpal fight.c:1657-1697(PAL_BattleStartFrame,action queue 耗尽时):每队员每毒槽
  //   跑 wPlayerScript(target=该队员;毒脚本 0x1B 负 delta 扣血,0x1B battle handler 自带活人 gate)。
  //   玩家毒存全局 gs.rgPoisonStatus[`${slot}_${roleId}`](持久,16 槽/role)。sdlpal 先玩家后敌。
  state.players.forEach((player, idx) => {
    for (let slot = 0; slot < 16; slot++) {
      const ps = gs.rgPoisonStatus[`${slot}_${player.roleId}`]
      if (ps && ps.wPoisonID !== 0 && ps.wPoisonScript > 0) {
        const next = (runPoisonScript as (o: RunScriptOptions) => number)({
          commands: res.commands,
          ip: ps.wPoisonScript,
          bus,
          runtimeMode: 'battle',
          battleCtx: { state, target: { type: 'player', idx }, gs, playerRoles: res.playerRoles },
        })
        // sdlpal fight.c:1624 `wPoisonScript = PAL_RunTriggerScript(wPoisonScript, ...)` —— 回写
        // 推进自推进毒链(0x0001 advance / 0x03 jump / 0x2b 重施);不回写则永卡入口。
        if (typeof next === 'number')
          ps.wPoisonScript = next
      }
    }
  })
  state.enemies.forEach((enemy, idx) => {
    if (enemy.e.health <= 0) return
    for (const poison of enemy.poisons ?? []) {
      if (poison.scriptEntry > 0) {
        const next = (runPoisonScript as (o: RunScriptOptions) => number)({
          commands: res.commands,
          ip: poison.scriptEntry,
          bus,
          runtimeMode: 'battle',
          battleCtx: { state, target: { type: 'enemy', idx }, gs },
        })
        // sdlpal fight.c:1647 `wPoisonScript = PAL_RunTriggerScript(wPoisonScript, i)` —— 回写推进。
        // 蛊孵化链(食妖虫附→灵蛊 / 碧血蚕附→赤血蚕)+ 递增毒(三尸蛊毒)全靠此自推进。
        if (typeof next === 'number')
          poison.scriptEntry = next
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

  // M6 玩家濒死/阵亡音(毒 tick 后判,与 sdlpal fight.c:1664 顺序一致)。prePoisonHp 门控阵亡音死因
  //   (仅敌攻致死播,毒杀不播)。详见 emitPlayerCasualtySounds。
  emitPlayerCasualtySounds(state.players, res.playerRoles, bus, prePoisonHp)

  // D17:毒 tick 杀敌也淡出(sdlpal fight.c:1664 毒后 PAL_BattlePostActionCheck → fFade → FadeScene)。
  //   开淡出 hold;phase 照常转(won/selectAction),下 tick 顶层 tickBattleFade 先暂停放完淡出。
  checkEnemyDeaths(state, bus)

  const aliveCount = state.players.filter(
    (p) => (res.playerRoles.roles[p.roleId]?.hp ?? 0) > 0,
  ).length
  const enemyAlive = state.enemies.filter((e) => e.e.health > 0).length

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
  // B2 c5 / D24:每轮衰减隐身(CLASSIC 每轮 -1,到 0 = 隐身结束;fight.c:1670-1672)
  decrementHidingEffect(state)
  state.turn++
  // 备份本轮已选 action 供 Repeat(R 键)重提(sdlpal fight.c:1434-1437 prevAction backup),再清。
  state.prevActions = new Map(state.pendingActions)
  // R 跨战斗:同步持久到 gs(sdlpal prevAction 全局不重置)→ 下一场战斗带入"上场最后一回合"。
  gs.prevBattleActions = new Map(state.prevActions)
  state.pendingActions.clear()
  // defend 单轮失效(sdlpal `fight.c:1604` `g_Battle.rgPlayer[i].fDefending = FALSE`)
  state.players.forEach((p) => {
    p.defending = false
  })
  // 清完 defending 立刻复位姿势 → 防御方下一帧回站立(frame 0),不再把防御姿带进下一轮
  //   (user 2026-05-31 实测:一回合结束后还保持防御姿)。sdlpal fight.c:1602-1609 同序(清 fDefending
  //   + 复位 pos),姿势随每帧 PAL_BattleUpdateFighters 即回站立。
  resetFightersAfterAction(state, res.playerRoles)
  // 进下一轮选择 —— 起第一个队员的菜单(= PAL_BattleUIPlayerReady;fAutoAttack 跨轮保持)。
  state.phase = 'selectAction'
  startPlayerSelection(state, 0)
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
  state.battleDialogQueue = undefined

  // won 走结算演出(buildBattleWonSettlement + tickBattleSettlement),不经此函数;此处只处理
  // lost / fleed / forced(watchdog 强退)。回写 HP/MP 战果 → runtime(伤害/治疗持久化 + 存档对齐)。
  // sdlpal 战败**不复活**:script.c:3320 战败 → 死亡脚本(0x4F 红屏 + 0x4E 读档恢复存档)。
  //   旧 M3 简版在此把全员 hp 重置为 1(伪复活)→ 死员变"活着站立"(配合渲染读 live roles = "起立")。
  //   已删。死员保持 hp=0,present 据此画倒下帧;真正恢复靠 0x4E 读档。
  writeBackBattleRolesToRuntime(res.playerRoles, gs.PlayerRolesRuntime, gs.partyMembers)
  // forced(watchdog 强退)按"胜"接回(续跑下一条);否则按 phase 分支(lost→op[1] / fleed→op[2])。
  finalizeBattleCleanup(gs, forced ? 'won' : (state.phase === 'lost' ? 'lost' : 'fled'))
}

/** 战斗收尾清状态(won 结算放完 / lost / fleed / forced 共用)→ 回 explore;0x07 触发的战斗接回触发脚本。 */
function finalizeBattleCleanup(gs: GameState, outcome: BattleOutcome): void {
  // D21 sdlpal battle.c:1822-1830(无条件 won/lost/fleed):清 player status + 毒 + 临时 Extra 装备效果。
  //   - PAL_ClearAllPlayerStatus:ts 战斗 status 是 battle-local(随 gs.battleState=undefined 丢弃)
  //     → 自动满足,无需显式清(若未来 status 持久化到 gs 再补 clearAllPlayerStatus≤999)。
  //   - 每角色 PAL_CurePoisonByLevel(w, 3):清持久 gs.rgPoisonStatus(level≤3 = 全部,毒等级上限 3)。
  //   - 每角色 PAL_RemoveEquipmentEffect(w, kBodyPartExtra):清 per-battle 临时 Extra 装备效果槽。
  //     0x30 临时 stat buff 写 rgEquipmentEffect[6](Extra)→ 本清反转之(2026-05-31 D14/0x30 收口)。
  const kBodyPartExtra = 6 // sdlpal global.h BODYPART:kBodyPartExtra = MAX_PLAYER_EQUIPMENTS
  for (const roleId of gs.partyMembers) {
    curePlayerPoisonByLevel(gs, roleId, 3)
    removeEquipmentEffect(gs, roleId, kBodyPartExtra)
  }

  // B4(3):持久 fAutoBattle 单场有效 —— 战斗结束清(sdlpal script.c:3332 `fAutoBattle = FALSE`)。
  gs.fAutoBattle = false

  // 战斗内对话用的是复用大世界 gs.dialogBox —— 战斗结束清掉,避免泄漏进 explore 渲染。
  gs.dialogBox = undefined
  gs.dialogBoxKept = undefined
  // 战斗法术脚本(如斩龙诀)可能跑 0x35 ShakeScreen / 0x71 WaveScreen 写**全局** gs.shakeTime/
  //   wScreenWave —— 战斗结束须清,否则竖向抖动/屏波泄漏进大世界(user 2026-06-03 报斩龙诀杀敌回
  //   大世界后屏幕仍上下抖)。sdlpal VIDEO_ShakeScreen 在战斗内同步阻塞放完不留尾;ts 异步逐帧
  //   自减,战斗提前结束会残留 → 此处归零。
  gs.shakeTime = 0
  gs.shakeLevel = 0
  gs.wScreenWave = 0
  gs.sWaveProgression = 0
  gs.mode = 'explore'
  gs.battleState = undefined
  setBattleResources(gs, undefined)
  // 清 injected runScript(若有)
  delete (gs as unknown as Record<string, RunScriptFn | undefined>).__battleRunScript
  // 0x07 触发的战斗 → 接回触发脚本(胜→下一条跑 0x52 隐藏怪 / 负→op[1] / 逃→op[2],script.c:3318-3331)。
  //   会把 gs.mode 改回 'event' + 设 eventCursor;非 0x07 触发(dev panel / 0x07 无 resume)→ no-op 留 explore。
  resumePostBattleScript(gs, outcome)
}

/**
 * D11b phase==='won' 首 tick:处理战果 + 建结算演出序列(对照 PAL_BattleWon battle.c:1025-1328)。
 *  1. 回写战斗 HP/MP → runtime(先于升级,升级读 runtime 判活 + 满血)
 *  2. Phase A exp/cash 屏(iExpGained>0)+ dwCash += cash
 *  3. battleWonLevelUp 升级数据(写 runtime)→ 每升级队员排 Phase B 升级 box,其后排该队员 Phase D 练成屏
 * 不在此 finalize;顶层 tickBattleSettlement 逐屏放完后才 finishBattleWon(Phase F 半血 + cleanup)。
 */
function buildBattleWonSettlement(gs: GameState, state: BattleState, res: BattleResources): void {
  // 1. 回写战斗 HP/MP → runtime(伤害/治疗持久化 + 存档对齐;升级读 runtime hp 判活 + 满血)
  writeBackBattleRolesToRuntime(res.playerRoles, gs.PlayerRolesRuntime, gs.partyMembers)

  const screens: BattleSettlementScreen[] = []
  // Phase A:获得经验值 / 打败敌人得文钱(battle.c:1025;仅 iExpGained>0)
  if (state.expGained > 0)
    screens.push({ kind: 'exp-cash', expGained: state.expGained, cashGained: state.cashGained, isBoss: state.isBoss })
  // 加 cash(battle.c:1054,无条件)
  gs.dwCash += state.cashGained

  // 升级数据 + 排升级/练成屏(sdlpal 顺序:per 队员先 Phase B 升级 box,再该队员 Phase D 练成屏)
  const results = battleWonLevelUp({
    gs,
    partyMembers: gs.partyMembers,
    expGained: state.expGained,
    levelUpExp: res.levelUpExp ?? [],
    levelUpMagic: res.levelUpMagic ?? [],
    rng: state.rng,
  })
  for (const r of results) {
    const name = res.playerRoles.roles[r.roleId]?._name ?? `role#${r.roleId}`
    if (r.snapshot)
      screens.push({ kind: 'level-up', data: { ...r.snapshot, name } })
    // E04:隐藏属性涨点 box(sdlpal CHECK_HIDDEN_EXP battle.c:1264-1273)— 主升级 box 之后、学法术之前,逐属性一屏。
    for (const g of r.hiddenExpGrowth ?? [])
      screens.push({ kind: 'hidden-exp-up', data: { roleId: r.roleId, name, statLabelWord: g.statLabelWord, delta: g.delta } })
    for (const magicId of r.learnedMagics) {
      const magicName = res.spells.find((s) => s.id === magicId)?._name ?? `仙术#${magicId}`
      screens.push({ kind: 'learn-magic', data: { roleId: r.roleId, name, magicName } })
    }
  }

  state.settlement = { screens, index: 0, shownMs: 0 }
}

/**
 * D11b 结算演出放完(index 越界)→ Phase F 每战后半血恢复(battle.c:1342-1372 PAL_CLASSIC:
 * HP += (maxHP-HP)/2,MP 同)+ finalize → explore。
 *
 * B2 c6:Phase E post-battle scriptOnBattleEnd(battle.c:1334-1337)在半血恢复**之前**、
 * 仅胜利时,对每只敌跑一次(返回值**不回写**,与 turnStart/ready 的 show-once 不同)。
 */
function finishBattleWon(gs: GameState, state: BattleState, res: BattleResources, bus: CommandBus): void {
  // B2 c6:逐敌跑 scriptOnBattleEnd(battle.c:1334-1337,在半血恢复前)。胜利时全敌已死,
  //   但 sdlpal 仍对 i=0..wMaxEnemyIndex 跑(不按 health 过滤);返回值不回写。
  for (let ei = 0; ei < state.enemies.length; ei++) {
    const en = state.enemies[ei]
    if (!en || (en.scriptOnBattleEnd ?? 0) <= 0) continue
    getRunScript(gs)({
      commands: res.commands,
      ip: en.scriptOnBattleEnd,
      bus,
      runtimeMode: 'battle',
      battleCtx: {
        state,
        caster: { type: 'enemy', idx: ei },
        summonTables: { enemies: res.enemies, enemyObjects: res.enemyObjects },
        gs,
      },
    })
  }

  const rt = gs.PlayerRolesRuntime
  for (const roleId of gs.partyMembers) {
    const maxHP = rt.rgwMaxHP[roleId] ?? 0
    const hp = rt.rgwHP[roleId] ?? 0
    rt.rgwHP[roleId] = hp + Math.floor((maxHP - hp) / 2)
    const maxMP = rt.rgwMaxMP[roleId] ?? 0
    const mp = rt.rgwMP[roleId] ?? 0
    rt.rgwMP[roleId] = mp + Math.floor((maxMP - mp) / 2)
  }
  finalizeBattleCleanup(gs, 'won')
}

/**
 * D11b 结算演出 hold(phase-agnostic,同 tickBattleDialog 模式)。settlement active → 暂停一切战斗推进,
 * 逐屏显示(每屏等任意键 / 超时自动翻,sdlpal PAL_WaitForAnyKey)。放完 → finishBattleWon → explore。
 * 返回 true = 本 tick 被结算占用(tickBattle 早退)。
 */
export function tickBattleSettlement(
  state: BattleState,
  gs: GameState,
  input: InputSnapshot,
  res: BattleResources,
  bus: CommandBus,
): boolean {
  const s = state.settlement
  if (!s) return false
  // 等键是合法玩家等待(非卡死)→ 清 stall 计数,避免被 60s 看门狗强退。
  state.phaseStallTicks = 0

  if (s.index >= s.screens.length) {
    finishBattleWon(gs, state, res, bus) // 放完 → scriptOnBattleEnd + 半血恢复 + 收尾回 explore
    return true
  }

  s.shownMs += BATTLE_DT
  const screen = s.screens[s.index]!
  const timeoutMs = settlementScreenTimeoutMs(screen)
  const anyKey = input.pressed.size > 0
  // 首帧(shownMs==BATTLE_DT)不收键,避免上个动作残留 Confirm 同帧误推下一屏。
  if ((anyKey && s.shownMs > BATTLE_DT) || s.shownMs >= timeoutMs) {
    s.index++
    s.shownMs = 0
  }
  return true
}

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
  key: 'rgHealthExp' | 'rgMagicExp' | 'rgAttackExp' | 'rgMagicPowerExp' | 'rgDefenseExp' | 'rgDexterityExp' | 'rgFleeExp'
  stat: 'rgwMaxHP' | 'rgwMaxMP' | 'rgwAttackStrength' | 'rgwMagicStrength' | 'rgwDefense' | 'rgwDexterity' | 'rgwFleeRate'
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
export interface HiddenExpGrowthResult { stat: string; label: string; statLabelWord: number; delta: number }

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
    if (delta > 0) results.push({ stat: p.stat, label: p.label, statLabelWord: p.statLabelWord, delta })
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
    if ((rt.rgwHP[roleId] ?? 0) <= 0)
      continue // 死人不获 exp / 不升级(battle.c:1093)

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
      if (threshold === undefined || threshold <= 0 || dwExp < threshold)
        break
      dwExp -= threshold
      if (level >= LEVELUP_MAX_LEVELS)
        continue // 满级:继续扣 exp 不再升(battle.c:1110 `if (level < MAX)`)
      leveled = true
      level++
      rt.rgwLevel[roleId] = level
      // PAL_PlayerLevelUp stat 成长(global.c:2347-2454)
      rt.rgwMaxHP[roleId] = (rt.rgwMaxHP[roleId] ?? 0) + 10 + rng.rangeInclusive(0, 7)
      rt.rgwMaxMP[roleId] = (rt.rgwMaxMP[roleId] ?? 0) + 8 + rng.rangeInclusive(0, 5)
      rt.rgwAttackStrength[roleId] = (rt.rgwAttackStrength[roleId] ?? 0) + 4 + rng.rangeInclusive(0, 1)
      rt.rgwMagicStrength[roleId] = (rt.rgwMagicStrength[roleId] ?? 0) + 4 + rng.rangeInclusive(0, 1)
      rt.rgwDefense[roleId] = (rt.rgwDefense[roleId] ?? 0) + 2 + rng.rangeInclusive(0, 1)
      rt.rgwDexterity[roleId] = (rt.rgwDexterity[roleId] ?? 0) + 2 + rng.rangeInclusive(0, 1)
      rt.rgwFleeRate[roleId] = (rt.rgwFleeRate[roleId] ?? 0) + 2
      for (const arr of [rt.rgwMaxHP, rt.rgwMaxMP, rt.rgwAttackStrength, rt.rgwMagicStrength, rt.rgwDefense, rt.rgwDexterity, rt.rgwFleeRate]) {
        if ((arr[roleId] ?? 0) > LEVELUP_STAT_CAP)
          arr[roleId] = LEVELUP_STAT_CAP
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
        hp: { old: oldHP, oldMax: oldMaxHP, cur: rt.rgwHP[roleId] ?? 0, curMax: rt.rgwMaxHP[roleId] ?? 0 },
        mp: { old: oldMP, oldMax: oldMaxMP, cur: rt.rgwMP[roleId] ?? 0, curMax: rt.rgwMaxMP[roleId] ?? 0 },
        attack: { old: oldAtkBase + (effAtk - (rt.rgwAttackStrength[roleId] ?? 0)), cur: effAtk },
        magic: { old: oldMagBase + (effMag - (rt.rgwMagicStrength[roleId] ?? 0)), cur: effMag },
        defense: { old: oldDefBase + (effDef - (rt.rgwDefense[roleId] ?? 0)), cur: effDef },
        dexterity: { old: oldDexBase + (effDex - (rt.rgwDexterity[roleId] ?? 0)), cur: effDex },
        flee: { old: oldFleeBase + (effFlee - (rt.rgwFleeRate[roleId] ?? 0)), cur: effFlee },
      }
    }

    // E04:CHECK_HIDDEN_EXP(battle.c:1226-1293)在主升级 box 之后、学法术之前跑(sdlpal 同序)。
    //   写 rt base + 收集各池涨点供结算屏。隐藏经验有独立 box,不并入主升级 snapshot。
    const hiddenExpGrowth = applyHiddenExpGrowth({ exp: gs.Exp, rt, roleId, expGained, levelUpExp, rng })
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
      if (!m || m.magic === 0 || m.level > level)
        continue
      if (addMagicToRoleRuntime(rt, roleId, m.magic))
        learned.push(m.magic)
    }

    // 升级了 / 学到新法术 / 隐藏属性涨点 → 产出结算条目(present 据此排 level-up box + 隐藏涨点 box + learn-magic 屏)。
    if (leveled || learned.length > 0 || hiddenExpGrowth.length > 0)
      out.push({ roleId, fromLevel, toLevel: level, learnedMagics: learned, snapshot, hiddenExpGrowth })
  }
  return out
}

/** sdlpal `PAL_AddMagic`(global.c:2084):已学 → false;否则填第一个空槽(spell object id)→ true。写 runtime.rgwMagic。 */
function addMagicToRoleRuntime(rt: PlayerRolesRuntime, roleId: number, spellObjId: number): boolean {
  if (roleId < 0 || spellObjId === 0)
    return false
  const rgwMagic = rt.rgwMagic
  for (const slot of rgwMagic) {
    if (slot?.[roleId] === spellObjId)
      return false // 已学
  }
  for (const slot of rgwMagic) {
    if ((slot?.[roleId] ?? 0) === 0) {
      slot[roleId] = spellObjId
      return true
    }
  }
  return false // 槽满
}
