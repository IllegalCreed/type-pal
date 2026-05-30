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
 * **诚实标注:未覆盖(非本演出范围,各需独立子系统,不在结算 box 里偷偷略过)**:
 *  - Phase C 隐藏属性经验升级(battle.c:1226-1293 `CHECK_HIDDEN_EXP`)—— 需战斗内逐次累积
 *    rgAttackExp/rgHealthExp/… 的 `wCount`,而 `ExpEntry` 当前无 `wCount` 字段(defend.ts
 *    注明 "M3 不实现 exp count")。无累积 → iTotalCount 恒 0 → sdlpal 本就跳过整段,故此演出
 *    缺失等价于「隐藏经验子系统未实现」,不是结算 box 自身的简化。
 *  - Phase E post-battle `scriptOnBattleEnd`(battle.c:1334-1337)—— enemy 脚本已存(battle-state
 *    rgEnemy.scriptOnBattleEnd)但战末未跑;接 explore script runner 是独立任务。
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

/** 一屏结算(对应 sdlpal 一次 PAL_WaitForAnyKey)。 */
export type BattleSettlementScreen =
  | { kind: 'exp-cash'; expGained: number; cashGained: number; isBoss: boolean }
  | { kind: 'level-up'; data: LevelUpScreenData }
  | { kind: 'learn-magic'; data: LearnMagicScreenData }

/** 结算演出运行态:挂 BattleState.settlement。won 首 tick 处理战果后建,顶层 hold 逐屏推进。 */
export interface BattleSettlementState {
  screens: BattleSettlementScreen[]
  /** 当前屏 index;>= screens.length → 演出放完,待收尾(Phase F 半血恢复 + finalize)。 */
  index: number
  /** 当前屏已显示毫秒(BATTLE_DT 累计)— 达 timeout 或任意键 → 下一屏。 */
  shownMs: number
}

/** 当前屏的自动翻页超时(sdlpal `PAL_WaitForAnyKey` timeout):boss exp 屏 5.5s,其余 3s。 */
export function settlementScreenTimeoutMs(screen: BattleSettlementScreen): number {
  if (screen.kind === 'exp-cash')
    return screen.isBoss ? 5500 : 3000
  return 3000
}
