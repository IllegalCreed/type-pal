import type { InputSnapshot } from '@type-pal/shared'
import type { CommandBus } from '../command-bus.js'
import { runScript } from '../event-system.js'
import {
  type GameState,
  projectRuntimeToBattleRoles,
  writeBackBattleRolesToRuntime,
} from '../game-state.js'
import { getWord } from '../word-lookup.js'
import { BATTLE_FRAME_TIME } from './anim-timeline.js'
import { finalizeBattleCleanup } from './battle-finalization.js'
import { battleWonLevelUp } from './battle-progression.js'
import { type BattleResources, getBattleRunScript } from './battle-runtime-context.js'
import type { LevelUpScreenData } from './battle-settlement-data.js'
import type { BattleState } from './battle-state.js'

const BATTLE_DT = BATTLE_FRAME_TIME

/**
 * D11b 战斗胜利结算演出数据 —— 对照 sdlpal `PAL_BattleWon`(battle.c:991-1373)的多屏
 * `PAL_WaitForAnyKey` 序列。每个 screen = 一屏(一次等键 / 超时自动翻)。
 *
 * 本模块组织的结算屏:
 *  - exp-cash    = Phase A(battle.c:1025-1048)"获得经验值 N" + "打败敌人得 N 文钱"
 *  - level-up    = Phase B(battle.c:1122-1218)主升级 8 属性 old→new box(修行/体力/真气/
 *                  武术/灵力/防御/身法/吉运),HP/MP 显 cur"/"max
 *  - hidden-exp-up = Phase C(battle.c:1226-1293)逐属性隐藏经验涨点屏
 *  - learn-magic = Phase D(battle.c:1298-1328)"{name} 练成 {magicName}"
 *
 * battle-system 在 won 首 tick 调用 build,其后将 tick 委托给本模块的 hold。
 * progression 负责主/隐藏经验数值;本模块负责排屏、等键/超时、Phase E 战后脚本与 Phase F 恢复。
 * 脚本产生的对话由宿主 dialog hold 播放,本模块等队列和 active box 都结束后再恢复/cleanup。
 */

export type {
  LevelUpScreenData,
  SettlementHPMP,
  SettlementPair,
} from './battle-settlement-data.js'

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

// 只属于当前结算执行的续跑位置。settlement也被V1序列化,游标不能加到其数据合同中。
// 本模块独占读写,以本场结算对象隔离;结束时删除,中断后随结算对象回收,不持有GS/资源。
const nextPostBattleEnemy = new WeakMap<BattleSettlementState, number>()

/** 当前屏的自动翻页超时(sdlpal `PAL_WaitForAnyKey` timeout):boss exp 屏 5.5s,其余 3s。 */
export function settlementScreenTimeoutMs(screen: BattleSettlementScreen): number {
  if (screen.kind === 'exp-cash') return screen.isBoss ? 5500 : 3000
  return 3000
}

/**
 * D11b phase==='won' 首 tick:处理战果 + 建结算演出序列(对照 PAL_BattleWon battle.c:1025-1328)。
 *  1. 回写战斗 HP/MP → runtime(先于升级,升级读 runtime 判活 + 满血)
 *  2. Phase A exp/cash 屏(iExpGained>0)+ dwCash += cash
 *  3. battleWonLevelUp 写 runtime → 按队伍顺序逐人排 Phase B 主升级、C 隐藏涨点、D 练成屏
 *     (未主升级也可能有隐藏涨点或补学法术)。
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

  // 数值委托 progression,屏按队伍逐人组织:B 主升级 → C 隐藏涨点 → D 练成。
  const results = battleWonLevelUp({
    gs,
    partyMembers: gs.partyMembers,
    expGained: state.expGained,
    levelUpExp: res.levelUpExp ?? [],
    levelUpMagic: res.levelUpMagic ?? [],
    rng: state.rng,
  })
  for (const r of results) {
    const name = getWord(
      res.playerRoles.roles[r.roleId]?.name ?? -1,
      res.playerRoles.roles[r.roleId]?._name ?? `role#${r.roleId}`,
    )
    if (r.snapshot) screens.push({ kind: 'level-up', data: { ...r.snapshot, name } })
    // E04:隐藏属性涨点 box(sdlpal CHECK_HIDDEN_EXP battle.c:1264-1273)— 主升级 box 之后、学法术之前,逐属性一屏。
    for (const g of r.hiddenExpGrowth ?? [])
      screens.push({
        kind: 'hidden-exp-up',
        data: { roleId: r.roleId, name, statLabelWord: g.statLabelWord, delta: g.delta },
      })
    for (const magicId of r.learnedMagics) {
      const magicName = getWord(
        magicId,
        res.spells.find((s) => s.id === magicId)?._name ?? `magic#${magicId}`,
      )
      screens.push({ kind: 'learn-magic', data: { roleId: r.roleId, name, magicName } })
    }
  }

  state.settlement = { screens, index: 0, shownMs: 0 }
}

/**
 * B2 c6:Phase E post-battle scriptOnBattleEnd(battle.c:1334-1337)在半血恢复**之前**、
 * 仅胜利时,对每只敌跑一次(返回值**不回写**,与 turnStart/ready 的 show-once 不同)。
 * 本敌的队列和active提示结束后才进下一槽;单条脚本内部仍由现有runner同步执行。
 */
function advanceBattleWonPostScripts(
  gs: GameState,
  state: BattleState,
  res: BattleResources,
  bus: CommandBus,
  settlement: BattleSettlementState,
): void {
  // 战斗HP/MP已在build时回写,升级随后可能改上限/当前值。Phase E起以runtime为唯一Owner:
  // raw属性指令直接写runtime,战斗治疗指令写role;两者必须逐指令互见,不能在脚本末用旧快照回填。
  // 保留playerRoles容器供战后对话呈现读取;资源随cleanup释放,普通战中仍使用原可写投影。
  const nextEnemy = nextPostBattleEnemy.get(settlement)
  if (nextEnemy === undefined) {
    const runtime = gs.PlayerRolesRuntime
    const projected = projectRuntimeToBattleRoles(runtime, res.playerRoles, gs.rgEquipmentEffect)
    res.playerRoles.roles = projected.roles.map((role) => ({
      ...role,
      get hp() {
        return runtime.rgwHP[role.id] ?? 0
      },
      set hp(value: number) {
        runtime.rgwHP[role.id] = value
      },
      get mp() {
        return runtime.rgwMP[role.id] ?? 0
      },
      set mp(value: number) {
        runtime.rgwMP[role.id] = value
      },
    }))
  }
  // battle.c:1334-1337逐槽执行,不按health/defeated过滤;返回值不回写。
  // 常规全灭和0x89直接置won都走此入口,不能假定所有胜利都由全灭触发。
  for (let ei = nextEnemy ?? 0; ei < state.enemies.length; ei++) {
    const en = state.enemies[ei]
    if (en && (en.scriptOnBattleEnd ?? 0) > 0) {
      getBattleRunScript(
        gs,
        runScript,
      )({
        commands: res.commands,
        ip: en.scriptOnBattleEnd,
        bus,
        runtimeMode: 'battle',
        // PAL_RunTriggerScript(..., i):通用属性指令的默认role上下文是敌槽号,不是我方party[i]。
        eventObjectId: ei,
        battleCtx: {
          state,
          playerRoles: res.playerRoles,
          caster: { type: 'enemy', idx: ei },
          summonTables: { enemies: res.enemies, enemyObjects: res.enemyObjects },
          enemyPos: res.enemyPos,
          enemySpriteFrameHeights: res.enemySpriteFrameHeights,
          gs,
        },
      })
    }
    // 只在脚本正常返回后推进;等当前提示放完时不能重跑本敌或重建HP/MP绑定。
    nextPostBattleEnemy.set(settlement, ei + 1)
    if ((state.battleDialogQueue?.length ?? 0) > 0 || gs.dialogBox) {
      settlement.postBattleScriptsDone = ei + 1 >= state.enemies.length
      if (settlement.postBattleScriptsDone) nextPostBattleEnemy.delete(settlement)
      return
    }
  }
  settlement.postBattleScriptsDone = true
  nextPostBattleEnemy.delete(settlement)
}

/**
 * 结算与 Phase E 脚本都完成后 → Phase F 胜利恢复缺口的一半,再 cleanup/接回事件。
 * battle.c:1342-1372 的 `#if 1//def PAL_CLASSIC` 恒真,不是由 PAL_CLASSIC 开关决定;
 * HP += (maxHP-HP)/2,MP 同。这里读取脚本后的 runtime,不重新回写战斗投影。
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
 * 逐屏显示(每屏等任意键 / 超时自动翻,sdlpal PAL_WaitForAnyKey)。放完 → finishBattleWon → cleanup/接回。
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
    if ((state.battleDialogQueue?.length ?? 0) > 0 || gs.dialogBox) return true
    if (!s.postBattleScriptsDone) {
      advanceBattleWonPostScripts(gs, state, res, bus, s)
    }
    if ((state.battleDialogQueue?.length ?? 0) > 0 || gs.dialogBox) return true
    finishBattleWon(gs) // scriptOnBattleEnd 的对话放完 → 半血恢复 + 收尾回 explore
    return true
  }

  s.shownMs += BATTLE_DT
  const screen = s.screens[s.index]!
  const timeoutMs = settlementScreenTimeoutMs(screen)
  const anyKey = input.pressed.size > 0
  // TS逐tick的残键防护:首帧不收pressed;C的PAL_WaitForAnyKey在进入时清键(play.c:603-639)。
  if ((anyKey && s.shownMs > BATTLE_DT) || s.shownMs >= timeoutMs) {
    s.index++
    s.shownMs = 0
  }
  return true
}
