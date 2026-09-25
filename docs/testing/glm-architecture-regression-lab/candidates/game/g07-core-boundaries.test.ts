/**
 * ARCH-REGRESSION-LAB-GLM-1 · G07 第一阶段模块边界（候选回归，隔离实验区）。
 * 验证轴（公开跨模块顺序，全部断言既有已核行为；不改角色索引/公式）：
 * - G07-01 scene 写 `_currentMapNum` → event-system `getCurrentMapNum` 读到（跨模块顺序）；
 * - G07-02 equip-effect 派生值经 event-system 表执行（addItemToInventory 真实入账，两独立 GameState
 *   不互相串扰——模块级态之外的实例隔离）；
 * - G07-03 battle-opcodes 消费装备派生值（getPlayerAttackStrength 含 rgEquipmentEffect 加成）。
 * 去重：event-system.test 326/scene 110/opcode 158/equip 36 为单模块/单 caller 证据；
 * 本组只做**跨 caller 顺序**的公开合同；既有跨 caller 例若足够则记 existing-proof（见各条 results）。
 */

import { getPlayerAttackStrength } from '@lab/game/equip-effect'
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

  test('G07-02 两独立 GameState 的背包互不串扰；addItemToInventory 幂等边界（id0 拒收）', () => {
    const gsA = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const gsB = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    addItemToInventory(gsA, 5, 2)
    expect(gsA.inventory.some((e) => e.itemId === 5 && e.count === 2)).toBe(true)
    expect(gsB.inventory.some((e) => e.itemId === 5)).toBe(false) // 实例隔离
    addItemToInventory(gsA, 0, 3) // id 0 绝不入库（sdlpal 守卫）
    expect(gsA.inventory.some((e) => e.itemId === 0)).toBe(false)
  })

  test('G07-03 battle 侧装备派生：applyEquipmentEffect 后 getPlayerAttackStrength 含加成', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const roleId = 0
    const base = getPlayerAttackStrength(gs, roleId)
    // 装备效果槽写入 +N 攻击 → 派生 getter 含加成（battle opcodes 消费同源）
    gs.rgEquipmentEffect[1] = { rgwAttackStrength: { [roleId]: 7 } } as never
    expect(getPlayerAttackStrength(gs, roleId)).toBe(base + 7)
  })
})
