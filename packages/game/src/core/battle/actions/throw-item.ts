/**
 * 投掷物 perform —— E2(战斗投掷物,kBattleActionThrowItem)。
 *
 * 对照 sdlpal `fight.c:4332-4376`:
 *   PAL_RunTriggerScript(item.wScriptOnThrow, (WORD)sTarget);  // eventObjectID = 目标敌人
 *   PAL_AddItemToInventory(wObject, -1);                       // 投掷物消耗 1
 *
 * 与 `performItem`(use 物品,scriptOnUse)的区别:
 *   - 跑 `item.scriptOnThrow`(不是 scriptOnUse)。
 *   - 注入 `battleCtx.magicTables`(magics + objectMagics)—— scriptOnThrow 几乎都跑
 *     `0x42 SimulateMagic`,需 magic 表解析 op0(magic object id → magicNumber/baseDamage)。
 *   - `battleCtx.target` = 被掷敌人(0x42 op2=0 时当 eventObjectID 用)。
 *
 * 43 个投掷物(天师符/风灵符/梅花镖/银针/各种卵·蛊·毒草)的 scriptOnThrow 都靠这条。
 */

import type {
  Command,
  Item,
  Magic,
  ObjectMagicView,
  ObjectPoisonView,
  PlayerRoles,
} from '@type-pal/shared'
import type { CommandBus } from '../../command-bus.js'
import type { RunScriptOptions } from '../../event-system.js'
import type { GameState } from '../../game-state.js'
import { buildThrowWindupTimeline } from '../anim-timeline.js'
import { startBattleAnim } from '../battle-anim-driver.js'
import type { BattleAnimFrame, BattleState } from '../battle-state.js'

/** 注入的 runScript 函数(同 performItem;测试可 mock,默认 event-system.runScript)。 */
export type RunScriptFn = (opts: RunScriptOptions) => void

export interface PerformThrowItemInput {
  state: BattleState
  /** GameState(扣 inventory 用)。 */
  gs: GameState
  /** caster 是敌人(true)还是队员(false)。投掷实践上是队员。 */
  casterIsEnemy: boolean
  /** caster 在 state.enemies / state.players 里的索引。 */
  casterIdx: number
  /** 投掷的物品 id(对应 Item.id)。 */
  itemId: number
  /** 被掷目标敌人索引或全体('all')。0x42 op2=0 时当 eventObjectID。 */
  targetIdx: number | 'all'
  /** items 表(items.json)。 */
  items: Item[]
  /** magic 详细表(magic.json)—— 0x42 解析 baseDamage/elemental。 */
  magics: Magic[]
  /** rgObject magic-union 视图(object-magics.json)—— 0x42 解析 op0 magic object id。 */
  objectMagics: ObjectMagicView[]
  /** rgObject poison-union 视图(object-poisons.json)—— 0x28 apply poison 解析 wEnemyScript。 */
  objectPoisons: ObjectPoisonView[]
  /** PlayerRoles —— 0x66 throw weapon 算 w 需 caster 的 attackStrength。 */
  playerRoles: PlayerRoles
  /** Present 命令通道。 */
  bus: CommandBus
  /** events.bin 全局 commands(scriptOnThrow 是其 ip)。 */
  commands: Command[]
  /** EventSystem.runScript 注入。 */
  runScript: RunScriptFn
  /** FIRE.MKF magic sprite 帧数 Map(0x42/0x66 建 OffMagic 特效帧用);省略 → 不建特效动画(向后兼容)。 */
  magicSpriteFrameCounts?: Map<number, number>
  /** enemyId → ABC.MKF frame0 height(PAL_RLEGetHeight),供脚本变身/召唤后保持命中特效落点。 */
  enemySpriteFrameHeights?: Map<number, number>
}

/**
 * 执行一次投掷物:
 *  1. 查 item。
 *  2. 队员投 → 检查 inventory(count>0;敌人不 track inventory)。
 *  3. 跑 scriptOnThrow(runtimeMode='battle' + battleCtx 注入 caster/target/magicTables);
 *     scriptOnThrow=0 时 PAL_RunTriggerScript 为 no-op,仍继续消耗投掷物。
 *  4. 跑完后扣 1(sdlpal 投掷物 consuming;`PAL_AddItemToInventory(-1)` 在脚本之后)。
 */
export function performThrowItem(input: PerformThrowItemInput): void {
  const item = input.items.find((it) => it.id === input.itemId)
  if (!item) {
    console.warn(`[throw-item] item id ${input.itemId} not found`)
    return
  }
  // —— 队员投:检查 inventory(敌人不 track) ——
  let entry: { itemId: number; count: number } | undefined
  if (!input.casterIsEnemy) {
    entry = input.gs.inventory.find((e) => e.itemId === input.itemId)
    if (!entry || entry.count === 0) {
      console.warn(`[throw-item] no inventory for item ${input.itemId}`)
      return
    }
  }

  // —— 投掷挥臂动画前置(sdlpal fight.c:4339-4356,队员投 + 有 posOriginal)——
  //   挥臂(4 步前移 + frame5/6 + 投掷音 rgwMagicSound[role])在 scriptOnThrow(0x42 OffMagic 特效)之前。
  //   有动画 → scriptOnThrow 的 OffMagic 特效帧 + 伤害数字延迟收进缓冲,拼挥臂后一起 startBattleAnim;
  //   无动画(敌投 / 旧 fixture 无 pos)→ 退化即时(向后兼容)。
  const caster = input.state.players[input.casterIdx]
  const hasAnim = !input.casterIsEnemy && !!caster?.posOriginal
  const magicSound = caster ? (input.playerRoles.roles[caster.roleId]?.magicSound ?? 0) : 0
  const windup = hasAnim
    ? buildThrowWindupTimeline(input.casterIdx, caster!.posOriginal!, magicSound, item._name)
    : []
  const pendingAnimFrames: BattleAnimFrame[] = []
  const pendingDamageNums: NonNullable<BattleState['battleAnim']>['pendingDamageNums'] = []

  // —— 跑 scriptOnThrow(battleCtx 注入 caster / target / magicTables) ——
  const targetCtx =
    input.targetIdx === 'all'
      ? undefined // 全体:由 0x42 的 applyToAll flag / 自动选敌处理
      : { type: 'enemy' as const, idx: input.targetIdx }

  if (item.scriptOnThrow !== 0) {
    input.runScript({
      commands: input.commands,
      ip: item.scriptOnThrow,
      bus: input.bus,
      runtimeMode: 'battle',
      battleCtx: {
        state: input.state,
        caster: { type: input.casterIsEnemy ? 'enemy' : 'player', idx: input.casterIdx },
        target: targetCtx,
        magicTables: { magics: input.magics, objectMagics: input.objectMagics },
        objectPoisons: input.objectPoisons, // 0x28 apply poison
        playerRoles: input.playerRoles, // 0x66 throw weapon 算 w 需 caster attackStrength
        gs: input.gs, // raw opcode fall 到 applyRawOpcode(控制流/资源/数据)需 gs
        // 0x28 施毒跑一次 wEnemyScript(sdlpal script.c:1213)+ 蛊孵化链末尾 giveItem 需 commands/runScript
        commands: input.commands,
        runScript: input.runScript as (o: RunScriptOptions) => number,
        enemySpriteFrameHeights: input.enemySpriteFrameHeights,
        // 投掷动画:0x42/0x66 把 OffMagic 特效帧 push 进 pendingAnimFrames;HP-mutate 数字延迟进 pendingDamageNums。
        //   无动画(敌投/无 pos)→ 不传缓冲 → opcode 即时 emit + 音效即时(向后兼容)。
        ...(hasAnim
          ? {
              pendingAnimFrames,
              pendingDamageNums,
              magicSpriteFrameCounts: input.magicSpriteFrameCounts,
            }
          : {}),
      },
    })
  }

  // —— 消耗 1(sdlpal:脚本之后 PAL_AddItemToInventory(-1)) ——
  if (entry) entry.count--

  // —— 拼挥臂 + OffMagic 特效 → startBattleAnim,伤害数字延迟到动画末(sdlpal fight.c:4369 DisplayStatChange)——
  if (hasAnim) {
    const frames = [...windup, ...pendingAnimFrames]
    if (frames.length > 0)
      startBattleAnim(
        input.state,
        frames,
        input.bus,
        pendingDamageNums.length > 0 ? pendingDamageNums : undefined,
      )
    if (input.state.battleAnim) input.state.battleAnim.updateEnemyGesture = true // DM11:玩家动作链
  }
}
