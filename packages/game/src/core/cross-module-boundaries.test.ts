/**
 * 第一阶段跨模块合同:库存实例隔离与id0边界、装备写入后的战斗投影、装备脚本目录消费。
 * 地图identity→对话历史的同合同由dependency-ownership.test.ts保留,不在此重复。
 */

import type { Item } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { makeHEnemy, makeHField, makeHRole } from '../__tests__/glm-next-wave/H/harness.js'
import { dispatchBattleOpcode } from './battle/battle-opcodes.js'
import { createBattleState } from './battle/battle-state.js'
import {
  getPlayerAttackStrength,
  updateAllEquipments,
  writeEquipmentEffectField,
} from './equip-effect.js'
import type { BattleCtx } from './event-system.js'
import { addItemToInventory, getGlobalCommands, setGlobalEvents } from './event-system.js'
import {
  createInitialGameState,
  hydratePlayerRolesRuntime,
  projectRuntimeToBattleRoles,
} from './game-state.js'
import { createSeedableRng } from './rng.js'

describe('G07 第一阶段模块边界', () => {
  test('G07-02 event-system addItemToInventory：真实入账 + id0 拒收 + 两独立 GameState 互不串扰', () => {
    const gsA = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const gsB = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    addItemToInventory(gsA, 5, 2)
    expect(gsA.inventory).toEqual([{ itemId: 5, count: 2 }])
    expect(gsB.inventory).toEqual([]) // 实例隔离
    addItemToInventory(gsA, 0, 3) // id 0 绝不入库（sdlpal global.c 守卫）
    expect(gsA.inventory).toEqual([{ itemId: 5, count: 2 }])
  })

  test('G07-03 装备派生进战斗 opcode：0x30 重算快照消费 writeEquipmentEffectField 派生值', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const roleId = 0
    gs.partyMembers = [roleId]
    const baseline = { roles: [makeHRole(roleId)] }
    hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, baseline)
    const playerRoles = projectRuntimeToBattleRoles(
      gs.PlayerRolesRuntime,
      baseline,
      gs.rgEquipmentEffect,
    )
    const state = createBattleState({
      gs,
      playerRoles,
      enemies: [makeHEnemy()],
      field: makeHField(),
      isBoss: false,
      rng: createSeedableRng(7),
    })
    const base = getPlayerAttackStrength(gs, roleId)
    writeEquipmentEffectField(gs, 1, 17, roleId, 7)
    expect(getPlayerAttackStrength(gs, roleId)).toBe(base + 7)
    expect(playerRoles.roles[roleId]!.attackStrength).toBe(base) // 开战快照在装备写入之前
    const ctx: BattleCtx = { state, gs, playerRoles }
    // 0x30 row17 op1=0%（0% 增益）→ Extra 槽写 0，快照重算值唯一来源 = 装备派生 getter
    const result = dispatchBattleOpcode(0x0030, [17, 0, 1], ctx)
    expect(result.consumed).toBe(true)
    // 战斗 opcode 消费装备派生值：快照从 base 重算为 base+7
    expect(ctx.playerRoles?.roles[roleId]?.attackStrength).toBe(base + 7)
  })

  test('G07-04 装备脚本经 event 表执行：scriptOnEquip → 全局命令表 → 效果层 → 派生 getter', () => {
    // 补齐工作包「装备脚本经 event 表执行」中间链：updateAllEquipments 按全局事件表的
    // L_<scriptOnEquip> 入口跑 0x17（equip-effect.ts 内 runEquipScriptSync 读 getGlobalCommands），
    // 写 rgEquipmentEffect 效果层 → getPlayerAttackStrength 含脚本写入值。
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const base = getPlayerAttackStrength(gs, 0)
    // 全局事件表（event 表）：入口 L_90001 = 0x17 写效果层（op0=0x0c → 部位1，row17 攻击，+7）
    const previousEvents = [...getGlobalCommands()]
    try {
      setGlobalEvents([
        { label: 'L_90001', op: 'raw', opcode: 0x17, operands: [0x0c, 17, 7] },
        { op: 'end' },
      ])
      gs.PlayerRolesRuntime.rgwEquipment[1]![0] = 777 // role0 的槽 1 已装 id=777
      const equip: Item = {
        id: 777,
        bitmap: 0,
        price: 0,
        scriptOnUse: 0,
        scriptOnEquip: 90001,
        scriptOnThrow: 0,
        scriptDesc: 0,
        flags: {
          usable: false,
          equipable: true,
          throwable: false,
          consuming: false,
          applyToAll: false,
          sellable: false,
          equipableBy: [true, false, false, false, false, false],
        },
      }
      updateAllEquipments(gs, [equip])
      // 装备脚本经 event 表真实执行：0x17 效果层写入经派生 getter 可见（base → base+7）
      expect(getPlayerAttackStrength(gs, 0)).toBe(base + 7)
    } finally {
      setGlobalEvents(previousEvents)
    }
  })
})
