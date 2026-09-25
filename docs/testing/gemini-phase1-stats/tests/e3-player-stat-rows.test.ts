/**
 * E3: addPlayerStatRow / setPlayerStatRow 基础与装备进行中状态
 * 重点核验:
 * 1. addPlayerStatRow 独立合同，含非零正值与负向数值 (负 delta 扣减)
 * 2. setPlayerStatRow 当 iCurEquipPart !== -1 时对覆盖层重定向完整性
 * 3. setPlayerStatRow 当 iCurEquipPart === -1 时的基础属性写入与角色隔离
 */
import { describe, expect, it } from 'vitest'
import {
  addPlayerStatRow,
  PLAYERROLES_ROW,
  setPlayerStatRow,
} from '../../../../packages/game/src/core/equip-effect.js'
import { makeFreshGameState } from '../fixtures/stats-test-fixtures.js'

describe('E3: 玩家属性行基础与进行中覆盖层更新', () => {
  it('E3-01 addPlayerStatRow 支持负向 delta 并正确计算各基础属性', () => {
    const gs = makeFreshGameState()
    const roleId = 0 // rgwAttackStrength: 30, rgwDefense: 15, rgwHP: 100

    // 正向加成
    addPlayerStatRow(gs, PLAYERROLES_ROW.ATTACK_STRENGTH, roleId, 10)
    expect(gs.PlayerRolesRuntime.rgwAttackStrength[roleId]).toBe(40)

    // 负向扣减 (如中毒或虚弱削弱)
    addPlayerStatRow(gs, PLAYERROLES_ROW.ATTACK_STRENGTH, roleId, -15)
    expect(gs.PlayerRolesRuntime.rgwAttackStrength[roleId]).toBe(25)

    addPlayerStatRow(gs, PLAYERROLES_ROW.DEFENSE, roleId, -5)
    expect(gs.PlayerRolesRuntime.rgwDefense[roleId]).toBe(10)

    addPlayerStatRow(gs, PLAYERROLES_ROW.HP, roleId, -30)
    expect(gs.PlayerRolesRuntime.rgwHP[roleId]).toBe(70)
  })

  it('E3-02 setPlayerStatRow 在 iCurEquipPart !== -1 时重定向至装备覆盖层，基础值不受影响', () => {
    const gs = makeFreshGameState()
    const roleId = 1 // base Def 12, Mag 40

    gs.iCurEquipPart = 2 // 假定正在装备衣甲 (part 2)
    setPlayerStatRow(gs, PLAYERROLES_ROW.DEFENSE, roleId, 35)
    setPlayerStatRow(gs, PLAYERROLES_ROW.MAGIC_STRENGTH, roleId, 20)

    // 写入 rgEquipmentEffect[2]
    expect(gs.rgEquipmentEffect[2]!.rgwDefense[roleId]).toBe(35)
    expect(gs.rgEquipmentEffect[2]!.rgwMagicStrength[roleId]).toBe(20)

    // PlayerRolesRuntime 基础值完全不变
    expect(gs.PlayerRolesRuntime.rgwDefense[roleId]).toBe(12)
    expect(gs.PlayerRolesRuntime.rgwMagicStrength[roleId]).toBe(40)
  })

  it('E3-03 setPlayerStatRow 在常规态 (iCurEquipPart === -1) 写入基础属性且角色间隔离', () => {
    const gs = makeFreshGameState()
    const roleA = 0
    const roleB = 1

    gs.iCurEquipPart = -1
    setPlayerStatRow(gs, PLAYERROLES_ROW.DEFENSE, roleA, 50)
    setPlayerStatRow(gs, PLAYERROLES_ROW.MAX_MP, roleA, 120)

    expect(gs.PlayerRolesRuntime.rgwDefense[roleA]).toBe(50)
    expect(gs.PlayerRolesRuntime.rgwMaxMP[roleA]).toBe(120)

    // roleB 保持不变
    expect(gs.PlayerRolesRuntime.rgwDefense[roleB]).toBe(12)
    expect(gs.PlayerRolesRuntime.rgwMaxMP[roleB]).toBe(60)
  })
})
