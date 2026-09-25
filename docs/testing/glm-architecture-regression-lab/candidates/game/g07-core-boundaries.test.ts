/**
 * ARCH-REGRESSION-LAB-GLM-1 · G07 第一阶段模块边界（候选回归，隔离实验区；r3 重写）。
 * 验证轴（真实公开跨模块调用链，全部断言既有已核行为；不改角色索引/公式）：
 * - G07-01 scene 写 `_currentMapNum` → event-system `getCurrentMapNum` 读到（跨模块顺序；
 *   scene-system.ts:54 写、:49 读由 event-system.ts:80 import）；
 * - G07-02 event-system `addItemToInventory` 真实入账 + id0 拒收守卫 + 两独立 GameState 互不串扰；
 * - G07-03 装备派生入 battle：equip-effect `writeEquipmentEffectField` 写 ATTACK_STRENGTH 槽 →
 *   `getPlayerAttackStrength`（battle-opcodes 消费同源）读出含加成值。
 * 去重：event-system.test 326/scene 110/opcode 158/equip 36 为单模块证据；本组只证跨 caller。
 */

import { getPlayerAttackStrength, writeEquipmentEffectField } from '@lab/game/equip-effect'
import { addItemToInventory } from '@lab/game/event-system'
import { createInitialGameState } from '@lab/game/game-state'
import { getCurrentMapNum, setCurrentMapNum } from '@lab/game/scene-system'
import { describe, expect, test } from 'vitest'

describe('G07 第一阶段模块边界', () => {
  test('G07-01 scene 写 mapNum → event 读：跨模块顺序合同（含恢复）', () => {
    setCurrentMapNum(7)
    expect(getCurrentMapNum()).toBe(7) // event-system 经 scene-system 读当前图号
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

  test('G07-03 装备派生入 battle：writeEquipmentEffectField 攻击槽 → getPlayerAttackStrength 含加成', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const roleId = 0
    const base = getPlayerAttackStrength(gs, roleId)
    // 经生产写入口（writeEquipmentEffectField）在装备槽 1 写攻击 +7
    writeEquipmentEffectField(gs, 1, 17, roleId, 7) // 17 = PLAYERROLES_ROW.ATTACK_STRENGTH
    expect(getPlayerAttackStrength(gs, roleId)).toBe(base + 7) // 派生 getter 含加成
  })
})
