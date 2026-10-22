/**
 * 战斗使用物品：本模块核库存并传递目标，解释器负责物品效果。
 * SDLPal fight.c:4378-4400先对选中角色跑脚本，再按consuming扣库存，不以脚本成功标志为门。
 * 全体目标传0xFFFF；单体目标从战斗队伍槽映射到roleId，不能用施用者或槽号替代。
 * scriptOnUse=0是no-op但仍按consuming扣除；敌人调用不拥有玩家库存。
 */

import type { Command, Item, PlayerRoles } from '@type-pal/shared'
import type { CommandBus } from '../../command-bus.js'
import type { RunScriptOptions } from '../../event-system.js'
import type { GameState } from '../../game-state.js'
import type { BattleState } from '../battle-state.js'

/** battle-system提供本场runner；保留真实解释器或显式注入的同一调用合同。 */
export type RunScriptFn = (opts: RunScriptOptions) => unknown

export interface PerformItemInput {
  state: BattleState
  /** 库存由本模块扣除；同一运行态传给解释器处理效果。 */
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

    let eventObjectId: number | undefined
    if (input.targetIdx === 'all') eventObjectId = 0xffff
    else if (!input.targetIsEnemy) eventObjectId = input.state.players[input.targetIdx]?.roleId

    input.runScript({
      commands: input.commands,
      ip: item.scriptOnUse,
      bus: input.bus,
      runtimeMode: 'battle',
      eventObjectId,
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
