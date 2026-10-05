/**
 * ARCH-REGRESSION-LAB-GLM-1 · G07 第一阶段模块边界（候选回归，隔离实验区；r7 重写）。
 * 验证轴（真实公开跨模块调用链，全部断言既有已核行为；不改角色索引/公式）：
 * - G07-01 scene-system 写 `_currentMapNum` → **event-system 内部消费**：explore 对话提交
 *   pushDialogHistory 时经 scene-system 读当前图号做历史维度（event-system.ts:2160），
 *   切图后新对话以新图号入账 = 写读两侧真实跨模块顺序；
 * - G07-02 event-system `addItemToInventory` 真实入账 + id0 拒收守卫 + 两独立 GameState 互不串扰；
 * - G07-03 装备派生进**战斗 opcode**：equip-effect 生产写入口 `writeEquipmentEffectField`
 *   写攻击槽 → battle-opcodes 0x30（STAT_ROW_BUFF）经 `getPlayerAttackStrength` 重算战斗快照，
 *   快照从 base 变为 base+7 —— 装备派生值被战斗上下文 opcode 真实消费。
 * 去重：event-system.test 326/scene 110/battle-opcodes.test/opcode 158/equip 36 为单模块证据；
 * 本组只证跨 caller 链。
 */

import { dispatchBattleOpcode } from '@lab/game/battle-opcodes'
import type { BattleState } from '@lab/game/battle-state'
import { createCommandBus } from '@lab/game/command-bus'
import {
  getPlayerAttackStrength,
  updateAllEquipments,
  writeEquipmentEffectField,
} from '@lab/game/equip-effect'
import type { BattleCtx } from '@lab/game/event-system'
import { addItemToInventory, setGlobalEvents, tickEventSystem } from '@lab/game/event-system'
import { createInitialGameState, type GameState } from '@lab/game/game-state'
import { getCurrentMapNum, setCurrentMapNum } from '@lab/game/scene-system'
import type { Command, InputSnapshot, Item, PlayerRole } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'

/** 对齐官方 event-system.test 的最小事件装载（同口径三行）。 */
function loadLabEvent(gs: GameState, commands: Command[]): void {
  gs.eventCursor = { commands, labelMap: {}, ip: 0 }
  gs.mode = 'event'
}

function labInput(): InputSnapshot {
  return { held: new Set(), pressed: new Set(), frameNum: 0 }
}

describe('G07 第一阶段模块边界', () => {
  test('G07-01 scene 写 mapNum → event-system 对话历史按当前图号入账（跨模块写读顺序）', () => {
    setCurrentMapNum(7)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    loadLabEvent(gs, [{ op: 'showDialog', messageIndex: 0, text: '甲地图台词' }, { op: 'end' }])
    tickEventSystem(gs, labInput(), bus)
    // 历史维度 map=7 不是测试传参，而是 event-system 内部经 scene-system 读到的当前图号
    expect(gs.dialogHistory?.at(-1)).toEqual({ map: 7, text: '甲地图台词' })
    // 切图后第二条对话以新图号入账：读侧真实跟随 scene 写侧
    setCurrentMapNum(3)
    loadLabEvent(gs, [{ op: 'showDialog', messageIndex: 1, text: '乙地图台词' }, { op: 'end' }])
    tickEventSystem(gs, labInput(), bus)
    expect(gs.dialogHistory?.at(-1)).toEqual({ map: 3, text: '乙地图台词' })
    setCurrentMapNum(0) // 恢复模块态（不污染后续测试）
    expect(getCurrentMapNum()).toBe(0)
  })

  test('G07-02 event-system addItemToInventory：真实入账 + id0 拒收 + 两独立 GameState 互不串扰', () => {
    const gsA = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const gsB = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    addItemToInventory(gsA, 5, 2)
    expect(gsA.inventory.some((e) => e.itemId === 5 && e.count === 2)).toBe(true)
    expect(gsB.inventory.some((e) => e.itemId === 5)).toBe(false) // 实例隔离
    addItemToInventory(gsA, 0, 3) // id 0 绝不入库（sdlpal global.c 守卫）
    expect(gsA.inventory.some((e) => e.itemId === 0)).toBe(false)
  })

  test('G07-03 装备派生进战斗 opcode：0x30 重算快照消费 writeEquipmentEffectField 派生值', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const roleId = 0
    const base = getPlayerAttackStrength(gs, roleId)
    // 经生产写入口（writeEquipmentEffectField）在装备槽 1 写攻击 +7（17 = PLAYERROLES_ROW.ATTACK_STRENGTH）
    writeEquipmentEffectField(gs, 1, 17, roleId, 7)
    expect(getPlayerAttackStrength(gs, roleId)).toBe(base + 7) // equip-effect 派生 getter 含加成
    // 开战投影后的战斗快照：投影在先、装备写入在后 → 快照仍停在旧值 base。
    // 最小 ctx：0x30（op2=1 显式 roleId）只触达 state/gs/playerRoles（官方 battle-opcodes.test 同口径）。
    const ctx: BattleCtx = {
      // 官方 battle-opcodes.test 同口径最小 state（0x30 op2=1 只触达 gs/playerRoles）
      state: { players: [], enemies: [] } as unknown as BattleState,
      gs,
      playerRoles: { roles: [{ attackStrength: base } as PlayerRole] },
    }
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
    setGlobalEvents([]) // 恢复模块态（不污染后续测试）
  })
})
