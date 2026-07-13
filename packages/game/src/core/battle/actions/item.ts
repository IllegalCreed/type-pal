/**
 * 物品 perform —— M3 T21。
 *
 * Item action = 跑 `Item.scriptOnUse` + 按 consuming 扣 inventory(经 runScript / EventSystem 处理伤害 /
 * 治疗 / status 等效果)。
 *
 * **效果不写死在 enum** — D17 富模型:不同 item 走不同事件脚本,各种 healHp / cureStatus /
 * dealDamage 等 opcode 由 EventSystem(T17 runScript)调度。
 *
 * **撞到未具名 opcode** 时,runScript D26 兜底:console.debug + ip++ skip。
 * M3 phase 1 测试 fixture 通过(用 `end` 单 op 脚本),T21 implementer 跑真 item.scriptOnUse
 * 时按 console.debug 输出号补具名 opcode handler(可选,延期)。
 *
 * **与 T20 magic 唯一差别**:战斗内按 `kItemFlagConsuming` 扣 `GameState.inventory[].count`
 * (队员 only),不扣 MP,且不看 `g_fScriptSuccess`。大世界 UseItem 才按脚本成功 gate 扣物品。
 * 敌人 cast item(schema 允许,实践罕见)不扣 inventory(敌人不 track inventory)。
 *
 * **API 解释**(同 T20):T17 真实现把 `runScript` 做成 free function 不挂在 class 上,
 * 且需要 `commands` 数组(scriptOnUse 是全局 ip)。本文件遵 T17 真实现:通过 input.runScript +
 * input.commands 注入(便于 unit test mock)。
 */

import type { Command, Item, PlayerRoles } from '@type-pal/shared'
import type { CommandBus } from '../../command-bus.js'
import type { RunScriptOptions } from '../../event-system.js'
import type { GameState } from '../../game-state.js'
import type { BattleState } from '../battle-state.js'

/** 注入的 runScript 函数(T17 free function `runScript`,测试可 mock)。同 T20。 */
export type RunScriptFn = (opts: RunScriptOptions) => unknown

export interface PerformItemInput {
  state: BattleState
  /** GameState(扣 inventory 用)。 */
  gs: GameState
  /** caster 是敌人(true)还是队员(false)。 */
  casterIsEnemy: boolean
  /** caster 在 state.enemies / state.players 里的索引。 */
  casterIdx: number
  /** 使用的物品 id(对应 Item.id)。 */
  itemId: number
  /** target 是敌人(true)还是队员(false)。target='all' 时此字段无意义但保持显式。 */
  targetIsEnemy: boolean
  /** target 索引或全体('all')。 */
  targetIdx: number | 'all'
  /** items 表(items.json)。 */
  items: Item[]
  /** PlayerRoles(部分 script handler 可能需要;item action 自身不读)。 */
  playerRoles: PlayerRoles
  /** Present 命令通道(同 T20;handler 内可 emit)。 */
  bus: CommandBus
  /** events.bin 全局 commands(scriptOnUse 是其 ip)。 */
  commands: Command[]
  /** EventSystem.runScript 注入(T17 free function)。 */
  runScript: RunScriptFn
}

/**
 * 执行一次物品使用:
 *  1. 查 item(items 表 by id)
 *  2. 队员 cast → 检查 inventory(找 entry by itemId,count>0)
 *     (count=0 保留 entry,由 add/sub 命令决定剔除,见 GameState.inventory 注释)
 *     敌人 cast → 不扣(敌人不 track inventory)
 *  3. scriptOnUse!=0 时跑 runScript(runtimeMode='battle' + battleCtx);0 则 no-op
 *  4. 队员 cast 且 item.flags.consuming → 脚本后 count--
 *
 * item 找不到 / 队员无 inventory → console.warn + 早退(不扣 + 不 runScript)。
 */
export function performItem(input: PerformItemInput): void {
  const item = input.items.find((it) => it.id === input.itemId)
  if (!item) {
    console.warn(`[item] item id ${input.itemId} not found`)
    return
  }

  // —— 队员使用:先检查库存;原版战斗 UseItem 在脚本之后才按 consuming 扣(sdlpal fight.c:4387-4400) ——
  let inventoryEntry: { itemId: number; count: number } | undefined
  if (!input.casterIsEnemy) {
    inventoryEntry = input.gs.inventory.find((e) => e.itemId === input.itemId)
    if (!inventoryEntry || inventoryEntry.count === 0) {
      console.warn(`[item] no inventory for item ${input.itemId}`)
      return
    }
  }

  // —— 跑 scriptOnUse(经 runScript,battleCtx 注入 caster / target) ——
  // PAL_RunTriggerScript(0, ...) 是 no-op;战斗 UseItem 仍会继续走 consuming 扣除。
  if (item.scriptOnUse !== 0) {
    const targetCtx =
      input.targetIdx === 'all'
        ? undefined // 全体目标:由 handler 自行循环 state.enemies / players
        : {
            type: input.targetIsEnemy ? ('enemy' as const) : ('player' as const),
            idx: input.targetIdx,
          }

    input.runScript({
      commands: input.commands,
      ip: item.scriptOnUse,
      bus: input.bus,
      runtimeMode: 'battle',
      battleCtx: {
        state: input.state,
        caster: {
          type: input.casterIsEnemy ? 'enemy' : 'player',
          idx: input.casterIdx,
        },
        target: targetCtx,
        // scriptOnUse 里 0x5A halve-player 等需 playerRoles(对齐 performMagic/performThrowItem)。
        playerRoles: input.playerRoles,
        // 未被 dispatchBattleOpcode 消费的 raw opcode fall 到 applyRawOpcode(控制流/资源/数据)需 gs。
        gs: input.gs,
      },
    })
  }

  if (inventoryEntry && item.flags.consuming) inventoryEntry.count--
}
