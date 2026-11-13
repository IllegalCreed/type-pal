/**
 * Battle throw coordinator (SDLPal kBattleActionThrowItem): run the object's
 * throw script, consume the current inventory entry, then play windup/effects.
 * Script effects own damage; this module collects their frames and deferred
 * numbers so presentation follows the throw instead of preceding it.
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
import type { GameState } from '../../game-state.js'
import { getItemScriptEntry, setItemScriptEntry } from '../../object-script-state.js'
import { getWord } from '../../word-lookup.js'
import { buildThrowWindupTimeline } from '../anim-timeline.js'
import { delayMs } from '../animation/frames.js'
import { playerRestFrame, startBattleAnim } from '../battle-anim-driver.js'
import type { RunScriptFn } from '../battle-runtime-context.js'
import type { BattleAnimFrame, BattleState, FighterDelta } from '../battle-state.js'

export type { RunScriptFn } from '../battle-runtime-context.js'

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
  /** events/all.json 全局 commands(scriptOnThrow 是原始脚本 IP)。 */
  commands: Command[]
  /** EventSystem.runScript 注入。 */
  runScript: RunScriptFn
  /** FIRE.MKF magic sprite 帧数 Map(0x42/0x66 建 OffMagic 特效帧用);缺帧数时不建FIRE特效，已创建的挥臂仍保留。 */
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
  if (!input.casterIsEnemy) {
    const entry = input.gs.inventory.find((e) => e.itemId === input.itemId)
    if (!entry || entry.count === 0) {
      console.warn(`[throw-item] no inventory for item ${input.itemId}`)
      return
    }
  }

  // —— 投掷挥臂动画前置(sdlpal fight.c:4339-4356,队员投 + 有 posOriginal)——
  //   挥臂(4 步前移 + frame5/6 + 投掷音 rgwMagicSound[role])在 scriptOnThrow(0x42 OffMagic 特效)之前。
  //   有动画 → scriptOnThrow 的 OffMagic 特效帧 + 伤害数字延迟收进缓冲,拼挥臂后一起 startBattleAnim;
  //   没有队员位置时不建挥臂链；脚本副作用由原即时路径消费。
  const caster = input.state.players[input.casterIdx]
  const origin = !input.casterIsEnemy ? caster?.posOriginal : undefined
  const hasAnim = origin !== undefined
  const magicSound = caster ? (input.playerRoles.roles[caster.roleId]?.magicSound ?? 0) : 0
  const windup = origin
    ? buildThrowWindupTimeline(input.casterIdx, origin, magicSound, getWord(item.id, item._name))
    : []
  const pendingAnimFrames: BattleAnimFrame[] = []
  const pendingDamageNums: NonNullable<BattleState['battleAnim']>['pendingDamageNums'] = []

  // —— 跑 scriptOnThrow(battleCtx 注入 caster / target / magicTables) ——
  const targetCtx =
    input.targetIdx === 'all'
      ? undefined // 全体:由 0x42 的 applyToAll flag / 自动选敌处理
      : { type: 'enemy' as const, idx: input.targetIdx }

  const scriptEntry = getItemScriptEntry(input.gs, item, 'scriptOnThrow')
  if (scriptEntry !== 0) {
    const nextEntry = input.runScript({
      commands: input.commands,
      ip: scriptEntry,
      bus: input.bus,
      runtimeMode: 'battle',
      battleCtx: {
        state: input.state,
        caster: { type: input.casterIsEnemy ? 'enemy' : 'player', idx: input.casterIdx },
        target: targetCtx,
        magicTables: { magics: input.magics, objectMagics: input.objectMagics },
        objectPoisons: input.objectPoisons, // 0x28 apply poison
        playerRoles: input.playerRoles, // 嵌套脚本所需战斗视图；0x66裸武术从gs.PlayerRolesRuntime读取
        gs: input.gs, // 0x66裸武术与通用raw控制流/资源/数据读取当前runtime
        // 0x28 施毒跑一次 wEnemyScript(sdlpal script.c:1213)+ 蛊孵化链末尾 giveItem 需 commands/runScript
        commands: input.commands,
        runScript: input.runScript,
        enemySpriteFrameHeights: input.enemySpriteFrameHeights,
        // 投掷动画:0x42/0x66 把 OffMagic 特效帧 push 进 pendingAnimFrames;HP-mutate 数字延迟进 pendingDamageNums。
        //   无挥臂链时不传缓冲，由opcode即时发送数字与音效。
        ...(hasAnim
          ? {
              pendingAnimFrames,
              pendingDamageNums,
              magicSpriteFrameCounts: input.magicSpriteFrameCounts,
            }
          : {}),
      },
    })
    setItemScriptEntry(input.gs, item, 'scriptOnThrow', nextEntry)
  }

  // The script may replace or exhaust the entry. Consume from the current
  // inventory, keeping the ordinary final count=0 row used by the TS menus.
  if (!input.casterIsEnemy) {
    const entry = input.gs.inventory.find((e) => e.itemId === input.itemId)
    if (entry && entry.count > 0) entry.count--
  }

  if (hasAnim) {
    // CLASSIC fight.c:4369–4372 shows the numbers after the effects, then
    // holds four frames before restoring the fighters and four after.
    const restingFighters: FighterDelta[] = input.state.players.map((player, idx) => ({
      side: 'player',
      idx,
      pos: player.defending ? undefined : player.posOriginal,
      currentFrame: playerRestFrame(player, input.playerRoles.roles[player.roleId]),
      iColorShift: 0,
    }))
    input.state.enemies.forEach((enemy, idx) => {
      if (enemy.defeated) return
      restingFighters.push({ side: 'enemy', idx, pos: enemy.posOriginal, iColorShift: 0 })
    })
    startBattleAnim(
      input.state,
      [
        ...windup,
        ...pendingAnimFrames,
        {
          durationMs: delayMs(4),
          ...(pendingDamageNums.length > 0 ? { damageNums: pendingDamageNums } : {}),
        },
        { durationMs: delayMs(4), fighters: restingFighters },
      ],
      input.bus,
    )
    if (input.state.battleAnim) input.state.battleAnim.updateEnemyGesture = true // DM11:玩家动作链
  }
}
