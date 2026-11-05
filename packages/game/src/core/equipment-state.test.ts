/** Pure equipment effects, effective attributes, and row-write ownership. */
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import {
  addPlayerStatRow,
  getPlayerAttackStrength,
  getPlayerDefense,
  getPlayerDexterity,
  getPlayerFleeRate,
  getPlayerMagicStrength,
  getPlayerPoisonResistance,
  PLAYERROLES_ROW,
  removeEquipmentEffect,
  setPlayerStatRow,
  writeEquipmentEffectField,
} from './equipment-state.js'
import { freshPlayerOpcodeState } from './event-opcode-player.test-fixtures.js'
import { setObjectPoisons } from './player-poison-state.js'

function freshGs() {
  const gs = freshPlayerOpcodeState()
  // 给 role 0 base attack 50
  gs.PlayerRolesRuntime.rgwAttackStrength[0] = 50
  gs.PlayerRolesRuntime.rgwMagicStrength[0] = 30
  gs.PlayerRolesRuntime.rgwDefense[0] = 20
  gs.PlayerRolesRuntime.rgwDexterity[0] = 40
  gs.PlayerRolesRuntime.rgwFleeRate[0] = 10
  gs.PlayerRolesRuntime.rgwPoisonResistance[0] = 5
  return gs
}
afterEach(() => {
  setObjectPoisons([])
})
describe('writeEquipmentEffectField', () => {
  it('writes ATTACK_STRENGTH row to specified part/role(sdlpal opcode 0x17 真值)', () => {
    const gs = freshGs()
    writeEquipmentEffectField(gs, 3 /* Hand */, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 5)
    expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(5)
  })

  it('writes DEXTERITY row(木剑 scriptOnEquip 真值:rgwOperand=[14,20,3] → part=3, row=20, value=3)', () => {
    const gs = freshGs()
    // sdlpal L_39011 chain 真值
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 2)
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.DEXTERITY, 0, 3)
    expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(2)
    expect(gs.rgEquipmentEffect[3]!.rgwDexterity[0]).toBe(3)
  })

  it('writes wind resistance row 23', () => {
    const gs = freshGs()
    writeEquipmentEffectField(gs, 5, PLAYERROLES_ROW.ELEM_RESIST_0, 0, 10) // wind +10
    expect(gs.rgEquipmentEffect[5]!.rgwElementalResistance[0]![0]).toBe(10)
  })

  it.each([-1, 7])('out-of-range part %i leaves all equipment effects unchanged', (part) => {
    const gs = freshGs()
    const before = structuredClone(gs.rgEquipmentEffect)
    writeEquipmentEffectField(gs, part, PLAYERROLES_ROW.HP, 0, 10)
    expect(gs.rgEquipmentEffect).toEqual(before)
  })

  // Override rows share the PLAYERROLES layout:
  //   row 1 spriteNumInBattle(长鞭 0x1A[1,6,0])/ row 4 attackAll(长鞭 0x1A[4,1,0])/
  //   row 65 cooperativeMagic(圣灵珠 0x1A[65,351,0])。global.h tagPLAYERROLES 行偏移。
  it('writes SPRITE_NUM_IN_BATTLE row 1(长鞭 0x1A[1,6,0])→ rgwSpriteNumInBattle', () => {
    const gs = freshGs()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())
    writeEquipmentEffectField(gs, 3 /* Hand */, PLAYERROLES_ROW.SPRITE_NUM_IN_BATTLE, 2, 6)
    expect(gs.rgEquipmentEffect[3]!.rgwSpriteNumInBattle[2]).toBe(6)
    expect(warn.mock.calls).toEqual([])
  })

  it('writes ATTACK_ALL row 4(长鞭 0x1A[4,1,0])→ rgwAttackAll', () => {
    const gs = freshGs()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_ALL, 2, 1)
    expect(gs.rgEquipmentEffect[3]!.rgwAttackAll[2]).toBe(1)
    expect(warn.mock.calls).toEqual([])
  })

  it('writes COOPERATIVE_MAGIC row 65(圣灵珠 0x1A[65,351,0])→ rgwCooperativeMagic', () => {
    const gs = freshGs()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())
    writeEquipmentEffectField(gs, 5 /* Wear */, PLAYERROLES_ROW.COOPERATIVE_MAGIC, 3, 351)
    expect(gs.rgEquipmentEffect[5]!.rgwCooperativeMagic[3]).toBe(351)
    expect(warn.mock.calls).toEqual([])
  })
})
describe('removeEquipmentEffect(sdlpal global.c:1372)', () => {
  it('clears attack, dexterity, defence and water resistance in the selected part', () => {
    const gs = freshGs()
    // 装一身 stat
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 5)
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.DEXTERITY, 0, 3)
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.DEFENSE, 0, 2)
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ELEM_RESIST_2, 0, 8) // 水抗

    removeEquipmentEffect(gs, 0, 3)

    expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(0)
    expect(gs.rgEquipmentEffect[3]!.rgwDexterity[0]).toBe(0)
    expect(gs.rgEquipmentEffect[3]!.rgwDefense[0]).toBe(0)
    expect(gs.rgEquipmentEffect[3]!.rgwElementalResistance[2]![0]).toBe(0)
  })

  it('清 override 类字段 sprite/attackAll/coopMagic(sdlpal 清整 PLAYERROLES 行)', () => {
    const gs = freshGs()
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.SPRITE_NUM_IN_BATTLE, 0, 6)
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_ALL, 0, 1)
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.COOPERATIVE_MAGIC, 0, 351)
    removeEquipmentEffect(gs, 0, 3)
    expect(gs.rgEquipmentEffect[3]!.rgwSpriteNumInBattle[0]).toBe(0)
    expect(gs.rgEquipmentEffect[3]!.rgwAttackAll[0]).toBe(0)
    expect(gs.rgEquipmentEffect[3]!.rgwCooperativeMagic[0]).toBe(0)
  })

  it('only clears given role(其他 role 不受影响)', () => {
    const gs = freshGs()
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 5)
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 1, 7) // role 1 装备
    removeEquipmentEffect(gs, 0, 3)
    expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(0)
    expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[1]).toBe(7) // 保留
  })

  it('only clears given part(其他 part 不受影响)', () => {
    const gs = freshGs()
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 5) // Hand
    writeEquipmentEffectField(gs, 0, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 3) // Head
    removeEquipmentEffect(gs, 0, 3)
    expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(0)
    expect(gs.rgEquipmentEffect[0]!.rgwAttackStrength[0]).toBe(3) // 保留
  })
})
describe('effective attributes include equipment and Extra', () => {
  it('effective Atk = base + Σ rgEquipmentEffect.rgwAttackStrength', () => {
    const gs = freshGs()
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 2) // 木剑
    writeEquipmentEffectField(gs, 0, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 5) // 头盔
    expect(getPlayerAttackStrength(gs, 0)).toBe(50 + 2 + 5)
  })

  it('magic strength includes the accessory effect', () => {
    const gs = freshGs()
    writeEquipmentEffectField(gs, 5, PLAYERROLES_ROW.MAGIC_STRENGTH, 0, 8)
    expect(getPlayerMagicStrength(gs, 0)).toBe(30 + 8)
  })

  it('defence includes both armour and footwear', () => {
    const gs = freshGs()
    writeEquipmentEffectField(gs, 2, PLAYERROLES_ROW.DEFENSE, 0, 6) // 衣甲
    writeEquipmentEffectField(gs, 4, PLAYERROLES_ROW.DEFENSE, 0, 3) // 鞋
    expect(getPlayerDefense(gs, 0)).toBe(20 + 6 + 3)
  })

  it('dexterity includes weapon effects before battle haste/slow modifiers', () => {
    const gs = freshGs()
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.DEXTERITY, 0, 3)
    expect(getPlayerDexterity(gs, 0)).toBe(40 + 3)
  })

  it('flee rate includes footwear and the Extra slot', () => {
    const gs = freshGs()
    writeEquipmentEffectField(gs, 6, PLAYERROLES_ROW.FLEE_RATE, 0, 2)
    writeEquipmentEffectField(gs, 4, PLAYERROLES_ROW.FLEE_RATE, 0, 7) // 灵巧鞋
    expect(getPlayerFleeRate(gs, 0)).toBe(19)
  })

  it.each([
    { effect: 200, expected: 100 },
    { effect: -50, expected: 0 },
  ])('poison resistance clamps effect $effect to $expected', ({ effect, expected }) => {
    const gs = freshGs()
    writeEquipmentEffectField(gs, 5, PLAYERROLES_ROW.POISON_RESISTANCE, 0, effect)
    expect(getPlayerPoisonResistance(gs, 0)).toBe(expected)
  })
})
describe('属性效果装卸：公开写入/清除后的有效值', () => {
  it('writing and removing weapon effects changes effective attack and dexterity', () => {
    const gs = freshGs()
    // 装备:opcode 0x18 入口 removeEquipmentEffect + opcode 0x17 写
    removeEquipmentEffect(gs, 0, 3) // 入口 reset Hand part
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 2)
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.DEXTERITY, 0, 3)
    expect(getPlayerAttackStrength(gs, 0)).toBe(50 + 2)
    expect(getPlayerDexterity(gs, 0)).toBe(40 + 3)

    // 卸下:sdlpal RemoveEquipmentEffect 清零(opcode 0x18 入口 + EquipItemMenu 不再装)
    removeEquipmentEffect(gs, 0, 3)
    expect(getPlayerAttackStrength(gs, 0)).toBe(50)
    expect(getPlayerDexterity(gs, 0)).toBe(40)
  })
})
describe('setPlayerStatRow 造型 row 路由(script.c:862)', () => {
  it('SPRITE_NUM/SPRITE_NUM_IN_BATTLE/AVATAR/WALK_FRAMES/ATTACK_ALL/COOP → runtime 字段', () => {
    const gs = freshPlayerOpcodeState()
    gs.iCurEquipPart = -1 // 非装备上下文(剧情脚本)
    setPlayerStatRow(gs, PLAYERROLES_ROW.SPRITE_NUM, 1, 512) // 赵灵儿变镇狱明王 大世界精灵
    setPlayerStatRow(gs, PLAYERROLES_ROW.SPRITE_NUM_IN_BATTLE, 1, 5)
    setPlayerStatRow(gs, PLAYERROLES_ROW.AVATAR, 1, 91)
    setPlayerStatRow(gs, PLAYERROLES_ROW.WALK_FRAMES, 1, 4)
    setPlayerStatRow(gs, PLAYERROLES_ROW.ATTACK_ALL, 1, 1)
    setPlayerStatRow(gs, PLAYERROLES_ROW.COOPERATIVE_MAGIC, 1, 7)
    const r = gs.PlayerRolesRuntime
    expect(r.rgwSpriteNum[1]).toBe(512)
    expect(r.rgwSpriteNumInBattle[1]).toBe(5)
    expect(r.rgwAvatar[1]).toBe(91)
    expect(r.rgwWalkFrames[1]).toBe(4)
    expect(r.rgwAttackAll[1]).toBe(1)
    expect(r.rgwCooperativeMagic[1]).toBe(7)
  })
})
describe('removeEquipmentEffect 卸装副作用(global.c:1406-1454)', () => {
  it('卸 Hand(part3)→ reset DualAttack(global.c:1411)', () => {
    const gs = freshPlayerOpcodeState()
    gs.rgPlayerStatus[1]![8] = 32760
    removeEquipmentEffect(gs, 1, 3) // Hand
    expect(gs.rgPlayerStatus[1]![8]).toBe(0)
  })

  it('卸非 Hand(part0 Head)→ DualAttack 不动', () => {
    const gs = freshPlayerOpcodeState()
    gs.rgPlayerStatus[1]![8] = 32760
    removeEquipmentEffect(gs, 1, 0) // Head
    expect(gs.rgPlayerStatus[1]![8]).toBe(32760)
  })

  it('卸 Wear(part5)→ 清 level≥99 毒(寿葫芦),低级毒保留(global.c:1413-1454)', () => {
    setObjectPoisons([
      { id: 563, level: 99, color: 0, playerScript: 40860, enemyScript: 0 }, // 寿葫芦正面毒
      { id: 552, level: 1, color: 64, playerScript: 40866, enemyScript: 40868 }, // 低级伤害毒
    ])
    const gs = freshPlayerOpcodeState()
    gs.partyMembers = [1]
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 563, wPoisonScript: 40860 }
    gs.rgPoisonStatus['1_0'] = { wPoisonID: 552, wPoisonScript: 40866 }
    removeEquipmentEffect(gs, 1, 5) // Wear
    expect(gs.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 552, wPoisonScript: 40866 })
    expect(gs.rgPoisonStatus['1_0']).toEqual({ wPoisonID: 0, wPoisonScript: 0 })
  })
})
describe('setPlayerStatRow destination ownership', () => {
  it('iCurEquipPart=-1 → 写 base PlayerRolesRuntime', () => {
    const gs = freshGs()
    gs.iCurEquipPart = -1
    setPlayerStatRow(gs, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 99)
    expect(gs.PlayerRolesRuntime.rgwAttackStrength[0]).toBe(99)
    expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(0)
  })
  it('iCurEquipPart=3(装备进行中)→ 写 rgEquipmentEffect[3] 覆盖层,base 不变', () => {
    const gs = freshGs()
    gs.iCurEquipPart = 3
    setPlayerStatRow(gs, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 7)
    expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(7)
    expect(gs.PlayerRolesRuntime.rgwAttackStrength[0]).toBe(50) // base 不变
  })
})
describe('row and Extra boundaries', () => {
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
    expect(gs.PlayerRolesRuntime.rgwMaxHP[0] ?? 0).toBe(100) // base 不动(0x17 是覆盖层语义)
  })
  describe('addPlayerStatRow —— 0x19 COVERED_BY row(script.c:813-832)', () => {
    it('row 31(COVERED_BY)按 delta 累加,不影响其他 row', () => {
      const gs = freshGs()
      addPlayerStatRow(gs, PLAYERROLES_ROW.COVERED_BY, 0, 2) // 李逍遥被林月如援护(coveredBy=2)
      addPlayerStatRow(gs, PLAYERROLES_ROW.COVERED_BY, 0, 1)
      expect(gs.PlayerRolesRuntime.rgwCoveredBy[0]).toBe(3)
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(100) // HP row is unchanged
    })
  })
  it('Extra part clears both fields for only the selected role', () => {
    const gs = freshGs()
    writeEquipmentEffectField(gs, 6, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 25) // 大蒜式 Extra 槽
    writeEquipmentEffectField(gs, 6, PLAYERROLES_ROW.POISON_RESISTANCE, 0, 30)
    writeEquipmentEffectField(gs, 6, PLAYERROLES_ROW.ATTACK_STRENGTH, 1, 50)
    removeEquipmentEffect(gs, 0, 6)
    expect(gs.rgEquipmentEffect[6]!.rgwAttackStrength[0]).toBe(0)
    expect(gs.rgEquipmentEffect[6]!.rgwPoisonResistance[0]).toBe(0)
    expect(gs.rgEquipmentEffect[6]!.rgwAttackStrength[1]).toBe(50)
  })
  it.each([-1, 7])('removing invalid part %i is a whole-state no-op', (part) => {
    const gs = freshGs()
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 25)
    gs.rgPlayerStatus[0]![8] = 32760
    const before = structuredClone(gs)
    removeEquipmentEffect(gs, 0, part)
    expect(gs).toEqual(before)
  })
})
