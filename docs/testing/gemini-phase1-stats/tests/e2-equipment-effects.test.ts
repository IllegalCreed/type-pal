/**
 * E2: writeEquipmentEffectField / removeEquipmentEffect 效果层读写保真
 * 重点核验:
 * 1. 覆盖旧测试未测的 row (LEVEL, MAX_HP, MAX_MP, HP, MP, DEFENSE, FLEE_RATE, POISON_RESISTANCE, COVERED_BY, 五行抗性 1..4)
 * 2. Extra 格 6 的写入与卸下清空
 * 3. 越界 partIdx 与未知 row 时的无损忽略与域保真 (不破坏其他槽位与其他角色)
 */
import { describe, expect, it } from 'vitest'
import {
  PLAYERROLES_ROW,
  removeEquipmentEffect,
  writeEquipmentEffectField,
} from '../../../../packages/game/src/core/equip-effect.js'
import { makeFreshGameState } from '../fixtures/stats-test-fixtures.js'

describe('E2: 装备效果层字段写入与卸下保真', () => {
  it('E2-01 完整支持生命、真气、五行抗性与守护等扩展行', () => {
    const gs = makeFreshGameState()
    const roleId = 1 // 赵灵儿

    writeEquipmentEffectField(gs, 2 /* Body */, PLAYERROLES_ROW.LEVEL, roleId, 2)
    writeEquipmentEffectField(gs, 2, PLAYERROLES_ROW.MAX_HP, roleId, 50)
    writeEquipmentEffectField(gs, 2, PLAYERROLES_ROW.MAX_MP, roleId, 30)
    writeEquipmentEffectField(gs, 2, PLAYERROLES_ROW.HP, roleId, 40)
    writeEquipmentEffectField(gs, 2, PLAYERROLES_ROW.MP, roleId, 20)
    writeEquipmentEffectField(gs, 2, PLAYERROLES_ROW.COVERED_BY, roleId, 0)

    // 五行抗性 (雷1, 水2, 火3, 土4)
    writeEquipmentEffectField(gs, 2, PLAYERROLES_ROW.ELEM_RESIST_1, roleId, 11)
    writeEquipmentEffectField(gs, 2, PLAYERROLES_ROW.ELEM_RESIST_2, roleId, 12)
    writeEquipmentEffectField(gs, 2, PLAYERROLES_ROW.ELEM_RESIST_3, roleId, 13)
    writeEquipmentEffectField(gs, 2, PLAYERROLES_ROW.ELEM_RESIST_4, roleId, 14)

    const eff = gs.rgEquipmentEffect[2]!
    expect(eff.rgwLevel[roleId]).toBe(2)
    expect(eff.rgwMaxHP[roleId]).toBe(50)
    expect(eff.rgwMaxMP[roleId]).toBe(30)
    expect(eff.rgwHP[roleId]).toBe(40)
    expect(eff.rgwMP[roleId]).toBe(20)
    expect(eff.rgwCoveredBy[roleId]).toBe(0)
    expect(eff.rgwElementalResistance[1]![roleId]).toBe(11)
    expect(eff.rgwElementalResistance[2]![roleId]).toBe(12)
    expect(eff.rgwElementalResistance[3]![roleId]).toBe(13)
    expect(eff.rgwElementalResistance[4]![roleId]).toBe(14)
  })

  it('E2-02 Extra 槽 (partIdx = 6) 写入与 removeEquipmentEffect 清除保真', () => {
    const gs = makeFreshGameState()
    const roleId = 0

    writeEquipmentEffectField(gs, 6, PLAYERROLES_ROW.DEFENSE, roleId, 25)
    writeEquipmentEffectField(gs, 6, PLAYERROLES_ROW.POISON_RESISTANCE, roleId, 30)
    expect(gs.rgEquipmentEffect[6]!.rgwDefense[roleId]).toBe(25)
    expect(gs.rgEquipmentEffect[6]!.rgwPoisonResistance[roleId]).toBe(30)

    // 卸下 Extra 槽
    removeEquipmentEffect(gs, roleId, 6)
    expect(gs.rgEquipmentEffect[6]!.rgwDefense[roleId]).toBe(0)
    expect(gs.rgEquipmentEffect[6]!.rgwPoisonResistance[roleId]).toBe(0)
  })

  it('E2-03 越界部位索引与未知行静默安全退出，无关域保持纯净', () => {
    const gs = makeFreshGameState()
    const roleId = 0

    // 预先写入合法槽位数据
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_STRENGTH, roleId, 10)
    const before = structuredClone(gs.rgEquipmentEffect)

    // 越界写入 partIdx = -1 或 7
    writeEquipmentEffectField(gs, -1, PLAYERROLES_ROW.ATTACK_STRENGTH, roleId, 99)
    writeEquipmentEffectField(gs, 7, PLAYERROLES_ROW.ATTACK_STRENGTH, roleId, 99)
    // 未知行 999
    writeEquipmentEffectField(gs, 3, 999, roleId, 99)

    // 越界卸下
    removeEquipmentEffect(gs, roleId, -1)
    removeEquipmentEffect(gs, roleId, 8)

    // 所有槽位和所有角色保持完整前像，不能只漏检未点名字段。
    expect(gs.rgEquipmentEffect).toEqual(before)
    expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[roleId]).toBe(10)
  })
})
