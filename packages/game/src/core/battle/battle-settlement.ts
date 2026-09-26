import type { InputSnapshot } from '@type-pal/shared'
import type { CommandBus } from '../command-bus.js'
import { runScript } from '../event-system.js'
import { type GameState, writeBackBattleRolesToRuntime } from '../game-state.js'
import { BATTLE_FRAME_TIME } from './anim-timeline.js'
import { finalizeBattleCleanup } from './battle-finalization.js'
import { battleWonLevelUp } from './battle-progression.js'
import { type BattleResources, getBattleRunScript } from './battle-runtime-context.js'
import type { BattleState } from './battle-state.js'

const BATTLE_DT = BATTLE_FRAME_TIME

/**
 * D11b 战斗胜利结算演出数据 —— 对照 sdlpal `PAL_BattleWon`(battle.c:991-1373)的多屏
 * `PAL_WaitForAnyKey` 序列。每个 screen = 一屏(一次等键 / 超时自动翻)。
 *
 * 忠实覆盖(本演出范围):
 *  - exp-cash    = Phase A(battle.c:1025-1048)"获得经验值 N" + "打败敌人得 N 文钱"
 *  - level-up    = Phase B(battle.c:1122-1218)主升级 8 属性 old→new box(修行/体力/真气/
 *                  武术/灵力/防御/身法/吉运),HP/MP 显 cur"/"max
 *  - learn-magic = Phase D(battle.c:1298-1328)"{name} 练成 {magicName}"
 *
 * Phase C 隐藏属性经验与 Phase E `scriptOnBattleEnd` 已由 battle-system 结算链处理;
 * 战后脚本若排入 battle dialog,结算链会等对话播完再退出战斗。
 * 本模块只定义需要等待按键/超时翻页的 screen 数据。
 */

/** 单属性 old(升级前)→ cur(升级后)对。 */
export interface SettlementPair {
  old: number
  cur: number
}

/** HP / MP:cur"/"max,old + 升级后两组。 */
export interface SettlementHPMP {
  old: number
  oldMax: number
  cur: number
  curMax: number
}

/** Phase B 主升级屏数据(单个升级队员)。stat 用 PAL_GetPlayerXxx 有效值(含装备加成)。 */
export interface LevelUpScreenData {
  roleId: number
  /** 角色名渲染串(present 无 PAL_GetWord;直接存 role._name)。 */
  name: string
  level: SettlementPair
  hp: SettlementHPMP
  mp: SettlementHPMP
  attack: SettlementPair
  magic: SettlementPair
  defense: SettlementPair
  dexterity: SettlementPair
  flee: SettlementPair
}

/** Phase D 练成法术屏数据。 */
export interface LearnMagicScreenData {
  roleId: number
  name: string
  /** 法术名渲染串(spell._name)。 */
  magicName: string
}

/** E04 隐藏属性涨点屏数据(sdlpal CHECK_HIDDEN_EXP box,battle.c:1264-1273)。 */
export interface HiddenExpUpScreenData {
  roleId: number
  name: string
  /** 属性名 WORD id(STATUS_LABEL_*:49体力/50真气/51武术/52灵力/53防御/54身法/55吉运)。 */
  statLabelWord: number
  /** 涨点数(本场该属性 +delta)。 */
  delta: number
}

/** 一屏结算(对应 sdlpal 一次 PAL_WaitForAnyKey)。 */
export type BattleSettlementScreen =
  | { kind: 'exp-cash'; expGained: number; cashGained: number; isBoss: boolean }
  | { kind: 'level-up'; data: LevelUpScreenData }
  | { kind: 'hidden-exp-up'; data: HiddenExpUpScreenData }
  | { kind: 'learn-magic'; data: LearnMagicScreenData }

/** 结算演出运行态:挂 BattleState.settlement。won 首 tick 处理战果后建,顶层 hold 逐屏推进。 */
export interface BattleSettlementState {
  screens: BattleSettlementScreen[]
  /** 当前屏 index;>= screens.length → 演出放完,待收尾(Phase F 半血恢复 + finalize)。 */
  index: number
  /** 当前屏已显示毫秒(BATTLE_DT 累计)— 达 timeout 或任意键 → 下一屏。 */
  shownMs: number
  /**
   * Phase E `scriptOnBattleEnd` 是否已运行。脚本可能排入 narration/dialog(如"获得止血草"),
   * 必须只跑一次,并等 tickBattleDialog 播完后再做 Phase F 半血恢复 + finalize。
   */
  postBattleScriptsDone?: boolean
}

/** 当前屏的自动翻页超时(sdlpal `PAL_WaitForAnyKey` timeout):boss exp 屏 5.5s,其余 3s。 */
export function settlementScreenTimeoutMs(screen: BattleSettlementScreen): number {
  if (screen.kind === 'exp-cash') return screen.isBoss ? 5500 : 3000
  return 3000
}

/**
 * D11b phase==='won' 首 tick:处理战果 + 建结算演出序列(对照 PAL_BattleWon battle.c:1025-1328)。
 *  1. 回写战斗 HP/MP → runtime(先于升级,升级读 runtime 判活 + 满血)
 *  2. Phase A exp/cash 屏(iExpGained>0)+ dwCash += cash
 *  3. battleWonLevelUp 升级数据(写 runtime)→ 每升级队员排 Phase B 升级 box,其后排该队员 Phase D 练成屏
 * 不在此 finalize;顶层 tickBattleSettlement 逐屏放完后才 run post scripts + Phase F 半血 + cleanup。
 */
export function buildBattleWonSettlement(
  gs: GameState,
  state: BattleState,
  res: BattleResources,
): void {
  // 1. 回写战斗 HP/MP → runtime(伤害/治疗持久化 + 存档对齐;升级读 runtime hp 判活 + 满血)
  writeBackBattleRolesToRuntime(res.playerRoles, gs.PlayerRolesRuntime, gs.partyMembers)

  const screens: BattleSettlementScreen[] = []
  // Phase A:获得经验值 / 打败敌人得文钱(battle.c:1025;仅 iExpGained>0)
  if (state.expGained > 0)
    screens.push({
      kind: 'exp-cash',
      expGained: state.expGained,
      cashGained: state.cashGained,
      isBoss: state.isBoss,
    })
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
    if (r.snapshot) screens.push({ kind: 'level-up', data: { ...r.snapshot, name } })
    // E04:隐藏属性涨点 box(sdlpal CHECK_HIDDEN_EXP battle.c:1264-1273)— 主升级 box 之后、学法术之前,逐属性一屏。
    for (const g of r.hiddenExpGrowth ?? [])
      screens.push({
        kind: 'hidden-exp-up',
        data: { roleId: r.roleId, name, statLabelWord: g.statLabelWord, delta: g.delta },
      })
    for (const magicId of r.learnedMagics) {
      const magicName = res.spells.find((s) => s.id === magicId)?._name ?? `仙术#${magicId}`
      screens.push({ kind: 'learn-magic', data: { roleId: r.roleId, name, magicName } })
    }
  }

  state.settlement = { screens, index: 0, shownMs: 0 }
}

/**
 * B2 c6:Phase E post-battle scriptOnBattleEnd(battle.c:1334-1337)在半血恢复**之前**、
 * 仅胜利时,对每只敌跑一次(返回值**不回写**,与 turnStart/ready 的 show-once 不同)。
 */
function runBattleWonPostScripts(
  gs: GameState,
  state: BattleState,
  res: BattleResources,
  bus: CommandBus,
): void {
  // B2 c6:逐敌跑 scriptOnBattleEnd(battle.c:1334-1337,在半血恢复前)。胜利时全敌已死,
  //   但 sdlpal 仍对 i=0..wMaxEnemyIndex 跑(不按 health 过滤);返回值不回写。
  for (let ei = 0; ei < state.enemies.length; ei++) {
    const en = state.enemies[ei]
    if (!en || (en.scriptOnBattleEnd ?? 0) <= 0) continue
    getBattleRunScript(
      gs,
      runScript,
    )({
      commands: res.commands,
      ip: en.scriptOnBattleEnd,
      bus,
      runtimeMode: 'battle',
      battleCtx: {
        state,
        caster: { type: 'enemy', idx: ei },
        summonTables: { enemies: res.enemies, enemyObjects: res.enemyObjects },
        enemyPos: res.enemyPos,
        enemySpriteFrameHeights: res.enemySpriteFrameHeights,
        gs,
      },
    })
  }
}

/**
 * D11b 结算与 Phase E 脚本都完成后 → Phase F 每战后半血恢复(battle.c:1342-1372 PAL_CLASSIC:
 * HP += (maxHP-HP)/2,MP 同)+ finalize → explore。
 */
function finishBattleWon(gs: GameState): void {
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
    if (!s.postBattleScriptsDone) {
      runBattleWonPostScripts(gs, state, res, bus) // Phase E:scriptOnBattleEnd 可排入 battleDialogQueue。
      s.postBattleScriptsDone = true
      if ((state.battleDialogQueue?.length ?? 0) > 0 || gs.dialogBox) return true
    }
    if ((state.battleDialogQueue?.length ?? 0) > 0 || gs.dialogBox) return true
    finishBattleWon(gs) // scriptOnBattleEnd 的对话放完 → 半血恢复 + 收尾回 explore
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
