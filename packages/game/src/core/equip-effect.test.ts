/**
 * C5(2026-05-28):equip-effect.ts 单测 — sdlpal global.c:1333-1900+ 真值校验。
 *
 * 覆盖:
 *  - writeEquipmentEffectField(opcode 0x17 真值)
 *  - removeEquipmentEffect(sdlpal global.c:1372 清零)
 *  - 6 effective stat getter(base + Σ rgEquipmentEffect)
 *
 * updateAllEquipments 依赖 shared.json runtime,留 e2e。
 */

import { describe, expect, it } from 'vitest'
import { createInitialGameState } from './game-state.js'
import {
  getPlayerAttackStrength,
  getPlayerDefense,
  getPlayerDexterity,
  getPlayerFleeRate,
  getPlayerMagicStrength,
  getPlayerPoisonResistance,
  PLAYERROLES_ROW,
  removeEquipmentEffect,
  writeEquipmentEffectField,
} from './equip-effect.js'

function freshGs() {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  // 给 role 0 base attack 50
  gs.PlayerRolesRuntime.rgwAttackStrength[0] = 50
  gs.PlayerRolesRuntime.rgwMagicStrength[0] = 30
  gs.PlayerRolesRuntime.rgwDefense[0] = 20
  gs.PlayerRolesRuntime.rgwDexterity[0] = 40
  gs.PlayerRolesRuntime.rgwFleeRate[0] = 10
  gs.PlayerRolesRuntime.rgwPoisonResistance[0] = 5
  return gs
}

describe('equip-effect', () => {
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

    it('writes elemental resistance row 23-27', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 5, PLAYERROLES_ROW.ELEM_RESIST_0, 0, 10) // wind +10
      expect(gs.rgEquipmentEffect[5]!.rgwElementalResistance[0]![0]).toBe(10)
    })

    it('ignores partIdx out of range', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, -1, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 5)
      writeEquipmentEffectField(gs, 10, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 5)
      for (let i = 0; i < 7; i++) {
        expect(gs.rgEquipmentEffect[i]!.rgwAttackStrength[0]).toBe(0)
      }
    })
  })

  describe('removeEquipmentEffect(sdlpal global.c:1372)', () => {
    it('clears all stat rows for given role in given part', () => {
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

  describe('6 effective stat getter(sdlpal global.c:1736-1899)', () => {
    it('effective Atk = base + Σ rgEquipmentEffect.rgwAttackStrength', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 2) // 木剑
      writeEquipmentEffectField(gs, 0, PLAYERROLES_ROW.ATTACK_STRENGTH, 0, 5) // 头盔
      expect(getPlayerAttackStrength(gs, 0)).toBe(50 + 2 + 5)
    })

    it('effective Mag', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 5, PLAYERROLES_ROW.MAGIC_STRENGTH, 0, 8)
      expect(getPlayerMagicStrength(gs, 0)).toBe(30 + 8)
    })

    it('effective Def', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 2, PLAYERROLES_ROW.DEFENSE, 0, 6) // 衣甲
      writeEquipmentEffectField(gs, 4, PLAYERROLES_ROW.DEFENSE, 0, 3) // 鞋
      expect(getPlayerDefense(gs, 0)).toBe(20 + 6 + 3)
    })

    it('effective Dex(no haste — battle layer 加)', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.DEXTERITY, 0, 3)
      expect(getPlayerDexterity(gs, 0)).toBe(40 + 3)
    })

    it('effective Flee', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 4, PLAYERROLES_ROW.FLEE_RATE, 0, 7) // 灵巧鞋
      expect(getPlayerFleeRate(gs, 0)).toBe(10 + 7)
    })

    it('effective PoisonResist clamped to [0, 100]', () => {
      const gs = freshGs()
      writeEquipmentEffectField(gs, 5, PLAYERROLES_ROW.POISON_RESISTANCE, 0, 200)
      expect(getPlayerPoisonResistance(gs, 0)).toBe(100)
      writeEquipmentEffectField(gs, 5, PLAYERROLES_ROW.POISON_RESISTANCE, 0, -50)
      expect(getPlayerPoisonResistance(gs, 0)).toBe(0)
    })
  })

  describe('完整 swap 模拟(sdlpal 木剑 39011 真值 chain)', () => {
    it('装备木剑 → AttackStrength +2 / Dexterity +3;卸下后清零', () => {
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
})
