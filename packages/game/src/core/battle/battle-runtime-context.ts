import type {
  Command,
  Enemy,
  EnemyObject,
  EnemyPosTable,
  Item,
  LevelUpMagicEntry,
  Magic,
  ObjectMagicView,
  ObjectPlayerView,
  ObjectPoisonView,
  PlayerRoles,
  Spell,
} from '@type-pal/shared'
import type { RunScriptOptions } from '../event-system.js'
import type { GameState } from '../game-state.js'

/** 战斗运行期间由 shell 装载、core 消费的只读资源表。 */
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
  /** enemyId → ABC.MKF frame0 height(PAL_RLEGetHeight),供命中特效落点与动态敌人刷新。 */
  enemySpriteFrameHeights?: Map<number, number>
  /** ENEMYPOS 表 —— 动态召唤/分裂/变身后刷新敌方 pos/posOriginal。 */
  enemyPos?: EnemyPosTable
  playerRoles: PlayerRoles
  commands: Command[]
  /** rgwBattleEffectIndex[10][2] flat，供玩家物理攻击命中特效取帧。 */
  battleEffectIndex?: number[]
  /** FIRE.MKF magic sprite 帧数；缺失时沿用即时施法路径。 */
  magicSpriteFrameCounts?: Map<number, number>
  /** F.MKF 召唤神精灵帧数；缺失时沿用即时施法路径。 */
  summonSpriteFrameCounts?: Map<number, number>
  /** LevelUpExp[100]；缺失时不进入升级 loop。 */
  levelUpExp?: number[]
  /** LEVELUPMAGIC_ALL[20][5]；缺失时不学习新法术。 */
  levelUpMagic?: LevelUpMagicEntry[][]
}

/** runScript 注入类型（便于测试替换 event-system free function）。 */
export type RunScriptFn = (opts: RunScriptOptions) => number

const BATTLE_RESOURCES_KEY = '__battleResources' as const
const BATTLE_RUN_SCRIPT_KEY = '__battleRunScript' as const

type BattleRuntimeStash = {
  [BATTLE_RESOURCES_KEY]?: BattleResources
  [BATTLE_RUN_SCRIPT_KEY]?: RunScriptFn
}

function getBattleRuntimeStash(gs: GameState): BattleRuntimeStash {
  return gs as unknown as BattleRuntimeStash
}

/** 取当前战斗资源；尚未开战或已经 finalize 时返回 undefined。 */
export function getBattleResources(gs: GameState): BattleResources | undefined {
  return getBattleRuntimeStash(gs)[BATTLE_RESOURCES_KEY]
}

/** startBattle 同步安装资源，finalize 以 undefined 保持旧隐藏字段语义。 */
export function setBattleResources(gs: GameState, resources: BattleResources | undefined): void {
  getBattleRuntimeStash(gs)[BATTLE_RESOURCES_KEY] = resources
}

/**
 * 取战斗中的实时队员 roles。present 必须消费这份含装备 effect 的投影，不能退回静态满血基线。
 */
export function getBattleLiveRoles(gs: GameState): PlayerRoles | undefined {
  return getBattleResources(gs)?.playerRoles
}

/** 只在调用方显式注入时覆盖默认 runner，保持旧 startBattle 行为。 */
export function setBattleRunScript(gs: GameState, runner: RunScriptFn | undefined): void {
  if (runner) getBattleRuntimeStash(gs)[BATTLE_RUN_SCRIPT_KEY] = runner
}

/** 当前战斗的注入 runner 优先，否则使用调用方给出的 event-system runner。 */
export function getBattleRunScript(gs: GameState, fallback: RunScriptFn): RunScriptFn {
  return getBattleRuntimeStash(gs)[BATTLE_RUN_SCRIPT_KEY] ?? fallback
}

/** finalize 后释放本场资源与可选 runner；顺序与旧主控一致。 */
export function clearBattleRuntimeContext(gs: GameState): void {
  const stash = getBattleRuntimeStash(gs)
  stash[BATTLE_RESOURCES_KEY] = undefined
  delete stash[BATTLE_RUN_SCRIPT_KEY]
}
