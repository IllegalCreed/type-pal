/**
 * E1: 六 getPlayer* 有效属性只读计算
 * 重点核验:
 * 1. Extra 格索引 6 (MAX_PLAYER_EQUIPMENTS = 6) 对六大 getter 的贡献
 * 2. 多角色间装备效果互不污染 (跨角色独立性)
 * 3. 毒抗 clamp [0, 100] 的精确边界值
 * (去重说明: 旧测试 equip-effect.test.ts 已测 base + 两格与 200/-50 钳制，本处不重复测试相同用例)
 */
import { describe, expect, it } from 'vitest'
import {
  getPlayerAttackStrength,
  getPlayerDefense,
  getPlayerDexterity,
  getPlayerFleeRate,
  getPlayerMagicStrength,
  getPlayerPoisonResistance,
  PLAYERROLES_ROW,
  writeEquipmentEffectField,
} from '../../equip-effect.js'
import { makeFreshGameState } from './stats-test-fixtures.js'

describe('E1: 六 getPlayer* 边界与隔离候选回归', () => {
  it('E1-01 Extra 格索引 6 参与全部 6 个 getter 的属性加成计算', () => {
    const gs = makeFreshGameState()
    const roleId = 0 // 李逍遥: base Atk 30, Mag 20, Def 15, Dex 18, Flee 10, PoisonRes 5

    // 向 Extra 槽 (partIdx = 6) 写入全部 6 种数值
    writeEquipmentEffectField(gs, 6, PLAYERROLES_ROW.ATTACK_STRENGTH, roleId, 12)
    writeEquipmentEffectField(gs, 6, PLAYERROLES_ROW.MAGIC_STRENGTH, roleId, 14)
    writeEquipmentEffectField(gs, 6, PLAYERROLES_ROW.DEFENSE, roleId, 8)
    writeEquipmentEffectField(gs, 6, PLAYERROLES_ROW.DEXTERITY, roleId, 7)
    writeEquipmentEffectField(gs, 6, PLAYERROLES_ROW.FLEE_RATE, roleId, 9)
    writeEquipmentEffectField(gs, 6, PLAYERROLES_ROW.POISON_RESISTANCE, roleId, 15)

    expect(getPlayerAttackStrength(gs, roleId)).toBe(30 + 12)
    expect(getPlayerMagicStrength(gs, roleId)).toBe(20 + 14)
    expect(getPlayerDefense(gs, roleId)).toBe(15 + 8)
    expect(getPlayerDexterity(gs, roleId)).toBe(18 + 7)
    expect(getPlayerFleeRate(gs, roleId)).toBe(10 + 9)
    expect(getPlayerPoisonResistance(gs, roleId)).toBe(5 + 15)
  })

  it('E1-02 多角色间装备效果严格隔离，无跨角色泄漏', () => {
    const gs = makeFreshGameState()
    const roleA = 0 // 李逍遥: base Atk 30, Def 15
    const roleB = 1 // 赵灵儿: base Atk 25, Def 12

    // 只给 roleA 的多个槽位装属性，包含 Extra 槽 6
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_STRENGTH, roleA, 20)
    writeEquipmentEffectField(gs, 6, PLAYERROLES_ROW.ATTACK_STRENGTH, roleA, 10)
    writeEquipmentEffectField(gs, 1, PLAYERROLES_ROW.DEFENSE, roleA, 15)

    // roleA 有效属性正确叠加
    expect(getPlayerAttackStrength(gs, roleA)).toBe(30 + 20 + 10)
    expect(getPlayerDefense(gs, roleA)).toBe(15 + 15)

    // roleB 属性必须保持自身 base，未受任何 roleA 的装备影响
    expect(getPlayerAttackStrength(gs, roleB)).toBe(25)
    expect(getPlayerDefense(gs, roleB)).toBe(12)
  })

  it('E1-03 毒抗精确上下限边界测试: 恰好为 100、101 与恰好为 0、-1', () => {
    const gs = makeFreshGameState()
    const roleId = 2 // 林月如: base poisonResistance = 0

    // 边界 1: 恰好达到 100
    writeEquipmentEffectField(gs, 5, PLAYERROLES_ROW.POISON_RESISTANCE, roleId, 100)
    expect(getPlayerPoisonResistance(gs, roleId)).toBe(100)

    // 边界 2: 略微超标 101 -> 截断为 100
    writeEquipmentEffectField(gs, 5, PLAYERROLES_ROW.POISON_RESISTANCE, roleId, 101)
    expect(getPlayerPoisonResistance(gs, roleId)).toBe(100)

    // 边界 3: 恰好归零 0
    writeEquipmentEffectField(gs, 5, PLAYERROLES_ROW.POISON_RESISTANCE, roleId, 0)
    expect(getPlayerPoisonResistance(gs, roleId)).toBe(0)

    // 边界 4: 负值 -1 -> 截断为 0
    writeEquipmentEffectField(gs, 5, PLAYERROLES_ROW.POISON_RESISTANCE, roleId, -1)
    expect(getPlayerPoisonResistance(gs, roleId)).toBe(0)
  })
})
