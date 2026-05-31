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

import type { Command, Item, Magic, ObjectMagicView, ObjectPoisonView, PlayerRoles } from '@type-pal/shared'
import type { CommandBus } from '../../command-bus.js'
import type { RunScriptOptions } from '../../event-system.js'
import type { GameState } from '../../game-state.js'
import type { BattleState } from '../battle-state.js'

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
}

/**
 * 执行一次投掷物:
 *  1. 查 item;scriptOnThrow=0 → 不可投掷 → warn + 早退。
 *  2. 队员投 → 检查 inventory(count>0;敌人不 track inventory)。
 *  3. 跑 scriptOnThrow(runtimeMode='battle' + battleCtx 注入 caster/target/magicTables)。
 *  4. 跑完后扣 1(sdlpal 投掷物 consuming;`PAL_AddItemToInventory(-1)` 在脚本之后)。
 */
export function performThrowItem(input: PerformThrowItemInput): void {
  const item = input.items.find(it => it.id === input.itemId)
  if (!item) {
    console.warn(`[throw-item] item id ${input.itemId} not found`)
    return
  }
  if (item.scriptOnThrow === 0) {
    console.warn(`[throw-item] item ${input.itemId} not throwable (scriptOnThrow=0)`)
    return
  }

  // —— 队员投:检查 inventory(敌人不 track) ——
  let entry: { itemId: number, count: number } | undefined
  if (!input.casterIsEnemy) {
    entry = input.gs.inventory.find(e => e.itemId === input.itemId)
    if (!entry || entry.count === 0) {
      console.warn(`[throw-item] no inventory for item ${input.itemId}`)
      return
    }
  }

  // —— 跑 scriptOnThrow(battleCtx 注入 caster / target / magicTables) ——
  const targetCtx
    = input.targetIdx === 'all'
      ? undefined // 全体:由 0x42 的 applyToAll flag / 自动选敌处理
      : { type: 'enemy' as const, idx: input.targetIdx }

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
    },
  })

  // —— 消耗 1(sdlpal:脚本之后 PAL_AddItemToInventory(-1)) ——
  if (entry)
    entry.count--
}
