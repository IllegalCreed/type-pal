/**
 * TEST-GLM-NEW-H-1 / H03 — equipment-state 当前公开合同补测(equipment-state.ts 无本文件前无直测;
 * 仅 getter/卸装副作用经 equip-effect.test.ts 间接覆盖)。
 *
 * 一手真值:
 *  - 0x17 写 effect 覆盖层按 PLAYERROLES row(script.c:752-766;行表 global.h:299-336):
 *    LEVEL6/MAX_HP7/MAX_MP8/HP9/MP10 → rgEquipmentEffect[part] 对应行
 *  - 0x19 按 row += SHORT(script.c:813-832;COVERED_BY=31 同表)
 *  - PAL_RemoveEquipmentEffect 接受 part 0..6(含 kBodyPartExtra=6,battle.c:1829 战末清理用),
 *    越界(-1/7)no-op(global.c:1372)
 */
import { describe, expect, it } from 'vitest'
import {
  addPlayerStatRow,
  PLAYERROLES_ROW,
  removeEquipmentEffect,
  writeEquipmentEffectField,
} from './equipment-state.js'
import { createInitialGameState } from './game-state.js'

function freshGs() {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.PlayerRolesRuntime.rgwHP[0] = 200
  gs.PlayerRolesRuntime.rgwMP[0] = 30
  return gs
}

describe('writeEquipmentEffectField —— 0x17 HP/MP 族 row(script.c:752-766)', () => {
  it('MAX_HP7/MAX_MP8/HP9/MP10 写进对应 part 覆盖层,base 不动、其余 role 不受影响', () => {
    const gs = freshGs()
    writeEquipmentEffectField(gs, 0, PLAYERROLES_ROW.MAX_HP, 0, 30)
    writeEquipmentEffectField(gs, 0, PLAYERROLES_ROW.MAX_MP, 0, 5)
    writeEquipmentEffectField(gs, 0, PLAYERROLES_ROW.HP, 0, 10)
    writeEquipmentEffectField(gs, 0, PLAYERROLES_ROW.MP, 0, 2)
    const eff = gs.rgEquipmentEffect[0]!
    expect(eff.rgwMaxHP[0]).toBe(30)
    expect(eff.rgwMaxMP[0]).toBe(5)
    expect(eff.rgwHP[0]).toBe(10)
    expect(eff.rgwMP[0]).toBe(2)
    expect(eff.rgwMaxHP[1] ?? 0).toBe(0) // 只写目标 role
    expect(gs.PlayerRolesRuntime.rgwMaxHP[0] ?? 0).toBe(0) // base 不动(0x17 是覆盖层语义)
  })

  it('partIdx -1 / 7(MAX_PLAYER_EQUIPMENTS 之外)→ no-op 不抛错', () => {
    const gs = freshGs()
    expect(() => writeEquipmentEffectField(gs, -1, PLAYERROLES_ROW.HP, 0, 10)).not.toThrow()
    expect(() => writeEquipmentEffectField(gs, 7, PLAYERROLES_ROW.HP, 0, 10)).not.toThrow()
    expect(gs.rgEquipmentEffect[0]!.rgwHP[0] ?? 0).toBe(0)
  })
})

describe('addPlayerStatRow —— 0x19 COVERED_BY row(script.c:813-832)', () => {
  it('row 31(COVERED_BY)按 delta 累加,不影响其他 row', () => {
    const gs = freshGs()
    addPlayerStatRow(gs, PLAYERROLES_ROW.COVERED_BY, 0, 2) // 李逍遥被林月如援护(coveredBy=2)
    addPlayerStatRow(gs, PLAYERROLES_ROW.COVERED_BY, 0, 1)
    expect(gs.PlayerRolesRuntime.rgwCoveredBy[0]).toBe(3)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(200) // 其他 row 不动
  })
})

describe('removeEquipmentEffect 部位边界(global.c:1372;Extra=6 战末清理合法)', () => {
  it('part 6(kBodyPartExtra)合法:清该 role 覆盖层;part 7 越界 no-op 不清', () => {
    const gs = freshGs()
    writeEquipmentEffectField(gs, 6, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 25) // 大蒜式 Extra 槽
    writeEquipmentEffectField(gs, 6, PLAYERROLES_ROW.POISON_RESISTANCE, 0, 30)
    removeEquipmentEffect(gs, 0, 6)
    expect(gs.rgEquipmentEffect[6]!.rgwAttackStrength[0]).toBe(0)
    expect(gs.rgEquipmentEffect[6]!.rgwPoisonResistance[0]).toBe(0)

    writeEquipmentEffectField(gs, 0, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 25)
    expect(() => removeEquipmentEffect(gs, 0, 7)).not.toThrow()
    expect(gs.rgEquipmentEffect[0]!.rgwAttackStrength[0]).toBe(25) // 越界 → 原值保留
  })

  it('part 6 只清目标 role,其他 role 的 Extra 槽保留', () => {
    const gs = freshGs()
    writeEquipmentEffectField(gs, 6, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 25)
    writeEquipmentEffectField(gs, 6, PLAYERROLES_ROW.ATTACK_STRENGTH, 1, 50)
    removeEquipmentEffect(gs, 0, 6)
    expect(gs.rgEquipmentEffect[6]!.rgwAttackStrength[0]).toBe(0)
    expect(gs.rgEquipmentEffect[6]!.rgwAttackStrength[1]).toBe(50)
  })
})
