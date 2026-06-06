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
  if (screen.kind === 'exp-cash')
    return screen.isBoss ? 5500 : 3000
  return 3000
}
